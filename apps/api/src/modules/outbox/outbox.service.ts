import { prisma } from '../../database/prisma';
import { OutboxStatus, OutboxEventType } from '@quickcommerce/shared';
import {
  orderEventsQueue,
  batchingQueue,
  notificationsQueue,
  invoiceQueue,
  addJobSafe,
} from '../../queues';
import { pino } from 'pino';

const logger = pino({ name: 'outbox-processor' });

export class OutboxService {
  /**
   * Poll and process pending outbox events
   */
  async processPendingEvents() {
    const pendingEvents = await prisma.outboxEvent.findMany({
      where: {
        status: OutboxStatus.PENDING,
        availableAt: { lte: new Date() },
        attempts: { lt: 5 },
      },
      take: 20,
      orderBy: { createdAt: 'asc' },
    });

    for (const event of pendingEvents) {
      try {
        await prisma.outboxEvent.update({
          where: { id: event.id },
          data: { status: OutboxStatus.PROCESSING, attempts: { increment: 1 } },
        });

        // Dispatch to BullMQ Queues based on event type
        switch (event.eventType) {
          case OutboxEventType.ORDER_CREATED:
            await addJobSafe(orderEventsQueue, 'order-created', event.payload, `order-evt-${event.id}`);
            await addJobSafe(invoiceQueue, 'generate-invoice', event.payload, `inv-${event.id}`);
            await addJobSafe(notificationsQueue, 'notify-customer-order', event.payload, `notif-${event.id}`);
            break;

          case OutboxEventType.ORDER_ACCEPTED:
          case OutboxEventType.ORDER_READY:
          case OutboxEventType.ORDER_CANCELLED:
            await addJobSafe(orderEventsQueue, 'order-status-update', event.payload, `order-stat-${event.id}`);
            await addJobSafe(notificationsQueue, 'notify-order-status', event.payload, `notif-stat-${event.id}`);
            break;

          case OutboxEventType.ORDER_BATCHED:
          case OutboxEventType.BATCH_ASSIGNED:
          case OutboxEventType.BATCH_DISPATCHED:
            await addJobSafe(batchingQueue, 'batch-event', event.payload, `batch-${event.id}`);
            break;

          case OutboxEventType.ORDER_DELIVERED:
            await addJobSafe(orderEventsQueue, 'order-delivered', event.payload, `order-deliv-${event.id}`);
            await addJobSafe(notificationsQueue, 'notify-order-delivered', event.payload, `notif-deliv-${event.id}`);
            break;

          case OutboxEventType.INVENTORY_LOW:
            await addJobSafe(notificationsQueue, 'notify-low-stock', event.payload, `notif-stock-${event.id}`);
            break;
        }

        // Mark processed
        await prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: OutboxStatus.PROCESSED,
            processedAt: new Date(),
          },
        });
      } catch (err: any) {
        logger.error({ err: err.message, eventId: event.id }, 'Error processing outbox event');
        const nextAttemptDelayMs = Math.min(60000, 1000 * Math.pow(2, event.attempts));
        await prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: event.attempts >= 4 ? OutboxStatus.FAILED : OutboxStatus.PENDING,
            availableAt: new Date(Date.now() + nextAttemptDelayMs),
            lastError: err?.message || String(err),
          },
        });
      }
    }
  }
}

export const outboxService = new OutboxService();
