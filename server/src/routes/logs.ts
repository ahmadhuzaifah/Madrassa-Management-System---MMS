import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../lib/errors';

const router = Router();

router.get('/', requireAuth, requireRole(['ADMIN']), asyncHandler(async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const size = Math.min(Number(req.query.size ?? 10), 50);
  const action = String(req.query.action ?? '');

  const where = action ? { action: { contains: action } } : {};
  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * size,
      take: size,
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.activityLog.count({ where }),
  ]);

  res.json({ logs, pagination: { page, size, total, pages: Math.ceil(total / size) } });
}));

router.get('/me', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const logs = await prisma.activityLog.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json({ logs });
}));

export default router;
