import Redis from 'ioredis';
import { config } from '../config';
import { pino } from 'pino';
import { v4 as uuidv4 } from 'uuid';

const logger = pino({ name: 'redis-client' });

export const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    return delay;
  },
  lazyConnect: true,
  enableOfflineQueue: false,
});

redis.on('connect', () => {
  logger.info('Connected to Redis');
});

redis.on('error', (err) => {
  logger.warn({ err: err.message }, 'Redis connection issue (non-fatal, fallback active)');
});

// Auto-connect in background
redis.connect().catch((err) => {
  logger.warn({ err: err.message }, 'Redis initial connection attempt failed. Continuing with in-memory fallbacks.');
});

// Safe lock release Lua script (only delete lock if token matches)
const RELEASE_LOCK_LUA = `
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
`;

/**
 * Acquire a distributed lock with automatic expiration and safe token verification
 */
export async function acquireDistributedLock(
  resource: string,
  ttlMs: number = 5000
): Promise<{ acquired: boolean; token: string; release: () => Promise<boolean> }> {
  const token = uuidv4();
  const key = `lock:${resource}`;

  try {
    const result = await redis.set(key, token, 'PX', ttlMs, 'NX');
    const acquired = result === 'OK';

    const release = async () => {
      try {
        const res = await redis.eval(RELEASE_LOCK_LUA, 1, key, token);
        return res === 1;
      } catch (err) {
        logger.error({ err, resource }, 'Error releasing distributed lock');
        return false;
      }
    };

    return { acquired, token, release };
  } catch (err) {
    logger.warn({ err, resource }, 'Distributed lock acquisition failed, proceeding cautiously');
    // If Redis is unavailable, return acquired=true with no-op release to avoid hard blocking
    return {
      acquired: true,
      token,
      release: async () => true,
    };
  }
}
