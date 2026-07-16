import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../lib/errors.js';

const router = Router();

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

async function buildParentContext(userId: string) {
  const { organization, madrassa } = await getWorkspace(userId);
  const parentUser = await prisma.parentUser.findFirst({
    where: { userId, organizationId: organization.id },
    include: { students: { include: { student: true } } },
  });
  const parentAccount = await prisma.parentAccount.findFirst({
    where: { userId, organizationId: organization.id },
    include: { guardian: true, preference: true },
  });
  return { organization, madrassa, parentUser, parentAccount };
}

router.use(requireAuth);

router.get('/profile', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const context = await buildParentContext(req.user!.id);
  res.json({ parent: context.parentUser, account: context.parentAccount, organization: context.organization, madrassa: context.madrassa });
}));

router.get('/student', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const context = await buildParentContext(req.user!.id);
  const studentIds = (context.parentUser?.students ?? []).map((link: { studentId: string }) => link.studentId);
  const students = studentIds.length ? await prisma.student.findMany({ where: { id: { in: studentIds } }, include: { guardian: true } }) : [];
  res.json({ students });
}));

router.get('/attendance', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const context = await buildParentContext(req.user!.id);
  const studentIds = (context.parentUser?.students ?? []).map((link: { studentId: string }) => link.studentId);
  const attendance = studentIds.length ? await prisma.attendanceRecord.findMany({ where: { studentId: { in: studentIds } }, orderBy: { date: 'desc' } }) : [];
  res.json({ attendance });
}));

router.get('/fees', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const context = await buildParentContext(req.user!.id);
  const studentIds = (context.parentUser?.students ?? []).map((link: { studentId: string }) => link.studentId);
  const invoices = studentIds.length ? await prisma.feeInvoice.findMany({ where: { studentId: { in: studentIds } } }) : [];
  const payments = studentIds.length ? await prisma.feePayment.findMany({ where: { studentId: { in: studentIds } } }) : [];
  res.json({ invoices, payments });
}));

router.get('/results', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const context = await buildParentContext(req.user!.id);
  const studentIds = (context.parentUser?.students ?? []).map((link: { studentId: string }) => link.studentId);
  const results = studentIds.length ? await prisma.resultCard.findMany({ where: { studentId: { in: studentIds } }, include: { exam: true, student: true } }) : [];
  res.json({ results });
}));

router.get('/certificates', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const context = await buildParentContext(req.user!.id);
  const studentIds = (context.parentUser?.students ?? []).map((link: { studentId: string }) => link.studentId);
  const certificates = studentIds.length ? await prisma.certificate.findMany({ where: { studentId: { in: studentIds } }, include: { template: true, verification: true } }) : [];
  res.json({ certificates });
}));

router.get('/announcements', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const context = await buildParentContext(req.user!.id);
  const announcements = await prisma.announcement.findMany({ where: { organizationId: context.organization.id }, orderBy: { createdAt: 'desc' } });
  res.json({ announcements });
}));

export default router;
