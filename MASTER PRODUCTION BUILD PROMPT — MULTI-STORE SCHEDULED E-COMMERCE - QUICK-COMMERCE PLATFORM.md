# MASTER PRODUCTION BUILD PROMPT — MULTI-STORE SCHEDULED E-COMMERCE / QUICK-COMMERCE PLATFORM

Build a **production-ready, client-sellable, multi-store scheduled-delivery e-commerce platform** using the PERN stack.

This is not a tutorial, prototype, mockup, or CRUD demo.

The system must be architected and implemented as a **real commercial application** that can safely handle concurrent customers, concurrent checkout requests, concurrent admin actions, inventory contention, slot contention, driver assignment conflicts, duplicate requests, retries, failures, and background processing.

The application consists of four independently deployable PWAs:

1. Customer PWA
2. Driver PWA
3. Store Admin PWA
4. God-Level Admin PWA

The business model is inspired by **scheduled delivery / delivery-slot batching**, where customers choose a store and a 3-hour delivery slot, and orders for the same store/date/slot are consolidated into delivery batches.

The application must initially support **Cash on Delivery only**.

Do not implement real-time GPS tracking, live maps, or WebSocket-based tracking.

---

# 1. PRIMARY TECHNOLOGY STACK

## Frontend

Use:

- React
- TypeScript
- Vite
- React Router
- TanStack Query
- Tailwind CSS
- shadcn/ui or equivalent
- React Hook Form
- Zod
- Recharts
- vite-plugin-pwa
- TypeScript strict mode

Create four applications:

```text
apps/
├── customer-pwa
├── driver-pwa
├── store-admin-pwa
└── god-admin-pwa
```

---

# 2. BACKEND

Use:

- Node.js
- TypeScript
- Express.js
- Prisma ORM
- PostgreSQL
- Redis
- BullMQ
- Zod
- Auth0
- Pino structured logging
- Helmet
- CORS
- Rate limiting
- OpenAPI/Swagger documentation
- Centralized error handling

The backend must be a **modular monolith**.

Do not split into microservices unnecessarily.

The architecture must still allow later extraction of modules into services.

---

# 3. INFRASTRUCTURE

Use Render as the primary deployment platform.

Architecture:

```text
Customer PWA ──────────────┐
Driver PWA ────────────────┤
Store Admin PWA ───────────┤
God Admin PWA ─────────────┤
                           ↓
                    Express API
                           ↓
             ┌─────────────┴─────────────┐
             ↓                           ↓
        PostgreSQL                     Redis
             ↓                           ↓
        Persistent data            BullMQ queues
                                         ↓
                              Background Workers
                                         ↓
                                  Backblaze B2
```

Render deployment:

```text
Customer PWA       → Static Site
Driver PWA         → Static Site
Store Admin PWA    → Static Site
God Admin PWA      → Static Site

Backend API        → Render Web Service

Worker             → Render Background Worker

Cron Jobs          → Render Cron Jobs

PostgreSQL         → Managed PostgreSQL

Redis              → Managed Redis / Redis provider
```

Backblaze B2 is used for object storage.

Auth0 is used for authentication.

---

# 4. PRODUCTION ENGINEERING PRINCIPLE

The system must follow this rule:

> The client is never the source of truth for inventory, pricing, permissions, delivery slots, order state, driver availability, or batch state.

Frontend values are always considered untrusted.

The backend must recalculate and validate critical information.

---

# 5. CONCURRENCY AND RACE-CONDITION REQUIREMENT

This is a critical requirement.

The implementation must explicitly identify and prevent race conditions throughout the system.

At minimum handle:

```text
inventory races
slot capacity races
cart/order duplication
duplicate checkout requests
duplicate button submissions
driver assignment races
batch creation races
batch modification races
order status races
OTP verification races
admin concurrent modifications
inventory adjustment races
slot configuration races
job duplication
background worker retries
payment/idempotency races for future payment support
```

Do not assume single-user behavior.

---

# 6. DATABASE AS THE FINAL CONSISTENCY AUTHORITY

PostgreSQL is the final authoritative transactional datastore.

Use:

- Transactions
- Row-level locking
- Foreign keys
- Unique constraints
- Check constraints where appropriate
- Partial unique indexes where appropriate
- Composite indexes
- Optimistic locking where useful
- Version columns where useful

Redis must not become the final source of truth for critical financial/inventory state.

Redis is primarily for:

- distributed locking
- idempotency
- caching
- queues
- rate limiting
- short-lived state

PostgreSQL remains authoritative.

---

# 7. INVENTORY CONCURRENCY

Inventory is store-specific.

Example:

```text
Store A
Product X
Available = 1
```

Two customers simultaneously request:

```text
Customer A → quantity 1
Customer B → quantity 1
```

Only one order may successfully reserve/purchase the final unit.

Implement transactional protection.

Use PostgreSQL row locking such as:

```text
SELECT ... FOR UPDATE
```

or an equally safe atomic update strategy.

Preferred pattern:

```text
BEGIN

lock inventory row

verify:
available >= requestedQuantity

decrement/reserve quantity

create order items

COMMIT
```

If validation fails:

```text
ROLLBACK
```

Never permit negative available inventory.

---

# 8. ATOMIC INVENTORY UPDATE

Where appropriate, use atomic conditions such as:

```text
UPDATE inventory
SET quantity = quantity - :requested
WHERE id = :inventoryId
AND quantity >= :requested
```

Then verify affected rows.

If zero rows are affected:

```text
OUT_OF_STOCK
```

Do not assume the frontend's displayed stock is still valid.

---

# 9. INVENTORY RESERVATION MODEL

Support:

```text
quantity
reservedQuantity
availableQuantity
version
```

Define clearly whether the initial implementation:

```text
decrements inventory immediately
```

or:

```text
reserves inventory and later finalizes it
```

Use the simpler safe approach for COD:

```text
successful order transaction
→ reserve/decrement inventory immediately
```

Maintain `reservedQuantity` in the schema so the system can later support richer reservation/cancellation behavior.

---

# 10. DELIVERY SLOT SYSTEM

There are exactly four default delivery windows per day:

```text
09:00 AM – 12:00 PM
12:00 PM – 03:00 PM
03:00 PM – 06:00 PM
06:00 PM – 09:00 PM
```

The architecture must allow future configurable slots.

Every order requires:

```text
deliveryDate
deliverySlotId
```

---

# 11. SLOT CAPACITY CONCURRENCY

Example:

```text
Capacity = 30
Booked = 29
```

Two customers attempt to book simultaneously.

Only one may acquire the final available capacity.

Never implement:

```text
frontend:
remaining = capacity - booked

backend:
blindly increment booked
```

This is unsafe.

Use PostgreSQL transaction + row lock or an atomic conditional update.

