import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../database/prisma';
import { ErrorCodes } from '@quickcommerce/shared';

/**
 * Hash request body for payload integrity checking
 */
function hashPayload(payload: any): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(payload || {}))
    .digest('hex');
}

/**
 * Idempotency Middleware:
 * When 'Idempotency-Key' is provided in request headers:
 * 1. Checks if (userId, key, endpoint) already exists.
 * 2. If it exists and requestHash matches, immediately replays the cached response.
 * 3. If requestHash mismatches, returns IDEMPOTENCY_CONFLICT.
 * 4. If key does not exist, intercepts `res.json` and caches the resulting response in PostgreSQL.
 */
export function idempotency(required: boolean = false) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = req.headers['idempotency-key'] as string;
    const userId = req.user?.id || 'anonymous';
    const endpoint = `${req.method}:${req.baseUrl}${req.path}`;

    if (!key) {
      if (required) {
        return res.status(400).json({
          success: false,
          error: {
            code: ErrorCodes.VALIDATION_ERROR,
            message: 'Header "Idempotency-Key" is required for this operation',
          },
        });
      }
      return next();
    }

    const currentHash = hashPayload(req.body);

    try {
      // Check existing idempotency key
      const existing = await prisma.idempotencyKey.findUnique({
        where: {
          userId_key_endpoint: {
            userId,
            key,
            endpoint,
          },
        },
      });

      if (existing) {
        if (existing.requestHash !== currentHash) {
          return res.status(409).json({
            success: false,
            error: {
              code: ErrorCodes.IDEMPOTENCY_CONFLICT,
              message: 'Idempotency key has already been used with different request parameters',
            },
          });
        }

        // Return the cached response
        return res.status(existing.responseStatus).json(existing.responseBody);
      }

      // Intercept res.json to capture response body
      const originalJson = res.json.bind(res);
      res.json = (body: any) => {
        // Asynchronously save to IdempotencyKey table
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24-hour retention
          prisma.idempotencyKey
            .create({
              data: {
                key,
                userId,
                endpoint,
                requestHash: currentHash,
                responseStatus: res.statusCode,
                responseBody: body,
                expiresAt,
              },
            })
            .catch(() => {
              // Non-fatal if concurrent write happened
            });
        }
        return originalJson(body);
      };

      next();
    } catch (err) {
      next(err);
    }
  };
}
