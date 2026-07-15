import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../lib/errors.js';
import { logActivity } from '../lib/activity.js';

const router = Router();
const accountTypes = z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE']);
const donationTypes = z.enum(['ZAKAT', 'SADAQAH', 'LILLAH', 'GENERAL', 'FITRANA', 'QURBANI', 'SPONSORSHIP']);
const paymentMethods = z.enum(['CASH', 'BANK', 'ONLINE']);

async function getWorkspace(userId: string) {
  const organization = await prisma.organization.findFirst({ where: { ownerId: userId } });
  if (!organization) throw new AppError(404, 'Workspace not found', 'NOT_FOUND');
  const madrassa = await prisma.madrassa.findFirst({ where: { organizationId: organization.id, isDeleted: false } });
  if (!madrassa) throw new AppError(404, 'Madrassa profile required', 'NOT_FOUND');
  return { organization, madrassa };
}

router.use(requireAuth);

router.get('/accounts', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  res.json({ accounts: await prisma.account.findMany({ where: { organizationId: organization.id }, orderBy: { accountCode: 'asc' } }) });
}));
router.post('/accounts', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = z.object({ accountCode: z.string().min(1), accountName: z.string().min(2), accountType: accountTypes, parentAccountId: z.string().optional().nullable(), openingBalance: z.number().optional(), status: z.string().optional() }).safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid account payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { organization } = await getWorkspace(req.user!.id);
  const account = await prisma.account.create({ data: { organizationId: organization.id, accountCode: parsed.data.accountCode, accountName: parsed.data.accountName, accountType: parsed.data.accountType, parentAccountId: parsed.data.parentAccountId ?? null, openingBalance: parsed.data.openingBalance ?? 0, currentBalance: parsed.data.openingBalance ?? 0, status: parsed.data.status ?? 'ACTIVE' } });
  res.status(201).json({ account });
}));

router.get('/transactions', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  res.json({ transactions: await prisma.transaction.findMany({ where: { organizationId: organization.id }, include: { lines: { include: { account: true } } }, orderBy: { transactionDate: 'desc' } }) });
}));
router.post('/transactions', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = z.object({ description: z.string().min(2), transactionDate: z.string(), lines: z.array(z.object({ accountId: z.string(), debit: z.number().nonnegative().default(0), credit: z.number().nonnegative().default(0), remarks: z.string().optional().nullable() })).min(2) }).safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid transaction payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { organization } = await getWorkspace(req.user!.id);
  const debit = parsed.data.lines.reduce((sum: number, line: { debit: number }) => sum + line.debit, 0);
  const credit = parsed.data.lines.reduce((sum: number, line: { credit: number }) => sum + line.credit, 0);
  if (debit !== credit) throw new AppError(400, 'Transaction must balance', 'VALIDATION_ERROR');
  const voucherNumber = `VCH-${Date.now()}`;
  const transaction = await prisma.transaction.create({ data: { organizationId: organization.id, voucherNumber, transactionDate: new Date(parsed.data.transactionDate), description: parsed.data.description, totalAmount: debit, createdBy: req.user!.id } });
  await Promise.all(parsed.data.lines.map((line) => prisma.transactionLine.create({ data: { transactionId: transaction.id, accountId: line.accountId, debit: line.debit, credit: line.credit, remarks: line.remarks ?? null } })));
  await logActivity({ userId: req.user!.id, action: 'finance_transaction_posted', entityType: 'transaction', entityId: transaction.id });
  res.status(201).json({ transaction });
}));

router.get('/expenses', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  res.json({ expenses: await prisma.expense.findMany({ where: { organizationId: organization.id }, include: { category: true }, orderBy: { expenseDate: 'desc' } }) });
}));
router.post('/expenses', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = z.object({ categoryName: z.string().min(2), amount: z.number().positive(), paymentMethod: paymentMethods, paidTo: z.string().min(2), invoiceNumber: z.string().optional().nullable(), expenseDate: z.string(), remarks: z.string().optional().nullable() }).safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid expense payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { organization } = await getWorkspace(req.user!.id);
  const category = await prisma.expenseCategory.upsert({ where: { organizationId_name: { organizationId: organization.id, name: parsed.data.categoryName } }, create: { organizationId: organization.id, name: parsed.data.categoryName }, update: {} });
  const expense = await prisma.expense.create({ data: { organizationId: organization.id, categoryId: category.id, amount: parsed.data.amount, paymentMethod: parsed.data.paymentMethod, paidTo: parsed.data.paidTo, invoiceNumber: parsed.data.invoiceNumber ?? null, expenseDate: new Date(parsed.data.expenseDate), remarks: parsed.data.remarks ?? null } });
  await logActivity({ userId: req.user!.id, action: 'finance_expense_recorded', entityType: 'expense', entityId: expense.id });
  res.status(201).json({ expense });
}));

router.get('/donations', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  res.json({ donations: await prisma.donation.findMany({ where: { organizationId: organization.id }, orderBy: { date: 'desc' } }) });
}));
router.post('/donations', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = z.object({ donorName: z.string().min(2), phone: z.string().optional().nullable(), email: z.string().email().optional().nullable(), donationType: donationTypes, amount: z.number().positive(), paymentMethod: paymentMethods, purpose: z.string().optional().nullable(), date: z.string() }).safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid donation payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { organization } = await getWorkspace(req.user!.id);
  const receiptNumber = `DON-${Date.now()}`;
  const donation = await prisma.donation.create({ data: { organizationId: organization.id, donorName: parsed.data.donorName, phone: parsed.data.phone ?? null, email: parsed.data.email ?? null, donationType: parsed.data.donationType, amount: parsed.data.amount, paymentMethod: parsed.data.paymentMethod, receiptNumber, purpose: parsed.data.purpose ?? null, date: new Date(parsed.data.date) } });
  await logActivity({ userId: req.user!.id, action: 'finance_donation_recorded', entityType: 'donation', entityId: donation.id });
  res.status(201).json({ donation, receiptNumber });
}));

router.get('/reports/cashbook', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const transactions = await prisma.transaction.findMany({ where: { organizationId: organization.id }, include: { lines: { include: { account: true } } }, orderBy: { transactionDate: 'desc' } });
  res.json({ transactions });
}));
router.get('/reports/ledger', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const accounts = await prisma.account.findMany({ where: { organizationId: organization.id } });
  const lines = await prisma.transactionLine.findMany({
    where: { transaction: { organizationId: organization.id } },
    include: { account: true, transaction: true },
  }).catch(() => []);
  res.json({ accounts, lines });
}));
router.get('/reports/trial-balance', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const accounts = await prisma.account.findMany({ where: { organizationId: organization.id }, include: { lines: true } });
  const rows = accounts.map((account: (typeof accounts)[number]) => {
    const debit = account.lines.reduce((sum: number, line: { debit: number }) => sum + line.debit, 0);
    const credit = account.lines.reduce((sum: number, line: { credit: number }) => sum + line.credit, 0);
    return { account, debit, credit };
  });
  res.json({ rows });
}));
router.get('/reports/income', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const incomes = await prisma.account.findMany({ where: { organizationId: organization.id, accountType: 'INCOME' } });
  res.json({ incomes });
}));
router.get('/reports/donations', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const donations = await prisma.donation.findMany({ where: { organizationId: organization.id } });
  res.json({ donations });
}));

export default router;