Example conceptual behavior:

```text
BEGIN

lock slot

verify:
bookedCount < capacity

increment bookedCount

create order

COMMIT
```

If capacity is exhausted:

```text
SLOT_FULL
```

---

# 12. INVENTORY + SLOT ATOMICITY

Checkout must make inventory and slot booking consistent.

The order creation transaction must guarantee:

```text
inventory succeeds
AND
slot capacity succeeds
AND
order succeeds
```

or:

```text
none of them succeed
```

Example:

```text
BEGIN

lock slot
lock inventory

validate slot
validate inventory

reserve slot
reserve/decrement inventory

create order
create order items
create OTP
create status history

COMMIT
```

If anything fails:

```text
ROLLBACK
```

---

# 13. DEADLOCK PREVENTION

When multiple database rows are locked, always acquire locks in a deterministic order.

Example:

```text
1. DeliverySlot
2. Inventory rows sorted by inventory ID
3. Order-related records
```

Never randomly lock records.

When multiple products are in a cart, sort inventory IDs before locking.

This minimizes deadlocks.

Implement retry handling for PostgreSQL serialization/deadlock errors where appropriate.

Use bounded retry counts with jitter.

---

# 14. IDEMPOTENCY

Implement idempotency for all critical mutation endpoints.

At minimum:

```text
POST /orders
POST /orders/:id/assign-driver
POST /delivery-batches/:id/dispatch
POST /orders/:id/verify-otp
POST /inventory/:id/adjust
```

Customer checkout is particularly important.

Frontend generates an idempotency key for every checkout attempt.

Example:

```text
Idempotency-Key: UUID
```

Backend stores:

```text
userId
endpoint
idempotencyKey
requestHash
response
createdAt
```

with a unique constraint.

If the same request is submitted twice:

```text
return original result
```

Do not create duplicate orders.

---

# 15. DOUBLE-SUBMIT PROTECTION

Frontend:

- Disable mutation button during request
- Show loading state
- Generate idempotency key before submission

Backend:

- Require/handle idempotency key for critical operations
- Use database uniqueness constraints
- Use transaction protection

Never rely only on button disabling.

---

# 16. DRIVER ASSIGNMENT RACE CONDITIONS

Example:

```text
Driver Rahul = AVAILABLE
```

Two store admins simultaneously attempt:

```text
Batch A → Rahul
Batch B → Rahul
```

Only one may succeed.

Use transaction and locking.

Possible implementation:

```text
BEGIN

lock driver row

verify driver status

verify no conflicting active batch

create assignment

set driver BUSY

COMMIT
```

Add a database-level uniqueness strategy where possible for active conflicting assignments.

Do not depend only on frontend availability lists.

---

# 17. DRIVER SLOT CONFLICTS

A driver may have:

```text
09–12 → Batch A
```

and cannot be assigned to:

```text
09–12 → Batch B
```

They may potentially be assigned to:

```text
12–03 → Batch C
```

provided business rules permit it.

Backend must validate temporal overlap.

Do not rely on dropdown filtering.

---

# 18. BATCH CREATION CONCURRENCY

Multiple admin requests/workers may attempt to create the same batch for:

```text
Store A
31 Aug
09–12
```

Do not create duplicate batches.

Use a unique database constraint such as:

```text
(storeId, deliverySlotId)
```

or an equivalent uniqueness model.

Because `DeliverySlot` already identifies a store/date/window, prefer a strong unique relation around the slot.

Creation should use:

```text
INSERT ... ON CONFLICT
```

or Prisma equivalent.

---

# 19. BATCH MEMBERSHIP

An order may belong to at most one active delivery batch.

Enforce using:

- Database uniqueness
- Transactional validation

Do not allow:

```text
Order 1001 → Batch A
Order 1001 → Batch B
```

simultaneously.

---

# 20. BATCH FORMATION

Orders are batch-compatible when:

```text
same store
+
same delivery date
+
same delivery slot
+
eligible order status
+
not already assigned
```

Batch creation can be automated.

Use a background queue to periodically consolidate ready orders where appropriate.

Store Admin may also manually manage eligible orders.

---

# 21. QUEUE ARCHITECTURE

Use Redis + BullMQ.

Create queues such as:

```text
order-events
batching
notifications
invoice-generation
analytics
maintenance
```

Do not put the critical database transaction itself entirely inside an asynchronous queue.

The order checkout request should synchronously complete the transaction.

Use queues for post-transaction processing.

---

# 22. OUTBOX PATTERN

Implement an Outbox pattern for reliable background event processing.

When an important transaction occurs:

```text
PostgreSQL transaction
    ↓
business data
+
outbox event
```

commit together.

Example:

```text
Order created
+
OrderCreated outbox event
```

A background worker reads outbox events and publishes/processes them.

This prevents:

```text
database updated
but queue event lost
```

---

# 23. OUTBOX EVENTS

Support events such as:

```text
ORDER_CREATED
ORDER_ACCEPTED
ORDER_READY
ORDER_BATCHED
BATCH_ASSIGNED
BATCH_DISPATCHED
ORDER_DELIVERED
ORDER_CANCELLED
INVENTORY_LOW
INVENTORY_UPDATED
DRIVER_ASSIGNED
INVOICE_GENERATION_REQUESTED
```

Events should be:

- versioned
- idempotent
- traceable
- retryable

---

# 24. QUEUE RETRY STRATEGY

BullMQ jobs should support:

- retries
- exponential backoff
- jitter
- dead-letter handling
- job IDs
- idempotent workers

Do not allow retrying a job to duplicate business operations.

Every worker must be idempotent.

---

# 25. DEAD-LETTER / FAILED JOB HANDLING

Create a mechanism to identify permanently failed jobs.

Admin should be able to inspect:

```text
job type
attempt count
error
created time
last attempt
payload/reference
```

Do not silently discard failed operational jobs.

---

# 26. REDIS LOCKING

Use Redis distributed locks only when they materially help.

Examples:

```text
batch formation
scheduled processing
non-transactional coordination
```

Do NOT use Redis locking as the only protection for inventory.

PostgreSQL must still enforce inventory consistency.

Locks should have:

- TTL
- unique lock token
- safe release
- bounded acquisition timeout

Avoid unsafe lock deletion.

---

# 27. ORDER STATUS CONCURRENCY

Two actors should not be able to perform conflicting state changes simultaneously.

Example:

```text
Admin:
READY_FOR_DISPATCH → CANCELLED

Driver:
READY_FOR_DISPATCH → OUT_FOR_DELIVERY
```

Only one valid transition should win.

Use transaction + row locking and verify current status before transition.

Implement an explicit state-machine service.

---

# 28. ORDER STATE MACHINE

Use:

