import { Router, Request, Response } from 'express';
import { prisma } from '../../database/prisma';
import { redis } from '../../redis/client';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  return res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'quickcommerce-api',
  });
});

router.get('/live', (req: Request, res: Response) => {
  return res.json({
    status: 'live',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

router.get('/ready', async (req: Request, res: Response) => {
  let dbStatus = 'healthy';
  let dbLatencyMs = 0;
  let redisStatus = 'healthy';
  let redisLatencyMs = 0;
  let isReady = true;

  // 1. Database Health Check with Timeout
  try {
    const dbStart = Date.now();
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Database ping timeout')), 3000)),
    ]);
    dbLatencyMs = Date.now() - dbStart;
  } catch (err: any) {
    dbStatus = 'unreachable';
    isReady = false;
  }

  // 2. Redis Health Check with Timeout & Ping Verification
  try {
    const redisStart = Date.now();
    const pingResult = await Promise.race([
      redis.ping(),
      new Promise<string>((_, reject) => setTimeout(() => reject(new Error('Redis ping timeout')), 3000)),
    ]);
    redisLatencyMs = Date.now() - redisStart;

    if (pingResult !== 'PONG') {
      redisStatus = 'degraded';
      isReady = false;
    }
  } catch (err: any) {
    redisStatus = 'unreachable';
    isReady = false;
  }

  const statusCode = isReady ? 200 : 503;
  return res.status(statusCode).json({
    status: isReady ? 'ready' : 'not_ready',
    dependencies: {
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      redis: {
        status: redisStatus,
        latencyMs: redisLatencyMs,
      },
    },
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

export const healthRoutes = router;
