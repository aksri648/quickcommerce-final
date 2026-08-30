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
  return res.json({ status: 'live' });
});

router.get('/ready', async (req: Request, res: Response) => {
  let dbStatus = 'healthy';
  let redisStatus = 'healthy';
  let isReady = true;

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = 'unreachable';
    isReady = false;
  }

  try {
    const ping = await redis.ping();
    if (ping !== 'PONG') redisStatus = 'degraded';
  } catch {
    redisStatus = 'unreachable';
  }

  const statusCode = isReady ? 200 : 503;
  return res.status(statusCode).json({
    status: isReady ? 'ready' : 'not_ready',
    dependencies: {
      database: dbStatus,
      redis: redisStatus,
    },
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

export const healthRoutes = router;
