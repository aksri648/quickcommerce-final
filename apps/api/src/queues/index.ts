import { Queue } from 'bullmq';
import { getRedisConnectionOptions } from '../redis/client';
import { pino } from 'pino';

const logger = pino({ name: 'bullmq-queues' });

const connection = getRedisConnectionOptions();

export const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000,
  },
  removeOnComplete: 100,
  removeOnFail: 500,
};

export const orderEventsQueue = new Queue('order-events', { connection, defaultJobOptions });
export const batchingQueue = new Queue('batching', { connection, defaultJobOptions });
export const notificationsQueue = new Queue('notifications', { connection, defaultJobOptions });
export const invoiceQueue = new Queue('invoice-generation', { connection, defaultJobOptions });
export const analyticsQueue = new Queue('analytics', { connection, defaultJobOptions });

export async function addJobSafe(queue: Queue, name: string, data: any, jobId?: string) {
  try {
    return await queue.add(name, data, {
      jobId: jobId || undefined,
    });
  } catch (err: any) {
    logger.warn({ err: err.message, queue: queue.name, name }, 'Failed to enqueue BullMQ job (worker will catch up via Outbox)');
    return null;
  }
}
