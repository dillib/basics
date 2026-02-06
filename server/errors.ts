import type { Response } from 'express';

/**
 * Custom application error class with status code and optional error code
 */
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Centralized error handler that logs and responds with appropriate error messages
 */
export function handleError(error: unknown, res: Response, context: string): Response {
  // Log error with context for debugging
  console.error(`[${context}] Error:`, {
    message: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    details: error instanceof AppError ? error.details : undefined,
  });

  // Handle AppError instances with custom status codes
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      message: error.message,
      code: error.code,
    });
  }

  // Handle generic Error instances
  if (error instanceof Error) {
    return res.status(500).json({
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : error.message,
    });
  }

  // Handle unknown error types
  return res.status(500).json({
    message: 'An unexpected error occurred',
  });
}

/**
 * Common error factory functions
 */
export const Errors = {
  notFound: (resource: string) =>
    new AppError(`${resource} not found`, 404, 'NOT_FOUND'),

  unauthorized: (message = 'Authentication required') =>
    new AppError(message, 401, 'UNAUTHORIZED'),

  forbidden: (message = 'Access denied') =>
    new AppError(message, 403, 'FORBIDDEN'),

  badRequest: (message: string, details?: unknown) =>
    new AppError(message, 400, 'BAD_REQUEST', details),

  conflict: (message: string) =>
    new AppError(message, 409, 'CONFLICT'),

  validation: (message: string, details?: unknown) =>
    new AppError(message, 400, 'VALIDATION_ERROR', details),
};
