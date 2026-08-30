import { Request, Response, NextFunction } from 'express';
import { UserRole, ErrorCodes } from '@quickcommerce/shared';

/**
 * Require one of the specified roles
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: ErrorCodes.UNAUTHORIZED,
          message: 'Authentication required',
        },
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: ErrorCodes.FORBIDDEN,
          message: `Access denied. Requires one of roles: ${roles.join(', ')}`,
        },
      });
    }

    next();
  };
}

/**
 * Mandatory Store Data Isolation Middleware:
 * Verifies that the authenticated user is allowed to access/mutate data for the targeted store.
 * Super Admins can access all stores.
 * Store Admins & Store Staff can only access their assigned store.
 */
export function requireStoreScope(storeIdParamName: string = 'storeId') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: ErrorCodes.UNAUTHORIZED,
          message: 'Authentication required',
        },
      });
    }

    // SUPER_ADMIN has global access across all stores
    if (req.user.role === UserRole.SUPER_ADMIN) {
      return next();
    }

    const targetStoreId =
      req.params[storeIdParamName] ||
      (req.query[storeIdParamName] as string) ||
      req.body[storeIdParamName];

    if (!targetStoreId) {
      return res.status(400).json({
        success: false,
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: `Store scope identifier '${storeIdParamName}' is missing in request`,
        },
      });
    }

    // For STORE_ADMIN, STORE_STAFF, and DRIVER, check if targetStore matches assigned store
    if (req.user.storeId && req.user.storeId === targetStoreId) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: {
        code: ErrorCodes.FORBIDDEN,
        message: 'Store data isolation violation: You do not have permission to access or mutate this store.',
      },
    });
  };
}
