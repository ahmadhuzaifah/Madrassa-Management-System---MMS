import { prisma } from './lib/prisma.js';
import { hashPassword } from './lib/auth.js';

async function main() {
  const planCount = await prisma.plan.count();
  if (planCount === 0) {
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
  }

  const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
  if (adminCount === 0) {
    await prisma.user.create({
      data: {
        name: 'Northstar Admin',
        email: 'admin@northstar.example',
        passwordHash: await hashPassword('ChangeMe123!'),
        role: 'ADMIN',
        settings: { create: {} },
      },
    });
  }
}

main().finally(() => prisma.$disconnect());
