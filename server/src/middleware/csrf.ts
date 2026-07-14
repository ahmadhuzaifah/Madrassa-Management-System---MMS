import type { NextFunction, Request, Response } from 'express';
import { createRandomToken } from '../lib/auth';
import { AppError } from '../lib/errors';

const cookieName = 'csrf_token';

export const issueCsrfToken = (_req: Request, res: Response) => {
  const token = createRandomToken();
  res.cookie(cookieName, token, {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.json({ csrfToken: token });
};

export const requireCsrfToken = (req: Request, _res: Response, next: NextFunction) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || req.headers.authorization?.startsWith('Bearer ')) return next();
  const headerToken = req.get('X-CSRF-Token');
  if (!headerToken || headerToken !== req.cookies?.[cookieName]) {
    return next(new AppError(403, 'A valid CSRF token is required', 'CSRF_VALIDATION_FAILED'));
  }
  next();
};
