import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../lib/errors.js';
import { logActivity } from '../lib/activity.js';
import { notifyOrganizationUsers, notifyStudentGuardians } from '../lib/communication-notifications.js';

const router = Router();
const channelSchema = z.enum(['SMS', 'EMAIL', 'WHATSAPP', 'IN_APP']);
const statusSchema = z.enum(['DRAFT', 'PUBLISHED', 'SCHEDULED', 'EXPIRED', 'CANCELLED', 'PENDING', 'SENT', 'FAILED', 'DELIVERED', 'ARCHIVED']);

async function getWorkspace(userId: string) {
  const organization = await prisma.organization.findFirst({ where: { ownerId: userId } });
  if (!organization) throw new AppError(404, 'Workspace not found', 'NOT_FOUND');
  const madrassa = await prisma.madrassa.findFirst({ where: { organizationId: organization.id, isDeleted: false } });
  if (!madrassa) throw new AppError(404, 'Madrassa profile required', 'NOT_FOUND');
  return { organization, madrassa };
}

router.use(requireAuth);

const templateSchema = z.object({
  name: z.string().min(2),
  type: channelSchema.optional(),
  channel: channelSchema.optional(),
  subject: z.string().optional().nullable(),
  body: z.string().optional(),
  content: z.string().optional(),
  variables: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});
const announcementSchema = z.object({
  title: z.string().min(2),
  content: z.string().min(1),
  audience: z.string().optional(),
  targetAudience: z.string().optional(),
  status: statusSchema.optional(),
  publishDate: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  publishAt: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
});
const parentCreateSchema = z.object({
  guardianId: z.string(),
  userId: z.string(),
  studentIds: z.array(z.string()).optional(),
  enabled: z.boolean().optional(),
  attendanceAlerts: z.boolean().optional(),
  feeAlerts: z.boolean().optional(),
  examAlerts: z.boolean().optional(),
  announcementAlerts: z.boolean().optional(),
});
const parentPreferenceSchema = z.object({
  attendanceAlerts: z.boolean().optional(),
  feeAlerts: z.boolean().optional(),
  examAlerts: z.boolean().optional(),
  announcementAlerts: z.boolean().optional(),
});
const groupSchema = z.object({ name: z.string().min(2), description: z.string().optional().nullable(), filterType: z.string().optional(), filterValue: z.string().optional().nullable() });
const providerSchema = z.object({ sms: z.any().optional(), email: z.any().optional(), whatsapp: z.any().optional() });
const sendSchema = z.object({ channel: channelSchema, subject: z.string().optional().nullable(), content: z.string().min(1), recipientType: z.string().default('GROUP'), recipientId: z.string().optional().nullable(), groupId: z.string().optional().nullable(), status: statusSchema.optional() });
const scheduleSchema = sendSchema.extend({ name: z.string().min(2), scheduledAt: z.string().optional().nullable(), cron: z.string().optional().nullable() });

function mapProviderConfig(data: unknown) {
  return typeof data === 'string' ? data : JSON.stringify(data ?? {});
}

router.get('/announcements', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const announcements = await prisma.announcement.findMany({ where: { organizationId: organization.id }, orderBy: { createdAt: 'desc' } });
  res.json({ announcements });
}));

router.post('/announcements', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = announcementSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid announcement payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { organization } = await getWorkspace(req.user!.id);
  const audience = parsed.data.audience ?? parsed.data.targetAudience ?? 'All';
  const publishDate = parsed.data.publishDate ?? parsed.data.publishAt ?? null;
  const expiryDate = parsed.data.expiryDate ?? parsed.data.expiresAt ?? null;
  const announcement = await prisma.announcement.create({
    data: {
      organizationId: organization.id,
      title: parsed.data.title,
      content: parsed.data.content,
      targetAudience: audience,
      audience,
      status: parsed.data.status ?? 'DRAFT',
      publishAt: publishDate ? new Date(publishDate) : null,
      publishDate: publishDate ? new Date(publishDate) : null,
      expiresAt: expiryDate ? new Date(expiryDate) : null,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      createdBy: req.user!.id,
    },
  });
  res.status(201).json({ announcement });
}));

