import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code = 'INTERNAL_ERROR',
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const asyncHandler = (handler: RequestHandler): RequestHandler =>
  (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction) =>
  next(new AppError(404, `Route ${req.method} ${req.originalUrl} was not found`, 'NOT_FOUND'));

export const errorHandler = (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  let appError: AppError;

  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof ZodError) {
    appError = new AppError(400, 'Request validation failed', 'VALIDATION_ERROR', error.flatten());
  } else if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    appError = new AppError(409, 'A record with this value already exists', 'CONFLICT');
  } else if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
    appError = new AppError(404, 'Requested record was not found', 'NOT_FOUND');
  } else if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'LIMIT_FILE_SIZE') {
    appError = new AppError(413, 'Uploaded file is too large', 'FILE_TOO_LARGE');
  } else {
    appError = new AppError(500, 'An unexpected server error occurred');
  }

  if (appError.statusCode >= 500) console.error('[api:error]', error);
  res.status(appError.statusCode).json({
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.details ? { details: appError.details } : {}),
    },
  });
};
