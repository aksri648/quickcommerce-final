import { prisma, withTransactionRetry } from '../../database/prisma';
import {
  ErrorCodes,
  DriverStatus,
  BatchStatus,
  AuditAction,
  UserRole,
  OutboxEventType,
  CreateDriverSchema,
  DriverStatusUpdateSchema,
} from '@quickcommerce/shared';
import { AppError } from '../../middleware/error-handler';
import { z } from 'zod';

export class DriversService {
  async listDrivers(storeId?: string, status?: DriverStatus, availableOnly?: boolean) {
    const where: any = {};
    if (storeId) where.storeId = storeId;
    if (status) where.status = status;
    if (availableOnly) {
      where.status = DriverStatus.AVAILABLE;
      where.isAvailable = true;
    }

    const drivers = await prisma.driver.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        store: { select: { id: true, name: true, code: true } },
        batches: {
          where: {
            status: { in: [BatchStatus.READY, BatchStatus.DRIVER_ASSIGNED, BatchStatus.OUT_FOR_DELIVERY] },
          },
          include: { deliverySlot: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return drivers.map((d) => {
      const activeBatch = d.batches[0];
      return {
        id: d.id,
        userId: d.userId,
        user: d.user,
        storeId: d.storeId,
        store: d.store,
        vehicleType: d.vehicleType,
        vehicleNumber: d.vehicleNumber,
        licenseNumber: d.licenseNumber,
        status: d.status,
        isAvailable: d.isAvailable && !activeBatch,
        currentBatchId: activeBatch?.id || null,
        currentSlotWindow: activeBatch?.deliverySlot ? `${activeBatch.deliverySlot.startTime} – ${activeBatch.deliverySlot.endTime}` : null,
        version: d.version,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      };
    });
  }

  async getDriverById(driverId: string) {
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: {
        user: true,
        store: true,
        batches: {
          include: {
            deliverySlot: true,
            orders: { include: { customer: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!driver) {
      throw new AppError(ErrorCodes.RESOURCE_NOT_FOUND, 'Driver not found', 404);
    }

    return driver;
  }

  async getDriverByUserId(userId: string) {
    const driver = await prisma.driver.findUnique({
      where: { userId },
      include: {
        user: true,
        store: true,
        batches: {
          where: {
            status: { in: [BatchStatus.READY, BatchStatus.DRIVER_ASSIGNED, BatchStatus.OUT_FOR_DELIVERY] },
          },
          include: {
            deliverySlot: true,
            orders: {
              include: {
                customer: true,
                items: { include: { product: true } },
                deliveryOtp: { select: { verifiedAt: true, attemptCount: true } },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });

    if (!driver) {
      throw new AppError(ErrorCodes.RESOURCE_NOT_FOUND, 'Driver profile not found', 404);
    }

    return driver;
  }

  /**
   * Concurrency-safe Driver Assignment to Batch with Overlap Validation
   */
  async assignDriverToBatch(
    batchId: string,
    driverId: string,
    actorId: string,
    actorRole: UserRole,
    expectedVersion?: number,
    actorStoreId?: string
  ) {
    return await withTransactionRetry(async (tx) => {
      // 1. Lock batch
      const batch = await tx.deliveryBatch.findUnique({
        where: { id: batchId },
        include: { deliverySlot: true },
      });

      if (!batch) {
        throw new AppError(ErrorCodes.RESOURCE_NOT_FOUND, 'Batch not found', 404);
      }

      if (actorRole !== UserRole.SUPER_ADMIN && actorStoreId && batch.storeId !== actorStoreId) {
        throw new AppError(ErrorCodes.FORBIDDEN, 'Not authorized for this store', 403);
      }

      if (expectedVersion !== undefined && batch.version !== expectedVersion) {
        throw new AppError(ErrorCodes.CONCURRENT_MODIFICATION, 'Batch modified concurrently', 409);
      }

      // 2. Lock driver
      const driver = await tx.driver.findUnique({
        where: { id: driverId },
        include: {
          batches: {
            where: {
              status: { in: [BatchStatus.DRIVER_ASSIGNED, BatchStatus.OUT_FOR_DELIVERY] },
            },
            include: { deliverySlot: true },
          },
        },
      });

      if (!driver) {
        throw new AppError(ErrorCodes.RESOURCE_NOT_FOUND, 'Driver not found', 404);
      }

      if (driver.storeId !== batch.storeId) {
        throw new AppError(ErrorCodes.FORBIDDEN, 'Driver belongs to a different store', 403);
      }

      // 3. Temporal Overlap Validation: Check if driver already has an active batch in the same slot window
      const conflictingBatch = driver.batches.find(
        (b) =>
          b.deliverySlot.date === batch.deliverySlot.date &&
          b.deliverySlot.startTime < batch.deliverySlot.endTime &&
          b.deliverySlot.endTime > batch.deliverySlot.startTime
      );

      if (conflictingBatch) {
        throw new AppError(
          ErrorCodes.DRIVER_CONFLICT,
          `Driver is already assigned to batch ${conflictingBatch.batchNumber} for delivery slot ${batch.deliverySlot.startTime}–${batch.deliverySlot.endTime}`,
          409
        );
      }

      // 4. Update previous active assignment if reassigning
      await tx.batchDriverAssignment.updateMany({
        where: { batchId, status: 'ACTIVE' },
        data: { status: 'REASSIGNED', unassignedAt: new Date() },
      });

      // 5. Update Batch with driver & mark OUT_FOR_DELIVERY
      const updatedBatch = await tx.deliveryBatch.update({
        where: { id: batchId },
        data: {
          driverId,
          status: BatchStatus.OUT_FOR_DELIVERY,
          assignedAt: new Date(),
          dispatchedAt: new Date(),
          version: { increment: 1 },
        },
      });

      // Automatically transition all member orders in this batch to OUT_FOR_DELIVERY
      const memberOrders = await tx.order.findMany({
        where: { deliveryBatchId: batchId },
      });

      for (const order of memberOrders) {
        if (order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.CANCELLED) {
          await tx.order.update({
            where: { id: order.id },
            data: {
              status: OrderStatus.OUT_FOR_DELIVERY,
              timeline: {
                create: {
                  fromStatus: order.status,
                  toStatus: OrderStatus.OUT_FOR_DELIVERY,
                  reason: `Driver ${driver.user?.name || 'Partner'} allotted for scheduled delivery slot`,
                  actorId,
                  actorRole,
                },
              },
            },
          });
        }
      }

      // 6. Record active assignment
      await tx.batchDriverAssignment.create({
        data: {
          driverId,
          batchId,
          status: 'ACTIVE',
        },
      });

      // 7. Update Driver status to BUSY
      await tx.driver.update({
        where: { id: driverId },
        data: {
          status: DriverStatus.BUSY,
          isAvailable: false,
          version: { increment: 1 },
        },
      });

      // 8. Outbox Event & Audit Log
      await tx.outboxEvent.create({
        data: {
          eventType: OutboxEventType.BATCH_DISPATCHED,
          aggregateType: 'DeliveryBatch',
          aggregateId: batchId,
          payload: { batchId, driverId, actorId, orderCount: memberOrders.length },
        },
      });

      await tx.auditLog.create({
        data: {
          actorId,
          actorRole,
          storeId: batch.storeId,
          action: AuditAction.DRIVER_ASSIGNMENT,
          entityType: 'DeliveryBatch',
          entityId: batchId,
          newValue: { driverId, batchNumber: batch.batchNumber, status: 'OUT_FOR_DELIVERY' },
        },
      });

      return updatedBatch;
    });
  }

  async updateDriverStatus(userId: string, data: z.infer<typeof DriverStatusUpdateSchema>) {
    return await withTransactionRetry(async (tx) => {
      const driver = await tx.driver.findUnique({ where: { userId } });
      if (!driver) {
        throw new AppError(ErrorCodes.RESOURCE_NOT_FOUND, 'Driver profile not found', 404);
      }

      const updated = await tx.driver.update({
        where: { id: driver.id },
        data: {
          status: data.status,
          isAvailable: data.status === DriverStatus.AVAILABLE,
          version: { increment: 1 },
        },
      });

      return updated;
    });
  }

  async createDriver(data: z.infer<typeof CreateDriverSchema>, actorId: string, actorRole: UserRole) {
    return await withTransactionRetry(async (tx) => {
      let user = await tx.user.findUnique({ where: { email: data.email } });
      if (!user) {
        user = await tx.user.create({
          data: {
            auth0Id: `auth0|driver-${Date.now()}`,
            email: data.email,
            name: data.name,
            phone: data.phone,
            role: UserRole.DRIVER,
          },
        });
      }

      const driver = await tx.driver.create({
        data: {
          userId: user.id,
          storeId: data.storeId,
          vehicleType: data.vehicleType,
          vehicleNumber: data.vehicleNumber,
          licenseNumber: data.licenseNumber,
          status: DriverStatus.AVAILABLE,
          isAvailable: true,
        },
        include: { user: true, store: true },
      });

      return driver;
    });
  }
}

export const driversService = new DriversService();