router.patch('/announcements/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = announcementSchema.partial().safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid announcement payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { organization } = await getWorkspace(req.user!.id);
  const announcement = await prisma.announcement.findFirst({ where: { id: req.params.id, organizationId: organization.id } });
  if (!announcement) throw new AppError(404, 'Announcement not found', 'NOT_FOUND');
  const audience = parsed.data.audience ?? parsed.data.targetAudience;
  const publishDate = parsed.data.publishDate ?? parsed.data.publishAt;
  const expiryDate = parsed.data.expiryDate ?? parsed.data.expiresAt;
  const updated = await prisma.announcement.update({
    where: { id: announcement.id },
    data: {
      ...parsed.data,
      ...(audience ? { audience, targetAudience: audience } : {}),
      ...(publishDate ? { publishAt: new Date(publishDate), publishDate: new Date(publishDate) } : {}),
      ...(expiryDate ? { expiresAt: new Date(expiryDate), expiryDate: new Date(expiryDate) } : {}),
    },
  });
  res.json({ announcement: updated });
}));

router.delete('/announcements/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const announcement = await prisma.announcement.findFirst({ where: { id: req.params.id, organizationId: organization.id } });
  if (!announcement) throw new AppError(404, 'Announcement not found', 'NOT_FOUND');
  await prisma.announcement.delete({ where: { id: announcement.id } });
  res.json({ message: 'Announcement deleted' });
}));

router.get('/templates', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const templates = await prisma.communicationTemplate.findMany({ where: { organizationId: organization.id }, orderBy: { createdAt: 'desc' } });
  res.json({ templates });
}));

router.post('/templates', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = templateSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid template payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { organization } = await getWorkspace(req.user!.id);
  const type = parsed.data.type ?? parsed.data.channel ?? 'IN_APP';
  const body = parsed.data.body ?? parsed.data.content ?? '';
  const template = await prisma.communicationTemplate.create({ data: { organizationId: organization.id, name: parsed.data.name, type, subject: parsed.data.subject ?? null, body, variables: parsed.data.variables ?? null, createdBy: req.user!.id } });
  res.status(201).json({ template });
}));

router.patch('/templates/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = templateSchema.partial().safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid template payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { organization } = await getWorkspace(req.user!.id);
  const template = await prisma.communicationTemplate.findFirst({ where: { id: req.params.id, organizationId: organization.id } });
  if (!template) throw new AppError(404, 'Template not found', 'NOT_FOUND');
  const updated = await prisma.communicationTemplate.update({
    where: { id: template.id },
    data: {
      ...(parsed.data.name ? { name: parsed.data.name } : {}),
      ...(parsed.data.type ?? parsed.data.channel ? { type: parsed.data.type ?? parsed.data.channel } : {}),
      ...(parsed.data.subject !== undefined ? { subject: parsed.data.subject ?? null } : {}),
      ...(parsed.data.body ?? parsed.data.content ? { body: parsed.data.body ?? parsed.data.content } : {}),
      ...(parsed.data.variables !== undefined ? { variables: parsed.data.variables ?? null } : {}),
    },
  });
  res.json({ template: updated });
}));

router.delete('/templates/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const template = await prisma.communicationTemplate.findFirst({ where: { id: req.params.id, organizationId: organization.id } });
  if (!template) throw new AppError(404, 'Template not found', 'NOT_FOUND');
  await prisma.communicationTemplate.delete({ where: { id: template.id } });
  res.json({ message: 'Template deleted' });
}));

router.get('/groups', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const groups = await prisma.communicationGroup.findMany({ where: { organizationId: organization.id }, include: { recipients: true }, orderBy: { createdAt: 'desc' } });
  res.json({ groups });
}));

router.post('/groups', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = groupSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid group payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { organization } = await getWorkspace(req.user!.id);
  const group = await prisma.communicationGroup.create({ data: { organizationId: organization.id, ...parsed.data } });
  res.status(201).json({ group });
}));

