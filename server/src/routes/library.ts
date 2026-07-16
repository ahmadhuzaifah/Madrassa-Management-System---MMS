import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../lib/errors.js';
import { logActivity } from '../lib/activity.js';

const router = Router();

async function getWorkspace(userId: string) {
  const organization = await prisma.organization.findFirst({ where: { ownerId: userId } });
  if (!organization) throw new AppError(404, 'Workspace not found', 'NOT_FOUND');
  const madrassa = await prisma.madrassa.findFirst({ where: { organizationId: organization.id, isDeleted: false } });
  if (!madrassa) throw new AppError(404, 'Madrassa profile required', 'NOT_FOUND');
  return { organization, madrassa };
}

const categorySchema = z.object({ name: z.string().min(2), description: z.string().optional().nullable() });
const bookSchema = z.object({
  isbn: z.string().min(3),
  title: z.string().min(2),
  categoryId: z.string(),
  authorId: z.string().optional().nullable(),
  publisherId: z.string().optional().nullable(),
  language: z.string().optional().nullable(),
  edition: z.string().optional().nullable(),
  publishYear: z.number().int().optional().nullable(),
  description: z.string().optional().nullable(),
  totalCopies: z.number().int().nonnegative().default(0),
  availableCopies: z.number().int().nonnegative().default(0),
});
const copySchema = z.object({ condition: z.string().default('GOOD'), location: z.string().optional().nullable() });
const issueSchema = z.object({
  memberId: z.string().optional(),
  studentId: z.string().optional(),
  employeeId: z.string().optional(),
  bookCopyId: z.string(),
  issueDate: z.string(),
  dueDate: z.string().optional(),
  issuedBy: z.string().optional().nullable(),
  returnedTo: z.string().optional().nullable(),
});
const returnSchema = z.object({ returnedTo: z.string().optional().nullable(), fineAmount: z.number().nonnegative().optional(), cashAccountId: z.string().optional().nullable(), fineIncomeAccountId: z.string().optional().nullable() });

router.use(requireAuth);

async function getOrg(userId: string) {
  const { organization } = await getWorkspace(userId);
  return organization;
}

async function memberNumber(organizationId: string) {
  const count = await prisma.libraryMember.count({ where: { organizationId } });
  return `LIB-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
}

async function bookCode(organizationId: string) {
  const count = await prisma.book.count({ where: { organizationId } });
  return `LIB-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
}

async function ensureMemberFromRef(organizationId: string, ref: { studentId?: string; employeeId?: string }) {
  if (ref.studentId) {
    const existing = await prisma.libraryMember.findFirst({ where: { studentId: ref.studentId, organizationId } });
    if (existing) return existing;
    return prisma.libraryMember.create({ data: { organizationId, studentId: ref.studentId, memberNumber: await memberNumber(organizationId) } });
  }
  if (ref.employeeId) {
    const existing = await prisma.libraryMember.findFirst({ where: { employeeId: ref.employeeId, organizationId } });
    if (existing) return existing;
    return prisma.libraryMember.create({ data: { organizationId, employeeId: ref.employeeId, memberNumber: await memberNumber(organizationId) } });
  }
  throw new AppError(400, 'Member reference required', 'VALIDATION_ERROR');
}

router.get('/categories', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const organization = await getOrg(req.user!.id);
  const categories = await prisma.bookCategory.findMany({ where: { organizationId: organization.id }, orderBy: { name: 'asc' } });
  res.json({ categories });
}));

router.post('/categories', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid category payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const organization = await getOrg(req.user!.id);
  const category = await prisma.bookCategory.create({ data: { organizationId: organization.id, ...parsed.data } });
  res.status(201).json({ category });
}));

router.patch('/categories/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = categorySchema.partial().safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid category payload', 'VALIDATION_ERROR', parsed.error.flatten());
  await getOrg(req.user!.id);
  const category = await prisma.bookCategory.update({ where: { id: req.params.id }, data: parsed.data });
  res.json({ category });
}));

router.delete('/categories/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  await getOrg(req.user!.id);
  await prisma.bookCategory.delete({ where: { id: req.params.id } });
  res.json({ message: 'Category deleted' });
}));

router.get('/books', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const organization = await getOrg(req.user!.id);
  const books = await prisma.book.findMany({ where: { organizationId: organization.id }, include: { category: true, author: true, publisher: true, copies: true }, orderBy: { createdAt: 'desc' } });
  res.json({ books });
}));