```text
PLACED
ACCEPTED
PREPARING
READY_FOR_DISPATCH
ASSIGNED_TO_BATCH
OUT_FOR_DELIVERY
DELIVERED
CANCELLED
```

Only valid transitions are allowed.

Examples:

```text
PLACED → ACCEPTED
ACCEPTED → PREPARING
PREPARING → READY_FOR_DISPATCH
READY_FOR_DISPATCH → ASSIGNED_TO_BATCH
ASSIGNED_TO_BATCH → OUT_FOR_DELIVERY
OUT_FOR_DELIVERY → DELIVERED
```

Cancellation rules must be explicit.

---

# 29. OTP SECURITY AND CONCURRENCY

Every order receives a separate OTP.

Use cryptographically secure random generation.

Store only:

```text
otpHash
expiresAt
attemptCount
verifiedAt
usedAt
```

When driver submits OTP:

```text
BEGIN

lock order
lock OTP

verify driver owns order/batch

verify order state

verify OTP validity

mark OTP consumed

set order DELIVERED

update delivery assignment

update batch status if necessary

update driver availability if batch complete

create order status history

create audit log

COMMIT
```

This must be one atomic transaction.

Two simultaneous OTP verification requests must not both complete the order.

---

# 30. OTP IDEMPOTENCY

A duplicate successful verification request must return safely without causing duplicate side effects.

If OTP is already consumed:

```text
order already delivered
```

can be returned as an idempotent result where appropriate.

---

# 31. BATCH COMPLETION

A batch is completed when all member orders are in terminal states.

Terminal states:

```text
DELIVERED
CANCELLED
```

Do not mark the batch completed merely because its scheduled time ended.

---

# 32. DRIVER AVAILABILITY

Driver availability must be derived from actual assignments.

Never trust:

```text
driver.available = true
```

from the frontend.

Backend validates:

```text
driver active
+
no overlapping active batch
```

before assignment.

---

# 33. SLOT STATUS

A slot can be:

```text
UPCOMING
OPEN
FULL
CLOSED
IN_PROGRESS
COMPLETED
```

Status must be calculated from:

```text
current time
booking cutoff
capacity
configuration
```

Use the configured business timezone.

Initial timezone:

```text
Asia/Kolkata
```

---

# 34. DELIVERY SLOTS

Default daily slots:

```text
09:00–12:00
12:00–15:00
15:00–18:00
18:00–21:00
```

Do not hard-code slot logic throughout the application.

Create configurable slot records.

---

# 35. SLOT CAPACITY ADMINISTRATION

Store Admin and Super Admin may configure:

```text
capacity
booking cutoff
active state
```

Do not allow capacity to be reduced below current bookings without explicit handling.

Example:

```text
Booked = 27
Current Capacity = 30
Admin attempts Capacity = 20
```

Reject the operation unless an explicit resolution workflow exists.

---

# 36. CUSTOMER DELIVERY SLOT SCREEN

The customer must see:

```text
Delivery Date
09:00 AM – 12:00 PM
12:00 PM – 03:00 PM
03:00 PM – 06:00 PM
06:00 PM – 09:00 PM
```

Each available option should show:

```text
Available
Few slots left
Fully booked
```

Do not expose exact operational numbers unless desired.

---

# 37. CUSTOMER PWA — REQUIRED SCREENS

Implement all:

```text
Splash
Onboarding
Login
Home
Store Selection
Search
Search Results
Categories
Category Products
Product Details
Cart
Delivery Address List
Add Address
Edit Address
Checkout
Delivery Slot Selection
Order Confirmation
Order Details
Order History
Active Orders
Completed Orders
Cancelled Orders
Profile
Settings
```

---

# 38. CUSTOMER HOME

Display:

- Current store
- Store change
- Search
- Categories
- Promotional banners
- Featured products
- Popular products
- Reorder section
- Cart
- Orders

Bottom navigation:

```text
Home
Categories
Orders
Profile
```

---

# 39. CUSTOMER STORE SELECTION

Display:

```text
Store
Area
Availability
Store status
```

If changing store with cart items:

```text
Changing store will clear your cart.
```

Require explicit confirmation.

---

# 40. CUSTOMER PRODUCT CATALOG

Each product card:

```text
image
name
brand
unit
MRP
selling price
discount
stock status
add/quantity controls
```

Out-of-stock products cannot be added.

---

# 41. CUSTOMER CART

Display:

```text
Store
Items
Quantities
Prices
Subtotal
Discount
Tax
Delivery charge
Total
```

Use server data as authoritative.

---

# 42. CUSTOMER CHECKOUT

Show:

```text
Address
Delivery Date
Delivery Slot
Products
Pricing
COD
Final Total
```

The backend recalculates all pricing.

Never trust frontend:

```text
price
discount
tax
total
```

---

# 43. CUSTOMER CHECKOUT PRICE VALIDATION

On order creation, backend must retrieve current product/store prices.

Do not accept client-provided total as authoritative.

Calculate:

```text
item subtotal
discount
tax
delivery fee
grand total
```

inside backend/business logic.

Store a pricing snapshot in the order/order items.

---

# 44. CUSTOMER ORDER CONFIRMATION

Display:

```text
Order placed successfully
Order number
Store
Delivery date
Delivery slot
Total
COD
Delivery OTP
```

---

# 45. CUSTOMER ORDER DETAILS

Display:

```text
Order number
Store
Date
Delivery slot
Address
Products
Pricing
COD
Payment status
Order status
OTP
Driver when appropriate
```

Timeline:

```text
Order Placed
Accepted
Preparing
Ready for Dispatch
Batched
Out for Delivery
Delivered
```

---

# 46. CUSTOMER UPCOMING ORDERS

Show:

```text
Tomorrow
03:00 PM – 06:00 PM
```

with order status.

---

# 47. DRIVER PWA — REQUIRED SCREENS

Implement all:

```text
Login
Dashboard
Availability
Current Batch
Batch Details
Batch Order List
Order Details
OTP Verification
Successful Delivery
Batch Completion
Delivery History
Profile
```

---

# 48. DRIVER DASHBOARD

Display:

```text
Driver name
Availability
Current delivery slot
Current batch
Orders in batch
Completed today
Pending today
```

Example:

```text
Current Batch
BATCH-001

03:00–06:00

4 Orders
2 Completed
2 Remaining
```

---

# 49. DRIVER CURRENT BATCH

Display:

```text
Batch ID
Store
Date
Slot
Driver
Order count
Order list
```

Each order:

```text
Order ID
Customer
Address
Status
```

---

# 50. DRIVER ORDER DETAILS

Display:

```text
Order
Customer
Phone
Address
Products
Quantity
Total
Payment
Slot
Status
```

Buttons:

```text
Start Delivery
Verify OTP
```

Only valid actions should be visible/enabled.

