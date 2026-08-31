import { prisma, withTransactionRetry } from '../../database/prisma';
import crypto from 'crypto';
import {
  ErrorCodes,
  OrderStatus,
  PaymentStatus,
  BatchStatus,
  DriverStatus,
  OutboxEventType,
  AuditAction,
  UserRole,
  VerifyOTPSchema,
} from '@quickcommerce/shared';
import { AppError } from '../../middleware/error-handler';
import { config } from '../../config';
import { z } from 'zod';

export class OTPService {
  private hashOtp(otp: string): string {
    return crypto
      .createHmac('sha256', config.OTP_SECRET_SALT)
      .update(otp)
      .digest('hex');
  }

  /**
   * Concurrency-safe, atomic OTP verification & order delivery completion
   */
  async verifyDeliveryOtp(
    driverUserId: string,
    data: z.infer<typeof VerifyOTPSchema>
  ) {
    const { orderId, otp } = data;
    const submittedHash = this.hashOtp(otp);

    return await withTransactionRetry(async (tx) => {
      // 1. Get driver profile
      const driver = await tx.driver.findUnique({
        where: { userId: driverUserId },
      });

      if (!driver) {
        throw new AppError(ErrorCodes.FORBIDDEN, 'Only registered drivers can verify delivery OTP', 403);
      }

      // 2. Lock Order & OTP rows
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          deliveryBatch: {
            include: {
              orders: {
                select: { id: true, status: true },
              },
            },
          },
          deliveryOtp: true,
        },
      });

      if (!order) {
        throw new AppError(ErrorCodes.RESOURCE_NOT_FOUND, 'Order not found', 404);
      }

      if (!order.deliveryOtp) {
        throw new AppError(ErrorCodes.INVALID_OTP, 'No OTP generated for this order', 400);
      }

      // 3. Idempotency & double verification check
      if (order.deliveryOtp.verifiedAt) {
        if (order.status === OrderStatus.DELIVERED) {
          return {
            success: true,
            orderId: order.id,
            orderNumber: order.orderNumber,
            status: OrderStatus.DELIVERED,
            message: 'Order already successfully delivered and verified',
          };
        }
        throw new AppError(ErrorCodes.OTP_ALREADY_USED, 'OTP has already been verified', 400);
      }

      // 4. Verify driver ownership of this batch
      if (!order.deliveryBatch || order.deliveryBatch.driverId !== driver.id) {
        throw new AppError(
          ErrorCodes.FORBIDDEN,
          'You are not the assigned driver for this order',
          403
        );
      }

      // 5. Check maximum attempts & expiration
      if (order.deliveryOtp.attemptCount >= order.deliveryOtp.maxAttempts) {
        throw new AppError(
          ErrorCodes.OTP_EXPIRED,
          'Maximum OTP verification attempts exceeded. Please contact store support.',
          400
        );
      }

      // Allow 5 minutes clock drift
      const now = new Date();
      if (now.getTime() - 5 * 60000 > order.deliveryOtp.expiresAt.getTime()) {
        throw new AppError(ErrorCodes.OTP_EXPIRED, 'OTP has expired', 400);
      }

      // 6. Compare Hash with timing-safe comparison
      const otpHashBuffer = Buffer.from(order.deliveryOtp.otpHash);
      const submittedHashBuffer = Buffer.from(submittedHash);

      let isValid = false;
      if (otpHashBuffer.length === submittedHashBuffer.length) {
        isValid = crypto.timingSafeEqual(otpHashBuffer, submittedHashBuffer);
      }

      if (!isValid) {
        // Increment attempt count
        await tx.deliveryOTP.update({
          where: { id: order.deliveryOtp.id },
          data: { attemptCount: { increment: 1 } },
        });

        throw new AppError(
          ErrorCodes.INVALID_OTP,
          `Invalid OTP. Attempt ${order.deliveryOtp.attemptCount + 1} of ${order.deliveryOtp.maxAttempts}`,
          400
        );
      }

      // 7. Valid OTP! Mark consumed & update Order to DELIVERED
      await tx.deliveryOTP.update({
        where: { id: order.deliveryOtp.id },
        data: {
          verifiedAt: now,
          usedAt: now,
        },
      });

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.DELIVERED,
          paymentStatus: PaymentStatus.PAID, // COD collected on OTP verification
          version: { increment: 1 },
          timeline: {
            create: {
              fromStatus: order.status,
              toStatus: OrderStatus.DELIVERED,
              reason: 'Customer verified OTP upon delivery',
              actorId: driver.userId,
              actorRole: UserRole.DRIVER,
            },
          },
        },
      });

      // 8. Batch Completion Check: Check if all orders in this batch are resolved
      if (order.deliveryBatch) {
        const otherOrders = order.deliveryBatch.orders.filter((o) => o.id !== order.id);
        const allOtherDone = otherOrders.every(
          (o) => o.status === OrderStatus.DELIVERED || o.status === OrderStatus.CANCELLED
        );

        const newCompletedOrdersCount = order.deliveryBatch.orders.filter(
          (o) => o.status === OrderStatus.DELIVERED || o.id === order.id
        ).length;

        if (allOtherDone) {
          // Complete the batch!
          await tx.deliveryBatch.update({
            where: { id: order.deliveryBatch.id },
            data: {
              status: BatchStatus.COMPLETED,
              completedOrders: newCompletedOrdersCount,
              completedAt: now,
              version: { increment: 1 },
            },
          });

          // Transition driver back to AVAILABLE
          await tx.driver.update({
            where: { id: driver.id },
            data: {
              status: DriverStatus.AVAILABLE,
              isAvailable: true,
              version: { increment: 1 },
            },
          });
        } else {
          await tx.deliveryBatch.update({
            where: { id: order.deliveryBatch.id },
            data: {
              completedOrders: newCompletedOrdersCount,
              status: BatchStatus.PARTIALLY_COMPLETED,
            },
          });
        }
      }

      // 9. Outbox & Audit events
      await tx.outboxEvent.create({
        data: {
          eventType: OutboxEventType.ORDER_DELIVERED,
          aggregateType: 'Order',
          aggregateId: order.id,
          payload: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            driverId: driver.id,
            totalAmount: Number(order.total),
          },
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: driver.userId,
          actorRole: UserRole.DRIVER,
          storeId: order.storeId,
          action: AuditAction.OTP_VERIFY,
          entityType: 'Order',
          entityId: order.id,
          newValue: { status: OrderStatus.DELIVERED, paymentStatus: PaymentStatus.PAID },
        },
      });

      return {
        success: true,
        orderId: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: OrderStatus.DELIVERED,
      };
    });
  }
}

export const otpService = new OTPService();
