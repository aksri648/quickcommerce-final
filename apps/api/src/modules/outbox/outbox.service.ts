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
    const pendingEvents = await prisma.$transaction(async (tx) => {
      const events = await tx.$queryRaw<any[]>`
        SELECT * FROM "OutboxEvent"
        WHERE "status" = 'PENDING'
          AND "availableAt" <= NOW()
          AND "attempts" < 5
        ORDER BY "createdAt" ASC
        LIMIT 20
        FOR UPDATE SKIP LOCKED
      `;

      if (events.length > 0) {
        await tx.outboxEvent.updateMany({
          where: { id: { in: events.map((e) => e.id) } },
          data: { status: 'PROCESSING', attempts: { increment: 1 } },
        });
      }
      return events;
    });

    for (const event of pendingEvents) {
      try {

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
        const newAttempts = event.attempts + 1;
        const nextAttemptDelayMs = Math.min(60000, 5000 * Math.pow(2, newAttempts));
        await prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: newAttempts >= 4 ? OutboxStatus.FAILED : OutboxStatus.PENDING,
            availableAt: new Date(Date.now() + nextAttemptDelayMs),
            lastError: err?.message || String(err),
          },
        });
      }
    }
  }
}

export const outboxService = new OutboxService();
