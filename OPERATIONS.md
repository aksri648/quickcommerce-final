# QuickBlink — Operational Runbooks & Procedures

---

## 1. Daily Dark Store Lifecycle

### Morning Shift Start (08:00 AM IST)
1. **Physical Inventory Verification**:
   - Store Admin opens **Store Operations PWA** -> **Inventory**.
   - Accepts daily fresh vegetable, milk, and bakery restock deliveries.
   - Uses `RESTOCK` movement type to update available inventory.
2. **Slot Capacity Check**:
   - Store Admin opens **Slot Board**.
   - Confirms capacity meters for the 4 slots: `09:00–12:00`, `12:00–15:00`, `15:00–18:00`, `18:00–21:00`.
3. **Fleet Check-in**:
   - Delivery drivers check in via **Driver PWA**, toggling their status to `ONLINE` / `AVAILABLE`.

---

## 2. Batch Creation & Dispatch Protocol

1. **Order Preparation**:
   - Store staff pack accepted orders into insulated grocery crates.
   - When order is packed, staff marks order as `READY_FOR_PICKUP`.
2. **Batch Consolidation**:
   - 30 minutes before slot start (Cutoff Window), orders in the same slot window are grouped into a `DeliveryBatch`.
3. **Driver Assignment**:
   - Store Admin selects an available driver in the **Batch Kanban**.
   - The system validates that the driver has no temporal overlap with other active batches.
4. **Dispatch**:
   - Store Admin hits **Dispatch Batch**. Driver receives immediate notification on Driver PWA with optimized stop list.
5. **Doorstep Delivery & OTP Verification**:
   - Driver arrives at customer address, hands over groceries, collects cash (COD).
   - Customer provides 6-digit OTP from their app screen.
   - Driver inputs OTP -> order is marked `DELIVERED`.
   - When all orders in batch are delivered, batch transitions to `COMPLETED` and driver automatically becomes `AVAILABLE` for the next slot.

---

## 3. Incident Management & Disaster Recovery

### Redis Failure
If Redis becomes unavailable, BullMQ pauses job dispatch while API continues processing checkouts safely through PostgreSQL transactional outbox. Once Redis recovers, the outbox worker resumes draining pending events.

### Deadlock / Serialization Recovery
The Prisma database client automatically retries failed transactions up to 3 times with exponential backoff and jitter upon encountering PostgreSQL error codes `40001` (Serialization Failure) and `40P01` (Deadlock Detected).
