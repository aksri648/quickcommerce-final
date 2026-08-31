import { Worker } from 'bullmq';
import { getRedisConnectionOptions } from './redis/client';
import { invoicesService } from './modules/invoices/invoices.service';
import { notificationsService } from './modules/notifications/notifications.service';
import { prisma } from './database/prisma';
import { logger } from './middleware/request-tracker';

const connection = getRedisConnectionOptions();

logger.info('🚀 Starting QuickCommerce BullMQ Background Workers (Upstash / Redis)...');

// 1. Order Events Worker
export const orderEventsWorker = new Worker(
  'order-events',
  async (job) => {
    logger.info({ job: job.name, id: job.id, data: job.data }, 'Processing order-event job');
    return { processed: true };
  },
  { connection }
);

// 2. Invoice Generation Worker (Idempotent)
export const invoiceWorker = new Worker(
  'invoice-generation',
  async (job) => {
    const { orderId } = job.data;
    if (!orderId) return;

    logger.info({ job: job.name, orderId }, 'Generating PDF Invoice asynchronously');
    const invoice = await invoicesService.generateInvoiceForOrder(orderId);
    return { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber };
  },
  { connection }
);

// 3. Notifications Worker
export const notificationsWorker = new Worker(
  'notifications',
  async (job) => {
    const { customerId, orderId, orderNumber, total, title, message } = job.data;

    if (customerId) {
      await notificationsService.sendNotification({
        userId: customerId,
        title: title || `Order ${orderNumber || ''} Update`,
        message: message || `Your order has been confirmed for Rs. ${total}`,
        metadata: { orderId },
      });
    }

    return { delivered: true };
  },
  { connection }
);

// 4. Batching Worker
export const batchingWorker = new Worker(
  'batching',
  async (job) => {
    logger.info({ job: job.name, data: job.data }, 'Processing delivery batch job');
    return { processed: true };
  },
  { connection }
);

const workers = [orderEventsWorker, invoiceWorker, notificationsWorker, batchingWorker];

workers.forEach(w => {
  w.on('error', err => logger.error({ err, worker: w.name }, 'Worker error'));
});

async function shutdownWorkers(signal?: string) {
  logger.info(`Shutting down background workers due to ${signal || 'shutdown'}...`);
  for (const w of workers) {
    await w.close();
  }
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', () => shutdownWorkers('SIGTERM'));
process.on('SIGINT', () => shutdownWorkers('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled Promise Rejection in worker');
});

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught Exception in worker');
  shutdownWorkers('uncaughtException');
});
