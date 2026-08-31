import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../auth';
import { config } from '../config';
import { prisma } from '../database/prisma';
import { UserRole, ErrorCodes } from '@quickcommerce/shared';

const JWKS = config.NEON_AUTH_JWKS_URL
  ? createRemoteJWKSet(new URL(config.NEON_AUTH_JWKS_URL))
  : null;

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

/**
 * Neon Managed Auth / Better Auth Authentication Middleware
 * Resolves sessions from Better Auth cookies/headers or Bearer JWT tokens (with remote JWKS verification)
 */
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    // 1. Try resolving session from Better Auth / Neon Auth session
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    }).catch(() => null);

    if (session?.user) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          storeStaff: { where: { isActive: true } },
          driverProfile: true,
        },
      });

      if (user && user.isActive) {
        req.user = {
          id: user.id,
          auth0Id: user.auth0Id || user.id,
          email: user.email,
          role: (user.role as UserRole) || ((session.user as any).role as UserRole) || UserRole.CUSTOMER,
          storeId: user.storeStaff?.[0]?.storeId || user.driverProfile?.storeId || (session.user as any).storeId,
        };
        return next();
      }
    }

    // 2. Fallback: Parse Bearer JWT token if supplied in Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token) {
        let decodedPayload: any = null;

        // A. Try verifying via Neon Auth JWKS public key set
        if (JWKS) {
          try {
            const { payload } = await jwtVerify(token, JWKS);
            decodedPayload = payload;
          } catch {
            // Not a JWKS token or JWKS verification failed
          }
        }

        // B. Fallback to local JWT_SECRET verification
        if (!decodedPayload) {
          try {
            decodedPayload = jwt.verify(token, config.JWT_SECRET) as any;
          } catch {
            // Invalid token
          }
        }

        if (decodedPayload && (decodedPayload.id || decodedPayload.sub)) {
          const userId = decodedPayload.id || decodedPayload.sub;
          const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
              storeStaff: { where: { isActive: true } },
              driverProfile: true,
            },
          });

          if (user && user.isActive) {
            req.user = {
              id: user.id,
              auth0Id: user.auth0Id || '',
              email: user.email || (decodedPayload.email as string) || '',
              role: (user.role as UserRole) || (decodedPayload.role as UserRole) || UserRole.CUSTOMER,
              storeId: user.storeStaff?.[0]?.storeId || user.driverProfile?.storeId || decodedPayload.storeId,
            };
            return next();
          }
        }
      }
    }

    return res.status(401).json({
      success: false,
      error: {
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Authentication required. Please sign in via Neon Managed Auth.',
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Optional authentication middleware for public endpoints that can personalize when authenticated
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // 1. Try Better Auth session
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    }).catch(() => null);

    if (session?.user) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          storeStaff: { where: { isActive: true } },
          driverProfile: true,
        },
      });

      if (user && user.isActive) {
        req.user = {
          id: user.id,
          auth0Id: user.auth0Id || user.id,
          email: user.email,
          role: user.role as UserRole,
          storeId: user.storeStaff?.[0]?.storeId || user.driverProfile?.storeId,
        };
        return next();
      }
    }

    // 2. Try Bearer header
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
        // Ignore
      }
    }
  } catch {
    // Ignore error in optionalAuth
  }
  next();
}

/**
 * Helper to generate a token for backward-compatible integrations
 */
export function generateToken(payload: { id: string; email: string; role: UserRole; storeId?: string }): string {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: '7d' });
}
