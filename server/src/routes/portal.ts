import { Router } from 'express';
import { z } from 'zod';
import { comparePasswords, createToken } from '../lib/auth.js';
import { logActivity } from '../lib/activity.js';
import { prisma } from '../lib/prisma.js';
import { AppError, asyncHandler } from '../lib/errors.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const portalRoles = ['PARENT', 'STUDENT', 'TEACHER', 'ADMIN'] as const;

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

async function getWorkspace(userId: string) {
  const organization = await prisma.organization.findFirst({
    where: {
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    },
  });
  if (!organization) throw new AppError(404, 'Workspace not found', 'NOT_FOUND');
  const madrassa = await prisma.madrassa.findFirst({ where: { organizationId: organization.id, isDeleted: false } });
  if (!madrassa) throw new AppError(404, 'Madrassa profile required', 'NOT_FOUND');
  return { organization, madrassa };
}

function portalTypeForRole(role: string) {
  if (role === 'PARENT') return 'PARENT';
  if (role === 'STUDENT') return 'STUDENT';
  if (role === 'TEACHER') return 'TEACHER';
  return 'ADMIN';
}

async function buildPortalContext(userId: string) {
  const { organization, madrassa } = await getWorkspace(userId);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');

  const parent = await prisma.parentUser.findFirst({
    where: { userId, organizationId: organization.id },
    include: { students: { include: { student: true } } },
  });
  const studentAccount = await prisma.studentPortalAccount.findFirst({
    where: { userId, organizationId: organization.id },
    include: { student: { include: { guardian: true, attendanceRecords: true, feeInvoices: true, feePayments: true, certificates: true, examResults: true, resultCards: true } } },
  });
  const teacherAccount = await prisma.teacherPortalAccount.findFirst({
    where: { userId, organizationId: organization.id },
    include: { employee: { include: { department: true, designation: true, attendance: true, leaveRequests: true, payrolls: true } } },
  });

  return { user, organization, madrassa, parent, studentAccount, teacherAccount };
}

router.post('/login', asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid login payload', 'VALIDATION_ERROR', parsed.error.flatten());

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await comparePasswords(parsed.data.password, user.passwordHash))) {
    throw new AppError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
  }
  if (!portalRoles.includes(user.role as typeof portalRoles[number])) {
    throw new AppError(403, 'Portal access not enabled for this account', 'PORTAL_ACCESS_DENIED');
  }

  const context = await buildPortalContext(user.id);
  const portalType = portalTypeForRole(user.role);
  const token = createToken({ sub: user.id, role: user.role, ver: user.sessionVersion });

  await prisma.portalSession.create({
    data: {
      organizationId: context.organization.id,
      userId: user.id,
      portalType,
      accountId: user.id,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      userAgent: req.get('user-agent') ?? null,
      ipAddress: req.ip ?? null,
    },
  });

  res.cookie('token', token, cookieOptions);
  await logActivity({ userId: user.id, action: 'portal_logged_in', entityType: 'portalSession' });
  res.json({
    message: 'Portal login successful',
    token,
    portalType,
    me: {
      user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status, emailVerified: user.emailVerified },
      organization: context.organization,
      madrassa: context.madrassa,
    },
  });
}));

router.post('/logout', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  await prisma.portalSession.updateMany({
    where: { userId: req.user!.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  await logActivity({ userId: req.user!.id, action: 'portal_logged_out', entityType: 'portalSession' });
  res.clearCookie('token', cookieOptions);
  res.json({ message: 'Portal logout successful' });
}));

router.get('/me', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const context = await buildPortalContext(req.user!.id);
  const portalType = portalTypeForRole(req.user!.role);
  res.json({
    portalType,
    user: { id: context.user.id, name: context.user.name, email: context.user.email, role: context.user.role, status: context.user.status, emailVerified: context.user.emailVerified, avatarUrl: context.user.avatarUrl, phone: context.user.phone },
    organization: context.organization,
    madrassa: context.madrassa,
    parent: context.parent,
    studentAccount: context.studentAccount,
    teacherAccount: context.teacherAccount,
  });
}));

