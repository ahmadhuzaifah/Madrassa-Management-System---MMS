import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { logActivity } from '../lib/activity.js';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../lib/errors.js';
import { hashPassword } from '../lib/auth.js';

const router = Router();

const adminOnly = [requireAuth, requireRole(['ADMIN'])] as const;
const toOptionalString = (value: unknown) => (typeof value === 'string' ? value : undefined);
const toNullableString = (value: unknown) => (typeof value === 'string' ? value : null);
const getParamId = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const seedDefaults = async () => {
  const [roleCount, permissionCount] = await Promise.all([
    prisma.role.count(),
    prisma.permission.count(),
  ]);
  if (permissionCount === 0) {
    await prisma.permission.createMany({
      data: [
        { code: 'users:create', resource: 'Users', action: 'Create', description: 'Create users' },
        { code: 'users:read', resource: 'Users', action: 'Read', description: 'View users' },
        { code: 'users:update', resource: 'Users', action: 'Update', description: 'Edit users' },
        { code: 'users:delete', resource: 'Users', action: 'Delete', description: 'Delete users' },
        { code: 'organizations:manage', resource: 'Organizations', action: 'Manage', description: 'Manage organizations' },
        { code: 'billing:view', resource: 'Billing', action: 'View', description: 'View billing data' },
        { code: 'reports:export', resource: 'Reports', action: 'Export', description: 'Export reports' },
        { code: 'logs:read', resource: 'Logs', action: 'Read', description: 'Read audit logs' },
      ],
    });
  }
  if (roleCount === 0) {
    const [adminRole, userRole, permissions] = await Promise.all([
      prisma.role.create({ data: { name: 'Administrator', slug: 'ADMIN', description: 'Full platform access', isSystem: true } }),
      prisma.role.create({ data: { name: 'User', slug: 'USER', description: 'Standard account access', isSystem: true } }),
      prisma.permission.findMany(),
    ]);
    await prisma.rolePermission.createMany({
      data: permissions.map((permission: { id: string }) => ({ roleId: adminRole.id, permissionId: permission.id })),
    });
    await prisma.rolePermission.createMany({
      data: permissions.filter((permission: { code: string; id: string }) => ['billing:view'].includes(permission.code)).map((permission: { id: string }) => ({ roleId: userRole.id, permissionId: permission.id })),
    });
  }
};

const dashboardRange = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

router.get('/dashboard', ...adminOnly, asyncHandler(async (_req, res) => {
  await seedDefaults();
  const [totalUsers, activeUsers, organizations, subscriptions, recentLogs, roles, permissions, files] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: 'ACTIVE' } }),
    prisma.organization.count(),
    prisma.subscription.count(),
    prisma.activityLog.findMany({ orderBy: { createdAt: 'desc' }, take: 8, include: { user: { select: { id: true, name: true, email: true } } } }),
    prisma.role.count(),
    prisma.permission.count(),
    prisma.fileUpload.aggregate({ _sum: { sizeBytes: true } }),
  ]);
  const revenue = await prisma.invoice.aggregate({ _sum: { amount: true } });
  const growthUsers = await prisma.user.groupBy({ by: ['createdAt'], _count: { id: true }, where: { createdAt: { gte: dashboardRange(30) } } }).catch(() => []);
  res.json({
    metrics: {
      totalUsers,
      activeUsers,
      organizations,
      subscriptions,
      revenue: revenue._sum.amount ?? 0,
      roles,
      permissions,
      storageBytes: files._sum.sizeBytes ?? 0,
    },
    recentActivity: recentLogs,
    growth: growthUsers,
  });
}));

router.get('/users', ...adminOnly, asyncHandler(async (req: AuthenticatedRequest, res) => {
  await seedDefaults();
  const parsed = z.object({
    page: z.string().optional(),
    size: z.string().optional(),
    search: z.string().optional(),
    status: z.string().optional(),
    role: z.string().optional(),
  }).safeParse(req.query);
  if (!parsed.success) throw new AppError(400, 'Invalid query parameters', 'VALIDATION_ERROR', parsed.error.flatten());
  const page = Math.max(Number(parsed.data.page ?? 1), 1);
  const size = Math.min(Math.max(Number(parsed.data.size ?? 10), 1), 50);
  const where: any = {};
  const search = toOptionalString(parsed.data.search);
  const status = toOptionalString(parsed.data.status);
  const role = toOptionalString(parsed.data.role);
  if (search) where.OR = [{ name: { contains: search } }, { email: { contains: search } }];
  if (status) where.status = status;
  if (role) where.role = role;
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * size,
      take: size,
      include: { settings: true, subscriptions: { include: { plan: true } }, organizationMembers: { include: { organization: true } } },
    }),
    prisma.user.count({ where }),
  ]);
  res.json({ users, pagination: { page, size, total, pages: Math.ceil(total / size) } });
}));

router.get('/users/:id', ...adminOnly, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: { settings: true, subscriptions: { include: { plan: true } }, activityLogs: { orderBy: { createdAt: 'desc' }, take: 20 } },
  });
  if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');
  res.json({ user });
}));

