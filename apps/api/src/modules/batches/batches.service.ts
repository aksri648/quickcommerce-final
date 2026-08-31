import { prisma, withTransactionRetry } from '../../database/prisma';
import {
  ErrorCodes,
  BatchStatus,
  OrderStatus,
  DriverStatus,
  OutboxEventType,
  AuditAction,
  UserRole,
  CreateDeliveryBatchSchema,
} from '@quickcommerce/shared';
import { AppError } from '../../middleware/error-handler';
import crypto from 'crypto';
import { z } from 'zod';

export class BatchesService {
  /**
   * List delivery batches with filtering
   */
  async listBatches(params: {
    storeId?: string;
    driverId?: string;
    status?: BatchStatus;
    slotId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.storeId) where.storeId = params.storeId;
    if (params.driverId) where.driverId = params.driverId;
    if (params.status) where.status = params.status;
    if (params.slotId) where.deliverySlotId = params.slotId;

    const [batches, total] = await Promise.all([
      prisma.deliveryBatch.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          store: true,
          deliverySlot: true,
          driver: { include: { user: true } },
          orders: {
            include: {
              customer: { select: { name: true, phone: true } },
              deliveryOtp: { select: { verifiedAt: true, attemptCount: true } },
            },
          },
        },
      }),
      prisma.deliveryBatch.count({ where }),
    ]);

    return {
      batches,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getBatchById(batchId: string) {
    const batch = await prisma.deliveryBatch.findUnique({
      where: { id: batchId },
      include: {
        store: true,
        deliverySlot: true,
        driver: { include: { user: true } },
        orders: {
          include: {
            items: { include: { product: true } },
            customer: { select: { id: true, name: true, phone: true } },
            deliveryOtp: { select: { verifiedAt: true, attemptCount: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!batch) {
      throw new AppError(ErrorCodes.RESOURCE_NOT_FOUND, 'Delivery batch not found', 404);
    }

    return batch;
  }

  /**
   * Concurrency-safe Batch Creation
   */
  async createBatch(
    data: z.infer<typeof CreateDeliveryBatchSchema>,
    actorId: string,
    actorRole: UserRole,
    actorStoreId?: string
  ) {
    const { storeId, deliverySlotId, orderIds } = data;

    if (actorRole !== UserRole.SUPER_ADMIN && actorStoreId && storeId !== actorStoreId) {
      throw new AppError(ErrorCodes.FORBIDDEN, 'Not authorized for this store', 403);
    }

    return await withTransactionRetry(async (tx) => {
      // 1. Verify slot
      const slot = await tx.deliverySlot.findUnique({ where: { id: deliverySlotId } });
      if (!slot || slot.storeId !== storeId) {
        throw new AppError(ErrorCodes.RESOURCE_NOT_FOUND, 'Delivery slot not found', 404);
      }

      if (!orderIds || orderIds.length === 0) {
        throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Cannot create a batch with 0 orders', 400);
      }

      // 2. Fetch and lock candidate orders
      const orders = await tx.order.findMany({
        where: {
          id: { in: orderIds },
          storeId,
          deliverySlotId,
          deliveryBatchId: null, // Must not already belong to an active batch
          status: {
            in: [OrderStatus.READY_FOR_DISPATCH, OrderStatus.PREPARING, OrderStatus.ACCEPTED, OrderStatus.PLACED],
          },
        },
      });

      if (orders.length === 0) {
        throw new AppError(
          ErrorCodes.BATCH_INVALID,
          'No eligible orders found for batching (orders must be unassigned and match store/slot)',
          400
        );
      }

      const batchNumber = `BATCH-${slot.startTime.replace(':', '')}-${crypto.randomInt(1000, 9999)}`;

      // 3. Create Delivery Batch
      const batch = await tx.deliveryBatch.create({
        data: {
          batchNumber,
          storeId,
          deliverySlotId,
          status: BatchStatus.READY,
          totalOrders: orders.length,
          completedOrders: 0,
        },
      });

      // 4. Associate orders to batch & transition order status to ASSIGNED_TO_BATCH
      for (let i = 0; i < orders.length; i++) {
        const order = orders[i];
        
        const updateResult = await tx.order.updateMany({
          where: { id: order.id, deliveryBatchId: null },
          data: {
            deliveryBatchId: batch.id,
            status: OrderStatus.ASSIGNED_TO_BATCH,
          },
        });
        
        if (updateResult.count === 0) {
          throw new AppError(ErrorCodes.BATCH_INVALID, `Order ${order.id} is already assigned to another batch`, 400);
        }

        await tx.orderTimeline.create({
          data: {
            orderId: order.id,
            fromStatus: order.status,
            toStatus: OrderStatus.ASSIGNED_TO_BATCH,
            reason: `Assigned to ${batch.batchNumber}`,
            actorId,
            actorRole,
          },
        });

        await tx.deliveryBatchOrder.create({
          data: {
            batchId: batch.id,
            orderId: order.id,
            sequence: i + 1,
          },
        });
      }

      // 5. Outbox Event
      await tx.outboxEvent.create({
        data: {
          eventType: OutboxEventType.ORDER_BATCHED,
          aggregateType: 'DeliveryBatch',
          aggregateId: batch.id,
          payload: { batchId: batch.id, orderCount: orders.length },
        },
      });

      return batch;
    });
  }

  /**
   * Dispatch Batch: Marks batch and all member orders as OUT_FOR_DELIVERY
   */
  async dispatchBatch(batchId: string, actorId: string, actorRole: UserRole, actorStoreId?: string) {
    return await withTransactionRetry(async (tx) => {
      const batch = await tx.deliveryBatch.findUnique({
        where: { id: batchId },
        include: { orders: true, driver: true },
      });

      if (!batch) {
        throw new AppError(ErrorCodes.RESOURCE_NOT_FOUND, 'Batch not found', 404);
      }

      if (actorRole !== UserRole.SUPER_ADMIN && actorStoreId && batch.storeId !== actorStoreId) {
        throw new AppError(ErrorCodes.FORBIDDEN, 'Not authorized for this store', 403);
      }

      if (!batch.driverId) {
        throw new AppError(ErrorCodes.BATCH_INVALID, 'Cannot dispatch batch without an assigned driver', 400);
      }

      if (batch.status === BatchStatus.OUT_FOR_DELIVERY || batch.status === BatchStatus.DELIVERED || batch.status === BatchStatus.COMPLETED) {
        return batch; // Idempotent return
      }

      const updatedBatch = await tx.deliveryBatch.update({
        where: { id: batchId },
        data: {
          status: BatchStatus.OUT_FOR_DELIVERY,
          dispatchedAt: new Date(),
          version: { increment: 1 },
        },
      });

      // Update all orders
      for (const order of batch.orders) {
        if (order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.CANCELLED) {
          await tx.order.update({
            where: { id: order.id },
            data: {
              status: OrderStatus.OUT_FOR_DELIVERY,
              timeline: {
                create: {
                  fromStatus: order.status,
                  toStatus: OrderStatus.OUT_FOR_DELIVERY,
                  reason: 'Batch dispatched for delivery',
                  actorId,
                  actorRole,
                },
              },
            },
          });
        }
      }

      // Outbox Event
      await tx.outboxEvent.create({
        data: {
          eventType: OutboxEventType.BATCH_DISPATCHED,
          aggregateType: 'DeliveryBatch',
          aggregateId: batch.id,
          payload: { batchId: batch.id, driverId: batch.driverId },
        },
      });

      return updatedBatch;
    });
  }
}

export const batchesService = new BatchesService();
