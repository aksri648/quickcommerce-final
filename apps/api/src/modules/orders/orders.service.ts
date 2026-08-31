import { prisma, withTransactionRetry } from '../../database/prisma';
import crypto from 'crypto';
import {
  ErrorCodes,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  InventoryMovementType,
  OutboxEventType,
  AuditAction,
  UserRole,
  VALID_ORDER_TRANSITIONS,
  TAX_RATE_PERCENTAGE,
  BASE_DELIVERY_FEE,
  FREE_DELIVERY_THRESHOLD,
  CheckoutOrderSchema,
  UpdateOrderStatusSchema,
} from '@quickcommerce/shared';
import { AppError } from '../../middleware/error-handler';
import { config } from '../../config';
import { z } from 'zod';

export class OrdersService {
  /**
   * Helper to hash an OTP with salt
   */
  private hashOtp(otp: string): string {
    return crypto
      .createHmac('sha256', config.OTP_SECRET_SALT)
      .update(otp)
      .digest('hex');
  }

  /**
   * Generate a random 6-digit numeric OTP
   */
  private generate6DigitOtp(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Transactional Checkout with Deadlock Prevention & Concurrency Protection
   */
  async checkout(
    customerId: string,
    data: z.infer<typeof CheckoutOrderSchema>,
    idempotencyKey?: string
  ) {
    const { storeId, addressId, deliveryDate, deliverySlotId, items } = data;

    return await withTransactionRetry(async (tx) => {
      if (idempotencyKey) {
        const existing = await tx.order.findUnique({
          where: { idempotencyKey },
          include: {
            items: true,
            store: true,
            deliverySlot: true,
            invoice: true,
          },
        });
        if (existing) return existing;
      }

      // 1. Verify Store is active
      const store = await tx.store.findUnique({ where: { id: storeId } });
      if (!store || !store.isActive) {
        throw new AppError(ErrorCodes.STORE_INACTIVE, 'Store is currently inactive', 400);
      }

      // 2. Fetch Customer Address
      const address = await tx.address.findUnique({ where: { id: addressId } });
      if (!address || address.customerId !== customerId) {
        throw new AppError(ErrorCodes.RESOURCE_NOT_FOUND, 'Delivery address not found', 404);
      }

      // 3. STEP 1 OF LOCK ORDER: Lock & Validate Delivery Slot
      const slot = await tx.deliverySlot.findUnique({
        where: { id: deliverySlotId },
      });

      if (!slot || slot.storeId !== storeId || !slot.isActive) {
        throw new AppError(ErrorCodes.SLOT_NOT_BOOKABLE, 'Selected delivery slot is unavailable', 400);
      }

      if (slot.bookedCount >= slot.capacity) {
        throw new AppError(ErrorCodes.SLOT_FULL, 'Selected delivery slot is fully booked. Please choose another slot.', 409);
      }

      // 4. STEP 2 OF LOCK ORDER: Sort product IDs deterministically to prevent deadlocks
      const sortedItems = [...items].sort((a, b) => a.productId.localeCompare(b.productId));
      const productIds = sortedItems.map((i) => i.productId);

      // Fetch products and store pricing
      const [products, storeProducts] = await Promise.all([
        tx.product.findMany({
          where: { id: { in: productIds }, isActive: true },
        }),
        tx.storeProduct.findMany({
          where: { storeId, productId: { in: productIds } },
        }),
      ]);

      if (products.length !== items.length) {
        throw new AppError(ErrorCodes.RESOURCE_NOT_FOUND, 'One or more products in your cart are no longer active', 400);
      }

      // 5. Lock and Validate Inventory Rows in sorted order with SELECT FOR UPDATE
      const inventoryRecords: any[] = [];
      for (const pid of productIds) {
        const lockedRows = await tx.$queryRaw<any[]>`
          SELECT * FROM "Inventory"
          WHERE "storeId" = ${storeId} AND "productId" = ${pid}
          FOR UPDATE
        `;
        if (lockedRows && lockedRows.length > 0) {
          inventoryRecords.push(lockedRows[0]);
        }
      }

      // Recalculate authoritative server-side pricing & verify stock
      let subtotal = 0;
      const orderItemsData: any[] = [];
      const inventoryUpdates: { invId: string; reservedQty: number; qtyChange: number }[] = [];

      for (const item of sortedItems) {
        const product = products.find((p) => p.id === item.productId)!;
        const sp = storeProducts.find((s) => s.productId === item.productId);
        const inv = inventoryRecords.find((i) => i.productId === item.productId);

        const available = inv ? Number(inv.quantity) - Number(inv.reservedQuantity) : 0;
        if (available < item.quantity) {
          throw new AppError(
            ErrorCodes.OUT_OF_STOCK,
            `Product "${product.name}" only has ${Math.max(0, available)} units available`,
            409
          );
        }

        const unitPrice = sp ? Number(sp.price) : Number(product.basePrice);
        const itemTotal = unitPrice * item.quantity;
        subtotal += itemTotal;

        orderItemsData.push({
          productId: product.id,
          productNameSnapshot: product.name,
          skuSnapshot: product.slug,
          unitSnapshot: product.unit,
          unitPrice,
          quantity: item.quantity,
          discount: 0,
          tax: 0,
          total: itemTotal,
        });

        if (inv) {
          inventoryUpdates.push({
            invId: inv.id,
            reservedQty: Number(inv.reservedQuantity),
            qtyChange: item.quantity,
          });
        }
      }

      const discount = 0;
      const tax = Math.round((subtotal * (TAX_RATE_PERCENTAGE / 100)) * 100) / 100;
      const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : BASE_DELIVERY_FEE;
      const grandTotal = Math.round((subtotal - discount + tax + deliveryFee) * 100) / 100;

      // 6. Atomically reserve slot capacity
      const updatedSlot = await tx.deliverySlot.update({
        where: { id: deliverySlotId },
        data: {
          bookedCount: { increment: 1 },
          version: { increment: 1 },
        },
      });

      if (updatedSlot.bookedCount > updatedSlot.capacity) {
        throw new AppError(ErrorCodes.SLOT_FULL, 'Selected delivery slot is fully booked. Please choose another slot.', 409);
      }

      // 7. Atomically decrement inventory & record ledger movements
      for (const update of inventoryUpdates) {
        const updatedInv = await tx.inventory.update({
          where: { id: update.invId },
          data: {
            quantity: { decrement: update.qtyChange },
            version: { increment: 1 },
          },
        });

        if (updatedInv.quantity < 0) {
          throw new AppError(ErrorCodes.OUT_OF_STOCK, 'Insufficient inventory remaining', 409);
        }

        await tx.inventoryMovement.create({
          data: {
            inventoryId: update.invId,
            type: InventoryMovementType.ORDER_RESERVATION,
            quantity: update.qtyChange,
            beforeQuantity: updatedInv.quantity + update.qtyChange,
            afterQuantity: updatedInv.quantity,
            actorId: customerId,
            reason: `Order checkout reservation`,
          },
        });
      }

      // 8. Generate Order Number & Raw OTP
      const orderNumber = `QC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomInt(1000, 9999)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
      const rawOtp = this.generate6DigitOtp();
      const otpHash = this.hashOtp(rawOtp);
      // Ensure expiry is relative to expected delivery or use a stable time. Adding 24h as safe fallback if config is small.
      const otpExpiresAt = new Date(Date.now() + (config.OTP_EXPIRY_MINUTES || 1440) * 60 * 1000);

      // 9. Create Order
      const order = await tx.order.create({
        data: {
          orderNumber,
          customerId,
          storeId,
          deliveryDate,
          deliverySlotId,
          status: OrderStatus.PLACED,
          subtotal,
          discount,
          tax,
          deliveryFee,
          total: grandTotal,
          paymentMethod: PaymentMethod.COD,
          paymentStatus: PaymentStatus.PENDING,
          addressSnapshot: {
            recipientName: address.recipientName,
            phone: address.phone,
            street: address.street,
            apartment: address.apartment,
            landmark: address.landmark,
            city: address.city,
            state: address.state,
            pincode: address.pincode,
          },
          pricingSnapshot: {
            subtotal,
            discount,
            tax,
            deliveryFee,
            total: grandTotal,
          },
          idempotencyKey,
          items: {
            create: orderItemsData,
          },
          timeline: {
            create: {
              fromStatus: null,
              toStatus: OrderStatus.PLACED,
              reason: 'Order placed by customer (COD)',
              actorId: customerId,
              actorRole: UserRole.CUSTOMER,
            },
          },
          deliveryOtp: {
            create: {
              otpHash,
              expiresAt: otpExpiresAt,
              attemptCount: 0,
              maxAttempts: 5,
            },
          },
        },
        include: {
          items: { include: { product: true } },
          store: true,
          deliverySlot: true,
        },
      });

      // 10. Create Outbox Event
      await tx.outboxEvent.create({
        data: {
          eventType: OutboxEventType.ORDER_CREATED,
          aggregateType: 'Order',
          aggregateId: order.id,
          payload: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            storeId: order.storeId,
            customerId: order.customerId,
            total: Number(order.total),
          },
        },
      });

      // 11. Clear Cart
      const cart = await tx.cart.findUnique({ where: { customerId } });
      if (cart) {
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      }

      return {
        ...order,
        deliveryOtp: rawOtp, // Returned only upon checkout confirmation
      };
    });
  }

  /**
   * List orders with filtering by role and store scope
   */
  async listOrders(params: {
    userId: string;
    role: UserRole;
    storeId?: string;
    status?: OrderStatus;
    deliveryDate?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.role === UserRole.CUSTOMER) {
      where.customerId = params.userId;
    } else if (params.role === UserRole.STORE_ADMIN || params.role === UserRole.STORE_STAFF) {
      where.storeId = params.storeId;
    } else if (params.role === UserRole.DRIVER) {
      // Driver orders via batches
      const driver = await prisma.driver.findUnique({ where: { userId: params.userId } });
      if (driver) {
        where.deliveryBatch = { driverId: driver.id };
      }
    } else if (params.storeId) {
      where.storeId = params.storeId;
    }

    if (params.status) where.status = params.status;
    if (params.deliveryDate) where.deliveryDate = params.deliveryDate;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: { include: { product: true } },
          store: true,
          deliverySlot: true,
          deliveryBatch: { include: { driver: { include: { user: true } } } },
          customer: { select: { id: true, name: true, email: true, phone: true } },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return {
      orders,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single order details with full timeline
   */
  async getOrderById(orderId: string, actorId: string, actorRole: UserRole, userStoreId?: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: true } },
        store: true,
        deliverySlot: true,
        deliveryBatch: { include: { driver: { include: { user: true } } } },
        customer: { select: { id: true, name: true, email: true, phone: true } },
        timeline: { orderBy: { createdAt: 'asc' } },
        deliveryOtp: true,
      },
    });

    if (!order) {
      throw new AppError(ErrorCodes.RESOURCE_NOT_FOUND, 'Order not found', 404);
    }

    // Role-based authorization
    if (actorRole === UserRole.CUSTOMER && order.customerId !== actorId) {
      throw new AppError(ErrorCodes.FORBIDDEN, 'You cannot access this order', 403);
    }

    if (
      (actorRole === UserRole.STORE_ADMIN || actorRole === UserRole.STORE_STAFF) &&
      order.storeId !== userStoreId
    ) {
      throw new AppError(ErrorCodes.FORBIDDEN, 'Store isolation check failed', 403);
    }

    return order;
  }

  /**
   * Concurrency-safe Order State Transition
   */
  async updateOrderStatus(
    orderId: string,
    data: z.infer<typeof UpdateOrderStatusSchema>,
    actorId: string,
    actorRole: UserRole
  ) {
    const { status: targetStatus, reason, expectedVersion } = data;

    return await withTransactionRetry(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order) {
        throw new AppError(ErrorCodes.RESOURCE_NOT_FOUND, 'Order not found', 404);
      }

      if (expectedVersion !== undefined && order.version !== expectedVersion) {
        throw new AppError(
          ErrorCodes.CONCURRENT_MODIFICATION,
          'Order status was concurrently modified by another user.',
          409
        );
      }

      // Check valid transitions
      const validNextStates = VALID_ORDER_TRANSITIONS[order.status as OrderStatus];
      if (!validNextStates.includes(targetStatus)) {
        throw new AppError(
          ErrorCodes.INVALID_ORDER_STATE,
          `Cannot transition order from ${order.status} to ${targetStatus}`,
          400
        );
      }

      // Handle Cancellation (Stock and slot capacity rollback)
      if (targetStatus === OrderStatus.CANCELLED) {
        // Rollback slot count
        const slot = await tx.deliverySlot.findUnique({ where: { id: order.deliverySlotId } });
        if (slot && slot.bookedCount > 0) {
          await tx.deliverySlot.update({
            where: { id: order.deliverySlotId },
            data: { bookedCount: { decrement: 1 } },
          });
        }

        // Restore inventory stock
        for (const item of order.items) {
          const inv = await tx.inventory.findUnique({
            where: { storeId_productId: { storeId: order.storeId, productId: item.productId } },
          });
          if (inv) {
            await tx.inventory.update({
              where: { id: inv.id },
              data: { quantity: { increment: item.quantity } },
            });

            await tx.inventoryMovement.create({
              data: {
                inventoryId: inv.id,
                type: InventoryMovementType.ORDER_CANCELLATION,
                quantity: item.quantity,
                beforeQuantity: inv.quantity,
                afterQuantity: inv.quantity + item.quantity,
                actorId,
                reason: `Order #${order.orderNumber} cancelled`,
              },
            });
          }
        }
      }

      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          status: targetStatus,
          version: { increment: 1 },
          timeline: {
            create: {
              fromStatus: order.status,
              toStatus: targetStatus,
              reason: reason || `Status updated to ${targetStatus}`,
              actorId,
              actorRole,
            },
          },
        },
      });

      // Outbox Event
      await tx.outboxEvent.create({
        data: {
          eventType:
            targetStatus === OrderStatus.CANCELLED
              ? OutboxEventType.ORDER_CANCELLED
              : OutboxEventType.ORDER_ACCEPTED,
          aggregateType: 'Order',
          aggregateId: order.id,
          payload: { orderId: order.id, status: targetStatus },
        },
      });

      return updated;
    });
  }
}

export const ordersService = new OrdersService();