router.patch('/groups/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = groupSchema.partial().safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid group payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { organization } = await getWorkspace(req.user!.id);
  const group = await prisma.communicationGroup.findFirst({ where: { id: req.params.id, organizationId: organization.id } });
  if (!group) throw new AppError(404, 'Group not found', 'NOT_FOUND');
  const updated = await prisma.communicationGroup.update({ where: { id: group.id }, data: parsed.data });
  res.json({ group: updated });
}));

router.delete('/groups/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const group = await prisma.communicationGroup.findFirst({ where: { id: req.params.id, organizationId: organization.id } });
  if (!group) throw new AppError(404, 'Group not found', 'NOT_FOUND');
  await prisma.communicationGroup.delete({ where: { id: group.id } });
  res.json({ message: 'Group deleted' });
}));

router.get('/notifications', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const notifications = await prisma.notification.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' } });
  res.json({ notifications });
}));

router.patch('/notifications/:id/read', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
  if (!notification || notification.userId !== req.user!.id) throw new AppError(404, 'Notification not found', 'NOT_FOUND');
  res.json({ notification: await prisma.notification.update({ where: { id: notification.id }, data: { isRead: true } }) });
}));

router.patch('/notifications/read-all', asyncHandler(async (req: AuthenticatedRequest, res) => {
  await prisma.notification.updateMany({ where: { userId: req.user!.id, isRead: false }, data: { isRead: true } });
  res.json({ message: 'All notifications marked as read' });
}));

router.delete('/notifications/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
  if (!notification || notification.userId !== req.user!.id) throw new AppError(404, 'Notification not found', 'NOT_FOUND');
  await prisma.notification.delete({ where: { id: notification.id } });
  res.json({ message: 'Notification deleted' });
}));

router.get('/providers', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const [sms, email, whatsapp] = await Promise.all([
    prisma.smsProvider.findMany({ where: { organizationId: organization.id } }),
    prisma.emailProvider.findMany({ where: { organizationId: organization.id } }),
    prisma.whatsappProvider.findMany({ where: { organizationId: organization.id } }),
  ]);
  res.json({ sms, email, whatsapp });
}));

router.put('/providers', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = providerSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid provider payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { organization } = await getWorkspace(req.user!.id);
  const sms = parsed.data.sms ? await (async () => {
    const name = parsed.data.sms.name ?? 'default';
    const existing = await prisma.smsProvider.findFirst({ where: { organizationId: organization.id, name } });
    return existing ? prisma.smsProvider.update({ where: { id: existing.id }, data: { isEnabled: Boolean(parsed.data.sms.isEnabled), config: mapProviderConfig(parsed.data.sms.config) } }) : prisma.smsProvider.create({ data: { organizationId: organization.id, name, isEnabled: Boolean(parsed.data.sms.isEnabled), config: mapProviderConfig(parsed.data.sms.config) } });
  })() : null;
  const email = parsed.data.email ? await (async () => {
    const name = parsed.data.email.name ?? 'default';
    const existing = await prisma.emailProvider.findFirst({ where: { organizationId: organization.id, name } });
    return existing ? prisma.emailProvider.update({ where: { id: existing.id }, data: { isEnabled: Boolean(parsed.data.email.isEnabled), config: mapProviderConfig(parsed.data.email.config) } }) : prisma.emailProvider.create({ data: { organizationId: organization.id, name, isEnabled: Boolean(parsed.data.email.isEnabled), config: mapProviderConfig(parsed.data.email.config) } });
  })() : null;
  const whatsapp = parsed.data.whatsapp ? await (async () => {
    const name = parsed.data.whatsapp.name ?? 'default';
    const existing = await prisma.whatsappProvider.findFirst({ where: { organizationId: organization.id, name } });
    return existing ? prisma.whatsappProvider.update({ where: { id: existing.id }, data: { isEnabled: Boolean(parsed.data.whatsapp.isEnabled), config: mapProviderConfig(parsed.data.whatsapp.config) } }) : prisma.whatsappProvider.create({ data: { organizationId: organization.id, name, isEnabled: Boolean(parsed.data.whatsapp.isEnabled), config: mapProviderConfig(parsed.data.whatsapp.config) } });
  })() : null;
  res.json({ sms, email, whatsapp });
}));

