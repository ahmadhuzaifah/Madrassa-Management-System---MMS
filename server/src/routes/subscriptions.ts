import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { logActivity } from '../lib/activity';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { AppError, asyncHandler } from '../lib/errors';

const router = Router();

router.get('/me', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const subscription = await prisma.subscription.findFirst({
    where: { userId: req.user!.id },
    include: { plan: true, invoices: { orderBy: { issuedAt: 'desc' } } },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ subscription });
}));

router.post('/checkout', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const schema = z.object({ planId: z.string(), interval: z.enum(['MONTHLY', 'YEARLY']) });
  const parsed = schema.safeParse(req.body);

  if (!parsed.success) throw new AppError(400, 'Invalid checkout payload', 'VALIDATION_ERROR', parsed.error.flatten());

  const plan = await prisma.plan.findUnique({ where: { id: parsed.data.planId } });
  if (!plan || !plan.isActive) throw new AppError(404, 'Plan not found', 'NOT_FOUND');

  const existing = await prisma.subscription.findFirst({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' } });
  let subscriptionRecord;

  const periodEnd = new Date(Date.now() + (parsed.data.interval === 'YEARLY' ? 1000 * 60 * 60 * 24 * 365 : 1000 * 60 * 60 * 24 * 30));

  if (existing) {
    subscriptionRecord = await prisma.subscription.update({
      where: { id: existing.id },
      data: {
        planId: plan.id,
        interval: parsed.data.interval,
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
      },
    });
  } else {
    subscriptionRecord = await prisma.subscription.create({
      data: {
        userId: req.user!.id,
        planId: plan.id,
        interval: parsed.data.interval,
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
      },
    });
  }

  await prisma.invoice.create({
    data: {
      subscriptionId: subscriptionRecord.id,
      amount: parsed.data.interval === 'YEARLY' ? plan.priceYearly : plan.priceMonthly,
      currency: 'usd',
      invoiceNumber: `INV-${Date.now()}`,
      status: 'paid',
      pdfUrl: '/api/reports/export',
    },
  });

  await logActivity({ userId: req.user!.id, action: 'updated_subscription', entityType: 'subscription', metadata: { planId: plan.id, interval: parsed.data.interval } });

  res.json({ message: 'Subscription updated successfully', checkoutUrl: '/billing' });
}));

router.post('/:id/cancel', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!id) throw new AppError(400, 'Subscription id is required', 'VALIDATION_ERROR');

  const subscription = await prisma.subscription.findUnique({ where: { id } });
  if (!subscription) throw new AppError(404, 'Subscription not found', 'NOT_FOUND');
  if (subscription.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
    throw new AppError(403, 'Forbidden', 'FORBIDDEN');
  }

  const canceled = await prisma.subscription.update({
    where: { id },
    data: { cancelAtPeriodEnd: true, status: 'CANCELED' },
  });
  await logActivity({ userId: req.user!.id, action: 'canceled_subscription', entityType: 'subscription', entityId: canceled.id });
  res.json({ message: 'Subscription canceled', subscription: canceled });
}));

export default router;
