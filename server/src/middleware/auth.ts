import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../lib/auth';
import { prisma } from '../lib/prisma';
import { AppError, asyncHandler } from '../lib/errors';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

export const requireAuth = asyncHandler(async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : req.cookies?.token;

  if (!token) {
    throw new AppError(401, 'Authentication required', 'AUTHENTICATION_REQUIRED');
  }

  let payload: { sub: string; role: string };
  try {
    payload = verifyToken(token);
  } catch {
    throw new AppError(401, 'Invalid or expired token', 'INVALID_SESSION');
  }
  const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, role: true, status: true } });
  if (!user) throw new AppError(401, 'Session is no longer valid', 'INVALID_SESSION');
  if (user.status !== 'ACTIVE') throw new AppError(403, 'This account is not active', 'ACCOUNT_INACTIVE');
  req.user = { id: user.id, role: user.role };
  next();
});

export const requireRole = (allowedRoles: string[]) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) return next(new AppError(401, 'Authentication required', 'AUTHENTICATION_REQUIRED'));
  if (!allowedRoles.includes(req.user.role)) {
    return next(new AppError(403, 'Forbidden', 'FORBIDDEN'));
  }
  next();
};
