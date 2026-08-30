# QuickBlink — Multi-Store Scheduled-Delivery Quick-Commerce Platform

A production-grade, enterprise-scale scheduled quick-commerce platform built with **TypeScript**, **Express Modular Monolith**, **PostgreSQL**, **Prisma ORM**, **Redis Safe Distributed Locks**, **BullMQ Background Workers**, and **4 React + Vite + Tailwind CSS PWAs**.

---

## ⚡ Architectural Highlights

1. **Scheduled Batch Delivery Model**:
   - **4 Delivery Slots Per Day**: `09:00 – 12:00`, `12:00 – 15:00`, `15:00 – 18:00`, `18:00 – 21:00` in Indian Standard Time (`Asia/Kolkata`).
   - Replaces hyper-fragmented 10-minute trips with consolidated multi-order batch routes, saving up to **68% fuel emissions**.
2. **Cash on Delivery (COD) Only with Single-Use OTP Verification**:
   - No payment gateway dependencies.
   - Customers receive a secure 6-digit OTP computed via HMAC-SHA256. Driver verifies OTP atomically on customer doorstep before cash exchange is finalized.
3. **Rock-Solid Concurrency & Invariant Guarantees**:
   - **Inventory Overselling Prevention**: Explicit row locks on sorted products in ascending ID order to prevent deadlocks under heavy concurrent checkout spikes.
   - **Slot Overbooking Prevention**: Atomic row lock and capacity decrement in PostgreSQL transaction retry loop.
   - **Driver Assignment Conflict Prevention**: Temporal overlap validation ensuring a driver cannot be assigned to multiple active batches simultaneously.
   - **Double Submit Protection**: Enforced via SHA-256 idempotency key caching.
4. **Transactional Outbox & BullMQ Async Queues**:
   - Event outbox guarantees zero message loss. Resilient background worker polls outbox and pushes to 5 dedicated BullMQ queues (`order-events`, `batching`, `notifications`, `invoice-generation`, `analytics`).

---

## 📁 Repository Structure

```
.
├── apps/
│   ├── api/                 # Express Modular Monolith API Backend & Worker
│   ├── customer-pwa/        # Customer Ordering PWA (Vite + React + Tailwind)
│   ├── driver-pwa/          # Driver Partner Delivery PWA (One-handed high-contrast UI)
│   ├── store-admin-pwa/     # Dark Store Operations PWA (Slot Board & Batch Kanban)
│   └── god-admin-pwa/       # Platform SaaS Executive Console (Multi-store GMV, System Health)
├── packages/
│   ├── shared/              # Shared Enums, DTOs, Zod Schemas, Error Codes, Constants
│   └── ui/                  # Reusable Tailwind / Shadcn UI Component Primitives
├── render.yaml              # Complete Render Infrastructure Blueprint (DB, Redis, API, Worker, 4 PWAs)
├── package.json             # Monorepo Workspace Configuration
└── tsconfig.base.json       # Base TypeScript Configuration
```

---

## 🚀 Quick Start & Local Development

### Prerequisites
- [Bun](https://bun.sh/) (or Node.js 20+)
- PostgreSQL 16+
- Redis 7+

### 1. Install Monorepo Dependencies
```bash
bun install
```

### 2. Configure Environment Variables
Copy `.env.example` in `apps/api/.env`:
```env
DATABASE_URL="postgresql://qc_admin:qc_password@localhost:5432/quickcommerce?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="quickcommerce-super-secret-jwt-key"
HMAC_SECRET="quickcommerce-super-secret-hmac-otp-key"
PORT=4000
TZ="Asia/Kolkata"
```

### 3. Run Database Migrations & Seed Data
```bash
cd apps/api
bun x prisma generate
bun x prisma db push
bun run seed
```

This seeds:
- **5 Operating Dark Stores**: Indiranagar, Koramangala, HSR Layout, Whitefield, Jayanagar
- **50+ Products** across 8 Categories
- **10+ Verified Delivery Drivers** with EV vehicles
- **16 Daily Delivery Slots** with configurable capacities
- Active demonstration batch `BATCH-001`

### 4. Start Development Servers
In separate terminals:
```bash
# Backend API & Server
cd apps/api && bun dev

# Background Worker
cd apps/api && bun run worker

# Customer PWA (Port 3000)
cd apps/customer-pwa && bun dev

# Driver Partner PWA (Port 3001)
cd apps/driver-pwa && bun dev

# Store Operations PWA (Port 3002)
cd apps/store-admin-pwa && bun dev

# God Admin Console (Port 3003)
cd apps/god-admin-pwa && bun dev
```

---

## 🧪 Testing

Run comprehensive concurrency, stress, and invariant test suites:
```bash
cd apps/api
bun test
```

Verifies:
- 100 concurrent checkouts never oversell stock.
- Concurrent slot bookings never exceed slot capacity.
- Idempotency key replay returns identical responses without double charge.
- Driver assignment temporal conflicts are strictly rejected.
- Single-use OTP cannot be reused.

---

## 📜 Documentation Index

- [ARCHITECTURE.md](file:///C:/Users/Prakhar%20Srivastava/Pictures/QuickCommerce(1)/ARCHITECTURE.md) — Comprehensive system architecture, module boundaries, and concurrency protocols.
- [API.md](file:///C:/Users/Prakhar%20Srivastava/Pictures/QuickCommerce(1)/API.md) — Complete REST API endpoint reference and error codes.
- [DATABASE.md](file:///C:/Users/Prakhar%20Srivastava/Pictures/QuickCommerce(1)/DATABASE.md) — PostgreSQL database schema and relational entity mapping.
- [DEPLOYMENT.md](file:///C:/Users/Prakhar%20Srivastava/Pictures/QuickCommerce(1)/DEPLOYMENT.md) — Production deployment guide with Render Infrastructure-as-Code.
- [SECURITY.md](file:///C:/Users/Prakhar%20Srivastava/Pictures/QuickCommerce(1)/SECURITY.md) — Store isolation, RBAC matrix, and HMAC OTP verification security.
- [OPERATIONS.md](file:///C:/Users/Prakhar%20Srivastava/Pictures/QuickCommerce(1)/OPERATIONS.md) — Runbooks for dark store managers, batch dispatch, and disaster recovery.
