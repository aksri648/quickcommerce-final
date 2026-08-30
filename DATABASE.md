# QuickBlink — PostgreSQL Database Schema Reference

The platform uses PostgreSQL 16 managed via Prisma ORM (`apps/api/prisma/schema.prisma`).

---

## Entity Relationship Overview

```
User (Role: CUSTOMER, STORE_ADMIN, STORE_STAFF, DRIVER, SUPER_ADMIN)
 ├── Address (1:N)
 ├── Cart (1:1)
 │    └── CartItem (1:N) -> Product
 ├── StoreStaff (1:N) -> Store
 ├── Driver (1:1) -> Store
 └── Order (1:N) -> Store, DeliverySlot, DeliveryBatch
      ├── OrderItem (1:N) -> Product
      ├── OrderStatusHistory (1:N)
      ├── DeliveryOTP (1:1)
      └── Invoice (1:1)

Store
 ├── StoreProduct (1:N) -> Product
 ├── Inventory (1:N) -> Product
 │    └── InventoryMovement (1:N)
 ├── DeliverySlot (1:N)
 ├── DeliveryBatch (1:N) -> Driver, DeliverySlot
 └── StoreStaff (1:N)

Infrastructure & Reliability Tables:
 ├── IdempotencyKey (key, method, path, requestHash, responseBody, status, expiresAt)
 ├── OutboxEvent (eventType, payload, status, retryCount, nextRetryAt)
 └── AuditLog (action, entityType, entityId, actorId, details, ipAddress)
```

---

## Key Indexes & Constraints

1. **`Inventory`**:
   - Unique: `@@unique([storeId, productId])`
   - Indexes: `[storeId]`, `[productId]`, `[availableQuantity]`
2. **`DeliverySlot`**:
   - Unique: `@@unique([storeId, date, slotIndex])`
   - Indexes: `[storeId, date]`, `[status]`
3. **`DeliveryBatch`**:
   - Unique: `@@unique([batchNumber])`
   - Indexes: `[storeId]`, `[driverId]`, `[status]`, `[deliverySlotId]`
4. **`IdempotencyKey`**:
   - Unique: `@@unique([key])`
   - Index: `[expiresAt]`
5. **`OutboxEvent`**:
   - Indexes: `[status, nextRetryAt]`, `[createdAt]`
