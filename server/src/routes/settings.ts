import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { AppError, asyncHandler } from '../lib/errors';

const router = Router();

router.get('/me', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const settings = await prisma.setting.findUnique({ where: { userId: req.user!.id } });
  res.json({ settings });
}));

router.put('/me', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const schema = z.object({
    theme: z.enum(['light', 'dark']).optional(),
    notificationsEnabled: z.boolean().optional(),
    timezone: z.string().optional(),
    language: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid settings payload', 'VALIDATION_ERROR', parsed.error.flatten());

  const settings = await prisma.setting.upsert({
    where: { userId: req.user!.id },
    create: { userId: req.user!.id, ...parsed.data },
    update: parsed.data,
  });

  res.json({ settings });
}));

export default router;
