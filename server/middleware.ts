import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './types';
import { storage } from './storage';
import { Errors, handleError } from './errors';

/**
 * Middleware to check if user is authenticated
 * Already exported from auth.ts, but documented here for completeness
 */
export { isAuthenticated } from './auth';

/**
 * Middleware to check if user has Pro subscription
 */
export const requirePro = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) throw Errors.unauthorized();

    const user = await storage.getUser(userId);
    if (!user || user.plan !== 'pro') {
      throw Errors.forbidden('Pro subscription required for this feature');
    }

    if (user.proExpiresAt && new Date(user.proExpiresAt) < new Date()) {
      throw Errors.forbidden('Your Pro subscription has expired. Please renew to continue using Pro features.');
    }

    next();
  } catch (error) {
    handleError(error, res, 'Pro User Check');
  }
};

/**
 * Middleware to check if user is an admin
 */
export const requireAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) throw Errors.unauthorized();

    const user = await storage.getUser(userId);
    if (!user || !user.isAdmin) {
      throw Errors.forbidden('Admin access required');
    }

    next();
  } catch (error) {
    handleError(error, res, 'Admin Check');
  }
};
