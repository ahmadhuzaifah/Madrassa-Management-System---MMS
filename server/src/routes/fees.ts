import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../lib/errors.js';
import { logActivity } from '../lib/activity.js';
import { notifyStudentGuardians } from '../lib/communication-notifications.js';

const router = Router();

const frequencySchema = z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY', 'ONE_TIME']);
const paymentMethodSchema = z.enum(['CASH', 'BANK', 'ONLINE']);

async function getWorkspace(userId: string) {
  const organization = await prisma.organization.findFirst({ where: { ownerId: userId } });
  if (!organization) throw new AppError(404, 'Workspace not found', 'NOT_FOUND');
  const madrassa = await prisma.madrassa.findFirst({ where: { organizationId: organization.id, isDeleted: false } });
  if (!madrassa) throw new AppError(404, 'Madrassa profile required', 'NOT_FOUND');
  return { organization, madrassa };
}

router.use(requireAuth);

router.get('/structures', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { madrassa } = await getWorkspace(req.user!.id);
  const structures = await prisma.feeStructure.findMany({ where: { madrassaId: madrassa.id }, orderBy: { createdAt: 'desc' } });
  res.json({ structures });
}));

router.post('/structures', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = z.object({ name: z.string().min(2), amount: z.number().int().nonnegative(), frequency: frequencySchema, description: z.string().optional().nullable(), branchId: z.string().optional().nullable(), academicYearId: z.string().optional().nullable(), programId: z.string().optional().nullable(), classRoomId: z.string().optional().nullable(), status: z.string().optional() }).safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid fee structure payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { organization, madrassa } = await getWorkspace(req.user!.id);
  const structure = await prisma.feeStructure.create({ data: { organizationId: organization.id, madrassaId: madrassa.id, ...parsed.data, status: parsed.data.status ?? 'ACTIVE' } });
  await logActivity({ userId: req.user!.id, action: 'fee_structure_created', entityType: 'feeStructure', entityId: structure.id });
  res.status(201).json({ structure });
}));

router.patch('/structures/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = z.object({ name: z.string().min(2).optional(), amount: z.number().int().nonnegative().optional(), frequency: frequencySchema.optional(), description: z.string().optional().nullable(), branchId: z.string().optional().nullable(), academicYearId: z.string().optional().nullable(), programId: z.string().optional().nullable(), classRoomId: z.string().optional().nullable(), status: z.string().optional() }).safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid fee structure payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { madrassa } = await getWorkspace(req.user!.id);
  const structure = await prisma.feeStructure.findFirst({ where: { id: req.params.id, madrassaId: madrassa.id } });
  if (!structure) throw new AppError(404, 'Fee structure not found', 'NOT_FOUND');
  const updated = await prisma.feeStructure.update({ where: { id: structure.id }, data: parsed.data });
  res.json({ structure: updated });
}));

router.delete('/structures/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { madrassa } = await getWorkspace(req.user!.id);
  const structure = await prisma.feeStructure.findFirst({ where: { id: req.params.id, madrassaId: madrassa.id } });
  if (!structure) throw new AppError(404, 'Fee structure not found', 'NOT_FOUND');
  await prisma.feeStructure.delete({ where: { id: structure.id } });
  res.json({ message: 'Fee structure deleted' });
}));

router.get('/student/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { madrassa } = await getWorkspace(req.user!.id);
  const student = await prisma.student.findFirst({ where: { id: req.params.id, madrassaId: madrassa.id, isDeleted: false } });
  if (!student) throw new AppError(404, 'Student not found', 'NOT_FOUND');
  const assignments = await prisma.studentFeeAssignment.findMany({ where: { studentId: student.id }, include: { feeStructure: true } });
  const payments = await prisma.feePayment.findMany({ where: { studentId: student.id }, orderBy: { paymentDate: 'desc' } });
  const invoices = await prisma.feeInvoice.findMany({ where: { studentId: student.id }, orderBy: { createdAt: 'desc' } });
  const discounts = await prisma.discount.findMany({ where: { studentId: student.id } });
  const totalAssigned = assignments.reduce((sum: number, item: { finalAmount: number }) => sum + item.finalAmount, 0);
  const paidAmount = payments.reduce((sum: number, item: { amount: number }) => sum + item.amount, 0);
  res.json({ student, assignments, payments, invoices, discounts, summary: { totalAssigned, paidAmount, outstanding: Math.max(totalAssigned - paidAmount, 0) } });
}));

