# QuickBlink — Security Architecture & Compliance

---

## 1. Authentication & RBAC Matrix

The system implements Role-Based Access Control across 5 discrete identities:

| Role | Scope | Permissions |
| :--- | :--- | :--- |
| `CUSTOMER` | Self | Browse catalog, manage personal cart/addresses, place orders, view personal OTP & timeline |
| `DRIVER` | Assigned Batches | View assigned batch stops, view customer address, call customer, verify OTP |
| `STORE_STAFF` | Single Assigned Store | View orders, prepare items, mark ready for pickup, view stock |
| `STORE_ADMIN` | Single Assigned Store | Full dark store management: adjust slot capacity, create batches, assign drivers, inventory adjustments |
| `SUPER_ADMIN` | Global Platform | Global SaaS access: create stores, update pricing, view global audit logs, inspect BullMQ health |

---

## 2. Cryptographic Doorstep OTP Security

- OTPs are 6-digit random decimal codes generated per order (`100000` to `999999`).
- Rather than storing raw OTPs in plaintext in the database:
  1. The raw OTP is sent to the customer upon checkout confirmation.
  2. The database stores the hash: `HMAC_SHA256(raw_otp, HMAC_SECRET + orderId)`.
  3. When the driver inputs the OTP on doorstep delivery, the backend hashes the candidate input and performs a constant-time comparison against the stored hash.
  4. Once verified, the OTP record is marked `isUsed = true`, preventing replay attacks.

---

## 3. Idempotency & Replay Attack Defense

Every checkout and mutation request supports the `Idempotency-Key` header.
- The backend hashes the request payload using SHA-256 and records it in `IdempotencyKey`.
- If the identical request is received multiple times (e.g. user double taps, network retries), the cached successful response is returned without executing second inventory deduction or duplicate order creation.
- If a different payload is sent with the same key, a `409 IDEMPOTENCY_CONFLICT` error is thrown.
