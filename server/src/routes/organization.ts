import { Router } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../lib/errors.js';
import { logActivity } from '../lib/activity.js';
import { sendEmail, emailTemplates } from '../lib/email.js';

const router = Router();

const workspaceSchema = z.object({
  name: z.string().min(2),
  logoUrl: z.string().url().nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  contactPhone: z.string().max(30).nullable().optional(),
  address: z.string().max(255).nullable().optional(),
  timezone: z.string().min(2).optional(),
  currency: z.string().min(3).max(3).optional(),
  language: z.string().min(2).optional(),
  primaryColor: z.string().min(4).optional(),
  secondaryColor: z.string().min(4).optional(),
  appearance: z.string().optional(),
});

router.get('/me', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const organization: any = await prisma.organization.findFirst({
    where: { ownerId: req.user!.id },
    include: { members: { include: { user: { select: { id: true, name: true, email: true, role: true, status: true, lastLoginAt: true } } } } },
  });
  res.json({ organization });
}));

router.put('/me', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = workspaceSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid workspace payload', 'VALIDATION_ERROR', parsed.error.flatten());

  const existing: any = await prisma.organization.findFirst({ where: { ownerId: req.user!.id } });
  if (!existing) throw new AppError(404, 'Workspace not found', 'NOT_FOUND');

  const organization: any = await prisma.organization.update({ where: { id: existing.id }, data: parsed.data });
  await logActivity({ userId: req.user!.id, action: 'workspace_updated', entityType: 'organization', entityId: organization.id });
  res.json({ organization });
}));

router.get('/members', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const organization: any = await prisma.organization.findFirst({ where: { ownerId: req.user!.id } });
  if (!organization) throw new AppError(404, 'Workspace not found', 'NOT_FOUND');
  const members: any = await prisma.organizationMember.findMany({
    where: { organizationId: organization.id },
    include: { user: { select: { id: true, name: true, email: true, role: true, status: true, lastLoginAt: true, avatarUrl: true } } },
  });
  res.json({ members });
}));

router.post('/members/invite', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = z.object({ email: z.string().email(), role: z.enum(['OWNER', 'ADMIN', 'MEMBER']).optional() }).safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid invite payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const organization: any = await prisma.organization.findFirst({ where: { ownerId: req.user!.id } });
  if (!organization) throw new AppError(404, 'Workspace not found', 'NOT_FOUND');
  const token = crypto.randomBytes(16).toString('hex');
  const invitation: any = await prisma.organizationInvitation.create({
    data: {
      organizationId: organization.id,
      email: parsed.data.email,
      token,
      role: parsed.data.role ?? 'MEMBER',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    },
  });
  await sendEmail({ to: parsed.data.email, subject: 'Workspace invitation', html: emailTemplates.activated(parsed.data.email) });
  res.status(201).json({ invitation });
}));

router.delete('/members/:userId', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.params.userId;
  const organization: any = await prisma.organization.findFirst({ where: { ownerId: req.user!.id } });
  if (!organization) throw new AppError(404, 'Workspace not found', 'NOT_FOUND');
  await prisma.organizationMember.deleteMany({ where: { organizationId: organization.id, userId } });
  await logActivity({ userId: req.user!.id, action: 'member_removed', entityType: 'organization', entityId: organization.id, metadata: { removedUserId: userId } });
  res.json({ message: 'Member removed' });
}));

export default router;
