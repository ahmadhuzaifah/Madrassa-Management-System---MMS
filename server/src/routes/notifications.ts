import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { AppError, asyncHandler } from '../lib/errors';

const router = Router();

router.get('/', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  res.json({ notifications });
}));

router.get('/summary', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const unreadCount = await prisma.notification.count({ where: { userId: req.user!.id, isRead: false } });
  res.json({ unreadCount });
}));

router.patch('/:id/read', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!id) throw new AppError(400, 'Notification id is required', 'VALIDATION_ERROR');

  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification) throw new AppError(404, 'Notification not found', 'NOT_FOUND');
  if (notification.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
    throw new AppError(403, 'Forbidden', 'FORBIDDEN');
  }

  const updated = await prisma.notification.update({ where: { id }, data: { isRead: true } });
  res.json({ notification: updated });
}));

router.patch('/read-all', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  await prisma.notification.updateMany({ where: { userId: req.user!.id, isRead: false }, data: { isRead: true } });
  res.json({ message: 'All notifications marked as read' });
}));

router.delete('/:id', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification) throw new AppError(404, 'Notification not found', 'NOT_FOUND');
  if (notification.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
    throw new AppError(403, 'Forbidden', 'FORBIDDEN');
  }
  await prisma.notification.delete({ where: { id } });
  res.json({ message: 'Notification deleted' });
}));

export default router;
