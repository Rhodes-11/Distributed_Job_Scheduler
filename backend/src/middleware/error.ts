import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../lib/logger';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction): void => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
    });
    return;
  }
  if (err?.status && typeof err.status === 'number') {
    res.status(err.status).json({
      error: err.code || 'ERROR',
      message: err.message || 'An error occurred',
    });
    return;
  }
  logger.error({ err }, 'unhandled error');
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'Internal server error',
  });
};

export class AppError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