router.get('/parent/dashboard', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const context = await buildPortalContext(req.user!.id);
  const studentIds = (context.parent?.students ?? []).map((item: { studentId: string }) => item.studentId);
  const students = studentIds.length ? await prisma.student.findMany({ where: { id: { in: studentIds } }, include: { attendanceRecords: true, feeInvoices: true, feePayments: true, certificates: true } }) : [];
  res.json({
    students,
    metrics: {
      children: students.length,
      attendance: students.reduce((sum: number, student: any) => sum + student.attendanceRecords.length, 0),
      pendingFees: students.reduce(
        (sum: number, student: any) =>
          sum + student.feeInvoices.filter((invoice: any) => invoice.status !== 'PAID').reduce((invoiceSum: number, invoice: any) => invoiceSum + invoice.amount, 0),
        0,
      ),
    },
  });
}));

router.get('/parent/students', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const context = await buildPortalContext(req.user!.id);
  const studentIds = (context.parent?.students ?? []).map((item: { studentId: string }) => item.studentId);
  const students = studentIds.length ? await prisma.student.findMany({ where: { id: { in: studentIds } }, include: { guardian: true, attendanceRecords: true, feeInvoices: true, certificates: true } }) : [];
  res.json({ students });
}));

router.get('/parent/fees', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const context = await buildPortalContext(req.user!.id);
  const studentIds = (context.parent?.students ?? []).map((item: { studentId: string }) => item.studentId);
  const invoices = studentIds.length ? await prisma.feeInvoice.findMany({ where: { studentId: { in: studentIds } } }) : [];
  const payments = studentIds.length ? await prisma.feePayment.findMany({ where: { studentId: { in: studentIds } } }) : [];
  res.json({ invoices, payments });
}));

router.get('/parent/results', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const context = await buildPortalContext(req.user!.id);
  const studentIds = (context.parent?.students ?? []).map((item: { studentId: string }) => item.studentId);
  const results = studentIds.length ? await prisma.resultCard.findMany({ where: { studentId: { in: studentIds } }, include: { exam: true, student: true } }) : [];
  res.json({ results });
}));

router.get('/parent/attendance', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const context = await buildPortalContext(req.user!.id);
  const studentIds = (context.parent?.students ?? []).map((item: { studentId: string }) => item.studentId);
  const attendance = studentIds.length ? await prisma.attendanceRecord.findMany({ where: { studentId: { in: studentIds } }, orderBy: { date: 'desc' } }) : [];
  res.json({ attendance });
}));

router.get('/parent/certificates', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const context = await buildPortalContext(req.user!.id);
  const studentIds = (context.parent?.students ?? []).map((item: { studentId: string }) => item.studentId);
  const certificates = studentIds.length ? await prisma.certificate.findMany({ where: { studentId: { in: studentIds } }, include: { template: true, verification: true } }) : [];
  res.json({ certificates });
}));

router.get('/student/dashboard', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const context = await buildPortalContext(req.user!.id);
  const student = context.studentAccount?.student;
  if (!student) throw new AppError(404, 'Student portal account not found', 'NOT_FOUND');
  const feeSummary = await prisma.feeInvoice.aggregate({ where: { studentId: student.id, status: { not: 'PAID' } }, _sum: { amount: true } });
  res.json({
    student,
    metrics: {
      attendance: await prisma.attendanceRecord.count({ where: { studentId: student.id } }),
      certificates: await prisma.certificate.count({ where: { studentId: student.id } }),
      feesDue: feeSummary._sum.amount ?? 0,
    },
  });
}));

router.get('/student/profile', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const context = await buildPortalContext(req.user!.id);
  if (!context.studentAccount) throw new AppError(404, 'Student portal account not found', 'NOT_FOUND');
  res.json({ student: context.studentAccount.student });
}));

router.get('/student/results', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const context = await buildPortalContext(req.user!.id);
  const student = context.studentAccount?.student;
  if (!student) throw new AppError(404, 'Student portal account not found', 'NOT_FOUND');
  const results = await prisma.resultCard.findMany({ where: { studentId: student.id }, include: { exam: true } });
  res.json({ results });
}));

router.get('/student/attendance', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const context = await buildPortalContext(req.user!.id);
  const student = context.studentAccount?.student;
  if (!student) throw new AppError(404, 'Student portal account not found', 'NOT_FOUND');
  const attendance = await prisma.attendanceRecord.findMany({ where: { studentId: student.id }, orderBy: { date: 'desc' } });
  res.json({ attendance });
}));

router.get('/student/fees', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const context = await buildPortalContext(req.user!.id);
  const student = context.studentAccount?.student;
  if (!student) throw new AppError(404, 'Student portal account not found', 'NOT_FOUND');
  const invoices = await prisma.feeInvoice.findMany({ where: { studentId: student.id } });
  const payments = await prisma.feePayment.findMany({ where: { studentId: student.id } });
  res.json({ invoices, payments });
}));

