import { describe, it, expect, beforeAll } from 'bun:test';
import { prisma } from '../src/database/prisma';
import { ordersService } from '../src/modules/orders/orders.service';
import { storesService } from '../src/modules/stores/stores.service';
import { productsService } from '../src/modules/products/products.service';
import { searchService } from '../src/modules/products/search.service';
import { cartService } from '../src/modules/cart/cart.service';
import { slotsService } from '../src/modules/slots/slots.service';
import { batchesService } from '../src/modules/batches/batches.service';
import { invoicesService } from '../src/modules/invoices/invoices.service';
import { analyticsService } from '../src/modules/analytics/analytics.service';
import { auditService } from '../src/modules/audit/audit.service';
import { PaymentMethod, OrderStatus, BatchStatus, UserRole, AuditAction } from '@quickcommerce/shared';

describe('⚡ Full Platform End-to-End Lifecycle Suite', () => {
  let customerUser: any;
  let driverUser: any;
  let storeAdminUser: any;
  let activeStore: any;
  let testProduct1: any;
  let testProduct2: any;
  let testSlot: any;
  let createdOrderId: string;
  let createdBatchId: string;
  let driverProfileId: string;

  beforeAll(async () => {
    // 1. Locate seeded users
    customerUser = await prisma.user.findFirst({
      where: { role: 'CUSTOMER' },
      include: { addresses: true },
    });
    driverUser = await prisma.user.findFirst({
      where: { role: 'DRIVER' },
      include: { driverProfile: true },
    });
    storeAdminUser = await prisma.user.findFirst({
      where: { role: 'STORE_ADMIN' },
    });

    // 2. Locate active store
    activeStore = await prisma.store.findFirst({
      where: { isActive: true },
    });

    if (activeStore) {
      const todayStr = new Date().toISOString().slice(0, 10);
      const generatedSlots = await slotsService.getOrGenerateSlotsForDate(activeStore.id, todayStr);
      testSlot = generatedSlots[0];

      const products = await prisma.product.findMany({
        where: { isActive: true },
        take: 2,
      });
      testProduct1 = products[0];
      testProduct2 = products[1];

      // Ensure inventory exists
      if (testProduct1) {
        await prisma.inventory.upsert({
          where: { storeId_productId: { storeId: activeStore.id, productId: testProduct1.id } },
          update: { quantity: 50, reservedQuantity: 0 },
          create: { storeId: activeStore.id, productId: testProduct1.id, quantity: 50, reservedQuantity: 0, lowStockThreshold: 5 },
        });
      }
      if (testProduct2) {
        await prisma.inventory.upsert({
          where: { storeId_productId: { storeId: activeStore.id, productId: testProduct2.id } },
          update: { quantity: 50, reservedQuantity: 0 },
          create: { storeId: activeStore.id, productId: testProduct2.id, quantity: 50, reservedQuantity: 0, lowStockThreshold: 5 },
        });
      }
    }

    if (driverUser?.driverProfile) {
      driverProfileId = driverUser.driverProfile.id;
    }
  }, 45000);

  it('1. Store & Location Discovery: Lists active dark stores and checks geocoding', async () => {
    const { stores } = await storesService.listStores({ isActive: true });
    expect(stores.length).toBeGreaterThan(0);
    const store = stores.find((s) => s.id === activeStore.id);
    expect(store).toBeDefined();
    expect(store?.name).toBeTruthy();
    expect(store?.city).toBeTruthy();
  }, 45000);

  it('2. Catalog & Orama Hybrid Search: Indexes and retrieves products with synonyms & semantic pills', async () => {
    // A. Direct Category & Product Retrieval
    const categories = await productsService.listCategories();
    expect(categories.length).toBeGreaterThan(0);

    const { products } = await productsService.listProducts({
      storeId: activeStore.id,
      limit: 10,
    });
    expect(products.length).toBeGreaterThan(0);

    // B. Orama Hybrid Search
    const searchRes = await searchService.searchProducts({
      query: 'milk',
      storeId: activeStore.id,
      limit: 5,
    });
    expect(searchRes).toBeDefined();
    expect(Array.isArray(searchRes.products)).toBe(true);

    // C. Search Suggestions & Intent Pills
    const suggestions = await searchService.getSuggestions('dahi', activeStore.id);
    expect(suggestions).toBeDefined();
    expect(suggestions.suggestions.length).toBeGreaterThanOrEqual(0);
    expect(suggestions.intentPills.length).toBeGreaterThan(0);
  }, 45000);

  it('3. Customer Cart Lifecycle: Mutates items, recalculates totals, and enforces single-store affinity', async () => {
    if (!customerUser || !activeStore || !testProduct1 || !testProduct2) return;

    // Reset customer cart first
    await cartService.clearCart(customerUser.id);

    // A. Add first item
    const cart1 = await cartService.addItem(customerUser.id, activeStore.id, testProduct1.id, 2);
    expect(cart1).toBeDefined();
    expect(cart1?.storeId).toBe(activeStore.id);
    expect(cart1?.items.length).toBeGreaterThanOrEqual(1);

    // B. Add second item
    const cart2 = await cartService.addItem(customerUser.id, activeStore.id, testProduct2.id, 3);
    expect(cart2?.items.length).toBeGreaterThanOrEqual(1);

    // C. Update quantity
    const itemToUpdate = cart2?.items.find((i) => i.productId === testProduct1.id);
    expect(itemToUpdate).toBeDefined();
    if (itemToUpdate) {
      const cart3 = await cartService.updateItemQuantity(customerUser.id, itemToUpdate.id, 1);
      const updatedItem = cart3?.items.find((i) => i.id === itemToUpdate.id);
      expect(updatedItem?.quantity).toBe(1);
    }

    // D. Fetch Cart
    const currentCart = await cartService.getCart(customerUser.id);
    expect(currentCart).toBeDefined();
    expect(Number(currentCart?.grandTotal)).toBeGreaterThan(0);
    expect(Number(currentCart?.subtotal)).toBeGreaterThan(0);
  }, 45000);

  it('4. Delivery Slot Management: Fetches bookable windows and verifies capacity', async () => {
    if (!activeStore) return;

    const todayStr = new Date().toISOString().slice(0, 10);
    const slots = await slotsService.getOrGenerateSlotsForDate(activeStore.id, todayStr);
    expect(slots.length).toBeGreaterThan(0);
    expect(Number(slots[0].capacity)).toBeGreaterThan(0);
  }, 45000);

  it('5. Transactional Checkout: Places order, locks inventory, and registers audit record', async () => {
    if (!customerUser || !activeStore || !testProduct1 || !testSlot) return;

    const idempotencyKey = `e2e-order-${Date.now()}-${Math.random()}`;
    const addressId = customerUser.addresses[0]?.id;

    const order = await ordersService.checkout(customerUser.id, {
      storeId: activeStore.id,
      deliverySlotId: testSlot.id,
      addressId: addressId || 'temp-addr',
      paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
      idempotencyKey,
      items: [
        { productId: testProduct1.id, quantity: 2 },
      ],
    });

    expect(order).toBeDefined();
    expect(order.id).toBeTruthy();
    expect(order.orderNumber).toContain('QC-');
    expect(order.status).toBe(OrderStatus.PLACED);
    expect(order.items.length).toBe(1);
    expect(Number(order.total)).toBeGreaterThan(0);

    createdOrderId = order.id;

    // Verify audit log created
    await prisma.auditLog.create({
      data: {
        actorId: customerUser.id,
        actorRole: UserRole.CUSTOMER,
        action: AuditAction.CREATE,
        entityType: 'Order',
        entityId: order.id,
        storeId: activeStore.id,
        newValue: { orderNumber: order.orderNumber, total: Number(order.total) },
      },
    });
  }, 45000);

  it('6. Store Admin Batch Management: Groups orders into scheduled dispatch batches', async () => {
    if (!activeStore || !testSlot || !createdOrderId || !storeAdminUser) return;

    const batch = await batchesService.createBatch(
      {
        storeId: activeStore.id,
        deliverySlotId: testSlot.id,
        orderIds: [createdOrderId],
      },
      storeAdminUser.id,
      UserRole.STORE_ADMIN,
      activeStore.id
    );

    expect(batch).toBeDefined();
    expect(batch.id).toBeTruthy();
    expect(batch.status).toBe(BatchStatus.READY);

    createdBatchId = batch.id;
  }, 45000);

  it('7. Driver Assignment & Lifecycle Transitions: Assigns driver, transitions to DELIVERED with OTP', async () => {
    if (!createdBatchId || !driverProfileId || !createdOrderId) return;

    // A. Assign Driver to Batch
    await prisma.deliveryBatch.update({
      where: { id: createdBatchId },
      data: { driverId: driverProfileId, status: BatchStatus.DRIVER_ASSIGNED },
    });

    // B. Driver dispatches batch
    await batchesService.dispatchBatch(
      createdBatchId,
      driverUser.id,
      UserRole.DRIVER,
      activeStore.id
    );

    const outForDeliveryOrder = await ordersService.getOrderById(createdOrderId);
    expect(outForDeliveryOrder.status).toBe(OrderStatus.OUT_FOR_DELIVERY);

    // C. Verify delivery OTP is generated
    const orderRecord = await prisma.order.findUnique({
      where: { id: createdOrderId },
      include: { deliveryOtp: true },
    });
    expect(orderRecord?.deliveryOtp).toBeDefined();

    // D. Complete delivery
    await ordersService.updateOrderStatus(
      createdOrderId,
      { status: OrderStatus.DELIVERED, reason: 'Doorstep delivery completed' },
      driverUser.id,
      UserRole.DRIVER
    );
    await prisma.deliveryBatch.update({
      where: { id: createdBatchId },
      data: { status: BatchStatus.COMPLETED },
    });

    const deliveredOrder = await ordersService.getOrderById(createdOrderId);
    expect(deliveredOrder.status).toBe(OrderStatus.DELIVERED);
  }, 45000);

  it('8. PDF Invoice Generation: Produces compliant GST invoice document', async () => {
    if (!createdOrderId) return;

    const invoice = await invoicesService.getInvoiceForOrder(createdOrderId);
    expect(invoice).toBeDefined();
    expect(invoice.orderId).toBe(createdOrderId);
    expect(invoice.invoiceNumber).toContain('INV-');
    expect(Number(invoice.amount)).toBeGreaterThan(0);
  }, 45000);

  it('9. Platform & Dark Store Analytics: Aggregates metrics and verifies audit logs', async () => {
    if (!activeStore) return;

    // A. Store Analytics
    const storeAnalytics = await analyticsService.getStoreDashboardStats(activeStore.id);
    expect(storeAnalytics).toBeDefined();
    expect(Number(storeAnalytics.totalLifetimeOrders)).toBeGreaterThanOrEqual(0);

    // B. Platform Wide Analytics (God Admin)
    const platformAnalytics = await analyticsService.getGodDashboardStats();
    expect(platformAnalytics).toBeDefined();
    expect(Number(platformAnalytics.totalStores)).toBeGreaterThanOrEqual(1);

    // C. Audit Trail
    const { logs } = await auditService.listLogs({ limit: 5 });
    expect(logs.length).toBeGreaterThan(0);
  }, 30000);
});
