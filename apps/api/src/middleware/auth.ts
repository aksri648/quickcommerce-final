import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../database/prisma';
import { UserRole } from '@quickcommerce/shared';
import { ErrorCodes } from '@quickcommerce/shared';

export interface AuthenticatedUser {
  id: string;
  auth0Id: string;
  email: string;
  role: UserRole;
  storeId?: string; // Store ID for store staff / admin / driver
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Authentication token required',
      },
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
    return res.status(401).json({
      success: false,
      error: { code: ErrorCodes.UNAUTHORIZED, message: 'Malformed authentication token' },
    });
  }
  const token = parts[1];

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as any;
    if (!decoded || (!decoded.id && !decoded.sub)) {
      return res.status(401).json({ success: false, error: { code: ErrorCodes.UNAUTHORIZED, message: 'Invalid token payload' } });
    }
    
    // Find or verify user in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id || decoded.sub },
      include: {
        storeStaff: { where: { isActive: true } },
        driverProfile: true,
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: {
          code: ErrorCodes.UNAUTHORIZED,
          message: 'User account not found or inactive',
        },
      });
    }

    const storeId =
      user.storeStaff?.[0]?.storeId ||
      user.driverProfile?.storeId ||
      decoded.storeId ||
      undefined;

    req.user = {
      id: user.id,
      auth0Id: user.auth0Id || '',
      email: user.email || '',
      role: (user.role as UserRole) || UserRole.CUSTOMER,
      storeId,
    };

    next();
  } catch (err: any) {
    if (err instanceof jwt.JsonWebTokenError || err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: { code: ErrorCodes.UNAUTHORIZED, message: 'Invalid or expired authentication token' },
      });
    }
    next(err);
  }
}

/**
 * Optional authentication middleware for public endpoints that can personalize when authenticated
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as any;
      const user = await prisma.user.findUnique({
        where: { id: decoded.id || decoded.sub },
        include: {
          storeStaff: { where: { isActive: true } },
          driverProfile: true,
        },
      });

      if (user && user.isActive) {
        req.user = {
          id: user.id,
          auth0Id: user.auth0Id,
          email: user.email,
          role: user.role as UserRole,
          storeId: user.storeStaff?.[0]?.storeId || user.driverProfile?.storeId || decoded.storeId,
        };
      }
    } catch {
      // Ignore token validation error for optional auth
    }
  }
  next();
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(payload: { id: string; email: string; role: UserRole; storeId?: string }): string {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: '7d' });
}
