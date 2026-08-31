import Redis, { RedisOptions } from 'ioredis';
import { config } from '../config';
import { pino } from 'pino';
import { v4 as uuidv4 } from 'uuid';

const logger = pino({ name: 'redis-client' });

/**
 * Parses any Redis URL (including Upstash Serverless rediss:// with TLS)
 * and returns connection options compatible with ioredis and BullMQ.
 */
export function getRedisConnectionOptions(): RedisOptions {
  const url = config.REDIS_URL;
  const isTls = url.startsWith('rediss://');

  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname || 'localhost',
      port: parseInt(parsed.port || (isTls ? '6379' : '6379'), 10),
      username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
      tls: isTls ? { rejectUnauthorized: false } : undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
      retryStrategy(times) {
        return Math.min(times * 100, 3000);
      },
    };
  } catch {
    return {
      maxRetriesPerRequest: null,
      lazyConnect: true,
    };
  }
}

export const redis = new Redis(config.REDIS_URL, {
  ...getRedisConnectionOptions(),
  maxRetriesPerRequest: 3,
  enableOfflineQueue: false,
});

redis.on('connect', () => {
  logger.info('Connected to Redis (Upstash / Cloud / Local)');
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
    logger.error({ err, resource }, 'Distributed lock acquisition failed due to Redis error');
    return {
      acquired: false,
      token,
      release: async () => false,
    };
  }
}