router.post('/books', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = bookSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid book payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const organization = await getOrg(req.user!.id);
  const category = await prisma.bookCategory.findFirst({ where: { id: parsed.data.categoryId, organizationId: organization.id } });
  if (!category) throw new AppError(404, 'Category not found', 'NOT_FOUND');
  const code = await bookCode(organization.id);
  const book = await prisma.book.create({
    data: {
      organizationId: organization.id,
      bookCode: code,
      isbn: parsed.data.isbn,
      title: parsed.data.title,
      categoryId: category.id,
      authorId: parsed.data.authorId ?? null,
      publisherId: parsed.data.publisherId ?? null,
      language: parsed.data.language ?? null,
      edition: parsed.data.edition ?? null,
      publishYear: parsed.data.publishYear ?? null,
      description: parsed.data.description ?? null,
      totalCopies: parsed.data.totalCopies,
      availableCopies: parsed.data.availableCopies,
    },
  });
  await logActivity({ userId: req.user!.id, action: 'library_book_created', entityType: 'book', entityId: book.id });
  res.status(201).json({ book });
}));

router.get('/books/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const organization = await getOrg(req.user!.id);
  const book = await prisma.book.findFirst({ where: { id: req.params.id, organizationId: organization.id }, include: { category: true, author: true, publisher: true, copies: { include: { issues: true } } } });
  if (!book) throw new AppError(404, 'Book not found', 'NOT_FOUND');
  res.json({ book });
}));

router.patch('/books/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = bookSchema.partial().safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid book payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const organization = await getOrg(req.user!.id);
  const book = await prisma.book.findFirst({ where: { id: req.params.id, organizationId: organization.id } });
  if (!book) throw new AppError(404, 'Book not found', 'NOT_FOUND');
  const updated = await prisma.book.update({ where: { id: book.id }, data: { ...parsed.data, publishYear: parsed.data.publishYear ?? undefined } });
  res.json({ book: updated });
}));

router.delete('/books/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const organization = await getOrg(req.user!.id);
  const book = await prisma.book.findFirst({ where: { id: req.params.id, organizationId: organization.id } });
  if (!book) throw new AppError(404, 'Book not found', 'NOT_FOUND');
  await prisma.book.delete({ where: { id: book.id } });
  res.json({ message: 'Book deleted' });
}));

router.post('/books/:id/copies', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = copySchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid copy payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const organization = await getOrg(req.user!.id);
  const book = await prisma.book.findFirst({ where: { id: req.params.id, organizationId: organization.id } });
  if (!book) throw new AppError(404, 'Book not found', 'NOT_FOUND');
  const count = await prisma.bookCopy.count({ where: { bookId: book.id } });
  const copy = await prisma.bookCopy.create({
    data: {
      bookId: book.id,
      barcode: `${book.bookCode}-BC-${String(count + 1).padStart(3, '0')}`,
      accessionNumber: `${book.bookCode}-AC-${String(count + 1).padStart(3, '0')}`,
      condition: parsed.data.condition,
      location: parsed.data.location ?? null,
    },
  });
  await prisma.book.update({ where: { id: book.id }, data: { totalCopies: { increment: 1 }, availableCopies: { increment: 1 } } });
  res.status(201).json({ copy });
}));

router.get('/members', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const organization = await getOrg(req.user!.id);
  const students = await prisma.student.findMany({ where: { madrassa: { organizationId: organization.id } }, select: { id: true } });
  const employees = await prisma.employee.findMany({ where: { organizationId: organization.id }, select: { id: true } });
  for (const student of students) await ensureMemberFromRef(organization.id, { studentId: student.id });
  for (const employee of employees) await ensureMemberFromRef(organization.id, { employeeId: employee.id });
  const members = await prisma.libraryMember.findMany({ where: { organizationId: organization.id }, include: { student: true, employee: true }, orderBy: { createdAt: 'desc' } });
  res.json({ members });
}));

router.get('/issues', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const organization = await getOrg(req.user!.id);
  const issues = await prisma.bookIssue.findMany({ where: { member: { organizationId: organization.id } }, include: { bookCopy: { include: { book: true } }, member: { include: { student: true, employee: true } }, fine: true }, orderBy: { issueDate: 'desc' } });
  res.json({ issues });
}));

