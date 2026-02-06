import type { Request, Response, NextFunction } from "express";

/**
 * Authenticated request with user information from Google OAuth
 */
export interface AuthenticatedRequest extends Request {
  user: {
    claims: {
      sub: string;
      email?: string;
      first_name?: string;
      last_name?: string;
      picture?: string;
    };
  };
}

/**
 * Type-safe async request handler for authenticated routes
 */
export type AsyncRequestHandler = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => Promise<void | Response>;

/**
 * Stripe webhook request with raw body and signature
 */
export interface StripeWebhookRequest extends Request {
  body: Buffer;
  headers: {
    'stripe-signature'?: string;
  };
}

/**
 * Generic async request handler (for routes that may or may not be authenticated)
 */
export type GenericAsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void | Response>;

/**
 * Middleware function type
 */
export type MiddlewareHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => void | Promise<void>;
