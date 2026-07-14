import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../lib/errors';

const router = Router();

router.get('/overview', requireAuth, requireRole(['ADMIN']), asyncHandler(async (_req, res) => {
  const [users, subscriptions, invoices, logs] = await Promise.all([
    prisma.user.count(),
    prisma.subscription.count(),
    prisma.invoice.count(),
    prisma.activityLog.count(),
  ]);

  res.json({
    overview: {
      users,
      subscriptions,
      invoices,
      activityLogs: logs,
    },
  });
}));

const escapeCsv = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;

router.get('/export', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const invoices = await prisma.invoice.findMany({
    where: req.user!.role === 'ADMIN' ? {} : { subscription: { userId: req.user!.id } },
    orderBy: { issuedAt: 'desc' },
    take: 100,
  });
  const csv = ['id,invoiceNumber,amount,currency,status,issuedAt', ...invoices.map((invoice) => [invoice.id, invoice.invoiceNumber, invoice.amount, invoice.currency, invoice.status, invoice.issuedAt.toISOString()].map(escapeCsv).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=invoice-export.csv');
  res.send(csv);
}));

export default router;
