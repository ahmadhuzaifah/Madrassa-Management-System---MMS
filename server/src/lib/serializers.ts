import type { User } from '@prisma/client';

export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  emailVerified: true,
  avatarUrl: true,
  phone: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const serializeUser = (user: User) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  emailVerified: user.emailVerified,
  avatarUrl: user.avatarUrl,
  phone: user.phone,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});
