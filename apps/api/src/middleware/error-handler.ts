import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ErrorCodes } from '@quickcommerce/shared';
import { logger } from './request-tracker';

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(code: string, message: string, statusCode: number = 400, details?: any) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const requestId = req.headers['x-request-id'] as string;

  // 1. Handle Zod validation errors
  if (err instanceof ZodError) {
    logger.warn({ requestId, issues: err.issues }, 'Validation Error');
    return res.status(400).json({
      success: false,
      error: {
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Invalid request payload',
        details: err.flatten().fieldErrors,
      },
    });
  }

  // 2. Handle Custom AppError instances
  if (err instanceof AppError) {
    logger.warn({ requestId, code: err.code, message: err.message, details: err.details }, 'Application Warning / Handled Error');
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  // 3. Handle Prisma specific error codes
  if (err?.code === 'P2002') {
    // Unique constraint failed
    const target = (err.meta?.target as string[]) || [];
    logger.warn({ requestId, target }, 'Prisma Unique Constraint Violation');
    return res.status(409).json({
      success: false,
      error: {
        code: ErrorCodes.CONCURRENT_MODIFICATION,
        message: `A record with unique field [${target.join(', ')}] already exists.`,
      },
    });
  }

  if (err?.code === 'P2025') {
    // Record to update/delete not found
    return res.status(404).json({
      success: false,
      error: {
        code: ErrorCodes.RESOURCE_NOT_FOUND,
        message: 'Requested record was not found or was concurrently modified.',
      },
    });
  }

  // 4. Unknown Internal Server Error
  logger.error({ requestId, err: err?.stack || err?.message || err }, 'Unhandled Internal Server Error');
  return res.status(500).json({
    success: false,
    error: {
      code: ErrorCodes.INTERNAL_SERVER_ERROR,
      message: 'An unexpected internal error occurred. Please try again later.',
    },
  });
}