router.post('/student/:id/assign', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = z.object({ feeStructureId: z.string(), amount: z.number().int().nonnegative().optional(), discountAmount: z.number().int().nonnegative().optional(), startDate: z.string(), endDate: z.string().optional().nullable() }).safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid fee assignment payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { madrassa } = await getWorkspace(req.user!.id);
  const student = await prisma.student.findFirst({ where: { id: req.params.id, madrassaId: madrassa.id, isDeleted: false } });
  if (!student) throw new AppError(404, 'Student not found', 'NOT_FOUND');
  const structure = await prisma.feeStructure.findFirst({ where: { id: parsed.data.feeStructureId, madrassaId: madrassa.id } });
  if (!structure) throw new AppError(404, 'Fee structure not found', 'NOT_FOUND');
  const amount = parsed.data.amount ?? structure.amount;
  const discountAmount = parsed.data.discountAmount ?? 0;
  const assignment = await prisma.studentFeeAssignment.create({ data: { studentId: student.id, feeStructureId: structure.id, amount, discountAmount, finalAmount: Math.max(amount - discountAmount, 0), startDate: new Date(parsed.data.startDate), endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null } });
  res.status(201).json({ assignment });
}));

router.post('/payments', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = z.object({ studentId: z.string(), amount: z.number().int().positive(), paymentDate: z.string().optional(), paymentMethod: paymentMethodSchema, referenceNumber: z.string().optional().nullable(), remarks: z.string().optional().nullable() }).safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid payment payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { organization, madrassa } = await getWorkspace(req.user!.id);
  const student = await prisma.student.findFirst({ where: { id: parsed.data.studentId, madrassaId: madrassa.id, isDeleted: false } });
  if (!student) throw new AppError(404, 'Student not found', 'NOT_FOUND');
  const receiptNumber = `RCPT-${Date.now()}`;
  const payment = await prisma.feePayment.create({ data: { organizationId: organization.id, madrassaId: madrassa.id, studentId: student.id, amount: parsed.data.amount, paymentDate: parsed.data.paymentDate ? new Date(parsed.data.paymentDate) : new Date(), paymentMethod: parsed.data.paymentMethod, referenceNumber: parsed.data.referenceNumber ?? null, remarks: parsed.data.remarks ?? null, receivedBy: req.user!.id, receiptNumber } });
  const assignments = await prisma.studentFeeAssignment.findMany({ where: { studentId: student.id } });
  const totalAssigned = assignments.reduce((sum: number, item: { finalAmount: number }) => sum + item.finalAmount, 0);
  const paidAmount = await prisma.feePayment.aggregate({ where: { studentId: student.id }, _sum: { amount: true } });
  const paid = paidAmount._sum.amount ?? 0;
  const due = Math.max(totalAssigned - paid, 0);
  const status = due === 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID';
  const invoice = await prisma.feeInvoice.create({ data: { organizationId: organization.id, madrassaId: madrassa.id, studentId: student.id, invoiceNumber: receiptNumber.replace('RCPT', 'INV'), amount: due, dueDate: new Date(), status } });
  await logActivity({ userId: req.user!.id, action: 'fee_payment_received', entityType: 'feePayment', entityId: payment.id });
  if (due > 0) {
    await notifyStudentGuardians({
      organizationId: organization.id,
      studentId: student.id,
      title: 'Fee reminder',
      content: `Outstanding fee balance is ${due}.`,
      channel: 'IN_APP',
    });
  }
  res.status(201).json({ payment, receipt: { receiptNumber, invoiceNumber: invoice.invoiceNumber } });
}));

router.get('/payments', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { madrassa } = await getWorkspace(req.user!.id);
  const payments = await prisma.feePayment.findMany({ where: { madrassaId: madrassa.id }, include: { student: true }, orderBy: { paymentDate: 'desc' } });
  res.json({ payments });
}));

router.get('/invoices', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { madrassa } = await getWorkspace(req.user!.id);
  const invoices = await prisma.feeInvoice.findMany({ where: { madrassaId: madrassa.id }, include: { student: true }, orderBy: { createdAt: 'desc' } });
  res.json({ invoices });
}));

router.get('/invoices/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { madrassa } = await getWorkspace(req.user!.id);
  const invoice = await prisma.feeInvoice.findFirst({ where: { id: req.params.id, madrassaId: madrassa.id }, include: { student: true } });
  if (!invoice) throw new AppError(404, 'Invoice not found', 'NOT_FOUND');
  res.json({ invoice });
}));

router.get('/reports/collection', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { madrassa } = await getWorkspace(req.user!.id);
  const payments = await prisma.feePayment.findMany({ where: { madrassaId: madrassa.id }, include: { student: true } });
  const totalCollected = payments.reduce((sum: number, payment: { amount: number }) => sum + payment.amount, 0);
  res.json({ totalCollected, payments });
}));

router.get('/reports/outstanding', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { madrassa } = await getWorkspace(req.user!.id);
  const students = await prisma.student.findMany({ where: { madrassaId: madrassa.id, isDeleted: false } });
  const rows = await Promise.all(students.map(async (student: { id: string; fullName: string }) => {
    const assignments = await prisma.studentFeeAssignment.findMany({ where: { studentId: student.id } });
    const payments = await prisma.feePayment.aggregate({ where: { studentId: student.id }, _sum: { amount: true } });
    const due = Math.max(assignments.reduce((sum: number, item: { finalAmount: number }) => sum + item.finalAmount, 0) - (payments._sum.amount ?? 0), 0);
    return { student, due };
  }));
  res.json({ rows });
}));

export default router;
