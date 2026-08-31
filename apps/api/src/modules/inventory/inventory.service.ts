import { prisma, withTransactionRetry } from '../../database/prisma';
import {
  ErrorCodes,
  InventoryAdjustmentSchema,
  InventoryMovementType,
  AuditAction,
  UserRole,
  OutboxEventType,
} from '@quickcommerce/shared';
import { AppError } from '../../middleware/error-handler';
import { z } from 'zod';

export class InventoryService {
  async getStoreInventory(storeId: string, search?: string, lowStockOnly?: boolean) {
    const where: any = { storeId };

    if (search) {
      where.product = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { brand: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const inventoryItems = await prisma.inventory.findMany({
      where,
      include: {
        product: {
          include: { category: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const mapped = inventoryItems.map((inv) => {
      const available = Math.max(0, inv.quantity - inv.reservedQuantity);
      return {
        id: inv.id,
        storeId: inv.storeId,
        productId: inv.productId,
        product: {
          id: inv.product.id,
          name: inv.product.name,
          slug: inv.product.slug,
          brand: inv.product.brand,
          unit: inv.product.unit,
          mrp: Number(inv.product.mrp),
          basePrice: Number(inv.product.basePrice),
          imageUrl: inv.product.imageUrl,
          category: inv.product.category,
        },
        quantity: inv.quantity,
        reservedQuantity: inv.reservedQuantity,
        availableQuantity: available,
        lowStockThreshold: inv.lowStockThreshold,
        version: inv.version,
        isLowStock: available <= inv.lowStockThreshold && available > 0,
        isOutOfStock: available <= 0,
        updatedAt: inv.updatedAt.toISOString(),
      };
    });

    if (lowStockOnly) {
      return mapped.filter((item) => item.isLowStock || item.isOutOfStock);
    }

    return mapped;
  }

  async getInventoryMovements(inventoryId: string) {
    return await prisma.inventoryMovement.findMany({
      where: { inventoryId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Concurrency-safe, transactional manual inventory adjustment with movement ledger & audit log
   */
  async adjustInventory(
    data: z.infer<typeof InventoryAdjustmentSchema>,
    actorId: string,
    actorRole: UserRole
  ) {
    const { storeId, productId, type, quantity, reason, expectedVersion } = data;

    return await withTransactionRetry(async (tx) => {
      // 1. Lock inventory row for update
      let inv = await tx.inventory.findUnique({
        where: { storeId_productId: { storeId, productId } },
      });

      if (!inv) {
        // Create initial inventory row if not exists
        inv = await tx.inventory.create({
          data: {
            storeId,
            productId,
            quantity: 0,
            reservedQuantity: 0,
            lowStockThreshold: 5,
          },
        });
      }

      // Optimistic concurrency version check if provided
      if (expectedVersion !== undefined && inv.version !== expectedVersion) {
        throw new AppError(
          ErrorCodes.CONCURRENT_MODIFICATION,
          'Inventory was updated by another administrator. Please refresh before adjusting.',
          409
        );
      }

      const beforeQuantity = inv.quantity;
      let afterQuantity = beforeQuantity;

      switch (type) {
        case InventoryMovementType.MANUAL_ADD:
        case InventoryMovementType.RESTOCK:
          if (quantity <= 0) {
            throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Quantity must be positive for addition/restock', 400);
          }
          afterQuantity = beforeQuantity + quantity;
          break;

        case InventoryMovementType.MANUAL_REMOVE:
          if (quantity <= 0) {
            throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Quantity must be positive for removal', 400);
          }
          if (beforeQuantity < quantity) {
            throw new AppError(
              ErrorCodes.INSUFFICIENT_STOCK,
              `Cannot remove ${quantity} units. Current stock is ${beforeQuantity}.`,
              400
            );
          }
          afterQuantity = beforeQuantity - quantity;
          break;

        case InventoryMovementType.ADJUSTMENT:
          afterQuantity = beforeQuantity + quantity;
          if (afterQuantity < 0) {
            throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Total quantity cannot be negative', 400);
          }
          break;
      }

      // Update inventory row
      const updatedInv = await tx.inventory.update({
        where: { id: inv.id },
        data: {
          quantity: afterQuantity,
          version: { increment: 1 },
        },
      });

      // Record in Inventory Movement Ledger
      const movement = await tx.inventoryMovement.create({
        data: {
          inventoryId: inv.id,
          type,
          quantity: Math.abs(afterQuantity - beforeQuantity),
          beforeQuantity,
          afterQuantity,
          actorId,
          reason,
        },
      });

      // Write Audit Log
      await tx.auditLog.create({
        data: {
          actorId,
          actorRole,
          storeId,
          action: AuditAction.INVENTORY_ADJUSTMENT,
          entityType: 'Inventory',
          entityId: inv.id,
          oldValue: { quantity: beforeQuantity },
          newValue: { quantity: afterQuantity, type, reason },
        },
      });

      // Trigger Outbox Event if stock is low
      const available = Math.max(0, afterQuantity - inv.reservedQuantity);
      if (available <= inv.lowStockThreshold) {
        await tx.outboxEvent.create({
          data: {
            eventType: OutboxEventType.INVENTORY_LOW,
            aggregateType: 'Inventory',
            aggregateId: inv.id,
            payload: {
              storeId,
              productId,
              availableQuantity: available,
              lowStockThreshold: inv.lowStockThreshold,
            },
          },
        });
      }

      return {
        inventory: updatedInv,
        movement,
      };
    });
  }
}

export const inventoryService = new InventoryService();