function deliverToMembers(input: { organizationId: string; title: string; message: string; channel: string; recipientType: string; recipientId?: string | null; userIds: string[]; providerType: string; subject?: string | null; status?: string }) {
  return Promise.all(input.userIds.map((userId) =>
    prisma.notification.create({ data: { userId, title: input.title, message: input.message, type: input.channel.toLowerCase() } }),
  ));
}

router.post('/send', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = sendSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid send payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { organization } = await getWorkspace(req.user!.id);
  const members = await prisma.organizationMember.findMany({ where: { organizationId: organization.id }, include: { user: true } });
  const userIds = members.map((m: { userId: string }) => m.userId);
  const queue = await prisma.messageQueue.create({ data: { organizationId: organization.id, channel: parsed.data.channel, recipientType: parsed.data.recipientType, recipientId: parsed.data.recipientId ?? null, subject: parsed.data.subject ?? null, content: parsed.data.content, status: 'SENT', sentAt: new Date() } });
  await prisma.message.create({
    data: {
      organizationId: organization.id,
      senderId: req.user!.id,
      receiverType: parsed.data.recipientType === 'GROUP' ? 'ALL' : parsed.data.recipientType,
      subject: parsed.data.subject ?? null,
      content: parsed.data.content,
      channel: parsed.data.channel,
      status: 'SENT',
      sentAt: new Date(),
      recipients: { create: userIds.map((userId: string) => ({ userId, deliveryStatus: 'DELIVERED' })) },
    },
  });
  await deliverToMembers({ organizationId: organization.id, title: parsed.data.subject ?? 'Communication', message: parsed.data.content, channel: parsed.data.channel, recipientType: parsed.data.recipientType, recipientId: parsed.data.recipientId ?? null, userIds, providerType: parsed.data.channel, subject: parsed.data.subject ?? null });
  await prisma.messageLog.createMany({ data: userIds.map((userId: string) => ({ organizationId: organization.id, queueId: queue.id, providerType: parsed.data.channel, channel: parsed.data.channel, recipientType: parsed.data.recipientType, recipientId: userId, subject: parsed.data.subject ?? null, content: parsed.data.content, status: 'DELIVERED', deliveredAt: new Date() })) });
  await logActivity({ userId: req.user!.id, action: 'communication_message_sent', entityType: 'messageQueue', entityId: queue.id });
  res.status(201).json({ queue });
}));

router.get('/messages', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const messages = await prisma.message.findMany({ where: { organizationId: organization.id }, include: { recipients: true }, orderBy: { createdAt: 'desc' } });
  res.json({ messages });
}));

router.post('/messages', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = z.object({
    subject: z.string().optional().nullable(),
    content: z.string().min(1),
    channel: channelSchema,
    receiverType: z.enum(['STUDENT', 'GUARDIAN', 'STAFF', 'ALL']),
    recipientIds: z.array(z.string()).optional(),
  }).safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid message payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { organization } = await getWorkspace(req.user!.id);
  const message = await prisma.message.create({
    data: {
      organizationId: organization.id,
      senderId: req.user!.id,
      receiverType: parsed.data.receiverType,
      subject: parsed.data.subject ?? null,
      content: parsed.data.content,
      channel: parsed.data.channel,
      status: 'SENT',
      sentAt: new Date(),
      recipients: {
        create: (parsed.data.recipientIds?.length ? parsed.data.recipientIds : [req.user!.id]).map((recipientId) => ({ userId: recipientId, deliveryStatus: 'DELIVERED' })),
      },
    },
  });
  await logActivity({ userId: req.user!.id, action: 'communication_message_created', entityType: 'message', entityId: message.id });
  res.status(201).json({ message });
}));

