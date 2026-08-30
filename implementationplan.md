# 🚀 QuickCommerce Cloudflare Full-Stack Migration — Production-Ready Implementation Plan

**Project:** QuickCommerce Scheduled Batch Delivery Platform
**Source Architecture:** Express 4 Monolith + Prisma + BullMQ + Orama + Render
**Target Architecture:** Cloudflare Edge Ecosystem (Workers, Pages, Queues, Workers AI, Vectorize, Hyperdrive) + Neon PostgreSQL + Upstash Redis + Backblaze B2 + Auth0
**Monthly Infrastructure Cost:** **$0.00 (100% Free Plan Services)**

---

## 📑 Table of Contents

1. [Gap Analysis Summary](#1-gap-analysis-summary)
2. [Target Architecture Diagram](#2-target-architecture-diagram)
3. [Design Decisions & Platform Limits Matrix](#3-design-decisions--platform-limits-matrix)
4. [Phase 0: Monorepo Restructuring & Shared Packages](#4-phase-0-monorepo-restructuring--shared-packages)
5. [Phase 1: Database Layer — Prisma → Drizzle ORM with Dual Drivers](#5-phase-1-database-layer--prisma--drizzle-orm-with-dual-drivers)
6. [Phase 2: Edge API Worker with Hono](#6-phase-2-edge-api-worker-with-hono-appsapi-worker)
7. [Phase 3: Middleware Port — Auth, RBAC, Rate Limiting, Idempotency, CORS](#7-phase-3-middleware-port--auth-rbac-rate-limiting-idempotency-cors)
8. [Phase 4: Business Logic Migration (15 Service Modules)](#8-phase-4-business-logic-migration-15-service-modules)
9. [Phase 5: Neural Search — Workers AI + Vectorize (Replace Orama)](#9-phase-5-neural-search--workers-ai--vectorize-replace-orama)
10. [Phase 6: Queue Worker & Outbox Poller](#10-phase-6-queue-worker--outbox-poller-appsqueue-worker)
11. [Phase 7: Backblaze B2 Storage via aws4fetch](#11-phase-7-backblaze-b2-storage-via-aws4fetch)
12. [Phase 8: Unified Frontend on Cloudflare Pages](#12-phase-8-unified-frontend-on-cloudflare-pages-appsweb)
13. [Phase 9: CI/CD Pipeline (GitHub Actions)](#13-phase-9-cicd-pipeline-github-actions)
14. [Phase 10: Environment Variables & Secrets Manifest](#14-phase-10-environment-variables--secrets-manifest)
15. [Phase 11: End-to-End Verification & Go-Live Checklist](#15-phase-11-end-to-end-verification--go-live-checklist)

---

## 1. Gap Analysis Summary

The previous implementation plan had **18 critical gaps** that would have caused production failures. All are now addressed.

| # | Gap | Severity | Resolution |
|---|-----|----------|------------|
| 1 | **`neon-http` does NOT support transactions or `FOR UPDATE` row locking** — the plan used `drizzle-orm/neon-http` but checkout, OTP verify, driver assign, inventory adjust, and cancellation ALL require interactive transactions | P0 Blocker | Use **dual-driver architecture**: `drizzle-orm/neon-http` for reads, `drizzle-orm/neon-serverless` (WebSocket) via **Cloudflare Hyperdrive** for all transactional writes |
| 2 | **`@aws-sdk/client-s3` is ~2MB+ bundled** — exceeds Workers Free 3MB script limit | P0 Blocker | Replace with **`aws4fetch`** (~2.5KB gzipped) for S3-compatible Backblaze B2 uploads |
| 3 | **Missing 27 out of 30+ API endpoints** — plan listed 12 endpoints but codebase has 30+ routes across 15 modules | P0 Blocker | Full endpoint-by-endpoint port map for all 15 modules |
| 4 | **Missing middleware ports** — no plan for `auth.ts`, `rbac.ts`, `idempotency.ts`, `rate-limiter.ts`, `error-handler.ts`, `request-tracker.ts` conversion from Express to Hono | P0 Blocker | Dedicated Phase 3 for all 6 middleware conversions |
| 5 | **Missing Cloudflare Hyperdrive** — required for connection pooling and transaction support on Workers Free tier | P1 Critical | Add Hyperdrive binding in `wrangler.toml` for transactional Neon connection |
| 6 | **Missing CORS configuration** — no `hono/cors` middleware specified; cross-origin Pages to Worker requests will fail | P1 Critical | Add `hono/cors` with dynamic origin validation from `env.ALLOWED_ORIGINS` |
| 7 | **Missing 5 BullMQ queues to CF Queues mapping** — existing codebase has 5 named queues (`order-events`, `batching`, `notifications`, `invoice-generation`, `analytics`), plan only addressed 3 event types | P1 Critical | Map all 5 queues to Cloudflare Queue message types with DLQ |
| 8 | **Missing 12 OutboxEventType handlers** — existing outbox has 12 event types; plan only handled 3 | P1 Critical | Full event-type routing table in queue consumer |
| 9 | **Workers AI 10,000 Neurons/day limit** — each search query consumes neurons; 6,058 neurons per 1M input tokens shared across all requests | P2 Important | Implement Upstash Redis embedding cache (24h TTL) to avoid redundant AI calls |
| 10 | **Vectorize 5M stored dimensions limit** — 768 dims x ~6,500 products = 4.99M (at capacity) | P2 Important | Document scaling thresholds; degrade to DB `ILIKE` search at index capacity |
| 11 | **Workers 10ms CPU time limit** — checkout involves 10+ sequential DB operations | P2 Important | Minimize CPU-bound work; all I/O (DB, Redis, Queue) is exempt from CPU timer |
| 12 | **Missing Hinglish synonym dictionary port** — existing 60+ synonym mappings and 12 concept anchors not addressed | P2 Important | Prepend synonym expansion text to AI embedding input for Hinglish support |
| 13 | **Missing `express-rate-limit` replacement** — Express rate limiter is in-memory, incompatible with stateless Workers | P2 Important | Replace with Upstash `@upstash/ratelimit` (sliding window algorithm) |
| 14 | **Missing SPA catch-all routing for unified Pages app** — no `_redirects` file or `404.html` removal documented | P2 Important | Documented SPA routing via absent `404.html` + `_routes.json` |
| 15 | **No CI/CD pipeline** — no GitHub Actions workflow exists in the repository | P2 Important | Full CI/CD pipeline with lint, type-check, test, deploy stages |
| 16 | **No environment variable manifest** — existing codebase has 13 env vars; plan documented 0 `wrangler secret` commands | P2 Important | Complete secrets manifest with `wrangler secret put` commands |
| 17 | **Missing test migration plan** — existing `concurrency.test.ts` and `search.test.ts` not addressed | P3 Nice | Port test suite to Vitest with Miniflare Workers environment |
| 18 | **Missing Prisma to Drizzle schema migration tooling** — no `drizzle-kit` introspection or migration generation steps | P3 Nice | Step-by-step `drizzle-kit introspect` to `drizzle-kit generate` to `drizzle-kit migrate` workflow |

---

## 2. Target Architecture Diagram

```
                                    [ CLOUDFLARE GLOBAL EDGE NETWORK (300+ Cities) ]
                                                       |
                   +-----------------------------------+--------------------------------------+
                   v                                                                          v
       +-----------------------------+                                            +-----------------------------+
       |    Cloudflare Pages (SPA)   |                                            |   Cloudflare Worker 1       |
       |  (Unified React 18 + Vite)  |          CORS: hono/cors                   |   (REST API - Hono v4)      |
       |  * / (Customer + Marketing) | ----------------------------------------> |   * Auth0 JWKS @ Edge       |
       |  * /driver/*                |                                            |   * Upstash Rate Limiting   |
       |  * /store-admin/*           |                                            |   * Drizzle ORM Dual-Driver |
       |  * /god-admin/*             |                                            |   * 30+ API Endpoints       |
       +-----------------------------+                                            +-------------+---------------+
                                                                                                |
         +-----------------+----------------+-----------------------+----------------------------+
         v                  v                v                      v                            v
+----------------+ +--------------+ +-------------------+ +-------------------+ +----------------+
|  Neon PG 16    | | Upstash Redis| | Cloudflare Queues | | Workers AI + Vect.| |  Backblaze B2  |
| (Dual-Driver)  | | (REST + Lua) | | (10k ops/day Free)| | (768-dim BGE)     | | (aws4fetch)    |
|                | |              | |                   | |                   | |                |
| neon-http      | | Rate Limiting| | CF Worker 2       | | Embed at Edge     | | PDF Invoices   |
| (Reads Only)   | | Dist. Locks  | | (Queue Consumer)  | | Vectorize Index   | | $0 Egress via  |
|                | | Embed Cache  | | 12 Event Types    | | Synonym Prepend   | | Bandwidth      |
| Hyperdrive     | | Idempotency  | | Invoice Gen       | | Redis Cache Layer | | Alliance       |
| (Tx + Locks)   | | Cache        | | B2 Upload         | |                   | |                |
|                | |              | | Notifications     | |                   | |                |
+----------------+ +--------------+ | DLQ Fallback      | +-------------------+ +----------------+
                                    +-------------------+
                                              |
                                     +--------+--------+
                                     |  Cron Trigger   |
                                     | (Outbox Poller) |
                                     |  Every 1 minute |
                                     +-----------------+
```

---

## 3. Design Decisions & Platform Limits Matrix

### Finalized Decisions

| Subsystem | Selected Architecture | Key Justification |
| :--- | :--- | :--- |
| **Edge API Framework** | **Hono v4** | <15KB, sub-1ms cold starts, native Web Standards, built-in CORS/JWT/Logger middleware |
| **Database ORM** | **Drizzle ORM Dual-Driver** | `neon-http` for fast reads + `neon-serverless` WebSocket via Hyperdrive for `FOR UPDATE` transactions |
| **Connection Pooling** | **Cloudflare Hyperdrive** (Free) | Global connection pool, supports interactive PG transactions from Workers |
| **Search Engine** | **Workers AI + Vectorize** | `@cf/baai/bge-base-en-v1.5` (768d) with Redis embedding cache and Hinglish synonym prepend |
| **Worker Topology** | **2 Micro-Workers** | API Worker (HTTP) + Queue Consumer Worker (Queues + Cron Trigger) |
| **Async Queues** | **Cloudflare Queues** | 10k ops/day free, 24h retention, built-in DLQ and retries |
| **Frontend** | **Single Unified Cloudflare Pages** | Path routing (`/`, `/driver`, `/store-admin`, `/god-admin`), SPA fallback |
| **Auth** | **Auth0 JWKS + `jose` Edge Verification** | Stateless JWT verification via `crypto.subtle`, 25k MAU free |
| **Rate Limiting** | **`@upstash/ratelimit`** | Distributed sliding window, compatible with stateless Workers |
| **Object Storage** | **Backblaze B2 via `aws4fetch`** | 2.5KB bundle (vs 2MB+ `@aws-sdk/client-s3`), $0 egress via Bandwidth Alliance |

### Free Tier Platform Limits

| Resource | Daily/Monthly Limit | Impact Assessment |
| :--- | :--- | :--- |
| Workers Requests | 100,000 / day | Ample for MVP (each user ~20 API calls/session) |
| Workers CPU Time | 10ms / invocation | I/O wait (DB, Redis, Queue) is exempt; Drizzle queries use <2ms CPU |
| Workers Subrequests | 50 external / invocation | Checkout worst-case: ~15 subrequests (Neon + Upstash + Queue) |
| Cloudflare Queues | 10,000 ops / day | Each order creates ~3 queue ops; supports ~3,333 orders/day |
| Workers AI Neurons | 10,000 / day | Mitigated by Redis embedding cache (24h TTL); ~1,000 unique search queries/day |
| Vectorize Stored Dims | 5,000,000 / account | 768 dims x 6,500 products = 4.99M (at capacity); fallback to DB ILIKE |
| Vectorize Queried Dims | 30,000,000 / month | 768 dims x ~39,000 queries/month |
| Neon Free Storage | 0.5 GB | Sufficient for MVP dataset |
| Neon Compute Hours | 190 hours / month | Auto-suspend after 5min idle; ~500ms cold start |
| Upstash Redis Commands | 500,000 / month | Rate limiting + locks + embed cache + idempotency |
| Auth0 MAU | 25,000 / month | Ample for MVP |
| Backblaze B2 Storage | 10 GB | ~100,000+ PDF invoices |
| Hyperdrive | Included Free | Connection pooling for transactional queries |

---

## 4. Phase 0: Monorepo Restructuring & Shared Packages

### New Directory Structure

```
QuickCommerce/
+-- packages/
|   +-- shared/                    # @quickcommerce/shared (UNCHANGED)
|   +-- ui/                        # @quickcommerce/ui (UNCHANGED)
|   +-- database/                  # NEW: Drizzle schema, client, migrations
|       +-- src/
|       |   +-- schema.ts          # All 27 tables + 12 enums in Drizzle
|       |   +-- client.ts          # Dual-driver factory (neon-http + Hyperdrive)
|       |   +-- transactions.ts    # withTxRetry wrapper
|       |   +-- relations.ts       # Drizzle relation definitions
|       +-- drizzle/               # Generated SQL migrations
|       +-- drizzle.config.ts
|       +-- package.json
+-- apps/
|   +-- api-worker/                # NEW: Hono API on Cloudflare Workers
|   |   +-- src/
|   |   |   +-- index.ts           # Hono app with fetch + scheduled exports
|   |   |   +-- env.ts             # Env type definitions (Bindings)
|   |   |   +-- middleware/        # Auth, RBAC, CORS, Rate Limit, Error, Request Tracker
|   |   |   +-- modules/          # 15 service modules ported from Express
|   |   +-- wrangler.toml
|   |   +-- package.json
|   +-- queue-worker/              # NEW: Cloudflare Queue Consumer Worker
|   |   +-- src/
|   |   |   +-- index.ts           # queue() + scheduled() exports
|   |   |   +-- handlers/         # 12 event type handlers
|   |   +-- wrangler.toml
|   |   +-- package.json
|   +-- web/                       # NEW: Unified React SPA for Cloudflare Pages
|   |   +-- src/
|   |   |   +-- modules/
|   |   |   |   +-- customer/     # Migrated from apps/customer-pwa
|   |   |   |   +-- driver/       # Migrated from apps/driver-pwa
|   |   |   |   +-- store-admin/  # Migrated from apps/store-admin-pwa
|   |   |   |   +-- god-admin/    # Migrated from apps/god-admin-pwa
|   |   |   +-- shared/           # Auth0 hooks, API client, shared UI
|   |   |   +-- App.tsx           # Master router
|   |   +-- public/
|   |   |   +-- _routes.json      # Pages routing config
|   |   +-- package.json
|   +-- api/                       # DEPRECATED (kept for reference during migration)
|   +-- customer-pwa/              # DEPRECATED
|   +-- driver-pwa/                # DEPRECATED
|   +-- store-admin-pwa/           # DEPRECATED
|   +-- god-admin-pwa/             # DEPRECATED
+-- .github/
    +-- workflows/
        +-- deploy.yml             # NEW: CI/CD pipeline
```

---

## 5. Phase 1: Database Layer — Prisma -> Drizzle ORM with Dual Drivers

**Critical Fix (Gap #1):** The `neon-http` driver does NOT support interactive transactions (`BEGIN ... COMMIT`), `SELECT ... FOR UPDATE`, or row locking. Our checkout, OTP verification, inventory adjustment, driver assignment, and order cancellation ALL require these. We MUST use a **dual-driver architecture**.

### 5.1 Dependencies (packages/database/package.json)

```json
{
  "dependencies": {
    "@neondatabase/serverless": "^0.10.0",
    "drizzle-orm": "^0.33.0",
    "drizzle-zod": "^0.5.1",
    "ws": "^8.18.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.24.2"
  }
}
```

### 5.2 Dual-Driver Client Factory (packages/database/src/client.ts)

```typescript
import { neon } from '@neondatabase/serverless';
import { Pool } from '@neondatabase/serverless';
import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http';
import { drizzle as drizzleWs } from 'drizzle-orm/neon-serverless';
import * as schema from './schema';

/**
 * Dual-Driver Database Client Factory
 *
 * READ DRIVER (neon-http): Ultra-fast HTTP one-shot queries. Used for all SELECT
 * operations that do NOT require transaction boundaries.
 *
 * WRITE DRIVER (neon-serverless via Hyperdrive): WebSocket-based persistent connection
 * that supports interactive transactions, FOR UPDATE row locking, and multi-statement
 * atomic operations. Used for checkout, OTP verify, inventory adjust, etc.
 */
export function createDualDb(env: {
  DATABASE_URL: string;       // neon-http (reads)
  HYPERDRIVE_URL: string;     // Hyperdrive connection string (transactional writes)
}) {
  const httpSql = neon(env.DATABASE_URL);
  const readDb = drizzleHttp(httpSql, { schema });

  const pool = new Pool({ connectionString: env.HYPERDRIVE_URL });
  const writeDb = drizzleWs(pool, { schema });

  return { readDb, writeDb, pool };
}
```

### 5.3 Transaction Retry Wrapper (Preserved from Existing Codebase)

```typescript
export async function withTxRetry<T>(
  writeDb: ReturnType<typeof drizzleWs>,
  fn: (tx: any) => Promise<T>,
  opts: { maxRetries?: number; initialDelayMs?: number; maxDelayMs?: number } = {}
): Promise<T> {
  const maxRetries = opts.maxRetries ?? 3;
  const initialDelayMs = opts.initialDelayMs ?? 50;
  const maxDelayMs = opts.maxDelayMs ?? 500;
  let attempt = 0;
  while (true) {
    attempt++;
    try {
      return await writeDb.transaction(fn, { isolationLevel: 'read committed' });
    } catch (err: any) {
      const isRetryable =
        err?.code === '40001' ||
        err?.code === '40P01' ||
        err?.message?.includes('could not serialize');
      if (isRetryable && attempt <= maxRetries) {
        const delay = Math.min(
          maxDelayMs,
          initialDelayMs * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 50)
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
}
```

### 5.4 Prisma to Drizzle Schema Migration Steps

```bash
# 1. Introspect existing Neon database into Drizzle schema
npx drizzle-kit introspect --dialect postgresql --url "$DATABASE_URL"

# 2. Review and refine generated schema.ts (27 tables, 12 enums, all indexes)

# 3. Generate migration SQL
npx drizzle-kit generate

# 4. Apply migration to Neon (use UNPOOLED connection string for migrations)
npx drizzle-kit migrate --url "$DATABASE_URL_UNPOOLED"
```

### 5.5 Wrangler Hyperdrive Binding

```toml
# In apps/api-worker/wrangler.toml
[[hyperdrive]]
binding = "HYPERDRIVE"
id = "<hyperdrive-config-id>"
```

Create the Hyperdrive configuration:
```bash
npx wrangler hyperdrive create quickcommerce-db \
  --connection-string "postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/quickcommerce?sslmode=require"
```

---

## 6. Phase 2: Edge API Worker with Hono (apps/api-worker)

### 6.1 Dependencies (apps/api-worker/package.json)

```json
{
  "dependencies": {
    "hono": "^4.6.0",
    "@hono/zod-validator": "^0.4.0",
    "jose": "^5.9.0",
    "@upstash/redis": "^1.34.0",
    "@upstash/ratelimit": "^2.0.0",
    "aws4fetch": "^1.0.20",
    "@quickcommerce/shared": "workspace:*",
    "@quickcommerce/database": "workspace:*"
  }
}
```

### 6.2 Environment Type Definitions (apps/api-worker/src/env.ts)

```typescript
export interface Env {
  // Cloudflare Bindings
  AI: Ai;
  VECTORIZE: VectorizeIndex;
  EVENTS_QUEUE: Queue;
  HYPERDRIVE: Hyperdrive;

  // Secrets (set via wrangler secret put)
  DATABASE_URL: string;
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;
  JWT_SECRET: string;
  OTP_SECRET_SALT: string;
  AUTH0_DOMAIN: string;
  AUTH0_AUDIENCE: string;
  B2_APPLICATION_KEY_ID: string;
  B2_APPLICATION_KEY: string;
  B2_BUCKET_NAME: string;
  B2_ENDPOINT: string;

  // Vars (set in wrangler.toml [vars])
  NODE_ENV: string;
  ALLOWED_ORIGINS: string;
  OTP_EXPIRY_MINUTES: string;
}
```

### 6.3 Complete Wrangler Configuration (apps/api-worker/wrangler.toml)

```toml
name = "quickcommerce-api"
main = "src/index.ts"
compatibility_date = "2026-08-30"
compatibility_flags = ["nodejs_compat"]

[vars]
NODE_ENV = "production"
ALLOWED_ORIGINS = "https://quickcommerce.pages.dev"
OTP_EXPIRY_MINUTES = "60"

[ai]
binding = "AI"

[[vectorize]]
binding = "VECTORIZE"
index_name = "product-search-index"

[[queues.producers]]
queue = "quickcommerce-events"
binding = "EVENTS_QUEUE"

[[hyperdrive]]
binding = "HYPERDRIVE"
id = "<your-hyperdrive-config-id>"
```

### 6.4 Complete API Endpoint Port Map (30+ Routes)

All 30+ existing Express routes ported to Hono handlers:

**Health and Docs**: GET /health, GET /health/live, GET /health/ready

**Auth (2 routes)**: POST /api/auth/dev-login, GET /api/auth/me [Auth]

**Stores (4 routes)**: GET /api/stores [OptionalAuth], GET /api/stores/:id [OptionalAuth], POST /api/stores [Auth: SUPER_ADMIN], PATCH /api/stores/:id [Auth: SUPER_ADMIN, STORE_ADMIN]

**Products and Search (7 routes)**: GET /api/products/categories [OptionalAuth], GET /api/products/search [OptionalAuth] (Workers AI + Vectorize), GET /api/products/search/suggestions [OptionalAuth], GET /api/products [OptionalAuth], GET /api/products/:id [OptionalAuth], POST /api/products [Auth: SUPER_ADMIN, STORE_ADMIN], PATCH /api/products/:id [Auth: SUPER_ADMIN, STORE_ADMIN]

**Inventory (3 routes)**: GET /api/inventory/store/:storeId [Auth + StoreScope], GET /api/inventory/:inventoryId/movements [Auth: SUPER_ADMIN, STORE_ADMIN], POST /api/inventory/adjust [Auth: SUPER_ADMIN, STORE_ADMIN + Idempotency]

**Delivery Slots (2 routes)**: GET /api/slots [OptionalAuth], PATCH /api/slots/:id [Auth: SUPER_ADMIN, STORE_ADMIN]

**Cart (4 routes)**: GET /api/cart [Auth], POST /api/cart/items [Auth], PATCH /api/cart/items/:itemId [Auth], DELETE /api/cart [Auth]

**Orders and Checkout (4 routes)**: POST /api/orders/checkout [Auth + CheckoutRateLimiter + Idempotency] (Transactional), GET /api/orders [Auth], GET /api/orders/:id [Auth], PATCH /api/orders/:id/status [Auth: SUPER_ADMIN, STORE_ADMIN, STORE_STAFF, DRIVER]

**Batches (4 routes)**: GET /api/batches [Auth], GET /api/batches/:id [Auth], POST /api/batches [Auth: SUPER_ADMIN, STORE_ADMIN, STORE_STAFF], POST /api/batches/:id/dispatch [Auth + Idempotency]

**Drivers (6 routes)**: GET /api/drivers [Auth: SUPER_ADMIN, STORE_ADMIN, STORE_STAFF], GET /api/drivers/me [Auth: DRIVER], GET /api/drivers/:id [Auth], POST /api/drivers [Auth: SUPER_ADMIN, STORE_ADMIN], POST /api/drivers/batches/:batchId/assign [Auth: SUPER_ADMIN, STORE_ADMIN + Idempotency], PATCH /api/drivers/me/status [Auth: DRIVER]

**OTP Verification (1 route)**: POST /api/otp/verify [Auth: DRIVER + OtpRateLimiter + Idempotency]

**Invoices (5 routes)**: GET /api/invoices [Auth], GET /api/invoices/order/:orderId [Auth], GET /api/invoices/order/:orderId/download [Auth], GET /api/invoices/:id/download [Auth], GET /api/invoices/:id [Auth]

**Analytics (2 routes)**: GET /api/analytics/store/:storeId [Auth + StoreScope], GET /api/analytics/god-dashboard [Auth: SUPER_ADMIN]

**Audit (1 route)**: GET /api/audit [Auth: SUPER_ADMIN, STORE_ADMIN]

**Notifications (2 routes)**: GET /api/notifications [Auth], PATCH /api/notifications/:id/read [Auth]

---

## 7. Phase 3: Middleware Port — Auth, RBAC, Rate Limiting, Idempotency, CORS

### 7.1 CORS Middleware (Gap #6)

Use `hono/cors` with dynamic origin validation from `env.ALLOWED_ORIGINS`. Allow `.pages.dev` preview deployments. Set `credentials: true`, expose `Content-Type`, `Authorization`, `Idempotency-Key`, `X-Request-ID` headers.

### 7.2 Auth Middleware (Express to Hono)

Replace `jsonwebtoken.verify()` with `jose.jwtVerify()` using `new TextEncoder().encode(env.JWT_SECRET)` for edge-compatible WebCrypto JWT verification. Load user from `readDb` (not writeDb) for auth lookups. Attach user to Hono context via `c.set('user', ...)`.

### 7.3 Rate Limiter (Gap #13 — express-rate-limit to @upstash/ratelimit)

Replace in-memory `express-rate-limit` with distributed `@upstash/ratelimit` using sliding window algorithm over Upstash Redis REST API. Three rate limiters preserved:
- Standard: 300 reqs / 15 min per IP (via `CF-Connecting-IP` header)
- Checkout: 10 reqs / 1 min per IP
- OTP: 15 attempts / 15 min per IP

### 7.4 Idempotency Middleware (PostgreSQL to Upstash Redis)

Move idempotency cached responses from PostgreSQL `IdempotencyKey` table to Upstash Redis with 24h TTL. Use `crypto.subtle.digest('SHA-256', ...)` for request body hashing (replaces Node.js `crypto.createHash`). Cache key format: `idem:{userId}:{key}:{method}:{path}`.

### 7.5 Error Handler

Port `AppError` class and centralized error formatting. Map Drizzle ORM errors (unique constraint violations, not found) to standardized `ApiErrorResponse` JSON. Handle Zod validation errors from `@hono/zod-validator`.

### 7.6 Request Tracker

Replace Pino logger with Hono's built-in `logger()` middleware. Pass-through `X-Request-ID` header (or generate via `crypto.randomUUID()`). Log method, URL, status, latency, userId, role on response.

---

## 8. Phase 4: Business Logic Migration (15 Service Modules)

Each of the 15 existing Express service modules must be ported:

| Module | Key Migration Change |
| :--- | :--- |
| `auth` | Replace `jsonwebtoken.sign()` with `jose.SignJWT` (edge-compatible) |
| `stores` | `prisma.store` to `readDb.query.stores` / `writeDb` for mutations |
| `products` | Remove Orama integration; add Vectorize upsert on create/update |
| `search` | **Full rewrite**: Orama to Workers AI + Vectorize (see Phase 5) |
| `inventory` | Use `writeDb.transaction()` for atomic adjustments with ledger |
| `slots` | IST timezone logic preserved via `Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata' })` |
| `cart` | `readDb` for reads; `writeDb` for store-switch cart clear |
| `orders` | **Critical**: `writeDb.transaction()` with `FOR UPDATE` sorted row locks |
| `batches` | `writeDb.transaction()` for atomic batch creation and order state updates |
| `drivers` | `writeDb.transaction()` for temporal overlap validation and auto-dispatch |
| `otp` | `writeDb.transaction()` for atomic OTP verification + order completion + batch check |
| `invoices` | HTML rendering preserved; B2 upload via `aws4fetch` (see Phase 7) |
| `outbox` | Replaced by Cloudflare Queues direct publish (outbox table retained for audit) |
| `analytics` | `readDb` only — pure aggregation queries |
| `audit` | `readDb` for listing; `writeDb` for log insertion |
| `notifications` | `writeDb` for creating notification records |

---

## 9. Phase 5: Neural Search — Workers AI + Vectorize (Replace Orama)

### 9.1 Vectorize Index Setup

```bash
npx wrangler vectorize create product-search-index --dimensions=768 --metric=cosine
```

### 9.2 Hinglish Synonym Prepend Strategy (Gap #12)

The existing search service has 60+ Hindi/Hinglish synonym mappings and 12 concept anchors that produce excellent results for Indian grocery queries. Rather than losing this, we **prepend expanded synonym text** to the AI embedding input. All existing synonym mappings (`dahi` to curd/yogurt, `atta` to wheat flour, `chai` to tea, `aloo` to potato, `pyaaz` to onion, etc.) are preserved in a `SYNONYM_MAP` dictionary and applied to both product indexing text and search query text before embedding.

### 9.3 Embedding Cache Layer (Gap #9 — 10k Neurons/day Budget)

Implement Upstash Redis embedding cache with 24h TTL. Cache key: `embed:{sha256(text)}`. On cache hit, skip Workers AI call entirely (saves Neurons). On cache miss, call `env.AI.run('@cf/baai/bge-base-en-v1.5', { text: [expandedText] })`, cache the resulting 768-dim vector, and proceed. This allows ~1,000 unique search queries/day while serving unlimited cached repeats.

### 9.4 Product Indexing (On Create/Update)

When a product is created or updated, generate synonym-expanded text, obtain embedding (from cache or Workers AI), and upsert into Vectorize index with product metadata (name, category, brand, unit).

### 9.5 Semantic Search Flow

1. Expand query with Hinglish synonyms
2. Get or create embedding (Redis cache or Workers AI)
3. Query Vectorize for top-20 nearest neighbors
4. Hydrate with real-time store pricing and inventory from Neon `readDb`
5. Rank by Vectorize similarity score x stock availability (in-stock products ranked first)

### 9.6 Capacity Fallback (Gap #10)

At 768 dims x ~6,500 products, the Vectorize free tier (5M stored dimensions) is at capacity. If product catalog grows beyond this, degrade gracefully to PostgreSQL `ILIKE` full-text search as a fallback path.

---

## 10. Phase 6: Queue Worker & Outbox Poller (apps/queue-worker)

### 10.1 Wrangler Configuration

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

[[hyperdrive]]
binding = "HYPERDRIVE"
id = "<your-hyperdrive-config-id>"

# Cron trigger for outbox polling (every 1 minute)
[triggers]
crons = ["*/1 * * * *"]
```

### 10.2 Full 12-Event-Type Consumer (Gap #7 and #8)

All 12 `OutboxEventType` values are handled:

| Event Type | Handler Action |
| :--- | :--- |
| `ORDER_CREATED` | Generate invoice record, archive PDF to B2, send customer notification |
| `ORDER_ACCEPTED` | Notify customer "Order is being prepared" |
| `ORDER_READY` | Notify customer "Order is packed and ready" |
| `ORDER_BATCHED` | Internal state tracking only |
| `ORDER_DELIVERED` | Notify customer "Your order has been delivered" |
| `ORDER_CANCELLED` | Notify customer "Order has been cancelled" |
| `BATCH_ASSIGNED` | Notify driver "New batch assigned" |
| `BATCH_DISPATCHED` | Notify all customers in batch "Out for Delivery" |
| `DRIVER_ASSIGNED` | Covered by BATCH_ASSIGNED |
| `INVENTORY_LOW` | Notify store admin "Low stock alert" |
| `INVENTORY_UPDATED` | Audit-only (no notification) |
| `INVOICE_GENERATION_REQUESTED` | Generate invoice and archive to B2 |

### 10.3 Outbox Cron Poller (scheduled() Export)

Every 1 minute, the Cron Trigger fires `scheduled()` which:
1. Reads up to 50 PENDING outbox events from Neon via `readDb`
2. Publishes each event to `EVENTS_QUEUE` (Cloudflare Queue)
3. Marks successfully published events as PROCESSED in `writeDb`
4. Marks failed events as FAILED with incremented attempt counter and error message

---

## 11. Phase 7: Backblaze B2 Storage via aws4fetch

**Critical Fix (Gap #2):** `@aws-sdk/client-s3` is ~2MB+ bundled and would exceed the Workers Free Plan 3MB script size limit. We use **`aws4fetch`** instead (~2.5KB gzipped).

```typescript
import { AwsClient } from 'aws4fetch';

export function createB2Client(env: Env): AwsClient {
  return new AwsClient({
    accessKeyId: env.B2_APPLICATION_KEY_ID,
    secretAccessKey: env.B2_APPLICATION_KEY,
    region: 'us-west-004',
    service: 's3',
  });
}

export async function uploadToB2(
  client: AwsClient, env: Env,
  key: string, body: ArrayBuffer | string, contentType: string
): Promise<string> {
  const endpoint = env.B2_ENDPOINT || 'https://s3.us-west-004.backblazeb2.com';
  const url = `${endpoint}/${env.B2_BUCKET_NAME}/${key}`;
  const response = await client.fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body,
  });
  if (!response.ok) {
    throw new Error(`B2 upload failed: ${response.status} ${await response.text()}`);
  }
  return `${endpoint}/${env.B2_BUCKET_NAME}/${key}`;
}
```

---

## 12. Phase 8: Unified Frontend on Cloudflare Pages (apps/web)

### 12.1 SPA Routing Configuration (Gap #14)

Cloudflare Pages automatically serves `index.html` for all non-asset routes when **no `404.html` file exists** in the build output. Do NOT generate a `404.html`.

**apps/web/public/_routes.json:**
```json
{
  "version": 1,
  "include": ["/*"],
  "exclude": ["/assets/*", "/favicon.svg", "/manifest.json", "/sw.js"]
}
```

### 12.2 Unified Router (apps/web/src/App.tsx)

All 4 modules merged with path routing:

- `/` -> Customer Marketing Landing Page
- `/catalog` -> Customer Shopping Catalog and Search
- `/product/:id` -> Product Details
- `/cart`, `/checkout`, `/order-confirmation/:orderId` -> Checkout Flow
- `/orders`, `/orders/:id` -> Order Tracking
- `/profile`, `/login` -> Customer Auth
- `/driver` -> Driver Dashboard
- `/driver/batch/:id` -> Batch Route Stops
- `/driver/delivery/:orderId` -> Doorstep OTP Verification
- `/driver/history` -> Delivery History
- `/store-admin` -> Store Dashboard
- `/store-admin/slot-board` -> 4-Slot Capacity Board
- `/store-admin/batch-kanban` -> Kanban Batching
- `/store-admin/orders` -> Live Orders
- `/store-admin/inventory` -> Stock Management
- `/store-admin/drivers` -> Driver Roster
- `/store-admin/invoices` -> Invoice Log
- `/god-admin` -> Executive Dashboard
- `/god-admin/stores` -> Multi-Store Manager
- `/god-admin/global-orders` -> Global Order Search
- `/god-admin/system-health` -> System Monitoring
- `/god-admin/audit-logs` -> Audit Trail

---

## 13. Phase 9: CI/CD Pipeline (GitHub Actions) (Gap #15)

**.github/workflows/deploy.yml** with 4 jobs:

1. **lint-typecheck**: `bun install`, `bun run typecheck`, `bun run lint`
2. **test**: `bun install`, `bun run test` (depends on lint-typecheck)
3. **deploy-api-worker**: `wrangler-action` deploys `apps/api-worker` (depends on test, main branch only)
4. **deploy-queue-worker**: `wrangler-action` deploys `apps/queue-worker` (depends on test, main branch only)
5. **deploy-frontend**: `bun run build`, `wrangler pages deploy apps/web/dist --project-name quickcommerce` (depends on test, main branch only)

GitHub Secrets required: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`

---

## 14. Phase 10: Environment Variables & Secrets Manifest (Gap #16)

### 14.1 Wrangler Vars (Non-Sensitive, in wrangler.toml)

```toml
[vars]
NODE_ENV = "production"
ALLOWED_ORIGINS = "https://quickcommerce.pages.dev"
OTP_EXPIRY_MINUTES = "60"
```

### 14.2 Wrangler Secrets (Sensitive, set via CLI)

```bash
# API Worker Secrets (11 total)
npx wrangler secret put DATABASE_URL             --name quickcommerce-api
npx wrangler secret put JWT_SECRET               --name quickcommerce-api
npx wrangler secret put OTP_SECRET_SALT          --name quickcommerce-api
npx wrangler secret put UPSTASH_REDIS_REST_URL   --name quickcommerce-api
npx wrangler secret put UPSTASH_REDIS_REST_TOKEN --name quickcommerce-api
npx wrangler secret put AUTH0_DOMAIN             --name quickcommerce-api
npx wrangler secret put AUTH0_AUDIENCE           --name quickcommerce-api
npx wrangler secret put B2_APPLICATION_KEY_ID    --name quickcommerce-api
npx wrangler secret put B2_APPLICATION_KEY       --name quickcommerce-api
npx wrangler secret put B2_BUCKET_NAME           --name quickcommerce-api
npx wrangler secret put B2_ENDPOINT              --name quickcommerce-api

# Queue Worker Secrets (7 total)
npx wrangler secret put DATABASE_URL             --name quickcommerce-queue-worker
npx wrangler secret put UPSTASH_REDIS_REST_URL   --name quickcommerce-queue-worker
npx wrangler secret put UPSTASH_REDIS_REST_TOKEN --name quickcommerce-queue-worker
npx wrangler secret put B2_APPLICATION_KEY_ID    --name quickcommerce-queue-worker
npx wrangler secret put B2_APPLICATION_KEY       --name quickcommerce-queue-worker
npx wrangler secret put B2_BUCKET_NAME           --name quickcommerce-queue-worker
npx wrangler secret put B2_ENDPOINT              --name quickcommerce-queue-worker
```

---

## 15. Phase 11: End-to-End Verification & Go-Live Checklist

### Pre-Flight Verification

- [ ] **Drizzle Schema**: All 27 tables and 12 enums introspected and validated against existing Prisma schema
- [ ] **Dual-Driver Transactions**: Verify `writeDb.transaction()` with `FOR UPDATE` row locks on Neon via Hyperdrive
- [ ] **Auth0 JWKS Edge Verification**: Verify `jose.jwtVerify()` succeeds with valid token and rejects expired/invalid tokens
- [ ] **CORS**: Verify Pages to Worker cross-origin requests succeed with correct headers
- [ ] **Rate Limiting**: Verify `@upstash/ratelimit` correctly throttles after threshold (300/15min, 10/1min checkout, 15/15min OTP)
- [ ] **Idempotency Replay**: Verify duplicate checkout with same `Idempotency-Key` returns cached response without creating duplicate order

### Business Logic Verification

- [ ] **Concurrency Flash Sale**: Run 50 concurrent checkout requests for a single delivery slot; verify exactly 50 accepted and slot capacity enforced without deadlocks
- [ ] **Inventory Oversell Prevention**: Verify checkout rejects when available stock < requested quantity
- [ ] **Hinglish Neural Search**: Verify `dahi` returns curd/yogurt products, `healthy breakfast` returns oats/eggs, `chai` returns tea products
- [ ] **Slot Time Logic**: Verify IST timezone calculations correctly determine UPCOMING/OPEN/CLOSED/IN_PROGRESS/COMPLETED slot states
- [ ] **Driver Temporal Overlap**: Verify driver cannot be assigned to two batches with overlapping delivery slots
- [ ] **Auto-Dispatch**: Verify allotting a driver transitions batch and orders to OUT_FOR_DELIVERY
- [ ] **Doorstep OTP**: Verify correct 6-digit OTP transitions order to DELIVERED and payment to PAID; incorrect OTP returns error; max 5 attempts enforced
- [ ] **Batch Completion**: Verify all-orders-delivered in batch transitions batch to COMPLETED and driver to AVAILABLE
- [ ] **Order Cancellation Rollback**: Verify cancellation restores inventory ledger and decrements slot booked count

### Queue and Background Processing

- [ ] **Outbox Cron Poller**: Verify Cron Trigger polls outbox table every 1 minute and publishes PENDING events to Cloudflare Queue
- [ ] **Queue Consumer**: Verify all 12 event types are correctly routed and handled
- [ ] **DLQ**: Verify failed messages after 3 retries land in `quickcommerce-dlq`
- [ ] **Invoice B2 Upload**: Verify printable HTML renders at `/api/invoices/order/:id/download` and archives to Backblaze B2 via `aws4fetch`

### Frontend Verification

- [ ] **SPA Routing**: Verify all 4 module paths (`/`, `/driver/*`, `/store-admin/*`, `/god-admin/*`) serve `index.html` without 404
- [ ] **Deep Link Reload**: Verify refreshing `/store-admin/slot-board` does not produce 404
- [ ] **PWA Manifest**: Verify Service Worker registration and offline shell

### CI/CD Verification

- [ ] **GitHub Actions**: Verify push to `main` triggers lint, typecheck, test, deploy pipeline
- [ ] **Wrangler Deploy**: Verify both Workers and Pages deploy successfully via `wrangler-action`

---

## Migration Timeline

| Phase | Description | Estimated Effort |
| :--- | :--- | :--- |
| **Phase 0** | Monorepo restructuring and packages/database scaffold | 1 day |
| **Phase 1** | Prisma to Drizzle ORM with dual-driver (27 tables, 12 enums) | 2-3 days |
| **Phase 2** | Hono API Worker skeleton + wrangler.toml + env types | 1 day |
| **Phase 3** | Middleware port (auth, RBAC, rate limit, idempotency, CORS, errors) | 1-2 days |
| **Phase 4** | Business logic migration (15 service modules, 30+ routes) | 3-4 days |
| **Phase 5** | Workers AI + Vectorize search with Hinglish synonyms and Redis cache | 1-2 days |
| **Phase 6** | Queue Worker + Outbox Cron (12 event types + DLQ) | 1-2 days |
| **Phase 7** | Backblaze B2 via aws4fetch (invoice upload) | 0.5 day |
| **Phase 8** | Unified frontend Pages app (merge 4 PWAs + routing) | 2-3 days |
| **Phase 9** | GitHub Actions CI/CD pipeline | 0.5 day |
| **Phase 10** | Environment variables and secrets configuration | 0.5 day |
| **Phase 11** | End-to-end testing and go-live | 1-2 days |
| **Total** | | **~14-20 days** |
