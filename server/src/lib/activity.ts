import { prisma } from './prisma';

export const logActivity = async ({
  userId,
  action,
  entityType,
  entityId,
  metadata,
}: {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
}) => {
  await prisma.activityLog.create({
    data: {
      userId: userId ?? null,
      action,
      entityType,
      entityId: entityId ?? null,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });
};
