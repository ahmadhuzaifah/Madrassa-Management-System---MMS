import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../lib/errors.js';
import { logActivity } from '../lib/activity.js';
import { notifyStudentGuardians } from '../lib/communication-notifications.js';

const router = Router();

const attendanceStatus = z.enum(['PRESENT', 'ABSENT', 'LATE', 'LEAVE']);

const attendanceSchema = z.object({
  branchId: z.string().optional().nullable(),
  academicYearId: z.string().optional().nullable(),
  classRoomId: z.string().optional().nullable(),
  sectionId: z.string().optional().nullable(),
  date: z.string(),
  records: z.array(z.object({
    studentId: z.string(),
    status: attendanceStatus,
    remarks: z.string().optional().nullable(),
  })).min(1),
});

const leaveSchema = z.object({
  studentId: z.string(),
  dateFrom: z.string(),
  dateTo: z.string(),
  reason: z.string().min(2),
});

async function getWorkspace(userId: string) {
  const organization = await prisma.organization.findFirst({ where: { ownerId: userId } });
  if (!organization) throw new AppError(404, 'Workspace not found', 'NOT_FOUND');
  const madrassa = await prisma.madrassa.findFirst({ where: { organizationId: organization.id, isDeleted: false } });
  if (!madrassa) throw new AppError(404, 'Madrassa profile required', 'NOT_FOUND');
  return { organization, madrassa };
}

router.use(requireAuth);

router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { madrassa } = await getWorkspace(req.user!.id);
  const parsed = z.object({
    date: z.string().optional(),
    branchId: z.string().optional(),
    classRoomId: z.string().optional(),
    sectionId: z.string().optional(),
  }).safeParse(req.query);
  if (!parsed.success) throw new AppError(400, 'Invalid query parameters', 'VALIDATION_ERROR', parsed.error.flatten());
  const where: any = { madrassaId: madrassa.id };
  if (parsed.data.date) where.date = new Date(parsed.data.date);
  if (parsed.data.branchId) where.branchId = parsed.data.branchId;
  if (parsed.data.classRoomId) where.classRoomId = parsed.data.classRoomId;
  if (parsed.data.sectionId) where.sectionId = parsed.data.sectionId;
  const records = await prisma.attendanceRecord.findMany({ where, include: { student: true }, orderBy: { date: 'desc' } });
  res.json({ records });
}));

router.post('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = attendanceSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid attendance payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { organization, madrassa } = await getWorkspace(req.user!.id);
  const date = new Date(parsed.data.date);
  const records = await prisma.$transaction(async (tx: any) => Promise.all(parsed.data.records.map(async (record) => {
    const student = await tx.student.findFirst({ where: { id: record.studentId, madrassaId: madrassa.id, isDeleted: false } });
    if (!student) throw new AppError(404, 'Student not found', 'NOT_FOUND');
    const existing = await tx.attendanceRecord.findUnique({ where: { studentId_date: { studentId: record.studentId, date } } }).catch(() => null);
    if (existing) throw new AppError(409, 'Attendance already exists for this student and date', 'CONFLICT');
    const attendance = await tx.attendanceRecord.create({ data: { organizationId: organization.id, madrassaId: madrassa.id, branchId: parsed.data.branchId ?? student.branchId, academicYearId: parsed.data.academicYearId ?? student.academicYearId, classRoomId: parsed.data.classRoomId ?? student.classRoomId, sectionId: parsed.data.sectionId ?? student.sectionId, studentId: record.studentId, date, status: record.status, remarks: record.remarks ?? null, markedBy: req.user!.id } });
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const monthlyRecords = await tx.attendanceRecord.findMany({ where: { studentId: record.studentId, date: { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) } } });
    const totalDays = monthlyRecords.length;
    const presentDays = monthlyRecords.filter((item: { status: string }) => item.status === 'PRESENT').length;
    const absentDays = monthlyRecords.filter((item: { status: string }) => item.status === 'ABSENT').length;
    const lateDays = monthlyRecords.filter((item: { status: string }) => item.status === 'LATE').length;
    const leaveDays = monthlyRecords.filter((item: { status: string }) => item.status === 'LEAVE').length;
    await tx.attendanceSummary.upsert({
      where: { studentId_month_year: { studentId: record.studentId, month, year } },
      create: {
        organizationId: organization.id,
        madrassaId: madrassa.id,
        studentId: record.studentId,
        month,
        year,
        totalDays,
        presentDays,
        absentDays,
        lateDays,
        leaveDays,
        percentage: totalDays ? (presentDays / totalDays) * 100 : 0,
      },
      update: {
        totalDays,
        presentDays,
        absentDays,
        lateDays,
        leaveDays,
        percentage: totalDays ? (presentDays / totalDays) * 100 : 0,
      },
    });
    return attendance;
  })));
  await logActivity({ userId: req.user!.id, action: 'attendance_marked', entityType: 'attendance', entityId: records[0]?.id });
  await Promise.all(records.filter((record: { status: string; studentId: string }) => record.status === 'ABSENT').map((record: { studentId: string }) =>
    notifyStudentGuardians({
      organizationId: organization.id,
      studentId: record.studentId,
      title: 'Attendance update',
      content: 'A student was marked absent today.',
      channel: 'IN_APP',
    }),
  ));
  res.status(201).json({ records });
}));