---

# 51. DRIVER DELIVERY

For each customer:

```text
Open order
↓
View address
↓
Deliver
↓
Customer provides OTP
↓
Enter OTP
↓
Verify
↓
Order delivered
↓
Next order
```

---

# 52. STORE ADMIN PWA — REQUIRED SCREENS

Implement:

```text
Login
Dashboard
Orders
Order Details
Delivery Slots
Slot Details
Delivery Batches
Batch Details
Driver Assignment
Drivers
Driver Details
Products
Product Details
Inventory
Inventory Adjustment
Staff
Invoices
Analytics
Store Settings
Audit Logs
```

---

# 53. STORE ADMIN DASHBOARD

Display:

```text
Today's Orders
Today's Revenue
Current Slot
Orders by Slot
Open Batches
Active Batches
Available Drivers
Busy Drivers
Low Stock
Out of Stock
Completion Rate
```

---

# 54. STORE SLOT BOARD

Create an operational slot board:

```text
09–12
12–03
03–06
06–09
```

Each slot displays:

```text
Orders
Booked capacity
Remaining
Batches
Drivers
Status
```

---

# 55. STORE BATCH BOARD

Create a delivery batch management interface.

Columns:

```text
READY
BATCHED
DRIVER ASSIGNED
OUT FOR DELIVERY
PARTIALLY COMPLETED
COMPLETED
```

Show order cards grouped by batch.

---

# 56. STORE BATCH DETAILS

Display:

```text
Batch ID
Store
Delivery Date
Delivery Slot
Driver
Batch status
Total orders
Completed orders
Pending orders
```

Orders:

```text
Order
Customer
Address
Amount
Status
OTP status
```

---

# 57. DRIVER ASSIGNMENT UI

Dropdown should show only eligible drivers.

Eligibility:

```text
active
correct store
available
no overlapping batch
not already assigned to another conflicting batch
```

But the backend must revalidate all conditions at assignment time.

---

# 58. STORE INVENTORY MANAGEMENT

Display:

```text
Product
SKU
Current Quantity
Reserved
Available
Threshold
Status
```

Actions:

```text
Increase
Decrease
Set
Adjust
```

Every adjustment must create an audit event.

Inventory adjustment operations require transaction safety.

---

# 59. INVENTORY ADJUSTMENT CONCURRENCY

If two admins adjust the same inventory item simultaneously:

Do not silently overwrite one update.

Use either:

```text
row locking
```

or:

```text
optimistic versioning
```

Prefer transactional updates.

Record:

```text
before
change
after
actor
reason
timestamp
```

---

# 60. STORE STAFF

Manage:

```text
Name
Email
Role
Active
Created
```

Store Admin can manage their store's staff.

---

# 61. STORE DRIVER MANAGEMENT

Display:

```text
Driver
Status
Availability
Current Batch
Current Slot
Today's Orders
Completed Orders
```

---

# 62. STORE INVOICES

Display:

```text
Invoice
Order
Customer
Amount
Date
Status
```

Allow:

```text
View
Download
```

---

# 63. GOD ADMIN PWA — REQUIRED SCREENS

Implement:

```text
Login
Dashboard
Stores
Store Details
Global Orders
Order Details
Delivery Slots
Slot Details
Delivery Batches
Batch Details
Customers
Customer Details
Drivers
Driver Details
Products
Inventory
Staff
Invoices
Analytics
Audit Logs
Admin Management
Platform Settings
System Health
Background Jobs
```

---

# 64. GOD ADMIN DASHBOARD

Display:

```text
Total Stores
Active Stores
Customers
Drivers
Orders Today
Revenue Today
Active Batches
Active Deliveries
Completed Orders
Cancelled Orders
Low Stock
Out of Stock
```

Slot summary:

```text
09–12
12–03
03–06
06–09
```

---

# 65. GLOBAL DELIVERY OPERATIONS

God Admin should see:

```text
Store
Slot
Orders
Capacity
Batches
Drivers
Completed
Pending
```

Allow drilling down:

```text
Global
→ Store
→ Slot
→ Batch
→ Order
```

---

# 66. GOD ADMIN STORE DETAILS

Tabs:

```text
Overview
Orders
Slots
Batches
Inventory
Products
Drivers
Staff
Analytics
Audit
```

---

# 67. GOD ADMIN ANALYTICS

Include:

## Sales

- Daily
- Weekly
- Monthly
- Custom date range

## Orders

- Total
- Completed
- Cancelled
- Pending
- Average order value

## Stores

- Revenue by store
- Orders by store
- Store ranking

## Slots

- Orders per slot
- Capacity utilization
- Slot fill rate

## Batches

- Orders per batch
- Items per batch
- Completion time
- Batch utilization

## Drivers

- Deliveries
- Completion rate
- Average completion time
- Batch utilization

---

# 68. SLOT UTILIZATION

Calculate:

```text
booked / capacity
```

Display:

```text
09–12 → 82%
12–03 → 64%
03–06 → 91%
06–09 → 98%
```

---

# 69. BATCH EFFICIENCY ANALYTICS

Track:

```text
average orders per batch
average items per batch
orders per driver
batches per driver
batch completion rate
partial batch rate
```

These metrics should demonstrate the benefit of delivery batching.

---

# 70. DATABASE MODELS

Create proper Prisma models for:

```text
User
CustomerProfile
Store
StoreStaff
Driver
Category
Product
StoreProduct
Inventory
Address
Cart
CartItem
DeliverySlot
DeliveryBatch
DeliveryBatchOrder
BatchDriverAssignment
Order
OrderItem
OrderStatusHistory
DeliveryOTP
Invoice
File
AuditLog
Notification
OutboxEvent
IdempotencyKey
```

Add any additional entities necessary for production quality.

---

# 71. ORDER MODEL

Include at minimum:

```text
id
orderNumber
customerId
storeId
deliveryDate
deliverySlotId
deliveryBatchId
status
subtotal
discount
tax
deliveryFee
total
paymentMethod
paymentStatus
addressSnapshot
createdAt
updatedAt
version
```

Store delivery/address information as a snapshot so future profile/address changes do not alter historical orders.

---

# 72. ORDER ITEM MODEL

Store:

```text
productId
productNameSnapshot
skuSnapshot
unitSnapshot
unitPrice
quantity
discount
tax
total
```

Do not depend on current product data to reconstruct historical invoices.

---

# 73. PRODUCT PRICING SNAPSHOTS

When order is created:

```text
product name
SKU
price
tax
discount
```

must be snapshotted into the order.

This protects historical order integrity when products later change.

---

# 74. DELIVERY SLOT MODEL

Include:

```text
id
storeId
date
startTime
endTime
bookingCutoff
capacity
bookedCount
status
isActive
createdAt
updatedAt
version
```

