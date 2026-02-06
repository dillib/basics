import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

/**
 * Validation schemas for API endpoints
 */

export const SupportRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  type: z.enum(['technical', 'billing', 'content', 'other'], {
    errorMap: () => ({ message: 'Type must be one of: technical, billing, content, other' }),
  }),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  subject: z.string().min(5, 'Subject must be at least 5 characters').max(200, 'Subject too long'),
  description: z.string().min(20, 'Description must be at least 20 characters').max(5000, 'Description too long'),
});

export const QuizAnswerSchema = z.object({
  questionId: z.string().uuid('Invalid question ID'),
  answer: z.number().int().min(0).max(3, 'Answer must be between 0 and 3'),
});

export const TopicGenerateSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title too long'),
});

export const TopicUpdateSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(1000).optional(),
  isPublic: z.boolean().optional(),
  isSample: z.boolean().optional(),
}).strict(); // Prevents unexpected fields

export const UserUpdateSchema = z.object({
  isAdmin: z.boolean().optional(),
  plan: z.enum(['free', 'pro']).optional(),
  proExpiresAt: z.string().datetime().nullable().optional(),
}).strict();

export const SupportRequestUpdateSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  resolvedAt: z.string().datetime().nullable().optional(),
}).strict();

export const MessageSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(5000, 'Message too long'),
});

/**
 * Middleware factory to validate request body against a Zod schema
 */
export function validate<T extends z.ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Parse and validate request body
      const validated = schema.parse(req.body);

      // Replace request body with validated data (removes extra fields)
      req.body = validated;

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Format validation errors for better readability
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        res.status(400).json({
          message: 'Validation failed',
          errors,
        });
        return;
      }

      // Pass other errors to error handler
      next(error);
    }
  };
}

/**
 * Middleware to validate query parameters
 */
export function validateQuery<T extends z.ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validated = schema.parse(req.query);
      req.query = validated as any;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        res.status(400).json({
          message: 'Query validation failed',
          errors,
        });
        return;
      }

      next(error);
    }
  };
}

/**
 * Query parameter schemas
 */
export const PaginationSchema = z.object({
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(100)).default('50'),
  offset: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(0)).default('0'),
}).partial();

export const DateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
}).partial();
