import { describe, it, expect, vi } from 'vitest';
import { AppError, handleError, Errors } from '../errors';
import type { Response } from 'express';

// Mock Express Response
function createMockResponse(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

describe('Error Handling', () => {
  describe('AppError', () => {
    it('should create an error with default status code 500', () => {
      const error = new AppError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe('AppError');
    });

    it('should create an error with custom status code', () => {
      const error = new AppError('Not found', 404);
      expect(error.message).toBe('Not found');
      expect(error.statusCode).toBe(404);
    });

    it('should create an error with error code and details', () => {
      const error = new AppError('Validation error', 400, 'VALIDATION_ERROR', { field: 'email' });
      expect(error.message).toBe('Validation error');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual({ field: 'email' });
    });

    it('should have a stack trace', () => {
      const error = new AppError('Test error');
      expect(error.stack).toBeDefined();
    });
  });

  describe('handleError', () => {
    it('should handle AppError with custom status code', () => {
      const res = createMockResponse();
      const error = new AppError('Not found', 404, 'NOT_FOUND');

      handleError(error, res, 'Test Context');

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Not found',
        code: 'NOT_FOUND',
      });
    });

    it('should handle generic Error instances', () => {
      const res = createMockResponse();
      const error = new Error('Generic error');

      // Set production environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      handleError(error, res, 'Test Context');

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'An unexpected error occurred',
      });

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should expose error message in development', () => {
      const res = createMockResponse();
      const error = new Error('Development error');

      // Set development environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      handleError(error, res, 'Test Context');

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Development error',
      });

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle unknown error types', () => {
      const res = createMockResponse();
      const error = 'String error';

      handleError(error, res, 'Test Context');

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'An unexpected error occurred',
      });
    });

    it('should log error context', () => {
      const res = createMockResponse();
      const error = new AppError('Test error', 400);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      handleError(error, res, 'Custom Context');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Custom Context] Error:',
        expect.objectContaining({
          message: 'Test error',
        })
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Errors factory', () => {
    it('should create notFound error', () => {
      const error = Errors.notFound('User');
      expect(error.message).toBe('User not found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });

    it('should create unauthorized error with default message', () => {
      const error = Errors.unauthorized();
      expect(error.message).toBe('Authentication required');
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
    });

    it('should create unauthorized error with custom message', () => {
      const error = Errors.unauthorized('Invalid token');
      expect(error.message).toBe('Invalid token');
      expect(error.statusCode).toBe(401);
    });

    it('should create forbidden error with default message', () => {
      const error = Errors.forbidden();
      expect(error.message).toBe('Access denied');
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
    });

    it('should create forbidden error with custom message', () => {
      const error = Errors.forbidden('Admin access required');
      expect(error.message).toBe('Admin access required');
      expect(error.statusCode).toBe(403);
    });

    it('should create badRequest error', () => {
      const error = Errors.badRequest('Invalid input');
      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('BAD_REQUEST');
    });

    it('should create badRequest error with details', () => {
      const error = Errors.badRequest('Invalid input', { field: 'email' });
      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ field: 'email' });
    });

    it('should create conflict error', () => {
      const error = Errors.conflict('Resource already exists');
      expect(error.message).toBe('Resource already exists');
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
    });

    it('should create validation error', () => {
      const error = Errors.validation('Validation failed');
      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
    });

    it('should create validation error with details', () => {
      const details = { errors: [{ field: 'email', message: 'Invalid' }] };
      const error = Errors.validation('Validation failed', details);
      expect(error.message).toBe('Validation failed');
      expect(error.details).toEqual(details);
    });
  });
});