router.get('/messages/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const message = await prisma.message.findFirst({ where: { id: req.params.id, organizationId: organization.id }, include: { recipients: true } });
  if (!message) throw new AppError(404, 'Message not found', 'NOT_FOUND');
  res.json({ message });
}));

router.post('/schedule', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = scheduleSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid schedule payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { organization } = await getWorkspace(req.user!.id);
  const scheduledMessage = await prisma.scheduledMessage.create({
    data: {
      organizationId: organization.id,
      name: parsed.data.name,
      channel: parsed.data.channel,
      subject: parsed.data.subject ?? null,
      content: parsed.data.content,
      cron: parsed.data.cron ?? null,
      sendAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
      status: 'SCHEDULED',
    },
  });
  res.status(201).json({ scheduledMessage });
}));

router.get('/history', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const messages = await prisma.messageLog.findMany({ where: { organizationId: organization.id }, orderBy: { createdAt: 'desc' } });
  res.json({ messages });
}));

router.post('/parents/create', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = parentCreateSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid parent payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { organization } = await getWorkspace(req.user!.id);
  const guardian = await prisma.guardian.findFirst({ where: { id: parsed.data.guardianId, madrassa: { organizationId: organization.id } } });
  if (!guardian) throw new AppError(404, 'Guardian not found', 'NOT_FOUND');
  const user = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');
  const parentAccount = await prisma.parentAccount.upsert({
    where: { organizationId_guardianId: { organizationId: organization.id, guardianId: guardian.id } },
    update: { userId: user.id, enabled: parsed.data.enabled ?? true },
    create: { organizationId: organization.id, guardianId: guardian.id, userId: user.id, enabled: parsed.data.enabled ?? true },
  });
  const parentUser = await prisma.parentUser.upsert({
    where: { organizationId_userId: { organizationId: organization.id, userId: user.id } },
    update: { displayName: guardian.name },
    create: { organizationId: organization.id, userId: user.id, displayName: guardian.name },
  });
  const preference = await prisma.parentNotificationPreference.upsert({
    where: { parentAccountId: parentAccount.id },
    update: {
      attendanceAlerts: parsed.data.attendanceAlerts ?? true,
      feeAlerts: parsed.data.feeAlerts ?? true,
      examAlerts: parsed.data.examAlerts ?? true,
      announcementAlerts: parsed.data.announcementAlerts ?? true,
    },
    create: {
      parentAccountId: parentAccount.id,
      attendanceAlerts: parsed.data.attendanceAlerts ?? true,
      feeAlerts: parsed.data.feeAlerts ?? true,
      examAlerts: parsed.data.examAlerts ?? true,
      announcementAlerts: parsed.data.announcementAlerts ?? true,
    },
  });
  if (parsed.data.studentIds?.length) {
    await prisma.parentStudent.deleteMany({ where: { parentUserId: parentUser.id } });
    await prisma.parentStudent.createMany({
      data: parsed.data.studentIds.map((studentId) => ({ organizationId: organization.id, parentUserId: parentUser.id, studentId, relationship: 'Parent' })),
    });
  }
  res.status(201).json({ parentAccount, preference });
}));

router.get('/parents/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { organization } = await getWorkspace(req.user!.id);
  const parentAccount = await prisma.parentAccount.findFirst({ where: { id: req.params.id, organizationId: organization.id }, include: { guardian: true, user: true, preference: true } });
  if (!parentAccount) throw new AppError(404, 'Parent account not found', 'NOT_FOUND');
  res.json({ parentAccount });
}));

router.patch('/parents/:id/preferences', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = parentPreferenceSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid preference payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const { organization } = await getWorkspace(req.user!.id);
  const parentAccount = await prisma.parentAccount.findFirst({ where: { id: req.params.id, organizationId: organization.id } });
  if (!parentAccount) throw new AppError(404, 'Parent account not found', 'NOT_FOUND');
  const preference = await prisma.parentNotificationPreference.upsert({
    where: { parentAccountId: parentAccount.id },
    update: parsed.data,
    create: { parentAccountId: parentAccount.id, ...parsed.data },
  });
  res.json({ preference });
}));

export default router;
