import { Router } from 'express';
import { z } from 'zod';
import { comparePasswords, createRandomToken, createToken, hashPassword } from '../lib/auth';
import { logActivity } from '../lib/activity';
import { prisma } from '../lib/prisma';
import { emailTemplates, sendEmail } from '../lib/email';
import type { AuthenticatedRequest } from '../middleware/auth';
import { requireAuth } from '../middleware/auth';
import { AppError, asyncHandler } from '../lib/errors';
import { serializeUser } from '../lib/serializers';

const router = Router();

const passwordSchema = z.string().min(12).regex(/[A-Z]/, 'Password must include an uppercase letter').regex(/[a-z]/, 'Password must include a lowercase letter').regex(/[0-9]/, 'Password must include a number');

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: passwordSchema,
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
const profileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(7).max(20).optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const sessionCookieOptions = {
  ...cookieOptions,
  signed: false,
};

const isLoginBlocked = (status: string) => ['SUSPENDED', 'DISABLED'].includes(status);
const isPendingVerification = (status: string) => status === 'PENDING_VERIFICATION';
const getPermissions = (role: string) => (role === 'ADMIN' ? ['auth:me', 'users:read', 'users:write', 'reports:read', 'settings:write'] : ['auth:me', 'settings:write']);

router.post('/register', asyncHandler(async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, 'Invalid registration payload', 'VALIDATION_ERROR', parsed.error.flatten());
  }

  const { name, email, password } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError(409, 'Email already registered', 'EMAIL_ALREADY_REGISTERED');
  }

  const passwordHash = await hashPassword(password);
  const user: any = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: 'USER',
      status: 'PENDING_VERIFICATION',
      settings: { create: {} },
    },
  });

  const organization: any = await prisma.organization.create({
    data: {
      name: `${name}'s Workspace`,
      ownerId: user.id,
      members: {
        create: { userId: user.id, role: 'OWNER' },
      },
    },
  });

  const token = createRandomToken();
  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    },
  });

  const freePlan = await prisma.plan.findFirst({ where: { slug: 'free' } });
  if (freePlan) {
    await prisma.subscription.create({
      data: {
        userId: user.id,
        planId: freePlan.id,
        status: 'TRIAL',
        interval: 'MONTHLY',
        currentPeriodEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      },
    });
  }

  await sendEmail({
    to: user.email,
    subject: 'Verify your email',
    html: emailTemplates.verification(name, token),
  });

  await logActivity({ userId: user.id, action: 'registered', entityType: 'user' });

  const sessionToken = createToken({ sub: user.id, role: user.role, ver: 0 });
  res.cookie('token', sessionToken, sessionCookieOptions);
  res.status(201).json({
    message: 'Registration successful. Please verify your email.',
    token: sessionToken,
    user: serializeUser(user),
  });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, 'Invalid login payload', 'VALIDATION_ERROR', parsed.error.flatten());
  }

  const user: any = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await comparePasswords(parsed.data.password, user.passwordHash))) {
    throw new AppError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
  }
  if (isLoginBlocked(user.status)) throw new AppError(403, 'This account is not active', 'ACCOUNT_INACTIVE');

  const token = createToken({ sub: user.id, role: user.role, ver: user.sessionVersion });
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  res.cookie('token', token, sessionCookieOptions);

  await logActivity({ userId: user.id, action: 'logged_in', entityType: 'session' });

  res.json({
    message: 'Login successful',
    token,
    user: serializeUser(user),
    requiresVerification: isPendingVerification(user.status) || !user.emailVerified,
  });
}));

router.get('/me', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const user: any = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { settings: true, subscriptions: { include: { plan: true } }, notifications: { take: 5, orderBy: { createdAt: 'desc' } } },
  });

  if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');

  res.json({
    user: {
      profile: serializeUser(user),
      role: user.role,
      permissions: getPermissions(user.role),
      organization: await prisma.organization.findFirst({ where: { ownerId: user.id }, include: { members: { include: { user: { select: { id: true, name: true, email: true, role: true, status: true } } } } } }),
      settings: user.settings,
      emailVerified: user.emailVerified,
      status: user.status,
      subscriptions: user.subscriptions,
    },
  });
}));

router.post('/logout', (_req, res) => {
  res.clearCookie('token', sessionCookieOptions);
  res.clearCookie('csrf_token');
  res.json({ message: 'Logged out' });
});

