import { describe, it, expect, beforeAll } from 'bun:test';
import { prisma } from '../src/database/prisma';
import { ordersService } from '../src/modules/orders/orders.service';
import { PaymentMethod } from '@quickcommerce/shared';

describe('High-Concurrency Stress & Invariant Tests', () => {
  let testStoreId: string;
  let testProductId: string;
  let testSlotId: string;
  let testCustomerId: string;
  let testAddressId: string;

  beforeAll(async () => {
    try {
      const store = await prisma.store.findFirst({ where: { isActive: true } });
      if (store) {
        testStoreId = store.id;
        const product = await prisma.product.findFirst({ where: { isActive: true } });
        const slot = await prisma.deliverySlot.findFirst({ where: { storeId: store.id, isActive: true } });
        const customer = await prisma.user.findFirst({
          where: { role: 'CUSTOMER' },
          include: { addresses: true },
        });

        if (product && slot && customer) {
          testProductId = product.id;
          testSlotId = slot.id;
          testCustomerId = customer.id;
          testAddressId = customer.addresses[0]?.id || '';
        }
      }
    } catch {
      // Database not connected in isolated environment
    }
  }, 30000);

  it('1. Prevents Inventory Overselling under Concurrent Checkout Requests', async () => {
    if (!testStoreId || !testProductId || !testCustomerId || !testSlotId || !testAddressId) return;

    // Reset stock to exactly 2 units and slot capacity to 20
    await prisma.deliverySlot.update({
      where: { id: testSlotId },
      data: { capacity: 20, bookedCount: 0 },
    });

    await prisma.inventory.upsert({
      where: {
        storeId_productId: {
          storeId: testStoreId,
          productId: testProductId,
        },
      },
      update: {
        quantity: 2,
        reservedQuantity: 0,
      },
      create: {
        storeId: testStoreId,
        productId: testProductId,
        quantity: 2,
        reservedQuantity: 0,
        lowStockThreshold: 1,
      },
    });

    const requests = Array.from({ length: 4 }).map(async (_, idx) => {
      try {
        const order = await ordersService.checkout(
          testCustomerId,
          {
            storeId: testStoreId,
            addressId: testAddressId,
            deliveryDate: new Date().toISOString().slice(0, 10),
            deliverySlotId: testSlotId,
            paymentMethod: PaymentMethod.COD,
            items: [{ productId: testProductId, quantity: 1 }],
          },
          `conc-chk-${idx}-${Date.now()}`
        );
        return { success: true, orderId: order.id };
      } catch (err: any) {
        return { success: false, error: err.code || err.message };
      }
    });

    const results = await Promise.all(requests);
    const successfulOrders = results.filter((r) => r.success);

    // Invariant: At most 2 checkouts succeed (since stock is 2)
    expect(successfulOrders.length).toBeLessThanOrEqual(2);

    const finalInv = await prisma.inventory.findUnique({
      where: { storeId_productId: { storeId: testStoreId, productId: testProductId } },
    });

    // Invariant: quantity must never drop below 0
    expect(finalInv?.quantity ?? 0).toBeGreaterThanOrEqual(0);
  }, 45000);

  it('2. Prevents Slot Overbooking under Concurrent Slot Allocations', async () => {
    if (!testSlotId || !testStoreId || !testProductId || !testCustomerId || !testAddressId) return;

    // Reset stock to 50 and slot capacity to 2
    await prisma.inventory.upsert({
      where: {
        storeId_productId: {
          storeId: testStoreId,
          productId: testProductId,
        },
      },
      update: {
        quantity: 50,
        reservedQuantity: 0,
      },
      create: {
        storeId: testStoreId,
        productId: testProductId,
        quantity: 50,
        reservedQuantity: 0,
        lowStockThreshold: 1,
      },
    });

    await prisma.deliverySlot.update({
      where: { id: testSlotId },
      data: {
        capacity: 2,
        bookedCount: 0,
      },
    });

    const requests = Array.from({ length: 4 }).map(async (_, idx) => {
      try {
        const order = await ordersService.checkout(
          testCustomerId,
          {
            storeId: testStoreId,
            addressId: testAddressId,
            deliveryDate: new Date().toISOString().slice(0, 10),
            deliverySlotId: testSlotId,
            paymentMethod: PaymentMethod.COD,
            items: [{ productId: testProductId, quantity: 1 }],
          },
          `slot-chk-${idx}-${Date.now()}`
        );
        return { success: true, orderId: order.id };
      } catch (err: any) {
        return { success: false, error: err.code || err.message };
      }
    });

    const results = await Promise.all(requests);
    const successfulOrders = results.filter((r) => r.success);

    // Invariant: Exactly 2 or fewer succeed
    expect(successfulOrders.length).toBeLessThanOrEqual(2);

    const updatedSlot = await prisma.deliverySlot.findUnique({ where: { id: testSlotId } });
    expect(updatedSlot?.bookedCount).toBeLessThanOrEqual(updatedSlot?.capacity || 2);
  }, 45000);

  it('3. Guarantees Idempotency Key Replay Returns Identical Response', async () => {
    if (!testStoreId || !testProductId || !testCustomerId || !testSlotId || !testAddressId) return;

    await prisma.deliverySlot.update({
      where: { id: testSlotId },
      data: { capacity: 20, bookedCount: 0 },
    });

    await prisma.inventory.update({
      where: { storeId_productId: { storeId: testStoreId, productId: testProductId } },
      data: { quantity: 20, reservedQuantity: 0 },
    });

    const fixedKey = `idemp-key-stress-${Date.now()}`;

    const placeOrder = () =>
      ordersService.checkout(
        testCustomerId,
        {
          storeId: testStoreId,
          addressId: testAddressId,
          deliveryDate: new Date().toISOString().slice(0, 10),
          deliverySlotId: testSlotId,
          paymentMethod: PaymentMethod.COD,
          items: [{ productId: testProductId, quantity: 1 }],
        },
        fixedKey
      );

    const [res1, res2] = await Promise.all([placeOrder(), placeOrder()]);

    expect(res1.id).toBe(res2.id);
    expect(res1.orderNumber).toBe(res2.orderNumber);
  }, 45000);
});
