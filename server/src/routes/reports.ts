import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../lib/errors.js';

const router = Router();

async function getWorkspace(userId: string) {
  const organization = await prisma.organization.findFirst({ where: { ownerId: userId } });
  if (!organization) throw new AppError(404, 'Workspace not found', 'NOT_FOUND');
  const madrassa = await prisma.madrassa.findFirst({ where: { organizationId: organization.id, isDeleted: false } });
  if (!madrassa) throw new AppError(404, 'Madrassa profile required', 'NOT_FOUND');
  return { organization, madrassa };
}

function monthStart() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

router.get('/overview', requireAuth, requireRole(['ADMIN']), asyncHandler(async (_req, res) => {
  const [users, subscriptions, invoices, logs] = await Promise.all([
    prisma.user.count(),
    prisma.subscription.count(),
    prisma.invoice.count(),
    prisma.activityLog.count(),
  ]);

  res.json({ overview: { users, subscriptions, invoices, activityLogs: logs } });
}));

router.get('/dashboard', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { madrassa } = await getWorkspace(req.user!.id);
  const [students, attendance, feeDue, feePaid, donations, employees, books, issuedBooks, inventoryItems, assets, certificates, messages] = await Promise.all([
    prisma.student.count({ where: { madrassaId: madrassa.id, isDeleted: false } }),
    prisma.attendanceRecord.count({ where: { madrassaId: madrassa.id } }),
    prisma.feeInvoice.aggregate({ where: { student: { madrassaId: madrassa.id }, status: { not: 'PAID' } }, _sum: { amount: true } }),
    prisma.feePayment.aggregate({ where: { student: { madrassaId: madrassa.id } }, _sum: { amount: true } }),
    prisma.donation.aggregate({ where: { organizationId: madrassa.organizationId, date: { gte: monthStart() } }, _sum: { amount: true } }),
    prisma.employee.count({ where: { organizationId: madrassa.organizationId } }),
    prisma.book.count({ where: { organizationId: madrassa.organizationId } }),
    prisma.bookIssue.count({ where: { member: { organizationId: madrassa.organizationId } } }),
    prisma.inventoryItem.count({ where: { organizationId: madrassa.organizationId } }),
    prisma.asset.count({ where: { organizationId: madrassa.organizationId } }),
    prisma.certificate.count({ where: { organizationId: madrassa.organizationId } }),
    prisma.messageLog.count({ where: { organizationId: madrassa.organizationId } }),
  ]);

  res.json({
    dashboard: {
      students,
      attendance,
      outstandingFees: feeDue._sum.amount ?? 0,
      feeCollections: feePaid._sum.amount ?? 0,
      donations: donations._sum.amount ?? 0,
      employees,
      books,
      issuedBooks,
      inventoryItems,
      assets,
      certificates,
      messages,
    },
  });
}));

router.get('/students/overview', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { madrassa } = await getWorkspace(req.user!.id);
  const [total, active, suspended, graduates, left, years, branches] = await Promise.all([
    prisma.student.count({ where: { madrassaId: madrassa.id, isDeleted: false } }),
    prisma.student.count({ where: { madrassaId: madrassa.id, status: 'ACTIVE', isDeleted: false } }),
    prisma.student.count({ where: { madrassaId: madrassa.id, status: 'SUSPENDED', isDeleted: false } }),
    prisma.student.count({ where: { madrassaId: madrassa.id, status: 'GRADUATED', isDeleted: false } }),
    prisma.student.count({ where: { madrassaId: madrassa.id, status: 'LEFT', isDeleted: false } }),
    prisma.academicYear.findMany({ where: { madrassaId: madrassa.id, isDeleted: false }, orderBy: { startDate: 'desc' } }),
    prisma.branch.count({ where: { madrassaId: madrassa.id, isDeleted: false } }),
  ]);
  res.json({ overview: { total, active, suspended, graduates, left, academicYears: years, branches } });
}));

router.get('/students/admissions', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { madrassa } = await getWorkspace(req.user!.id);
  const admissions = await prisma.student.groupBy({
    by: ['admissionDate'],
    where: { madrassaId: madrassa.id, isDeleted: false },
    _count: { id: true },
  }).catch(() => []);
  res.json({ admissions });
}));

router.get('/students/distribution', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { madrassa } = await getWorkspace(req.user!.id);
  const byStatus = await prisma.student.groupBy({ by: ['status'], where: { madrassaId: madrassa.id, isDeleted: false }, _count: { id: true } });
  const byGender = await prisma.student.groupBy({ by: ['gender'], where: { madrassaId: madrassa.id, isDeleted: false }, _count: { id: true } }).catch(() => []);
  res.json({ byStatus, byGender });
}));

router.get('/attendance/summary', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { madrassa } = await getWorkspace(req.user!.id);
  const [present, absent, late, leave, total] = await Promise.all([
    prisma.attendanceRecord.count({ where: { madrassaId: madrassa.id, status: 'PRESENT' } }),
    prisma.attendanceRecord.count({ where: { madrassaId: madrassa.id, status: 'ABSENT' } }),
    prisma.attendanceRecord.count({ where: { madrassaId: madrassa.id, status: 'LATE' } }),
    prisma.attendanceRecord.count({ where: { madrassaId: madrassa.id, status: 'LEAVE' } }),
    prisma.attendanceRecord.count({ where: { madrassaId: madrassa.id } }),
  ]);
  res.json({ summary: { present, absent, late, leave, total, percentage: total ? Math.round((present / total) * 100) : 0 } });
}));