router.get('/student/library', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const context = await buildPortalContext(req.user!.id);
  const student = context.studentAccount?.student;
  if (!student) throw new AppError(404, 'Student portal account not found', 'NOT_FOUND');
  const member = await prisma.libraryMember.findFirst({ where: { studentId: student.id } });
  const issues = member ? await prisma.bookIssue.findMany({ where: { memberId: member.id }, include: { bookCopy: { include: { book: true } } } }) : [];
  res.json({ issues });
}));

router.get('/student/certificates', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const context = await buildPortalContext(req.user!.id);
  const student = context.studentAccount?.student;
  if (!student) throw new AppError(404, 'Student portal account not found', 'NOT_FOUND');
  const certificates = await prisma.certificate.findMany({ where: { studentId: student.id }, include: { template: true, verification: true } });
  res.json({ certificates });
}));

router.get('/teacher/dashboard', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const context = await buildPortalContext(req.user!.id);
  const employee = context.teacherAccount?.employee;
  if (!employee) throw new AppError(404, 'Teacher portal account not found', 'NOT_FOUND');
  const classes = await prisma.classRoom.findMany({ where: { madrassaId: context.madrassa.id, teacherName: { contains: `${employee.firstName} ${employee.lastName}` } } });
  const resultCutoff = new Date();
  resultCutoff.setMonth(resultCutoff.getMonth() - 1);
  res.json({
    employee,
    classes,
    metrics: {
      classes: classes.length,
      attendanceMarks: await prisma.attendanceRecord.count({ where: { markedBy: req.user!.id } }),
      resultsEntry: await prisma.studentExamResult.count({ where: { createdAt: { gte: resultCutoff } } }),
    },
  });
}));

router.get('/teacher/classes', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const context = await buildPortalContext(req.user!.id);
  const employee = context.teacherAccount?.employee;
  if (!employee) throw new AppError(404, 'Teacher portal account not found', 'NOT_FOUND');
  const classes = await prisma.classRoom.findMany({ where: { madrassaId: context.madrassa.id, teacherName: { contains: `${employee.firstName} ${employee.lastName}` } } });
  res.json({ classes });
}));

router.get('/teacher/students', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const context = await buildPortalContext(req.user!.id);
  const students = await prisma.student.findMany({ where: { madrassaId: context.madrassa.id, isDeleted: false } });
  res.json({ students });
}));

router.post('/teacher/attendance', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = z.object({ studentId: z.string(), date: z.string(), status: z.string(), remarks: z.string().optional().nullable() }).safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid attendance payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const context = await buildPortalContext(req.user!.id);
  const attendance = await prisma.attendanceRecord.create({
    data: {
      organizationId: context.organization.id,
      madrassaId: context.madrassa.id,
      studentId: parsed.data.studentId,
      date: new Date(parsed.data.date),
      status: parsed.data.status,
      remarks: parsed.data.remarks ?? null,
      markedBy: req.user!.id,
    },
  });
  res.status(201).json({ attendance });
}));

router.post('/teacher/results', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = z.object({ examId: z.string(), studentId: z.string(), subjectId: z.string(), obtainedMarks: z.number().nonnegative(), grade: z.string(), remarks: z.string().optional().nullable() }).safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid result payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const result = await prisma.studentExamResult.create({ data: { examId: parsed.data.examId, studentId: parsed.data.studentId, subjectId: parsed.data.subjectId, obtainedMarks: parsed.data.obtainedMarks, grade: parsed.data.grade, remarks: parsed.data.remarks ?? null } });
  res.status(201).json({ result });
}));

router.get('/teacher/timetable', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const context = await buildPortalContext(req.user!.id);
  const employee = context.teacherAccount?.employee;
  if (!employee) throw new AppError(404, 'Teacher portal account not found', 'NOT_FOUND');
  const timetable = await prisma.timetable.findMany({ where: { madrassaId: context.madrassa.id, teacherName: { contains: `${employee.firstName} ${employee.lastName}` } } });
  res.json({ timetable });
}));

router.get('/teacher/payroll', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const context = await buildPortalContext(req.user!.id);
  const employee = context.teacherAccount?.employee;
  if (!employee) throw new AppError(404, 'Teacher portal account not found', 'NOT_FOUND');
  const payroll = await prisma.payroll.findMany({ where: { employeeId: employee.id } });
  res.json({ payroll });
}));

export default router;
