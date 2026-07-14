import { Router } from 'express';
import { z } from 'zod';
import { comparePasswords, createRandomToken, createToken, hashPassword } from '../lib/auth';
import { logActivity } from '../lib/activity';
import { prisma } from '../lib/prisma';
import { sendEmail } from '../lib/email';
import type { AuthenticatedRequest } from '../middleware/auth';
import { requireAuth } from '../middleware/auth';
import { AppError, asyncHandler } from '../lib/errors';
import { serializeUser } from '../lib/serializers';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

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
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: 'USER',
      settings: { create: {} },
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
    html: `<p>Hello ${name},</p><p>Your verification token is <strong>${token}</strong>.</p>`,
  });

  await logActivity({ userId: user.id, action: 'registered', entityType: 'user' });

  const sessionToken = createToken({ sub: user.id, role: user.role });
  res.cookie('token', sessionToken, cookieOptions);
  res.status(201).json({
    message: 'Registration successful. Please verify your email.',
    token: sessionToken,
    user: serializeUser(user),
  });
}));

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

router.post('/login', asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, 'Invalid login payload', 'VALIDATION_ERROR', parsed.error.flatten());
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await comparePasswords(parsed.data.password, user.passwordHash))) {
    throw new AppError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
  }
  if (user.status !== 'ACTIVE') throw new AppError(403, 'This account is not active', 'ACCOUNT_INACTIVE');

  const token = createToken({ sub: user.id, role: user.role });
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  res.cookie('token', token, cookieOptions);

  await logActivity({ userId: user.id, action: 'logged_in', entityType: 'session' });

  res.json({
    message: 'Login successful',
    token,
    user: serializeUser(user),
  });
}));

router.get('/me', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { settings: true, subscriptions: { include: { plan: true } }, notifications: { take: 5, orderBy: { createdAt: 'desc' } } },
  });

  if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');

  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, emailVerified: user.emailVerified, settings: user.settings, subscriptions: user.subscriptions } });
}));

router.post('/logout', (_req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

router.post('/forgot-password', asyncHandler(async (req, res) => {
  const email = z.string().email().safeParse(req.body.email);
  if (!email.success) throw new AppError(400, 'Invalid email', 'VALIDATION_ERROR', email.error.flatten());

  const user = await prisma.user.findUnique({ where: { email: email.data } });
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
    html: `<p>Hello ${user.name},</p><p>Your password reset token is <strong>${token}</strong>.</p>`,
  });

  res.json({ message: 'If the email exists, a reset link was sent.' });
}));

router.post('/reset-password', asyncHandler(async (req, res) => {
  const schema = z.object({ token: z.string(), password: z.string().min(8) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid reset payload', 'VALIDATION_ERROR', parsed.error.flatten());

  const reset = await prisma.passwordResetToken.findUnique({ where: { token: parsed.data.token } });
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

  const verification = await prisma.emailVerificationToken.findUnique({ where: { token: parsed.data.token } });
  if (!verification || verification.expiresAt < new Date() || verification.usedAt) {
    throw new AppError(400, 'Invalid or expired verification token', 'INVALID_VERIFICATION_TOKEN');
  }

  await prisma.user.update({ where: { id: verification.userId }, data: { emailVerified: true } });
  await prisma.emailVerificationToken.update({ where: { id: verification.id }, data: { usedAt: new Date() } });

  res.json({ message: 'Email verified successfully' });
}));

export default router;
