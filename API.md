# QuickBlink — API Reference & Error Codes

Base URL: `/api`

All successful responses follow the standard JSON envelope:
```json
{
  "success": true,
  "data": { ... }
}
```

All failure responses follow:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```

---

## Key REST API Endpoints

### 1. Authentication (`/api/auth`)
- `POST /api/auth/dev-login` — Switch demo identity (Customer, Store Admin, Driver, God Admin).
- `GET /api/auth/me` — Return current authenticated user profile & roles.

### 2. Stores (`/api/stores`)
- `GET /api/stores` — List all dark stores (Supports `isActive` query filter).
- `GET /api/stores/:id` — Get dark store details.
- `POST /api/stores` — Create dark store (`SUPER_ADMIN` only).
- `PATCH /api/stores/:id` — Update store details with optimistic locking (`expectedVersion`).

### 3. Products & Catalog (`/api/products`)
- `GET /api/products/categories` — List all product categories.
- `GET /api/products` — Catalog search with store-specific price projection & stock status (`storeId`, `categoryId`, `search`, `page`, `limit`).
- `GET /api/products/:id` — Get single product details.

### 4. Delivery Slots (`/api/slots`)
- `GET /api/slots?storeId=...&date=...` — Returns the 4 daily 3-hour slots with real-time capacity and cutoff status in `Asia/Kolkata` timezone.
- `PATCH /api/slots/:id` — Adjust slot capacity and cutoff minutes (`STORE_ADMIN`, `SUPER_ADMIN`).

### 5. Cart Management (`/api/cart`)
- `GET /api/cart` — Authoritative server-recalculated cart breakdown (subtotal, 5% tax, delivery fee, grand total).
- `POST /api/cart/items` — Add item to cart (Enforces single-store cart constraint).
- `PATCH /api/cart/items/:id` — Update item quantity (0 removes item).
- `DELETE /api/cart` — Clear cart.

### 6. Orders & Checkout (`/api/orders`)
- `POST /api/orders/checkout` — High-concurrency transactional checkout with `Idempotency-Key` header.
- `GET /api/orders` — List orders (Scoped by customer or store).
- `GET /api/orders/:id` — Get order status, items, address snapshot, timeline, and delivery OTP.
- `PATCH /api/orders/:id/status` — Transition order status along state machine.

### 7. Batches & Kanban (`/api/batches`)
- `GET /api/batches` — List batches for store or driver.
- `GET /api/batches/:id` — Batch details with stop-by-stop orders.
- `POST /api/batches` — Group ready orders into a new batch.
- `POST /api/batches/:id/dispatch` — Dispatch batch for out-for-delivery.

### 8. Drivers & Fleet (`/api/drivers`)
- `GET /api/drivers` — List drivers for store.
- `GET /api/drivers/me` — Driver profile & status.
- `PATCH /api/drivers/me/status` — Toggle driver status (`AVAILABLE`, `BUSY`, `OFFLINE`).
- `POST /api/drivers/batches/:batchId/assign` — Assign driver to batch (Validates temporal non-overlap).

### 9. OTP Verification (`/api/otp`)
- `POST /api/otp/verify` — Atomic doorstep verification. Completes order, updates batch status, and marks driver available upon batch completion.

### 10. Analytics & Health
- `GET /api/analytics/store/:storeId` — Store admin operational KPIs & slot distribution.
- `GET /api/analytics/god` — Multi-store network GMV, emissions saved, batch efficiency.
- `GET /api/health/ready` — Deep healthcheck (Postgres & Redis).
- `GET /api/docs` — Swagger OpenAPI specification.

---

## Standard Error Codes

| Error Code | HTTP Status | Meaning |
| :--- | :--- | :--- |
| `UNAUTHORIZED` | 401 | Missing or invalid Bearer JWT token |
| `FORBIDDEN` | 403 | User role not permitted or cross-store isolation violation |
| `NOT_FOUND` | 404 | Requested entity does not exist |
| `SLOT_FULL` | 409 | Selected 3-hour delivery slot is at maximum capacity |
| `SLOT_CUTOFF_EXCEEDED` | 400 | Booking cutoff window has passed for this slot |
| `OUT_OF_STOCK` | 409 | Insufficient available stock for one or more items |
| `MULTI_STORE_CART_NOT_ALLOWED` | 400 | Cart contains items from another store |
| `DRIVER_UNAVAILABLE` | 409 | Selected driver is offline or busy |
| `DRIVER_ALREADY_ASSIGNED` | 409 | Driver already has an active overlapping batch in this slot |
| `INVALID_OTP` | 400 | OTP entered does not match HMAC-SHA256 hash |
| `INVALID_STATUS_TRANSITION` | 400 | Illegal order or batch state machine transition |
| `CONCURRENCY_CONFLICT` | 409 | Optimistic lock version mismatch, retry requested |
| `IDEMPOTENCY_CONFLICT` | 409 | Request currently in progress with this key |
