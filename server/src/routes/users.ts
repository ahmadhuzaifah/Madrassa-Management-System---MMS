import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { logActivity } from '../lib/activity';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../middleware/auth';
import { AppError, asyncHandler } from '../lib/errors';
import { publicUserSelect, serializeUser } from '../lib/serializers';

const router = Router();

const getParamId = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

router.get('/', requireAuth, requireRole(['ADMIN']), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const querySchema = z.object({
    page: z.string().optional(),
    size: z.string().optional(),
    search: z.string().optional(),
    role: z.string().optional(),
    status: z.string().optional(),
    sort: z.enum(['createdAt', 'name', 'email', 'status']).optional(),
  });

  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(400, 'Invalid query parameters', 'VALIDATION_ERROR', parsed.error.flatten());
  }

  const page = Number(parsed.data.page ?? 1);
  const size = Math.min(Number(parsed.data.size ?? 10), 50);
  const search = parsed.data.search ?? '';
  const role = parsed.data.role ?? '';
  const status = parsed.data.status ?? '';
  const sort = parsed.data.sort ?? 'createdAt';

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
    ];
  }
  if (role) where.role = role;
  if (status) where.status = status;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { [sort]: 'desc' },
      skip: (page - 1) * size,
      take: size,
      select: publicUserSelect,
    }),
    prisma.user.count({ where }),
  ]);

  res.json({ users, pagination: { page, size, total, pages: Math.ceil(total / size) } });
}));

router.get('/:id', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const id = getParamId(req.params.id);
  if (!id) throw new AppError(400, 'User id is required', 'VALIDATION_ERROR');
  if (req.user?.role !== 'ADMIN' && req.user?.id !== id) {
    throw new AppError(403, 'Forbidden', 'FORBIDDEN');
  }

  const user = await prisma.user.findUnique({
    where: { id },
    include: { settings: true, subscriptions: { include: { plan: true } } },
  });

  if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');
  const { passwordHash: _passwordHash, ...safeUser } = user;
  res.json({ user: safeUser });
}));

router.patch('/:id', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const id = getParamId(req.params.id);
  if (!id) throw new AppError(400, 'User id is required', 'VALIDATION_ERROR');
  if (req.user?.role !== 'ADMIN' && req.user?.id !== id) {
    throw new AppError(403, 'Forbidden', 'FORBIDDEN');
  }

  const adminSchema = z.object({ role: z.enum(['ADMIN', 'USER']).optional(), status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional() });
  const selfSchema = z.object({ name: z.string().min(2).optional(), phone: z.string().optional() });
  const parsed = req.user?.role === 'ADMIN' ? adminSchema.safeParse(req.body) : selfSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError(400, 'Invalid update payload', 'VALIDATION_ERROR', parsed.error.flatten());
  }

  const updated = await prisma.user.update({ where: { id }, data: parsed.data });
  await logActivity({ userId: req.user!.id, action: 'updated_user', entityType: 'user', entityId: id });
  res.json({ user: serializeUser(updated) });
}));

router.delete('/:id', requireAuth, requireRole(['ADMIN']), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const id = getParamId(req.params.id);
  if (!id) throw new AppError(400, 'User id is required', 'VALIDATION_ERROR');
  await prisma.user.delete({ where: { id } });
  await logActivity({ userId: req.user!.id, action: 'deleted_user', entityType: 'user', entityId: id });
  res.json({ message: 'User deleted' });
}));

export default router;