router.patch('/users/:id', ...adminOnly, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    role: z.enum(['ADMIN', 'USER']).optional(),
    status: z.enum(['ACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED', 'DISABLED']).optional(),
    phone: z.string().nullable().optional(),
  }).safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid user payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const updated = await prisma.user.update({ where: { id: req.params.id }, data: parsed.data });
  await logActivity({ userId: req.user!.id, action: 'admin_updated_user', entityType: 'user', entityId: getParamId(req.params.id) });
  res.json({ user: updated });
}));

router.post('/users/:id/reset-password', ...adminOnly, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const schema = z.object({ password: z.string().min(12) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid password payload', 'VALIDATION_ERROR', parsed.error.flatten());
  await prisma.user.update({ where: { id: req.params.id }, data: { passwordHash: await hashPassword(parsed.data.password), sessionVersion: { increment: 1 } } });
  await logActivity({ userId: req.user!.id, action: 'admin_reset_password', entityType: 'user', entityId: getParamId(req.params.id) });
  res.json({ message: 'Password reset' });
}));

router.delete('/users/:id', ...adminOnly, asyncHandler(async (req: AuthenticatedRequest, res) => {
  await prisma.user.delete({ where: { id: req.params.id } });
  await logActivity({ userId: req.user!.id, action: 'admin_deleted_user', entityType: 'user', entityId: getParamId(req.params.id) });
  res.json({ message: 'User deleted' });
}));

router.get('/organizations', ...adminOnly, asyncHandler(async (_req, res) => {
  const organizations = await prisma.organization.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true, role: true, status: true } } } },
      invitations: true,
    },
  });
  res.json({ organizations });
}));

router.patch('/organizations/:id', ...adminOnly, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = z.object({
    name: z.string().min(2).optional(),
    contactEmail: z.string().email().nullable().optional(),
    contactPhone: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    timezone: z.string().optional(),
    currency: z.string().optional(),
    language: z.string().optional(),
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
    appearance: z.string().optional(),
    logoUrl: z.string().url().nullable().optional(),
  }).safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid organization payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const organization = await prisma.organization.update({ where: { id: req.params.id }, data: parsed.data });
  await logActivity({ userId: req.user!.id, action: 'admin_updated_organization', entityType: 'organization', entityId: getParamId(req.params.id) });
  res.json({ organization });
}));

router.delete('/organizations/:id', ...adminOnly, asyncHandler(async (req: AuthenticatedRequest, res) => {
  await prisma.organization.delete({ where: { id: req.params.id } });
  await logActivity({ userId: req.user!.id, action: 'admin_deleted_organization', entityType: 'organization', entityId: getParamId(req.params.id) });
  res.json({ message: 'Organization deleted' });
}));

router.get('/roles', ...adminOnly, asyncHandler(async (_req, res) => {
  await seedDefaults();
  const roles = await prisma.role.findMany({ include: { permissions: { include: { permission: true } }, assignments: true } });
  res.json({ roles });
}));

router.post('/roles', ...adminOnly, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = z.object({ name: z.string().min(2), slug: z.string().min(2), description: z.string().optional(), permissionIds: z.array(z.string()).default([]) }).safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid role payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const role = await prisma.role.create({ data: { name: parsed.data.name, slug: parsed.data.slug, description: parsed.data.description, permissions: { create: parsed.data.permissionIds.map((permissionId) => ({ permissionId })) } }, include: { permissions: { include: { permission: true } } } });
  await logActivity({ userId: req.user!.id, action: 'admin_created_role', entityType: 'role', entityId: role.id });
  res.status(201).json({ role });
}));

router.patch('/roles/:id', ...adminOnly, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = z.object({ name: z.string().min(2).optional(), slug: z.string().min(2).optional(), description: z.string().optional(), permissionIds: z.array(z.string()).optional() }).safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid role payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const role = await prisma.role.update({
    where: { id: req.params.id },
    data: {
    ...(toOptionalString(parsed.data.name) ? { name: toOptionalString(parsed.data.name)! } : {}),
    ...(toOptionalString(parsed.data.slug) ? { slug: toOptionalString(parsed.data.slug)! } : {}),
    ...(parsed.data.description !== undefined ? { description: toOptionalString(parsed.data.description) } : {}),
      ...(parsed.data.permissionIds ? {
        permissions: {
          deleteMany: {},
          create: parsed.data.permissionIds.map((permissionId) => ({ permissionId })),
        },
      } : {}),
    },
    include: { permissions: { include: { permission: true } } },
  });
  await logActivity({ userId: req.user!.id, action: 'admin_updated_role', entityType: 'role', entityId: getParamId(req.params.id) });
  res.json({ role });
}));

router.delete('/roles/:id', ...adminOnly, asyncHandler(async (req: AuthenticatedRequest, res) => {
  await prisma.role.delete({ where: { id: req.params.id } });
  await logActivity({ userId: req.user!.id, action: 'admin_deleted_role', entityType: 'role', entityId: getParamId(req.params.id) });
  res.json({ message: 'Role deleted' });
}));