router.post('/issues', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = issueSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid issue payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const organization = await getOrg(req.user!.id);
  const bookCopy = await prisma.bookCopy.findUnique({ where: { id: parsed.data.bookCopyId }, include: { book: true } });
  if (!bookCopy || bookCopy.book.organizationId !== organization.id) throw new AppError(404, 'Book copy not found', 'NOT_FOUND');
  if (bookCopy.status !== 'AVAILABLE') throw new AppError(409, 'Book copy not available', 'CONFLICT');
  const member = parsed.data.memberId
    ? await prisma.libraryMember.findFirst({ where: { id: parsed.data.memberId, organizationId: organization.id } })
    : await ensureMemberFromRef(organization.id, { studentId: parsed.data.studentId, employeeId: parsed.data.employeeId });
  if (!member) throw new AppError(404, 'Member not found', 'NOT_FOUND');
  const issueDate = new Date(parsed.data.issueDate);
  const dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : new Date(issueDate.getTime() + 14 * 24 * 60 * 60 * 1000);
  const issue = await prisma.bookIssue.create({
    data: {
      bookCopyId: bookCopy.id,
      memberId: member.id,
      issueDate,
      dueDate,
      issuedBy: parsed.data.issuedBy ?? req.user!.id,
      returnedTo: parsed.data.returnedTo ?? null,
      status: 'ISSUED',
    },
  });
  await prisma.bookCopy.update({ where: { id: bookCopy.id }, data: { status: 'ISSUED' } });
  await prisma.book.update({ where: { id: bookCopy.bookId }, data: { availableCopies: { decrement: 1 } } });
  await logActivity({ userId: req.user!.id, action: 'library_book_issued', entityType: 'bookIssue', entityId: issue.id });
  res.status(201).json({ issue });
}));

router.post('/issues/:id/return', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = returnSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid return payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const organization = await getOrg(req.user!.id);
  const issue = await prisma.bookIssue.findFirst({ where: { id: req.params.id, member: { organizationId: organization.id } }, include: { bookCopy: { include: { book: true } } } });
  if (!issue) throw new AppError(404, 'Issue not found', 'NOT_FOUND');
  if (issue.status === 'RETURNED') throw new AppError(409, 'Book already returned', 'CONFLICT');
  const now = new Date();
  const overdueDays = Math.max(0, Math.ceil((now.getTime() - issue.dueDate.getTime()) / (24 * 60 * 60 * 1000)));
  const fineAmount = parsed.data.fineAmount ?? overdueDays * 10;
  await prisma.bookIssue.update({ where: { id: issue.id }, data: { returnDate: now, returnedTo: parsed.data.returnedTo ?? req.user!.id, status: overdueDays > 0 ? 'OVERDUE' : 'RETURNED' } });
  await prisma.bookCopy.update({ where: { id: issue.bookCopyId }, data: { status: 'AVAILABLE' } });
  await prisma.book.update({ where: { id: issue.bookCopy.bookId }, data: { availableCopies: { increment: 1 } } });
  let fine = null;
  if (fineAmount > 0) {
    fine = await prisma.libraryFine.upsert({ where: { issueId: issue.id }, create: { issueId: issue.id, amount: fineAmount, paid: false }, update: { amount: fineAmount, paid: false, paymentDate: null } });
    if (parsed.data.cashAccountId && parsed.data.fineIncomeAccountId) {
      await prisma.transaction.create({
        data: {
          organizationId: organization.id,
          voucherNumber: `FIN-${Date.now()}`,
          transactionDate: now,
          description: `Library fine for issue ${issue.id}`,
          totalAmount: fineAmount,
          createdBy: req.user!.id,
          lines: { create: [{ accountId: parsed.data.cashAccountId, debit: fineAmount, credit: 0, remarks: 'Fine received' }, { accountId: parsed.data.fineIncomeAccountId, debit: 0, credit: fineAmount, remarks: 'Library fine income' }] },
        },
      });
      await prisma.libraryFine.update({ where: { issueId: issue.id }, data: { paid: true, paymentDate: now } });
    }
  }
  await logActivity({ userId: req.user!.id, action: 'library_book_returned', entityType: 'bookIssue', entityId: issue.id });
  res.json({ issue: { ...issue, status: overdueDays > 0 ? 'OVERDUE' : 'RETURNED' }, fine });
}));

router.get('/reports/books', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const organization = await getOrg(req.user!.id);
  const books = await prisma.book.findMany({ where: { organizationId: organization.id }, include: { category: true, author: true, publisher: true, copies: true } });
  res.json({ books });
}));

router.get('/reports/issues', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const organization = await getOrg(req.user!.id);
  const issues = await prisma.bookIssue.findMany({ where: { member: { organizationId: organization.id } }, include: { bookCopy: { include: { book: true } }, member: true, fine: true } });
  res.json({ issues });
}));

router.get('/reports/fines', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const organization = await getOrg(req.user!.id);
  const fines = await prisma.libraryFine.findMany({ where: { issue: { member: { organizationId: organization.id } } }, include: { issue: { include: { member: true, bookCopy: { include: { book: true } } } } } });
  res.json({ fines });
}));

export default router;