Use database constraints to prevent invalid values.

---

# 75. DELIVERY BATCH MODEL

Include:

```text
id
batchNumber
storeId
deliverySlotId
driverId
status
createdAt
assignedAt
dispatchedAt
completedAt
version
```

---

# 76. DRIVER ASSIGNMENT MODEL

Include:

```text
id
driverId
batchId
assignedAt
unassignedAt
status
```

Use constraints to prevent conflicting active assignments.

---

# 77. OTP MODEL

Include:

```text
id
orderId
otpHash
expiresAt
attemptCount
verifiedAt
usedAt
createdAt
```

Ensure one active OTP per order.

---

# 78. IDEMPOTENCY MODEL

Create:

```text
IdempotencyKey
```

with:

```text
id
key
userId
endpoint
requestHash
responseStatus
responseBody
createdAt
expiresAt
```

Use a unique constraint:

```text
(userId, key, endpoint)
```

---

# 79. OUTBOX MODEL

Create:

```text
OutboxEvent
```

fields:

```text
id
eventType
aggregateType
aggregateId
payload
status
attempts
availableAt
processedAt
lastError
createdAt
```

---

# 80. AUDIT LOG MODEL

Store:

```text
actorId
actorRole
storeId
action
entityType
entityId
oldValue
newValue
metadata
ipAddress
userAgent
createdAt
```

Do not log sensitive credentials or raw OTP values.

---

# 81. API SECURITY

Implement:

- Auth0 JWT verification
- RBAC
- Store-level authorization
- Resource-level authorization
- Helmet
- CORS
- Rate limiting
- Request size limits
- Input validation
- Parameter validation
- Secure headers
- Structured logging
- Error sanitization

Never leak stack traces in production responses.

---

# 82. AUTHORIZATION RULES

CUSTOMER:

```text
own profile
own addresses
own cart
own orders
```

DRIVER:

```text
own profile
own assigned batches
own delivery orders
```

STORE_STAFF:

```text
assigned store
```

STORE_ADMIN:

```text
assigned store
```

SUPER_ADMIN:

```text
all stores
all users
```

---

# 83. STORE DATA ISOLATION

This is mandatory.

Every store-scoped query must enforce authorization.

Do not merely do:

```text
WHERE storeId = req.params.storeId
```

Use authenticated user's authorized store scope.

Store A admin manipulating:

```text
/api/orders?storeId=storeB
```

must receive:

```text
403 FORBIDDEN
```

---

# 84. API RESPONSE FORMAT

Use consistent responses:

```json
{
  "success": true,
  "data": {}
}
```

and:

```json
{
  "success": false,
  "error": {
    "code": "SLOT_FULL",
    "message": "The selected delivery slot is no longer available."
  }
}
```

---

# 85. IMPORTANT ERROR CODES

Implement:

```text
OUT_OF_STOCK
INSUFFICIENT_STOCK
SLOT_FULL
SLOT_CLOSED
SLOT_NOT_BOOKABLE
STORE_INACTIVE
DRIVER_UNAVAILABLE
DRIVER_CONFLICT
BATCH_INVALID
INVALID_ORDER_STATE
INVALID_OTP
OTP_EXPIRED
OTP_ALREADY_USED
IDEMPOTENCY_CONFLICT
UNAUTHORIZED
FORBIDDEN
RESOURCE_NOT_FOUND
VALIDATION_ERROR
CONCURRENT_MODIFICATION
```

---

# 86. OBSERVABILITY

Implement production logging.

Use structured JSON logs.

Every request should have:

```text
requestId
userId where available
route
method
status
duration
```

Business events should include:

```text
orderId
storeId
batchId
driverId
```

where applicable.

---

# 87. DISTRIBUTED REQUEST TRACING

Use a request/correlation ID.

Propagate it:

```text
HTTP request
↓
database/business logs
↓
outbox event
↓
queue job
↓
worker logs
```

This allows a production operator to trace one order through the system.

---

# 88. HEALTH ENDPOINTS

Implement:

```text
GET /health
GET /health/ready
GET /health/live
```

Readiness should check required dependencies.

Example:

```text
PostgreSQL
Redis
```

Do not expose sensitive connection details.

---

# 89. DATABASE MIGRATIONS

Use Prisma migrations.

Never modify production schema manually.

Provide:

```text
migration scripts
seed script
rollback strategy/documentation
```

---

# 90. BACKUP REQUIREMENTS

Configure/document:

- PostgreSQL backups
- Restore process
- Data retention
- Disaster recovery
- B2 file durability/recovery strategy

The README must describe how to restore production data.

---

# 91. FILE STORAGE

Use Backblaze B2 for:

```text
product images
store images
invoice PDFs
documents
```

Validate:

```text
file type
file size
extension
content type
```

Use secure object naming.

Do not trust uploaded filenames.

---

# 92. INVOICE GENERATION

Invoice generation should be asynchronous when it does not need to block order creation.

Example:

```text
Order created
↓
Outbox event
↓
BullMQ job
↓
Generate PDF
↓
Upload B2
↓
Update invoice record
```

Make invoice generation idempotent.

Never create duplicate invoices due to queue retries.

---

# 93. NOTIFICATIONS

Create an abstraction for:

```text
email
push
SMS
in-app
```

Initially it is acceptable to implement:

```text
in-app notification records
```

and leave external providers configurable.

Notification jobs should be asynchronous.

---

# 94. CUSTOMER PWA PWA REQUIREMENTS

Use:

- web manifest
- service worker
- installability
- application icons
- offline shell
- caching
- responsive UI

Do not allow critical operations offline.

The following always require live backend connectivity:

```text
checkout
inventory changes
slot booking
driver assignment
OTP verification
delivery completion
```

---

# 95. DRIVER PWA OFFLINE RULE

The Driver PWA may cache the UI shell but must not allow:

```text
offline OTP verification
offline order completion
offline batch state mutation
```

Critical delivery operations always require server validation.

---

# 96. CUSTOMER PWA DESIGN

Use a modern Indian quick-commerce visual direction.

Theme:

```text
White
Green
Yellow
```

Design:

- Rounded cards
- Large product imagery
- Large prices
- Green CTAs
- Yellow highlights
- Minimal visual clutter
- Sticky cart CTA
- Mobile-first
- Fast browsing

Take inspiration from quick-commerce UX patterns but do not copy proprietary branding, logos, assets, or exact UI from Blinkit, BigBasket, or another competitor.

---

# 97. DRIVER DESIGN

Optimize for fast operation.

Use:

- Large buttons
- Clear order cards
- Prominent batch
- Clear current customer
- Strong status indicators
- Minimal navigation

---

# 98. STORE ADMIN DESIGN

Use:

