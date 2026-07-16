import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../lib/errors.js';
import { logActivity } from '../lib/activity.js';
import { notifyStudentGuardians } from '../lib/communication-notifications.js';

const router = Router();
const types = z.enum(['HIFZ_COMPLETION', 'TAJWEED_COMPLETION', 'COURSE_COMPLETION', 'CHARACTER_CERTIFICATE', 'LEAVING_CERTIFICATE', 'CUSTOM']);

async function getWorkspace(userId: string) {
  const organization = await prisma.organization.findFirst({ where: { ownerId: userId } });
  if (!organization) throw new AppError(404, 'Workspace not found', 'NOT_FOUND');
  const madrassa = await prisma.madrassa.findFirst({ where: { organizationId: organization.id, isDeleted: false } });
  if (!madrassa) throw new AppError(404, 'Madrassa profile required', 'NOT_FOUND');
  return { organization, madrassa };
}
async function nextNumber(organizationId: string, year: number) {
  const count = await prisma.certificate.count({ where: { organizationId, issueDate: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } } });
  return `CERT-${year}-${String(count + 1).padStart(4, '0')}`;
}

router.get('/templates', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  res.json({ templates: await prisma.certificateTemplate.findMany({ where: { organizationId: organization.id }, orderBy: { createdAt: 'desc' } }) });
}));
router.post('/templates', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = z.object({ name: z.string().min(2), type: types, templateContent: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid template payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { organization } = await getWorkspace(req.user!.id);
  const template = await prisma.certificateTemplate.create({ data: { organizationId: organization.id, ...parsed.data } });
  res.status(201).json({ template });
}));
router.patch('/templates/:id', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = z.object({ name: z.string().min(2).optional(), type: types.optional(), templateContent: z.string().optional() }).safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid template payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { organization } = await getWorkspace(req.user!.id);
  const template = await prisma.certificateTemplate.findFirst({ where: { id: req.params.id, organizationId: organization.id } });
  if (!template) throw new AppError(404, 'Template not found', 'NOT_FOUND');
  const updated = await prisma.certificateTemplate.update({ where: { id: template.id }, data: parsed.data });
  res.json({ template: updated });
}));
router.delete('/templates/:id', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const template = await prisma.certificateTemplate.findFirst({ where: { id: req.params.id, organizationId: organization.id } });
  if (!template) throw new AppError(404, 'Template not found', 'NOT_FOUND');
  await prisma.certificateTemplate.delete({ where: { id: template.id } });
  res.json({ message: 'Template deleted' });
}));
router.get('/', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  res.json({ certificates: await prisma.certificate.findMany({ where: { organizationId: organization.id }, include: { student: true, template: true }, orderBy: { createdAt: 'desc' } }) });
}));
router.post('/generate', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = z.object({ studentId: z.string(), templateId: z.string().optional().nullable(), type: types, title: z.string().min(2), description: z.string().optional().nullable(), issuedBy: z.string().optional().nullable() }).safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid certificate payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { organization } = await getWorkspace(req.user!.id);
  const student = await prisma.student.findFirst({ where: { id: parsed.data.studentId, madrassaId: (await getWorkspace(req.user!.id)).madrassa.id, isDeleted: false } });
  if (!student) throw new AppError(404, 'Student not found', 'NOT_FOUND');
  const number = await nextNumber(organization.id, new Date().getFullYear());
  const certificate = await prisma.certificate.create({ data: { organizationId: organization.id, studentId: student.id, templateId: parsed.data.templateId ?? null, certificateNumber: number, issueDate: new Date(), title: parsed.data.title, description: parsed.data.description ?? null, issuedBy: parsed.data.issuedBy ?? req.user!.id } });
  await prisma.certificateVerification.create({ data: { certificateId: certificate.id, verificationCode: crypto.randomBytes(16).toString('hex') } });
  await logActivity({ userId: req.user!.id, action: 'certificate_generated', entityType: 'certificate', entityId: certificate.id });
  await notifyStudentGuardians({
    organizationId: organization.id,
    studentId: student.id,
    title: 'Certificate ready',
    content: `A certificate titled "${parsed.data.title}" has been issued.`,
    channel: 'IN_APP',
  });
  res.status(201).json({ certificate });
}));
router.get('/:id', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const certificate = await prisma.certificate.findFirst({ where: { id: req.params.id, organizationId: organization.id }, include: { student: true, template: true, verification: true } });
  if (!certificate) throw new AppError(404, 'Certificate not found', 'NOT_FOUND');
  res.json({ certificate });
}));
router.delete('/:id', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const certificate = await prisma.certificate.findFirst({ where: { id: req.params.id, organizationId: organization.id } });
  if (!certificate) throw new AppError(404, 'Certificate not found', 'NOT_FOUND');
  await prisma.certificate.update({ where: { id: certificate.id }, data: { status: 'REVOKED' } });
  await logActivity({ userId: req.user!.id, action: 'certificate_revoked', entityType: 'certificate', entityId: certificate.id });
  res.json({ message: 'Certificate revoked' });
}));
router.get('/student/:id', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization, madrassa } = await getWorkspace(req.user!.id);
  const student = await prisma.student.findFirst({ where: { id: req.params.id, madrassaId: madrassa.id, isDeleted: false } });
  if (!student) throw new AppError(404, 'Student not found', 'NOT_FOUND');
  const certificates = await prisma.certificate.findMany({ where: { organizationId: organization.id, studentId: student.id }, include: { template: true, verification: true } });
  res.json({ certificates });
}));
router.get('/verify/:code', asyncHandler(async (req, res) => {
  const verification = await prisma.certificateVerification.findUnique({ where: { verificationCode: req.params.code }, include: { certificate: { include: { student: true, template: true } } } });
  if (!verification) throw new AppError(404, 'Certificate not found', 'NOT_FOUND');
  res.json({ certificate: verification.certificate, verification: { verifiedAt: verification.verifiedAt, ipAddress: verification.ipAddress } });
}));

export default router;
