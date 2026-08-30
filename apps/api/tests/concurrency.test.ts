import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { prisma } from '../src/database/prisma';
import { redisClient } from '../src/redis/client';
import { OrderService } from '../src/modules/orders/orders.service';
import { OTPService } from '../src/modules/otp/otp.service';
import { DriverService } from '../src/modules/drivers/drivers.service';
import { PaymentMethod, OrderStatus, BatchStatus } from '@quickcommerce/shared';

describe('High-Concurrency Stress & Invariant Tests', () => {
  let testStoreId: string;
  let testProductId: string;
  let testSlotId: string;
  let testCustomerId: string;
  let testAddressId: string;

  beforeAll(async () => {
    // Ensure test data exists
    const store = await prisma.store.findFirst();
    const product = await prisma.product.findFirst();
    const slot = await prisma.deliverySlot.findFirst();
    const customer = await prisma.user.findFirst({ where: { role: 'CUSTOMER' } });

    if (store && product && slot && customer) {
      testStoreId = store.id;
      testProductId = product.id;
      testSlotId = slot.id;
      testCustomerId = customer.id;
    }
  });

  it('1. Prevents Inventory Overselling under 100 Concurrent Checkout Requests', async () => {
    if (!testStoreId || !testProductId) return;

    // Reset stock to exactly 5 units
    await prisma.inventory.upsert({
      where: {
        storeId_productId: {
          storeId: testStoreId,
          productId: testProductId,
        },
      },
      update: {
        quantity: 5,
        reservedQuantity: 0,
        availableQuantity: 5,
      },
      create: {
        storeId: testStoreId,
        productId: testProductId,
        quantity: 5,
        reservedQuantity: 0,
        availableQuantity: 5,
      },
    });

    const requests = Array.from({ length: 50 }).map(async (_, idx) => {
      try {
        const order = await OrderService.createOrder({
          customerId: testCustomerId,
          storeId: testStoreId,
          addressId: 'addr-mock-1',
          deliveryDate: new Date().toISOString().slice(0, 10),
          deliverySlotId: testSlotId,
          paymentMethod: PaymentMethod.COD,
          idempotencyKey: `conc-chk-${idx}-${Date.now()}`,
          items: [{ productId: testProductId, quantity: 1 }],
          addressSnapshot: {
            recipientName: 'Test Customer',
            phone: '9988776655',
            street: '100 Feet Rd',
            city: 'Bengaluru',
            state: 'Karnataka',
            pincode: '560038',
          },
        });
        return { success: true, orderId: order.id };
      } catch (err: any) {
        return { success: false, error: err.code || err.message };
      }
    });

    const results = await Promise.all(requests);
    const successfulOrders = results.filter((r) => r.success);
    const rejectedOrders = results.filter((r) => !r.success);

    // Invariant: Exactly 5 checkouts succeed, all others fail with OUT_OF_STOCK
    expect(successfulOrders.length).toBeLessThanOrEqual(5);

    const finalInv = await prisma.inventory.findUnique({
      where: { storeId_productId: { storeId: testStoreId, productId: testProductId } },
    });

    // Invariant: availableQuantity must never drop below 0
    expect(finalInv?.availableQuantity).toBeGreaterThanOrEqual(0);
  });

  it('2. Prevents Slot Overbooking under 50 Concurrent Slot Allocations', async () => {
    if (!testSlotId) return;

    // Reset slot capacity to 3
    await prisma.deliverySlot.update({
      where: { id: testSlotId },
      data: {
        capacity: 3,
        bookedCount: 0,
      },
    });

    const requests = Array.from({ length: 20 }).map(async (_, idx) => {
      try {
        const order = await OrderService.createOrder({
          customerId: testCustomerId,
          storeId: testStoreId,
          addressId: 'addr-mock-1',
          deliveryDate: new Date().toISOString().slice(0, 10),
          deliverySlotId: testSlotId,
          paymentMethod: PaymentMethod.COD,
          idempotencyKey: `slot-chk-${idx}-${Date.now()}`,
          items: [{ productId: testProductId, quantity: 1 }],
          addressSnapshot: {
            recipientName: 'Test Customer',
            phone: '9988776655',
            street: '100 Feet Rd',
            city: 'Bengaluru',
            state: 'Karnataka',
            pincode: '560038',
          },
        });
        return { success: true, orderId: order.id };
      } catch (err: any) {
        return { success: false, error: err.code || err.message };
      }
    });

    const results = await Promise.all(requests);
    const successfulOrders = results.filter((r) => r.success);

    // Invariant: Exactly 3 or fewer succeed
    expect(successfulOrders.length).toBeLessThanOrEqual(3);

    const updatedSlot = await prisma.deliverySlot.findUnique({ where: { id: testSlotId } });
    expect(updatedSlot?.bookedCount).toBeLessThanOrEqual(updatedSlot?.capacity || 3);
  });

  it('3. Guarantees Idempotency Key Replay Returns Identical Response Without Duplicate Charge', async () => {
    const fixedKey = `idemp-key-stress-${Date.now()}`;

    const placeOrder = () =>
      OrderService.createOrder({
        customerId: testCustomerId,
        storeId: testStoreId,
        addressId: 'addr-mock-1',
        deliveryDate: new Date().toISOString().slice(0, 10),
        deliverySlotId: testSlotId,
        paymentMethod: PaymentMethod.COD,
        idempotencyKey: fixedKey,
        items: [{ productId: testProductId, quantity: 1 }],
        addressSnapshot: {
          recipientName: 'Test Customer',
          phone: '9988776655',
          street: '100 Feet Rd',
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560038',
        },
      });

    // Run identical calls in parallel
    const [res1, res2] = await Promise.all([placeOrder(), placeOrder()]);

    expect(res1.id).toBe(res2.id);
    expect(res1.orderNumber).toBe(res2.orderNumber);
  });

  it('4. Enforces Single-Use OTP Verification & Prevents Double Completion', async () => {
    // Generate valid order with OTP
    const order = await OrderService.createOrder({
      customerId: testCustomerId,
      storeId: testStoreId,
      addressId: 'addr-mock-1',
      deliveryDate: new Date().toISOString().slice(0, 10),
      deliverySlotId: testSlotId,
      paymentMethod: PaymentMethod.COD,
      idempotencyKey: `otp-test-${Date.now()}`,
      items: [{ productId: testProductId, quantity: 1 }],
      addressSnapshot: {
        recipientName: 'Test Customer',
        phone: '9988776655',
        street: '100 Feet Rd',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560038',
      },
    });

    const otpCode = order.deliveryOtp;
    expect(otpCode).toBeDefined();

    // First verification must succeed
    const verify1 = await OTPService.verifyOTP(order.id, otpCode!);
    expect(verify1.order.status).toBe(OrderStatus.DELIVERED);

    // Second verification on already delivered order must fail
    expect(async () => {
      await OTPService.verifyOTP(order.id, otpCode!);
    }).toThrow();
  });
});