- Professional dashboard
- Sidebar
- Topbar
- Tables
- Filters
- Charts
- Batch Kanban
- Slot board
- Driver availability indicators
- Inventory status

---

# 99. GOD ADMIN DESIGN

Build a professional SaaS administration console.

Prioritize:

- Global visibility
- Analytics
- Tables
- Filtering
- Store comparison
- Slot utilization
- Delivery-batch performance
- System health

---

# 100. CUSTOMER ORDER FLOW

Implement:

```text
Login
↓
Select Store
↓
Browse
↓
Add Products
↓
Cart
↓
Checkout
↓
Address
↓
Delivery Date
↓
Delivery Slot
↓
COD
↓
Place Order
↓
Backend validates
↓
Transactional inventory + slot allocation
↓
Order creation
↓
OTP creation
↓
Outbox event
↓
Confirmation
```

---

# 101. STORE FLOW

```text
Order appears
↓
Accept
↓
Prepare
↓
Ready for Dispatch
↓
Eligible for batching
↓
Batch created
↓
Driver assigned
↓
Batch dispatched
```

---

# 102. DRIVER FLOW

```text
Driver Login
↓
Current Batch
↓
Order 1
↓
Customer OTP
↓
Verify
↓
Delivered
↓
Order 2
↓
Customer OTP
↓
Verify
↓
Delivered
↓
All batch orders resolved
↓
Batch Completed
↓
Driver Available
```

---

# 103. BATCHING WORKFLOW

When orders become ready:

```text
Order 1001 → Store A → 03–06 → READY
Order 1002 → Store A → 03–06 → READY
Order 1003 → Store A → 03–06 → READY
```

System creates or uses:

```text
Batch B001
Store A
03–06
```

Then:

```text
B001
├── Order 1001
├── Order 1002
└── Order 1003
```

Store Admin assigns Driver Rahul.

---

# 104. AUTOMATIC BATCHING WORKER

Use BullMQ for batching assistance.

Worker can:

```text
find ready orders
group by store/date/slot
create batch if needed
attach eligible orders
```

However, all writes must remain transactionally safe.

The worker must be safe to run twice.

Running the batching job twice must not create duplicate batches or duplicate assignments.

---

# 105. BATCHING LOCK

Use:

```text
Redis lock
```

to reduce duplicate batch-processing attempts for the same store/slot.

However:

```text
Redis lock = optimization/coordination
PostgreSQL constraint = final protection
```

Never rely solely on Redis.

---

# 106. SLOT PROCESSING

Use background jobs for:

```text
slot state changes
booking cutoff updates
slot completion
```

But the API must still dynamically validate current time and slot state.

Never rely exclusively on a Cron job for correctness.

---

# 107. ORDER CANCELLATION

Cancellation must be transactional.

If an order is cancelled before dispatch:

```text
order status updated
inventory restored where business rules require
slot capacity returned
batch membership adjusted
audit log created
outbox event created
```

Every reversal must be atomic.

---

# 108. INVENTORY RESTORATION

If cancellation restores stock:

```text
BEGIN
lock inventory
increase available quantity
update order
update slot if relevant
write audit/outbox
COMMIT
```

Avoid double restoration.

Use an inventory movement/ledger model if needed for strong traceability.

---

# 109. INVENTORY LEDGER

For production traceability, implement:

```text
InventoryMovement
```

with:

```text
id
inventoryId
type
quantity
referenceType
referenceId
beforeQuantity
afterQuantity
actorId
createdAt
```

Movement types:

```text
ORDER_RESERVATION
ORDER_CANCELLATION
MANUAL_ADD
MANUAL_REMOVE
ADJUSTMENT
RESTOCK
```

This makes inventory auditable.

---

# 110. STOCK ADJUSTMENT SAFETY

A manual stock adjustment must not overwrite the current quantity blindly.

Use:

```text
current row lock
calculate new quantity
write movement
update inventory
audit action
```

inside one transaction.

---

# 111. DATABASE CONSTRAINTS

Use constraints wherever possible.

Examples:

```text
unique user.auth0Id
unique store.code
unique product.slug
unique store-product pair
unique order.orderNumber
unique invoice.invoiceNumber
unique delivery batch per slot/store
unique active batch membership per order
```

Add checks for:

```text
capacity >= 0
bookedCount >= 0
bookedCount <= capacity
quantity >= 0
reservedQuantity >= 0
prices >= 0
```

---

# 112. OPTIMISTIC LOCKING

For admin-managed records where concurrent updates are possible, use:

```text
version
```

or:

```text
updatedAt comparison
```

Example:

```text
Admin A loads inventory version 5
Admin B changes inventory → version 6
Admin A submits version 5
```

Backend responds:

```text
CONCURRENT_MODIFICATION
```

rather than silently overwriting Admin B.

---

# 113. RATE LIMITING

Apply appropriate rate limits to:

```text
login-related endpoints
checkout
OTP verification
file uploads
admin mutation endpoints
public catalog APIs
```

OTP verification must have strict per-user/order/IP controls.

---

# 114. ABUSE PREVENTION

Protect against:

```text
OTP brute force
checkout spam
idempotency abuse
oversized payloads
malicious file uploads
API enumeration
unauthorized store access
```

---

# 115. API DOCUMENTATION

Generate OpenAPI documentation.

Document:

- Authentication
- Roles
- Requests
- Responses
- Errors
- Idempotency
- Pagination
- Filtering
- Sorting

---

# 116. PAGINATION

Do not return unlimited rows.

Use pagination for:

```text
orders
products
customers
drivers
staff
inventory
invoices
audit logs
notifications
```

Prefer cursor pagination for high-volume tables where appropriate.

---

# 117. FILTERING/SORTING

Implement server-side filtering for admin tables.

Examples:

```text
store
status
date
slot
batch
driver
customer
product
```

---

# 118. ANALYTICS PERFORMANCE

Start with PostgreSQL queries.

Add indexes.

For expensive recurring analytics:

- summary tables
- scheduled aggregation jobs
- materialized views where appropriate

Do not run extremely expensive scans on every dashboard request.

---

# 119. CACHING

Use Redis selectively for:

```text
catalog caching
store metadata
slot read caching
analytics cache
rate limits
```

Do not cache highly volatile inventory in a way that can create correctness issues.

Inventory checkout must always use authoritative PostgreSQL state.

---

# 120. CACHE INVALIDATION

Whenever appropriate:

```text
inventory change → invalidate relevant cache
product price change → invalidate product cache
store status change → invalidate store cache
slot capacity change → invalidate slot cache
```

Never let caching override business correctness.

---

# 121. DATABASE CONNECTION MANAGEMENT

Use proper PostgreSQL connection pooling.

Configure safe pool sizes for Render production environment.

Do not create a new DB connection for every request.

---