router.patch('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = z.object({ status: attendanceStatus.optional(), remarks: z.string().optional().nullable() }).safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid attendance payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { madrassa } = await getWorkspace(req.user!.id);
  const record = await prisma.attendanceRecord.findFirst({ where: { id: req.params.id, madrassaId: madrassa.id } });
  if (!record) throw new AppError(404, 'Attendance record not found', 'NOT_FOUND');
  const updated = await prisma.attendanceRecord.update({ where: { id: record.id }, data: { ...(parsed.data.status ? { status: parsed.data.status } : {}), ...(parsed.data.remarks !== undefined ? { remarks: parsed.data.remarks ?? null } : {}) } });
  await logActivity({ userId: req.user!.id, action: 'attendance_updated', entityType: 'attendance', entityId: updated.id });
  res.json({ record: updated });
}));

router.get('/reports/daily', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { madrassa } = await getWorkspace(req.user!.id);
  const parsed = z.object({ date: z.string(), branchId: z.string().optional(), classRoomId: z.string().optional(), sectionId: z.string().optional() }).safeParse(req.query);
  if (!parsed.success) throw new AppError(400, 'Invalid query parameters', 'VALIDATION_ERROR', parsed.error.flatten());
  const where: any = { madrassaId: madrassa.id, date: new Date(parsed.data.date) };
  if (parsed.data.branchId) where.branchId = parsed.data.branchId;
  if (parsed.data.classRoomId) where.classRoomId = parsed.data.classRoomId;
  if (parsed.data.sectionId) where.sectionId = parsed.data.sectionId;
  const records = await prisma.attendanceRecord.findMany({ where, include: { student: true } });
  res.json({
    records,
    summary: {
      present: records.filter((r: { status: string }) => r.status === 'PRESENT').length,
      absent: records.filter((r: { status: string }) => r.status === 'ABSENT').length,
      late: records.filter((r: { status: string }) => r.status === 'LATE').length,
      leave: records.filter((r: { status: string }) => r.status === 'LEAVE').length,
      percentage: records.length ? (records.filter((r: { status: string }) => r.status === 'PRESENT').length / records.length) * 100 : 0,
    },
  });
}));

router.get('/reports/monthly', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { madrassa } = await getWorkspace(req.user!.id);
  const parsed = z.object({ month: z.string(), year: z.string(), classRoomId: z.string().optional() }).safeParse(req.query);
  if (!parsed.success) throw new AppError(400, 'Invalid query parameters', 'VALIDATION_ERROR', parsed.error.flatten());
  const month = Number(parsed.data.month);
  const year = Number(parsed.data.year);
  const where: any = { madrassaId: madrassa.id, date: { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) } };
  if (parsed.data.classRoomId) where.classRoomId = parsed.data.classRoomId;
  const records = await prisma.attendanceRecord.findMany({ where, include: { student: true } });
  res.json({ records });
}));

router.get('/student/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { madrassa } = await getWorkspace(req.user!.id);
  const student = await prisma.student.findFirst({ where: { id: req.params.id, madrassaId: madrassa.id, isDeleted: false } });
  if (!student) throw new AppError(404, 'Student not found', 'NOT_FOUND');
  const records = await prisma.attendanceRecord.findMany({ where: { studentId: student.id }, orderBy: { date: 'desc' } });
  const total = records.length;
  const present = records.filter((r: { status: string }) => r.status === 'PRESENT').length;
  const absent = records.filter((r: { status: string }) => r.status === 'ABSENT').length;
  const late = records.filter((r: { status: string }) => r.status === 'LATE').length;
  const leave = records.filter((r: { status: string }) => r.status === 'LEAVE').length;
  const summary = await prisma.attendanceSummary.findFirst({ where: { studentId: student.id }, orderBy: [{ year: 'desc' }, { month: 'desc' }] });
  res.json({ records, summary: summary ?? { totalDays: total, presentDays: present, absentDays: absent, lateDays: late, leaveDays: leave, percentage: total ? (present / total) * 100 : 0 } });
}));

router.post('/leaves', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = leaveSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid leave payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { organization, madrassa } = await getWorkspace(req.user!.id);
  const student = await prisma.student.findFirst({ where: { id: parsed.data.studentId, madrassaId: madrassa.id, isDeleted: false } });
  if (!student) throw new AppError(404, 'Student not found', 'NOT_FOUND');
  const leave = await prisma.leaveRequest.create({ data: { organizationId: organization.id, madrassaId: madrassa.id, studentId: student.id, dateFrom: new Date(parsed.data.dateFrom), dateTo: new Date(parsed.data.dateTo), reason: parsed.data.reason } });
  res.status(201).json({ leave });
}));

router.get('/leaves', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { madrassa } = await getWorkspace(req.user!.id);
  const leaves = await prisma.leaveRequest.findMany({ where: { madrassaId: madrassa.id }, include: { student: true }, orderBy: { createdAt: 'desc' } }).catch(() => []);
  res.json({ leaves });
}));

export default router;
