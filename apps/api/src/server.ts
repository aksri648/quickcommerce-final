import { createApp } from './app';
import { config } from './config';
import { prisma } from './database/prisma';
import { redis } from './redis/client';
import { outboxService } from './modules/outbox/outbox.service';
import { searchService } from './modules/products/search.service';
import { logger } from './middleware/request-tracker';

const app = createApp();
const PORT = config.PORT;

const server = app.listen(PORT, async () => {
  logger.info(`🚀 QuickCommerce API Server listening on http://localhost:${PORT}`);
  logger.info(`📚 Swagger OpenAPI Documentation available at http://localhost:${PORT}/docs`);

  // Initialize Orama Hybrid & Semantic Search index
  try {
    await searchService.initIndex();
  } catch (err: any) {
    logger.warn({ error: err.message }, 'Failed initial search index warmup');
  }
});

// Periodic Outbox processor loop
const outboxInterval = setInterval(async () => {
  try {
    await outboxService.processPendingEvents();
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Outbox processing cycle warning');
  }
}, 3000);

// Graceful Shutdown handling for Render & production environments
async function shutdown(signal: string) {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  clearInterval(outboxInterval);

  server.close(async () => {
    logger.info('HTTP server closed.');

    try {
      await redis.quit();
      logger.info('Redis connection closed.');
    } catch {
      // Ignore
    }

    try {
      await prisma.$disconnect();
      logger.info('Prisma database disconnected.');
    } catch {
      // Ignore
    }

    logger.info('Graceful shutdown completed successfully.');
    process.exit(0);
  });

  // Force close if stuck
  setTimeout(() => {
    logger.error('Shutdown timed out. Forcing process exit.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
