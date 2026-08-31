import { PrismaClient } from '@prisma/client';
import { pino } from 'pino';

const logger = pino({ name: 'prisma-client' });

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

/**
 * Execute a transaction with automatic retry on serialization failures (40001) or deadlocks (40P01).
 * Exponential backoff with random jitter is applied.
 */
export async function withTransactionRetry<T>(
  fn: (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => Promise<T>,
  options: { maxRetries?: number; initialDelayMs?: number; maxDelayMs?: number } = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const initialDelayMs = options.initialDelayMs ?? 50;
  const maxDelayMs = options.maxDelayMs ?? 500;

  let attempt = 0;
  while (true) {
    attempt++;
    try {
      return await prisma.$transaction(async (tx) => {
        return await fn(tx);
      }, {
        maxWait: 15000,
        timeout: 30000,
        isolationLevel: 'ReadCommitted',
      });
    } catch (err: any) {
      const isRetryable =
        err?.code === 'P2034' || // Transaction failed due to a write conflict or a deadlock
        err?.code === 'P2002' || // Unique constraint failed (e.g. concurrent idempotency replay)
        err?.code === '40001' || // serialization_failure
        err?.code === '40P01';   // deadlock_detected

      if (isRetryable && attempt <= maxRetries) {
        const delay = Math.min(
          maxDelayMs,
          initialDelayMs * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 50)
        );
        logger.warn(
          { attempt, maxRetries, delay, errCode: err?.code },
          'Transient database conflict detected, retrying transaction...'
        );
        await new Promise((res) => setTimeout(res, delay));
        continue;
      }
      throw err;
    }
  }
}