router.get('/attendance/class', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { madrassa } = await getWorkspace(req.user!.id);
  const rows = await prisma.attendanceRecord.groupBy({ by: ['classRoomId'], where: { madrassaId: madrassa.id }, _count: { id: true } });
  res.json({ rows });
}));

router.get('/attendance/students', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { madrassa } = await getWorkspace(req.user!.id);
  const rows = await prisma.attendanceRecord.groupBy({ by: ['studentId'], where: { madrassaId: madrassa.id }, _count: { id: true } });
  res.json({ rows });
}));

router.get('/finance/summary', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { madrassa } = await getWorkspace(req.user!.id);
  const [fees, feesDue, income, expenses, donations] = await Promise.all([
    prisma.feePayment.aggregate({ where: { student: { madrassaId: madrassa.id } }, _sum: { amount: true } }),
    prisma.feeInvoice.aggregate({ where: { student: { madrassaId: madrassa.id }, status: { not: 'PAID' } }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { organizationId: madrassa.organizationId }, _sum: { totalAmount: true } }),
    prisma.expense.aggregate({ where: { organizationId: madrassa.organizationId }, _sum: { amount: true } }),
    prisma.donation.aggregate({ where: { organizationId: madrassa.organizationId }, _sum: { amount: true } }),
  ]);
  res.json({ summary: { fees: fees._sum.amount ?? 0, feesDue: feesDue._sum.amount ?? 0, income: income._sum.totalAmount ?? 0, expenses: expenses._sum.amount ?? 0, donations: donations._sum.amount ?? 0 } });
}));

router.get('/finance/fees', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { madrassa } = await getWorkspace(req.user!.id);
  const invoices = await prisma.feeInvoice.findMany({ where: { student: { madrassaId: madrassa.id } } });
  res.json({ invoices });
}));

router.get('/finance/expenses', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { madrassa } = await getWorkspace(req.user!.id);
  const expenses = await prisma.expense.findMany({ where: { organizationId: madrassa.organizationId } });
  res.json({ expenses });
}));

router.get('/finance/donations', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { madrassa } = await getWorkspace(req.user!.id);
  const donations = await prisma.donation.findMany({ where: { organizationId: madrassa.organizationId } });
  res.json({ donations });
}));

router.get('/academic/results', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { madrassa } = await getWorkspace(req.user!.id);
  const results = await prisma.resultCard.findMany({ where: { student: { madrassaId: madrassa.id } }, include: { student: true, exam: true } });
  res.json({ results });
}));

router.get('/academic/performance', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { madrassa } = await getWorkspace(req.user!.id);
  const total = await prisma.resultCard.count({ where: { student: { madrassaId: madrassa.id } } });
  const avg = await prisma.resultCard.aggregate({ where: { student: { madrassaId: madrassa.id } }, _avg: { percentage: true } });
  res.json({ performance: { total, averagePercentage: avg._avg.percentage ?? 0 } });
}));

router.get('/hr/overview', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const [employees, departments, attendance, leaves] = await Promise.all([
    prisma.employee.count({ where: { organizationId: organization.id } }),
    prisma.hrDepartment.count({ where: { organizationId: organization.id } }),
    prisma.employeeAttendance.count({ where: { employee: { organizationId: organization.id } } }),
    prisma.hrLeaveRequest.count({ where: { organizationId: organization.id } }),
  ]);
  res.json({ overview: { employees, departments, attendance, leaves } });
}));

router.get('/hr/payroll', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const payroll = await prisma.payroll.findMany({ where: { organizationId: organization.id }, include: { employee: true } });
  res.json({ payroll });
}));

router.get('/inventory/assets', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const assets = await prisma.asset.findMany({ where: { organizationId: organization.id } });
  res.json({ assets });
}));

router.get('/inventory/stock', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const items = await prisma.inventoryItem.findMany({ where: { organizationId: organization.id } });
  res.json({ items });
}));

router.get('/library/overview', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const [books, issuedBooks, overdueBooks, fines] = await Promise.all([
    prisma.book.count({ where: { organizationId: organization.id } }),
    prisma.bookIssue.count({ where: { member: { organizationId: organization.id } } }),
    prisma.bookIssue.count({ where: { member: { organizationId: organization.id }, status: 'OVERDUE' } }),
    prisma.libraryFine.aggregate({ where: { issue: { member: { organizationId: organization.id } } }, _sum: { amount: true } }),
  ]);
  res.json({ overview: { books, issuedBooks, overdueBooks, fineCollection: fines._sum.amount ?? 0 } });
}));

router.get('/export', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const exportRecord = {
    id: `exp-${Date.now()}`,
    organizationId: organization.id,
    requestedBy: req.user!.id,
    reportType: String(req.query.type ?? 'overview'),
    format: String(req.query.format ?? 'csv'),
    status: 'COMPLETED',
    filePath: `/exports/${Date.now()}.${String(req.query.format ?? 'csv')}`,
    createdAt: new Date(),
  };
  res.json({ export: exportRecord });
}));

export default router;
