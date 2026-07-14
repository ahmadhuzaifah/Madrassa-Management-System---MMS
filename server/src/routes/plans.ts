import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { logActivity } from '../lib/activity';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../middleware/auth';
import { AppError, asyncHandler } from '../lib/errors';

const router = Router();

const seedPlans = async () => {
  const count = await prisma.plan.count();
  if (count > 0) return;

  await prisma.plan.createMany({
    data: [
      {
        name: 'Free',
        slug: 'free',
        description: 'For early teams exploring the platform.',
        priceMonthly: 0,
        priceYearly: 0,
        trialDays: 14,
        maxUsers: 3,
        maxProjects: 10,
        storageLimitGb: 25,
        features: 'Basic analytics, 3 seats, community support',
        stripePriceId: 'price_free',
      },
      {
        name: 'Pro',
        slug: 'pro',
        description: 'For growing SaaS teams that need automation.',
        priceMonthly: 49,
        priceYearly: 490,
        trialDays: 14,
        maxUsers: 10,
        maxProjects: 100,
        storageLimitGb: 200,
        features: 'Advanced reporting, audit logs, team workspaces',
        stripePriceId: 'price_pro',
      },
      {
        name: 'Scale',
        slug: 'scale',
        description: 'For mature organizations with compliance requirements.',
        priceMonthly: 149,
        priceYearly: 1490,
        trialDays: 30,
        maxUsers: 50,
        maxProjects: 500,
        storageLimitGb: 1000,
        features: 'SSO, SLA, priority support, custom reports',
        stripePriceId: 'price_scale',
      },
    ],
  });
};

router.get('/', requireAuth, asyncHandler(async (_req, res) => {
  await seedPlans();
  const plans = await prisma.plan.findMany({ where: { isActive: true }, orderBy: { priceMonthly: 'asc' } });
  res.json({ plans });
}));

router.post('/', requireAuth, requireRole(['ADMIN']), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const schema = z.object({
    name: z.string(),
    slug: z.string(),
    description: z.string(),
    priceMonthly: z.number(),
    priceYearly: z.number(),
    trialDays: z.number().optional(),
    maxUsers: z.number().optional(),
    maxProjects: z.number().optional(),
    storageLimitGb: z.number().optional(),
    features: z.string(),
    stripePriceId: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid plan payload', 'VALIDATION_ERROR', parsed.error.flatten());

  const plan = await prisma.plan.create({ data: parsed.data });
  await logActivity({ userId: req.user!.id, action: 'created_plan', entityType: 'plan', entityId: plan.id });

  res.status(201).json({ plan });
}));

export default router;