router.post('/logout-all-sessions', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  await prisma.user.update({ where: { id: req.user!.id }, data: { sessionVersion: { increment: 1 } } });
  res.clearCookie('token', sessionCookieOptions);
  res.clearCookie('csrf_token');
  await logActivity({ userId: req.user!.id, action: 'logout_all_sessions', entityType: 'session' });
  res.json({ message: 'All sessions logged out' });
}));

router.post('/forgot-password', asyncHandler(async (req, res) => {
  const email = z.string().email().safeParse(req.body.email);
  if (!email.success) throw new AppError(400, 'Invalid email', 'VALIDATION_ERROR', email.error.flatten());

  const user: any = await prisma.user.findUnique({ where: { email: email.data } });
  if (!user) return res.status(200).json({ message: 'If the email exists, a reset link was sent.' });

  const token = createRandomToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 2),
    },
  });

  await sendEmail({
    to: user.email,
    subject: 'Reset your password',
    html: emailTemplates.passwordReset(user.name, token),
  });

  res.json({ message: 'If the email exists, a reset link was sent.' });
}));

router.post('/reset-password', asyncHandler(async (req, res) => {
  const schema = z.object({ token: z.string(), password: passwordSchema });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid reset payload', 'VALIDATION_ERROR', parsed.error.flatten());

  const reset: any = await prisma.passwordResetToken.findUnique({ where: { token: parsed.data.token } });
  if (!reset || reset.expiresAt < new Date() || reset.usedAt) {
    throw new AppError(400, 'Invalid or expired reset token', 'INVALID_RESET_TOKEN');
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.user.update({ where: { id: reset.userId }, data: { passwordHash } });
  await prisma.passwordResetToken.update({ where: { id: reset.id }, data: { usedAt: new Date() } });

  await logActivity({ userId: reset.userId, action: 'password_reset', entityType: 'user' });
  res.json({ message: 'Password updated successfully' });
}));

router.post('/verify-email', asyncHandler(async (req, res) => {
  const schema = z.object({ token: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid token', 'VALIDATION_ERROR', parsed.error.flatten());

  const verification: any = await prisma.emailVerificationToken.findUnique({ where: { token: parsed.data.token } });
  if (!verification || verification.expiresAt < new Date() || verification.usedAt) {
    throw new AppError(400, 'Invalid or expired verification token', 'INVALID_VERIFICATION_TOKEN');
  }

  await prisma.user.update({ where: { id: verification.userId }, data: { emailVerified: true } });
  await prisma.emailVerificationToken.update({ where: { id: verification.id }, data: { usedAt: new Date() } });
  await prisma.user.update({ where: { id: verification.userId }, data: { status: 'ACTIVE' } });
  await logActivity({ userId: verification.userId, action: 'email_verified', entityType: 'user' });

  const user: any = await prisma.user.findUnique({ where: { id: verification.userId } });
  if (user) {
    await sendEmail({
      to: user.email,
      subject: 'Welcome to Northstar',
      html: emailTemplates.welcome(user.name),
    });
  }

  res.json({ message: 'Email verified successfully' });
}));

router.post('/resend-verification', asyncHandler(async (req, res) => {
  const parsed = z.object({ email: z.string().email() }).safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid email', 'VALIDATION_ERROR', parsed.error.flatten());

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) return res.json({ message: 'If the email exists, a verification email was sent.' });

  if (user.emailVerified) return res.json({ message: 'Email is already verified.' });

  const token = createRandomToken();
  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    },
  });

  await sendEmail({
    to: user.email,
    subject: 'Verify your email',
    html: emailTemplates.verification(user.name, token),
  });

  res.json({ message: 'If the email exists, a verification email was sent.' });
}));

router.put('/profile', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid profile payload', 'VALIDATION_ERROR', parsed.error.flatten());

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      ...(parsed.data.name ? { name: parsed.data.name } : {}),
      ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone } : {}),
      ...(parsed.data.avatarUrl !== undefined ? { avatarUrl: parsed.data.avatarUrl } : {}),
      sessionVersion: { increment: 1 },
    },
    include: { settings: true },
  });

  await logActivity({ userId: req.user!.id, action: 'profile_updated', entityType: 'user' });

  res.json({ user: serializeUser(user) });
}));

router.post('/change-password', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const schema = z.object({
    currentPassword: z.string().min(8),
    newPassword: passwordSchema,
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid password payload', 'VALIDATION_ERROR', parsed.error.flatten());

  const user: any = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user || !(await comparePasswords(parsed.data.currentPassword, user.passwordHash))) {
    throw new AppError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  await logActivity({ userId: user.id, action: 'password_changed', entityType: 'user' });

  res.json({ message: 'Password updated successfully' });
}));

export default router;
