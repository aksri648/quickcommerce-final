# 🚀 Cloudflare Full-Stack Migration & Implementation Plan
**Project:** QuickCommerce Scheduled Batch Delivery Platform  
**Target Infrastructure:** Cloudflare Edge Ecosystem + Neon PostgreSQL + Upstash Redis + Backblaze B2 + Auth0  
**Target Monthly Infrastructure Cost:** **$0.00 / month (100% Free Plan Services)**  

---

## 📑 Table of Contents
1. [Executive Summary & Target Architecture](#1-executive-summary--target-architecture)
2. [Design Decisions & Invariant Matrix](#2-design-decisions--invariant-matrix)
3. [Phase 1: Database Layer (Prisma ➔ Drizzle ORM on Neon)](#3-phase-1-database-layer-prisma--drizzle-orm-on-neon)
4. [Phase 2: Edge API Gateway Worker (`apps/api-worker` with Hono)](#4-phase-2-edge-api-gateway-worker-appsapi-worker-with-hono)
5. [Phase 3: Edge Neural Search (Workers AI + Vectorize)](#5-phase-3-edge-neural-search-workers-ai--vectorize)
6. [Phase 4: Cloudflare Queues & Background Consumer Worker](#6-phase-4-cloudflare-queues--background-consumer-worker)
7. [Phase 5: Unified Frontend on Cloudflare Pages (`apps/web`)](#7-phase-5-unified-frontend-on-cloudflare-pages-appsweb)
8. [Phase 6: Backblaze B2 Invoicing & Asset Storage](#8-phase-6-backblaze-b2-invoicing--asset-storage)
9. [Phase 7: End-to-End Verification, Load Testing & Go-Live Protocol](#9-phase-7-end-to-end-verification-load-testing--go-live-protocol)

---

## 1. Executive Summary & Target Architecture

This implementation plan transitions the QuickCommerce platform from a containerized Node.js monolith to a **100% Edge-Native, Serverless Micro-Worker Architecture** running on Cloudflare's global edge network across 300+ cities.

```
                                [ CLOUDFLARE GLOBAL EDGE NETWORK ]
                                                │
                ┌───────────────────────────────┴───────────────────────────────┐
                ▼                                                               ▼
    ┌───────────────────────┐                                       ┌───────────────────────┐
    │   Cloudflare Pages    │                                       │  Cloudflare Worker 1  │
    │   (Unified PWA App)   │                                       │   (REST API - Hono)   │
    │  • / (Customer + Mktg)│                                       │  • Auth0 JWKS Auth    │
    │  • /driver/*          │                                       │  • Drizzle ORM (Neon) │
    │  • /store-admin/*     │                                       │  • Upstash Redis Lock │
    │  • /god-admin/*       │                                       │  • Pure Vector Search │
    └───────────────────────┘                                       └───────────┬───────────┘
                                                                                │
                  ┌─────────────────────────┬───────────────────────────────────┼─────────────────────────┐
                  ▼                         ▼                                   ▼                         ▼
      ┌───────────────────────┐ ┌───────────────────────┐           ┌───────────────────────┐ ┌───────────────────────┐
      │ Neon Serverless PG 16 │ │   Upstash Redis TLS   │           │   Cloudflare Queues   │ │ Workers AI + Vectorize│
      │  (Drizzle ORM via     │ │  (@upstash/redis REST)│           │ (10,000 ops/day Free) │ │ (768-dim Neural Search│
      │   WebSocket / HTTP)   │ │  • Distributed Locks  │           └───────────┬───────────┘ │  @cf/baai/bge-base..) │
      │  • 27 Relational Tables│ │  • Idempotency Cache │                       │             └───────────────────────┘
      │  • Row Locks FOR UPDATE│ └───────────────────────┘                       ▼
      └───────────────────────┘                                     ┌───────────────────────┐
                                                                    │  Cloudflare Worker 2  │
                                                                    │    (Queue Consumer)   │
                                                                    │  • Tax Invoices (HTML)│
                                                                    │  • Backblaze B2 Upload│
                                                                    │  • SMS / Notifications│
                                                                    └───────────────────────┘
```

---

## 2. Design Decisions & Invariant Matrix

The following table summarizes all finalized architectural decisions agreed upon during the alignment interview:

| Subsystem | Selected Architecture | Key Justification |
| :--- | :--- | :--- |
| **Edge API Framework** | **Hono (TypeScript)** | Lightweight (<15KB), sub-1ms cold starts on Cloudflare Workers, native web standards API. |
| **Database ORM** | **Drizzle ORM (`drizzle-orm/neon-serverless`)** | Zero cold-start overhead, tiny bundle footprint, SQL-like query builder with full TypeScript types. |
| **Search Engine** | **Cloudflare Workers AI + Vectorize** | Pure edge neural retrieval (`@cf/baai/bge-base-en-v1.5` - 768 dims) with zero external LLM API costs. |
| **Worker Topology** | **Micro-Workers (API + Dedicated Queue Worker)** | Decouples high-throughput customer HTTP requests from background PDF rendering & B2 uploads. |
| **Async Queues** | **Cloudflare Queues** | 10,000 free operations/day, zero idle container costs, built-in dead letter queues & retries. |
| **Frontend Deployment** | **Single Unified Cloudflare Pages Project** | Single deployment with path routing (`/`, `/driver`, `/store-admin`, `/god-admin`) sharing UI components. |
| **Authentication** | **Auth0 JWKS + WebCrypto JWT Verification** | Stateless verification via `jose` / `crypto.subtle` at the edge with role-based route guards. |
| **Invoice Storage** | **Backblaze B2 via Bandwidth Alliance** | 10 GB free storage with 100% free CDN data egress through Cloudflare. |

---

## 3. Phase 1: Database Layer (Prisma ➔ Drizzle ORM on Neon)

### 3.1 Dependencies
```json
{
  "dependencies": {
    "@neondatabase/serverless": "^0.9.4",
    "drizzle-orm": "^0.33.0",
    "drizzle-zod": "^0.5.1"
  },
  "devDependencies": {
    "drizzle-kit": "^0.24.2"
  }
}
```

### 3.2 Drizzle Schema Architecture (`packages/database/src/schema.ts`)
Migrate all 27 models from Prisma to Drizzle PostgreSQL tables:
* **Core Enums**: `user_role`, `order_status`, `batch_status`, `driver_status`, `inventory_movement_type`, `outbox_status`.
* **Primary Tables**: `users`, `stores`, `categories`, `products`, `store_products`, `inventory`, `inventory_movements`, `delivery_slots`, `orders`, `order_items`, `delivery_batches`, `delivery_batch_orders`, `drivers`, `batch_driver_assignments`, `delivery_otps`, `invoices`, `outbox_events`, `audit_logs`.
* **Indexes & Constraints**:
  * Unique compound index on `(store_id, product_id)` in `inventory`.
  * Index on `(store_id, delivery_date, start_time)` in `delivery_slots`.
  * Index on `(status, created_at)` in `outbox_events`.

### 3.3 Database Client Helper (`packages/database/src/client.ts`)
```typescript
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

export function createDb(databaseUrl: string) {
  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
}
```

### 3.4 Concurrency-Safe Transaction Wrapper
Implement Drizzle transaction retry wrapper with exponential backoff and jitter to preserve row-level deadlock prevention:
```typescript
export async function withDrizzleTxRetry<T>(
  db: any,
  fn: (tx: any) => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await db.transaction(fn, { isolationLevel: 'read committed' });
    } catch (err: any) {
      attempt++;
      if (attempt >= maxRetries || (!err.message?.includes('deadlock') && !err.message?.includes('could not serialize'))) {
        throw err;
      }
      const delay = Math.floor(Math.random() * (100 * Math.pow(2, attempt)));
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error('Transaction failed after maximum retries');
}
```

---

## 4. Phase 2: Edge API Gateway Worker (`apps/api-worker` with Hono)

### 4.1 Wrangler Configuration (`apps/api-worker/wrangler.toml`)
```toml
name = "quickcommerce-api"
main = "src/index.ts"
compatibility_date = "2026-08-30"
compatibility_flags = ["nodejs_compat"]

[vars]
NODE_ENV = "production"
TZ = "Asia/Kolkata"

[ai]
binding = "AI"

[[vectorize]]
binding = "VECTORIZE"
index_name = "product-search-index"

[[queues.producers]]
queue = "quickcommerce-events"
binding = "EVENTS_QUEUE"
```

### 4.2 Hono Application Endpoints (`apps/api-worker/src/index.ts`)
* `GET /api/health` — Worker liveness & Neon DB connectivity check.
* `POST /api/auth/login`, `POST /api/auth/register`, `GET /api/auth/me` — Auth0 JWKS token verification & user provisioning.
* `GET /api/stores`, `GET /api/stores/:id` — Dark stores directory.
* `GET /api/products`, `GET /api/products/:id` — Catalog with local dark-store pricing.
* `GET /api/products/search` — Pure Edge Neural Search via Vectorize.
* `GET /api/slots/available` — 4 daily 3-hour slot windows with real-time capacity counter.
* `POST /api/orders/checkout` — Pessimistic sorted row lock (`FOR UPDATE ORDER BY product_id ASC`), atomic slot check, HMAC-SHA256 OTP generation, and Cloudflare Queue publish.
* `GET /api/orders`, `GET /api/orders/:id` — Slot-aware order tracking.
* `POST /api/batches` — Dark store Kanban batch grouping.
* `POST /api/drivers/assign` — Driver allotment with temporal overlap validation & auto-dispatch.
* `POST /api/driver/orders/:id/verify-otp` — Doorstep OTP verification & cash reconciliation.
* `GET /api/invoices/order/:orderId/download` — Printable HTML Tax Invoice renderer.

---

## 5. Phase 3: Edge Neural Search (Workers AI + Vectorize)

### 5.1 Vectorize Index Creation
```bash
npx wrangler vectorize create product-search-index --dimensions=768 --metric=cosine
```

### 5.2 Product Embedding & Ingestion Service
```typescript
export async function generateAndUpsertProductVector(product: any, env: any) {
  const document = `${product.name} ${product.brand} ${product.category} ${product.description}`;
  
  // Workers AI BAAI BGE-Base model (768 dimensions)
  const embeddingResponse = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
    text: [document],
  });

  const vector = embeddingResponse.data[0];

  await env.VECTORIZE.upsert([
    {
      id: product.id,
      values: vector,
      metadata: {
        name: product.name,
        category: product.category,
        brand: product.brand,
      },
    },
  ]);
}
```

---

## 6. Phase 4: Cloudflare Queues & Background Consumer Worker

### 6.1 Wrangler Configuration (`apps/queue-worker/wrangler.toml`)
```toml
name = "quickcommerce-queue-worker"
main = "src/index.ts"
compatibility_date = "2026-08-30"
compatibility_flags = ["nodejs_compat"]

[[queues.consumers]]
queue = "quickcommerce-events"
max_batch_size = 10
max_batch_timeout = 5
max_retries = 3
dead_letter_queue = "quickcommerce-dlq"
```

### 6.2 Queue Event Consumer
```typescript
export default {
  async queue(batch: any, env: any): Promise<void> {
    const db = createDb(env.DATABASE_URL);

    for (const msg of batch.messages) {
      const event = msg.body;

      try {
        switch (event.eventType) {
          case 'ORDER_CREATED':
            // 1. Generate Invoice Record in DB
            await generateInvoiceRecord(db, event.orderId);
            // 2. Render & Archive PDF to Backblaze B2
            await archiveInvoicePdfToB2(db, event.orderId, env);
            break;

          case 'BATCH_DISPATCHED':
            await updateBatchRouteProgress(db, event.batchId);
            break;

          case 'OTP_VERIFIED':
            await recordDeliverySettlement(db, event.orderId, event.collectedCash);
            break;
        }

        msg.ack();
      } catch (err) {
        console.error(`Failed to process message ${msg.id}:`, err);
        msg.retry();
      }
    }
  },
};
```

---

## 7. Phase 5: Unified Frontend on Cloudflare Pages (`apps/web`)

### 7.1 Single Consolidated App Structure
```
apps/web/
├── public/
│   ├── _routes.json
│   ├── manifest.json
│   └── favicon.svg
├── src/
│   ├── modules/
│   │   ├── customer/        # Customer grocery catalog, search modal, cart, slot picker, tracking
│   │   ├── driver/          # Driver 1-handed delivery route & doorstep OTP verification
│   │   ├── store-admin/     # Dark store slot board, Kanban batching, driver allotment
│   │   └── god-admin/       # Executive GMV, fleet analytics & system health
│   ├── shared/              # Reusable UI components & Auth0 hooks
│   ├── App.tsx              # Master BrowserRouter with path routing
│   └── main.tsx
├── package.json
└── vite.config.ts
```

### 7.2 Unified Routing Map
* `/` ➔ Customer Marketing Landing Page
* `/catalog` ➔ Customer Shopping Catalog & Search
* `/cart`, `/checkout`, `/orders/:id` ➔ Customer Checkout & Slot-Aware Tracker
* `/driver/*` ➔ Driver Dashboard & Active Batch Stops
* `/store-admin/*` ➔ Dark Store Operations & Slot Board
* `/god-admin/*` ➔ SaaS Multi-Store Oversight

---

## 8. Phase 6: Backblaze B2 Invoicing & Asset Storage

### 8.1 S3-Compatible Upload Client
```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export function createB2Client(env: any) {
  return new S3Client({
    endpoint: env.B2_ENDPOINT || 'https://s3.us-west-004.backblazeb2.com',
    region: 'us-west-004',
    credentials: {
      accessKeyId: env.B2_APPLICATION_KEY_ID,
      secretAccessKey: env.B2_APPLICATION_KEY,
    },
  });
}
```

---

## 9. Phase 7: End-to-End Verification & Testing Checklist

* [ ] **Auth0 Edge Verification**: Verify JWT signature at edge using WebCrypto.
* [ ] **Pure Neural Search**: Verify Workers AI 768-dim query matches Vectorize index.
* [ ] **Concurrency Slot Reservation**: Verify 50 orders/slot limit with zero deadlocks.
* [ ] **Driver Allotment & Queues**: Verify driver assignment dispatches message to Cloudflare Queues.
* [ ] **Doorstep OTP Handshake**: Verify single-use OTP verification transitions order to DELIVERED.
* [ ] **Tax Invoice Archiving**: Verify instant printable HTML and async PDF archiving to Backblaze B2.