# 122. REDIS CONNECTION MANAGEMENT

Use a shared Redis connection strategy suitable for:

```text
API
BullMQ producers
workers
locks
rate limiting
```

Avoid creating unnecessary Redis connections per request.

---

# 123. BACKGROUND WORKER SEPARATION

The API server handles:

```text
HTTP requests
business operations
transactions
```

The worker handles:

```text
async processing
notifications
invoice generation
analytics
batching assistance
maintenance
```

Do not execute long-running jobs synchronously in HTTP handlers.

---

# 124. GRACEFUL SHUTDOWN

API and workers must handle:

```text
SIGTERM
SIGINT
```

Gracefully:

- stop accepting new work
- finish safe in-flight work
- close queue consumers
- close Redis
- close database connections

This is important for Render deployments.

---

# 125. JOB IDEMPOTENCY

Every BullMQ worker must be safe to execute more than once.

Example:

Invoice job runs twice.

The system must create only one invoice.

Use unique database constraints and state checks.

---

# 126. ORDER NOTIFICATION FLOW

Example:

```text
Order Created
↓
OutboxEvent
↓
Worker
↓
Notification
```

If notification fails:

```text
retry
```

Order creation must not fail because a notification provider is temporarily unavailable.

---

# 127. INVOICE FAILURE

If invoice generation fails:

```text
order remains valid
invoice job retries
admin can inspect failed job
```

Do not roll back an already successful customer order because PDF generation failed afterward.

---

# 128. BACKGROUND JOB OBSERVABILITY

Admin/system health should expose:

```text
pending jobs
active jobs
failed jobs
retrying jobs
completed jobs
```

Do not expose internal Redis credentials or raw sensitive payloads.

---

# 129. TESTING STRATEGY

Use:

- Vitest/Jest
- Supertest
- Playwright
- Integration test database

Test critical concurrency.

---

# 130. REQUIRED CONCURRENCY TESTS

## Inventory

100 concurrent checkout requests against limited stock.

Expected:

```text
successful orders <= available stock
inventory never negative
```

## Slot

100 concurrent checkout requests against limited slot capacity.

Expected:

```text
bookedCount <= capacity
successful bookings <= capacity
```

## Driver

Concurrent assignment attempts to same driver.

Expected:

```text
no overlapping batch assignment
```

## Batch

Concurrent batch creation requests.

Expected:

```text
one batch
```

## OTP

Concurrent OTP verification.

Expected:

```text
one successful completion
```

---

# 131. END-TO-END TEST

Test:

```text
Customer login
↓
Store selection
↓
Product selection
↓
Cart
↓
Slot booking
↓
Checkout
↓
Order creation
↓
Store receives order
↓
Order preparation
↓
Batch creation
↓
Driver assignment
↓
Driver opens batch
↓
OTP delivery
↓
Order completion
↓
Batch completion
↓
Driver availability
```

---

# 132. FAILURE TESTING

Test:

```text
Redis unavailable
PostgreSQL unavailable
queue unavailable
B2 unavailable
invoice generation failure
notification failure
request timeout
duplicate request
client retry
worker retry
admin double-click
driver double-submit OTP
```

The system should fail safely.

---

# 133. DATABASE TRANSACTION BOUNDARIES

Every mutation must clearly define its transaction boundary.

Avoid:

```text
DB transaction
↓
external API call
↓
wait
↓
commit
```

Do not hold database locks while making slow external requests.

Use outbox/async processing where needed.

---

# 134. EXTERNAL SERVICE FAILURE

External services:

```text
Auth0
B2
notification providers
future payment providers
```

must not create partially committed internal transactions.

Use:

```text
transaction
+
outbox
+
background worker
```

where appropriate.

---

# 135. PAYMENT ARCHITECTURE

Initially:

```text
COD
```

Order:

```text
paymentMethod = COD
paymentStatus = PENDING
```

On successful delivery:

```text
paymentStatus = PAID
```

Use an abstraction so online payments can later be introduced.

---

# 136. CASH COLLECTION

Driver order screen should display:

```text
COD Amount
```

and after completion:

```text
Cash Collected
```

The initial system can record:

```text
paymentStatus
```

without implementing a complete cash reconciliation accounting system.

Architect the model so reconciliation can be added later.

---

# 137. SECURITY OF SENSITIVE DATA

Never expose:

```text
Auth0 secrets
B2 secrets
Redis credentials
database credentials
OTP hashes
internal audit metadata
```

to frontend clients.

---

# 138. FRONTEND SECURITY

Do not put secrets in Vite environment variables.

Only expose values genuinely safe for browsers.

---

# 139. ERROR UI

Every major screen needs:

```text
Loading
Empty
Error
Retry
Offline
```

states.

Use skeleton loaders.

Do not display blank screens.

---

# 140. ACCESSIBILITY

Implement:

- semantic HTML
- keyboard navigation
- focus states
- accessible form fields
- screen-reader labels
- touch-friendly controls
- adequate contrast

---

# 141. CUSTOMER PWA RESPONSIVENESS

Mobile-first.

Desktop should still function.

Optimize for:

```text
360px+
```

screens.

---

# 142. DRIVER PWA RESPONSIVENESS

Prioritize:

```text
mobile phones
```

Use one-handed operation.

---

# 143. STORE ADMIN RESPONSIVENESS

Support:

```text
desktop
tablet
```

---

# 144. GOD ADMIN RESPONSIVENESS

Support:

```text
desktop
tablet
```

---

# 145. SEED DATA

Create realistic test data:

```text
5 stores
50+ products
10+ drivers
multiple staff members
multiple customers
inventory
delivery slots
orders
batches
analytics data
```

Create a scenario with:

```text
multiple orders
same store
same slot
same batch
same driver
```

so the batching dashboard can immediately be demonstrated.

---

# 146. DEMO USERS

Provide documented development-only accounts/seed users for:

```text
Customer
Driver
Store Admin
Store Staff
Super Admin
```

Do not ship insecure default passwords into production.

Use environment-controlled development credentials.

---

# 147. FRONTEND ROUTE PROTECTION

Routes must be protected by role.

However:

Frontend protection is only UX.

Backend authorization remains authoritative.

---

# 148. COMMON UI COMPONENTS

Create reusable:

```text
Button
Input
Select
Modal
Dialog
Toast
Badge
Card
Table
Pagination
DatePicker
SlotPicker
StatusBadge
ProductCard
OrderCard
OrderTimeline
DriverSelector
BatchCard
SlotCard
```

---

# 149. CUSTOMER PRODUCT CARD

Display:

```text
Image
Name
Brand
Unit
MRP
Selling Price
Discount
Stock
Quantity
Add
```

---

# 150. SLOT CARD

Display:

```text
09:00 AM – 12:00 PM
Available
```