router.get('/permissions', ...adminOnly, asyncHandler(async (_req, res) => {
  await seedDefaults();
  const permissions = await prisma.permission.findMany({ orderBy: [{ resource: 'asc' }, { action: 'asc' }] });
  res.json({ permissions });
}));

router.post('/permissions', ...adminOnly, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = z.object({ code: z.string().min(2), resource: z.string().min(2), action: z.string().min(2), description: z.string().optional() }).safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid permission payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const permission = await prisma.permission.create({
    data: {
      code: toOptionalString(parsed.data.code)!,
      resource: toOptionalString(parsed.data.resource)!,
      action: toOptionalString(parsed.data.action)!,
      ...(parsed.data.description !== undefined ? { description: toOptionalString(parsed.data.description) } : {}),
    },
  });
  await logActivity({ userId: req.user!.id, action: 'admin_created_permission', entityType: 'permission', entityId: permission.id });
  res.status(201).json({ permission });
}));

router.patch('/permissions/:id', ...adminOnly, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = z.object({ code: z.string().min(2).optional(), resource: z.string().min(2).optional(), action: z.string().min(2).optional(), description: z.string().optional() }).safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid permission payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const permission = await prisma.permission.update({
    where: { id: req.params.id },
    data: {
      ...(toOptionalString(parsed.data.code) ? { code: toOptionalString(parsed.data.code)! } : {}),
      ...(toOptionalString(parsed.data.resource) ? { resource: toOptionalString(parsed.data.resource)! } : {}),
      ...(toOptionalString(parsed.data.action) ? { action: toOptionalString(parsed.data.action)! } : {}),
      ...(parsed.data.description !== undefined ? { description: toOptionalString(parsed.data.description) } : {}),
    },
  });
  await logActivity({ userId: req.user!.id, action: 'admin_updated_permission', entityType: 'permission', entityId: getParamId(req.params.id) });
  res.json({ permission });
}));

router.delete('/permissions/:id', ...adminOnly, asyncHandler(async (req: AuthenticatedRequest, res) => {
  await prisma.permission.delete({ where: { id: req.params.id } });
  await logActivity({ userId: req.user!.id, action: 'admin_deleted_permission', entityType: 'permission', entityId: getParamId(req.params.id) });
  res.json({ message: 'Permission deleted' });
}));

router.get('/settings', ...adminOnly, asyncHandler(async (_req, res) => {
  const settings = await prisma.adminSetting.findMany();
  res.json({ settings });
}));

router.put('/settings', ...adminOnly, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = z.object({
    applicationName: z.string().optional(),
    contactEmail: z.string().email().optional(),
    contactPhone: z.string().optional(),
    passwordPolicy: z.string().optional(),
    sessionTimeoutMinutes: z.number().int().positive().optional(),
    smtpHost: z.string().optional(),
    smtpUser: z.string().optional(),
    smtpPassword: z.string().optional(),
    uploadLimitMb: z.number().int().positive().optional(),
    maintenanceMode: z.boolean().optional(),
    defaultTheme: z.string().optional(),
  }).safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid settings payload', 'VALIDATION_ERROR', parsed.error.flatten());
  const entries = Object.entries(parsed.data).map(([key, value]) => prisma.adminSetting.upsert({ where: { key }, update: { value: String(value) }, create: { key, value: String(value) } }));
  const settings = await Promise.all(entries);
  await logActivity({ userId: req.user!.id, action: 'admin_updated_settings', entityType: 'system' });
  res.json({ settings });
}));

router.get('/logs', ...adminOnly, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = z.object({ search: z.string().optional(), entityType: z.string().optional(), from: z.string().optional(), to: z.string().optional() }).safeParse(req.query);
  if (!parsed.success) throw new AppError(400, 'Invalid query parameters', 'VALIDATION_ERROR', parsed.error.flatten());
  const where: any = {};
  if (parsed.data.search) where.action = { contains: parsed.data.search };
  if (parsed.data.entityType) where.entityType = parsed.data.entityType;
  if (parsed.data.from || parsed.data.to) where.createdAt = {
    ...(parsed.data.from ? { gte: new Date(parsed.data.from) } : {}),
    ...(parsed.data.to ? { lte: new Date(parsed.data.to) } : {}),
  };
  const logs = await prisma.activityLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200, include: { user: { select: { id: true, name: true, email: true, role: true } } } });
  res.json({ logs });
}));

router.get('/reports', ...adminOnly, asyncHandler(async (_req, res) => {
  const [users, activeUsers, orgs, logs, storage] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: 'ACTIVE' } }),
    prisma.organization.count(),
    prisma.activityLog.count(),
    prisma.fileUpload.aggregate({ _sum: { sizeBytes: true } }),
  ]);
  const registrations = await prisma.user.groupBy({ by: ['createdAt'], _count: { id: true } }).catch(() => []);
  res.json({
    reports: {
      users: { total: users, active: activeUsers, registrations },
      organizations: { total: orgs },
      activity: { total: logs },
      system: { storageBytes: storage._sum.sizeBytes ?? 0 },
    },
  });
}));

export default router;