or:

```text
09:00 AM – 12:00 PM
Fully Booked
```

Use strong selected-state styling.

---

# 151. BATCH CARD

Display:

```text
Batch ID
Slot
Orders
Driver
Status
```

---

# 152. DRIVER CARD

Display:

```text
Driver
Availability
Current Slot
Current Batch
Today's Deliveries
```

---

# 153. ORDER TIMELINE

Display:

```text
Order Placed
Accepted
Preparing
Ready
Batched
Dispatched
Delivered
```

Use actual timestamps.

---

# 154. PWA INSTALL EXPERIENCE

Provide appropriate:

```text
install prompt
application icons
theme color
splash behavior
manifest metadata
```

---

# 155. SEO / PUBLIC PAGES

Customer PWA may include public:

```text
landing
store information
```

where appropriate.

Authenticated application routes remain protected.

---

# 156. PRODUCTION CONFIGURATION

Use separate configurations:

```text
development
staging
production
```

Never use production credentials locally.

---

# 157. ENVIRONMENT VALIDATION

Validate required environment variables on startup.

Application should fail fast if required production configuration is missing.

---

# 158. DEPLOYMENT PIPELINE

Prepare the project for:

```text
GitHub
↓
CI
↓
lint
↓
typecheck
↓
unit tests
↓
integration tests
↓
build
↓
deployment
```

Use GitHub Actions or equivalent.

---

# 159. CODE QUALITY

Require:

- ESLint
- Prettier
- TypeScript strict
- no implicit any
- no unnecessary `any`
- meaningful naming
- modular architecture
- reusable services
- reusable validation
- clean error handling

---

# 160. DOCUMENTATION

Provide:

```text
README.md
ARCHITECTURE.md
API.md
DATABASE.md
DEPLOYMENT.md
SECURITY.md
OPERATIONS.md
```

Document:

- local setup
- environment variables
- database migration
- seeding
- Redis
- BullMQ workers
- Render deployment
- Auth0 setup
- B2 setup
- testing
- backups
- incident troubleshooting

---

# 161. PRODUCTION README

The README must explain:

```text
how to start API
how to start each PWA
how to run migrations
how to seed
how to start worker
how to run tests
how to build
how to deploy
```

---

# 162. CLIENT-SELLABLE REQUIREMENTS

The application must look like something a professional software agency could hand to a paying client.

Do not ship:

```text
placeholder buttons
fake analytics
hard-coded business data
mock APIs
TODO screens
dead routes
console.log debugging
inconsistent loading states
broken mobile layouts
```

---

# 163. IMPORTANT BUSINESS CORRECTNESS RULE

For any conflict between frontend appearance and backend correctness:

```text
backend correctness wins
```

For any conflict between Redis state and PostgreSQL state:

```text
PostgreSQL wins
```

For any conflict between cached data and transactional state:

```text
transactional state wins
```

---

# 164. FINAL BUSINESS RULES

Implement all of these:

1. Customer selects one store.
2. Cart belongs to one store.
3. Product availability is store-specific.
4. Customer selects delivery date and slot.
5. Slot capacity is limited.
6. Slot capacity is transactionally protected.
7. Inventory is transactionally protected.
8. Inventory and slot reservation are atomic with order creation.
9. Duplicate checkout cannot create duplicate orders.
10. Prices are calculated server-side.
11. Every order has one delivery slot.
12. Multiple orders can belong to one delivery batch.
13. Batch membership is concurrency-safe.
14. A driver is assigned to a batch.
15. Driver assignments are concurrency-safe.
16. Drivers cannot have overlapping active batches.
17. Every order has an individual OTP.
18. OTP verification is transactional.
19. OTP cannot be replayed.
20. Order cannot be delivered without valid OTP.
21. Batch completes only when all orders are terminal.
22. Driver becomes available only when their active batch is complete.
23. Store admins can only access their store.
24. Super Admin can access all stores.
25. All important mutations are audited.
26. Background jobs are retryable and idempotent.
27. Queue failures do not corrupt transactional data.
28. Redis failure must not create inventory corruption.
29. Database constraints enforce critical invariants.
30. External service failures do not create partial business transactions.

---

# 165. FINAL END-TO-END SYSTEM

The final architecture should behave as:

```text
                    CUSTOMER
                       │
                       ↓
                Customer PWA
                       │
                       ↓
                 Express API
                       │
             ┌─────────┴─────────┐
             ↓                   ↓
        PostgreSQL              Redis
             │                   │
             │                BullMQ
             │                   │
             ↓                   ↓
       Orders / Slots      Background Jobs
       Inventory / Batches      │
             │                  │
             └──────────┬───────┘
                        ↓
                 Store Admin PWA
                        │
                        ↓
                 Delivery Batch
                        │
                        ↓
                   Driver PWA
                        │
                        ↓
                  OTP Verification
                        │
                        ↓
                PostgreSQL Transaction
                        │
             ┌──────────┼──────────┐
             ↓          ↓          ↓
        Order Done   Batch Done  Driver Available
```

---

# 166. FINAL IMPLEMENTATION PRIORITY

Build in this sequence:

```text
1. Repository/monorepo
2. PostgreSQL schema
3. Prisma
4. Database constraints
5. Redis
6. BullMQ
7. API foundation
8. Auth0
9. RBAC/authorization
10. Store/catalog
11. Inventory
12. Delivery slots
13. Cart
14. Idempotency
15. Transactional checkout
16. Order state machine
17. Outbox
18. Batch system
19. Driver assignment
20. OTP
21. Driver PWA
22. Store Admin PWA
23. Customer PWA
24. God Admin PWA
25. B2
26. Invoice worker
27. Analytics
28. Notifications abstraction
29. Audit logs
30. Observability
31. Tests
32. Concurrency tests
33. Failure tests
34. PWA hardening
35. CI/CD
36. Render deployment
37. Production documentation
```

---

# 167. FINAL EXPECTATION

Deliver a complete, professionally engineered application with:

```text
4 PWAs
+
1 modular Express backend
+
PostgreSQL
+
Redis
+
BullMQ
+
Auth0
+
Backblaze B2
+
Render deployment
```

The implementation must be **production-oriented from the beginning**.

The system must explicitly protect against concurrency, retries, duplicate requests, stale frontend state, competing administrators, competing customers, competing drivers, queue retries, worker duplication, cache inconsistencies, and external service failures.

The most important invariant is:

```text
NO race condition may allow:

overselling inventory
overbooking delivery slots
duplicate orders
duplicate batch assignment
driver overlap
duplicate delivery completion
OTP replay
inconsistent order states
or corrupt inventory
```

The resulting application should be suitable for demonstration to a real client and should provide a solid foundation for a future commercial deployment without requiring a rewrite of its core business logic.