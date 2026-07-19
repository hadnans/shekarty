# 02 — Architecture

> **GGH — Gomla Go Home** — System architecture, service responsibilities, communication patterns, and data flow.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Service Inventory](#2-service-inventory)
3. [Next.js — Frontend & API Gateway](#3-nextjs--frontend--api-gateway)
4. [Medusa v2 — Commerce Engine](#4-medusa-v2--commerce-engine)
5. [PostgreSQL — Primary Database](#5-postgresql--primary-database)
6. [Redis — Cache, Queue & Session Store](#6-redis--cache-queue--session-store)
7. [BullMQ — Job Processing](#7-bullmq--job-processing)
8. [ERPNext — ERP System](#8-erpnext--erp-system)
9. [Docker — Containerization](#9-docker--containerization)
10. [Inter-Service Communication](#10-inter-service-communication)
11. [Data Flow](#11-data-flow)
12. [Failure Modes & Degradation](#12-failure-modes--degradation)
13. [Security Boundaries](#13-security-boundaries)
14. [Architectural Decision Records](#14-architectural-decision-records)

---

## 1. Architecture Overview

GGH follows a **service-oriented architecture** with four deployable services sharing a database and message queue. Each service owns a bounded context. Communication is asynchronous by default, synchronous only when latency demands it.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            CLIENT LAYER                                 │
│                                                                         │
│   ┌────────────────┐   ┌────────────────┐   ┌────────────────────┐     │
│   │  Web Browser   │   │  Mobile (Future)│   │  Admin Dashboard   │     │
│   │  SSR + Hydrate │   │  React Native  │   │  Medusa Admin UI   │     │
│   └───────┬────────┘   └───────┬────────┘   └────────┬───────────┘     │
└───────────┼────────────────────┼──────────────────────┼─────────────────┘
            │                    │                      │
            │  HTTPS             │  HTTPS               │  HTTPS
            ▼                    ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     NEXT.JS  (Port 3000)                                │
│                     Frontend + BFF + API Gateway                        │
│                                                                         │
│   ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  ┌────────────┐  │
│   │  React 19   │  │  API Routes  │  │  ISR Cache  │  │  Session   │  │
│   │  Server     │  │  /api/*      │  │  (File +    │  │  Manager   │  │
│   │  Components │  │  (BFF Layer) │  │   Redis)    │  │  (Redis)   │  │
│   └─────────────┘  └──────┬───────┘  └─────────────┘  └────────────┘  │
│                           │                                             │
└───────────────────────────┼─────────────────────────────────────────────┘
                            │
              ┌─────────────┼──────────────┐
              │             │              │
              ▼             ▼              ▼
┌──────────────────┐ ┌──────────────┐ ┌──────────────────┐
│   MEDUSA v2      │ │   BullMQ     │ │   ERPNext        │
│   (Port 9000)    │ │   Worker     │ │   (Port 8000)    │
│                  │ │   (Process)  │ │                  │
│  ┌────────────┐  │ │              │ │  ┌────────────┐  │
│  │ Product    │  │ │  ┌────────┐  │ │  │ Item       │  │
│  │ Module     │  │ │  │ ERP    │  │ │  │ Master     │  │
│  ├────────────┤  │ │  │ Sync   │  │ │  ├────────────┤  │
│  │ Pricing    │  │ │  ├────────┤  │ │  │ Stock      │  │
│  │ Module     │  │ │  │ Order  │  │ │  │ Ledger     │  │
│  ├────────────┤  │ │  │ Push   │  │ │  ├────────────┤  │
│  │ Order      │  │ │  ├────────┤  │ │  │ Sales      │  │
│  │ Module     │  │ │  │ Notif- │  │ │  │ Order      │  │
│  ├────────────┤  │ │  │ icat-  │  │ │  ├────────────┤  │
│  │ Customer   │  │ │  │ ions   │  │ │  │ Purchasing │  │
│  │ Module     │  │ │  ├────────┤  │ │  ├────────────┤  │
│  ├────────────┤  │ │  │ Cache  │  │ │  │ Accounts   │  │
│  │ Payment    │  │ │  │ Inval- │  │ │  │ & Finance  │  │
│  │ Module     │  │ │  │ idate  │  │ │  └────────────┘  │
│  ├────────────┤  │ │  └────────┘  │ │                  │
│  │ Shipping   │  │ │              │ │  MariaDB/         │
│  │ Module     │  │ │              │ │  PostgreSQL       │
│  ├────────────┤  │ │              │ │  (ERP DB)         │
│  │ Inventory  │  │ │              │ │                  │
│  │ Module     │  │ │              │ │                  │
│  └────────────┘  │ │              │ │                  │
└───────┬──────────┘ └──────┬───────┘ └──────────────────┘
        │                   │
        ▼                   ▼
┌──────────────────┐ ┌──────────────┐
│  PostgreSQL 16   │ │   Redis 7    │
│  (Primary DB)    │ │              │
│                  │ │ ┌──────────┐ │
│  ┌────────────┐  │ │ │ Cache    │ │
│  │ medusa     │  │ │ │ (TTL)    │ │
│  │ schema     │  │ │ ├──────────┤ │
│  ├────────────┤  │ │ │ Session  │ │
│  │ ggh        │  │ │ │ Store    │ │
│  │ schema     │  │ │ ├──────────┤ │
│  └────────────┘  │ │ │ BullMQ   │ │
│                  │ │ │ Queues   │ │
└──────────────────┘ │ └──────────┘ │
                     └──────────────┘
```

### Design Principles Reflected in Architecture

| Architectural Choice | Vision Alignment |
|---|---|
| **SSR via Next.js** | Om Ibrahim sees content immediately. No blank screen while JavaScript loads. |
| **BFF pattern** | Mobile and web get tailored responses. No over-fetching. Elder-friendly means fast, even on slow connections. |
| **ERP as source of truth** | Honest prices come from accounting, not from a product manager's spreadsheet. Trust over convenience. |
| **Async job processing** | Orders never fail because ERP is slow. The queue absorbs spikes. Reliability over speed. |
| **Redis caching layer** | Product pages load from memory, not disk. Speed is an accessibility feature. |
| **Docker isolation** | Every service can be restarted independently. No single deployment takes down the whole platform. |

---

## 2. Service Inventory

| Service | Port | Role | Lifecycle |
|---|---|---|---|
| **Next.js** | 3000 | Frontend rendering, API gateway, BFF, session management | Long-running HTTP server |
| **Medusa v2** | 9000 | Commerce engine: products, pricing, orders, customers, payments, shipping | Long-running HTTP server |
| **BullMQ Worker** | — (no HTTP port) | Background job processing: ERP sync, notifications, cache invalidation | Long-running Node.js process |
| **ERPNext** | 8000 | ERP: accounting, inventory truth, procurement, VAT | Long-running Python/Gunicorn server |
| **PostgreSQL** | 5432 | Persistent data store for Medusa and GGH operational data | Long-running database |
| **Redis** | 6379 | Cache, session store, BullMQ queue backend | Long-running in-memory store |

### Dependency Graph

```
Next.js ──depends on──► Medusa (API)
       ──depends on──► Redis (session, cache)

Medusa ──depends on──► PostgreSQL (data)
       ──depends on──► Redis (internal cache, event bus)

BullMQ Worker ──depends on──► Redis (queue)
              ──depends on──► Medusa (Admin API)
              ──depends on──► ERPNext (REST API)
              ──depends on──► PostgreSQL (audit log)
              ──depends on──► Next.js (ISR revalidation webhook)

ERPNext ──depends on──► MariaDB/PostgreSQL (own database)
         ──webhooks──► Next.js (optional push notifications)
```

### Startup Order

```
1. PostgreSQL   (data foundation — must be ready first)
2. Redis        (queue foundation — must be ready before workers)
3. ERPNext      (slow startup ~60s; start early)
4. Medusa       (depends on PostgreSQL + Redis)
5. BullMQ Worker (depends on Redis + Medusa + ERPNext)
6. Next.js      (depends on Medusa + Redis; start last)
```

---

## 3. Next.js — Frontend & API Gateway

### 3.1 Role

Next.js serves three functions in one deployable unit:

| Function | Why It Lives Here |
|---|---|
| **Server-rendered frontend** | Product pages, category pages, and the homepage render on the server as HTML. The browser receives a complete page — no spinner, no skeleton, no "loading..." for the initial view. This is critical for Om Ibrahim on a slow 3G connection. |
| **BFF (Backend-for-Frontend)** | API route handlers in `/api/*` transform and aggregate Medusa responses into the exact shape the frontend needs. The browser never calls Medusa directly. This hides internal APIs, reduces payload size, and centralizes auth. |
| **API Gateway** | Rate limiting, input validation, CSRF protection, and request logging all happen at the API route level before any call reaches Medusa or ERPNext. |

### 3.2 Rendering Strategy

| Page | Strategy | Why |
|---|---|---|
| `/` (homepage) | ISR, 60-second revalidation | High traffic, semi-static content (categories, deals), fast initial load |
| `/categories/[slug]` | ISR, 60-second revalidation | Product listings change slowly; cache aggressively |
| `/products/[handle]` | ISR, 60-second revalidation + on-demand revalidation via webhook | Product details rarely change; instant update when ERP syncs a price change |
| `/cart` | Client-rendered (dynamic) | Cart is user-specific and interactive. SSR would leak data. |
| `/checkout` | Client-rendered (dynamic) | Payment and shipping forms are fully interactive. |
| `/account/*` | Client-rendered with RSC shell | Authenticated pages. Server renders the layout, client handles the interactive parts. |
| `/api/*` | No rendering (JSON) | Pure API endpoints. |

### 3.3 Caching Layers

```
Request
  │
  ├─── Browser Cache (SWR via TanStack Query)
  │     staleTime: 30s for product lists
  │     cacheTime: 5 min
  │
  ├─── Next.js Data Cache (fetch calls)
  │     revalidate: 60s (ISR)
  │     tags: ["products", "categories", "deals"]
  │     Invalidation: revalidateTag() called by webhook
  │
  ├─── Next.js Full Route Cache
  │     Duration: 60s
  │     Invalidation: revalidatePath() called by webhook
  │
  ├─── Redis Cache (application-level)
  │     Key patterns:
  │       cache:products:category:<slug>  TTL: 300s
  │       cache:products:search:<query>   TTL: 120s
  │       cache:deals:active              TTL: 60s
  │     Invalidation: BullMQ cache.invalidate job
  │
  └─── Medusa (source of truth for storefront data)
```

### 3.4 Session Architecture

| Aspect | Detail |
|---|---|
| **Session ID** | Cryptographically random, 256-bit, stored in `__ggh_sess` cookie |
| **Cookie flags** | `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/` |
| **Session store** | Redis key `sess:<id>` with 30-day TTL (rolling) |
| **Session contents** | `{ cartId, customerId, locale, customerGroup }` |
| **Guest carts** | Created on first session. Persisted in Medusa. Survive across page loads. |
| **Auth merge** | When a guest logs in, their guest cart merges with their customer cart. |

### 3.5 API Route Structure

```
src/app/api/
├── auth/
│   ├── login/route.ts          POST   Customer login
│   ├── register/route.ts       POST   Customer registration
│   ├── logout/route.ts         POST   Clear session
│   └── session/route.ts        GET    Return current auth state
├── cart/
│   ├── route.ts                GET    Retrieve cart
│   ├── items/route.ts          POST   Add item to cart
│   └── items/[id]/route.ts     PATCH  Update quantity
│                                DELETE Remove item
├── products/
│   ├── route.ts                GET    List products (search, filter, paginate)
│   └── [handle]/route.ts       GET    Single product detail
├── categories/
│   ├── route.ts                GET    List categories
│   └── [slug]/route.ts         GET    Category with products
├── orders/
│   ├── route.ts                GET    List customer orders
│   └── [id]/route.ts           GET    Order detail
├── checkout/
│   ├── route.ts                POST   Initiate checkout
│   └── complete/route.ts       POST   Complete checkout (confirm payment)
└── webhooks/
    ├── medusa/route.ts         POST   Medusa event webhooks
    └── erpnext/route.ts        POST   ERPNext push webhooks
```

Every API route follows this pattern:

```typescript
// 1. Validate input (Zod schema)
// 2. Authenticate request (session or service token)
// 3. Authorize action (customer group check)
// 4. Call Medusa / ERPNext / Redis
// 5. Transform response for frontend
// 6. Return JSON with proper status code
// 7. Log request duration and result
```

---

## 4. Medusa v2 — Commerce Engine

### 4.1 Role

Medusa owns all commerce data and business logic. It is the system of record for products, prices, carts, orders, customers, payments, and shipping — but **not** for accounting or inventory truth (ERPNext owns those).

### 4.2 Module Responsibilities

| Module | Owns | Key Operations | ERP Sync |
|---|---|---|---|
| **Product** | Products, variants, categories, collections, tags | CRUD, search, filtering | Read from ERP (items → products) |
| **Pricing** | Price sets, price lists, bulk-break tiers | Calculate price for quantity + customer group | Read from ERP (item prices) |
| **Cart** | Carts, line items, shipping methods | Add/remove items, calculate totals, apply discounts | None |
| **Order** | Orders, fulfillments, returns, refunds | Status transitions, cancellation, return processing | Write to ERP (sales orders) |
| **Customer** | Customers, addresses, customer groups | Registration, auth, profile management | Write to ERP (customers) |
| **Payment** | Payment sessions, payments, refunds | Initialize, authorize, capture, refund | Read from ERP (payment entries) |
| **Shipping** | Shipping options, delivery zones, rates | Calculate shipping cost, assign fulfillment | None (GGH-managed logistics) |
| **Inventory** | Inventory items, stock levels, reservations | Check availability, reserve stock on order | Read from ERP (stock ledger) |
| **Notification** | Email templates, SMS templates | Send order confirmations, shipping updates | None |

### 4.3 Custom Modules (GGH-Specific)

These modules extend Medusa beyond its default retail-oriented behavior to support wholesale operations.

| Module | Purpose | Key Logic |
|---|---|---|
| **Wholesale Pricing** | Bulk-break pricing tiers beyond Medusa's default price lists | `calculatePrice(variant, quantity, customerGroup)` → returns `{ unitPrice, totalPrice, tierName, savingsPercent }` |
| **Delivery Zones** | Geographic zones for shipping rate calculation (Cairo, Giza, 6th October, national) | `getZone(address)` → `{ zoneId, zoneName, availableSlots, shippingRate }` |
| **Order Templates** | Saved cart templates for recurring B2B orders | `createTemplate(cartId, name)` → template stored with line items for one-tap reorder |
| **Subscription** | Scheduled auto-reorder (Phase 2) | `scheduleReorder(templateId, frequency)` → BullMQ recurring job |

### 4.4 Medusa Events (Consumed by Subscribers)

| Event | Emitted When | Subscriber Action |
|---|---|---|
| `order.placed` | Customer completes checkout | Enqueue `erp.push.order` + `order.confirmation` jobs |
| `order.canceled` | Order is canceled | Enqueue `erp.sync.order.cancel` job |
| `payment.captured` | Payment is confirmed | Enqueue `order.payment.confirmed` notification |
| `payment.refunded` | Refund is processed | Enqueue `order.refund` notification |
| `customer.created` | New customer registers | Enqueue `erp.sync.customers` job |
| `customer.updated` | Customer profile changes | Enqueue `erp.sync.customers` job |
| `product.updated` | Product data changes in Medusa | Enqueue `cache.invalidate` job |

### 4.5 Wholesale Pricing Logic

```
Input: variantId, quantity, customerGroupId

Step 1: Fetch price tiers for variant
        Tier 1: qty 1–4   → EGP 25.00/unit  (retail)
        Tier 2: qty 5–9   → EGP 22.50/unit  (wholesale)
        Tier 3: qty 10+   → EGP 20.00/unit  (bulk)

Step 2: Apply customer group multiplier
        Group "retail"           → only Tier 1 available
        Group "wholesale-verified" → Tier 1, 2, 3 available
        Group "wholesale-enterprise" → Tier 1, 2, 3 + custom discount

Step 3: Return
        {
          unitPrice: 2250,          // in piastres (integer)
          currency: "EGP",
          tierName: "Wholesale",
          quantity: 5,
          lineTotal: 11250,
          savingsVsRetail: 1250,    // saved vs Tier 1
          savingsPercent: 10
        }
```

---

## 5. PostgreSQL — Primary Database

### 5.1 Role

PostgreSQL is the persistent data store for all Medusa and GGH operational data. It is the only durable storage for commerce records.

### 5.2 Schema Organization

| Schema | Owner | Contents |
|---|---|---|
| `public` | Medusa (managed) | All Medusa core tables: product, product_variant, order, order_line_item, customer, payment, etc. Medusa manages migrations — do not modify directly. |
| `ggh` | GGH team | Custom tables: `erp_sync_log`, `delivery_zone`, `delivery_slot`, `order_template`, `subscription_schedule`, `price_tier_config` |

### 5.3 Custom Tables (ggh schema)

```sql
-- Audit log for all ERP sync operations
CREATE TABLE ggh.erp_sync_log (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type   TEXT NOT NULL,          -- 'product'|'inventory'|'customer'|'order'|'invoice'
    entity_id     TEXT NOT NULL,          -- Medusa or ERP entity identifier
    direction     TEXT NOT NULL,          -- 'erp_to_medusa' | 'medusa_to_erp'
    status        TEXT NOT NULL,          -- 'success' | 'conflict' | 'error'
    medusa_data   JSONB,                 -- Snapshot of Medusa state
    erp_data      JSONB,                 -- Snapshot of ERP state
    error_message TEXT,
    duration_ms   INTEGER,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Delivery zones for shipping calculation
CREATE TABLE ggh.delivery_zone (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en       TEXT NOT NULL,
    name_ar       TEXT NOT NULL,
    regions       JSONB NOT NULL,        -- Array of areas/postal codes
    base_rate     INTEGER NOT NULL,      -- Base shipping rate in piastres
    free_above    INTEGER,               -- Free delivery above this order value
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Available delivery time slots
CREATE TABLE ggh.delivery_slot (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id       UUID REFERENCES ggh.delivery_zone(id),
    day_of_week   SMALLINT NOT NULL,     -- 0=Sunday (Egypt work week)
    start_time    TIME NOT NULL,
    end_time      TIME NOT NULL,
    max_orders    INTEGER NOT NULL DEFAULT 20,
    current_orders INTEGER NOT NULL DEFAULT 0,
    is_active     BOOLEAN DEFAULT TRUE
);

-- Saved order templates for B2B quick reorder
CREATE TABLE ggh.order_template (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id   TEXT NOT NULL,         -- Medusa customer ID
    name          TEXT NOT NULL,
    items         JSONB NOT NULL,        -- [{ variantId, quantity }]
    last_used_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Bulk-break pricing tier configuration
CREATE TABLE ggh.price_tier_config (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id    TEXT NOT NULL,         -- Medusa variant ID
    tier_name     TEXT NOT NULL,
    min_quantity  INTEGER NOT NULL,
    max_quantity  INTEGER,               -- NULL = no upper limit
    price_amount  INTEGER NOT NULL,      -- In piastres
    currency_code TEXT NOT NULL DEFAULT 'EGP',
    customer_groups JSONB,               -- Groups allowed this tier. NULL = all groups.
    created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.4 Index Strategy

| Table | Index | Purpose |
|---|---|---|
| `ggh.erp_sync_log` | `(entity_type, entity_id)` | Fast lookup of sync history per entity |
| `ggh.erp_sync_log` | `(status, created_at DESC)` | Find recent failures quickly |
| `ggh.delivery_slot` | `(zone_id, day_of_week)` | Look up available slots for a zone |
| `ggh.order_template` | `(customer_id)` | Load a customer's templates |
| `ggh.price_tier_config` | `(variant_id, min_quantity)` | Resolve price tier for a given quantity |

### 5.5 Migration Strategy

| Scope | Tool | Rule |
|---|---|---|
| Medusa core tables | Medusa CLI (`medusa db:migrate`) | Never modify manually. Upgrades come from Medusa releases. |
| `ggh` schema | Custom migration scripts in `infra/migrations/ggh/` | Versioned, reversible, tested in CI before production. |

---

## 6. Redis — Cache, Queue & Session Store

### 6.1 Role

Redis serves three distinct functions, separated by key prefix namespaces:

| Function | Key Prefix | Memory Budget | Persistence |
|---|---|---|---|
| **Application Cache** | `cache:*` | ~256 MB | No persistence (volatile cache) |
| **Session Store** | `sess:*` | ~64 MB | AOF persistence (sessions must survive restart) |
| **BullMQ Queues** | `bull:*` | ~128 MB | AOF persistence (jobs must survive restart) |

### 6.2 Cache Key Registry

| Key Pattern | TTL | Invalidation | Example Value |
|---|---|---|---|
| `cache:products:category:<slug>` | 300s | `cache.invalidate` job after ERP sync | JSON array of product summaries |
| `cache:products:detail:<handle>` | 300s | `cache.invalidate` job after product update | JSON product object |
| `cache:products:search:<hash>` | 120s | `cache.invalidate` job | JSON array of search results |
| `cache:deals:active` | 60s | `cache.invalidate` job after deal change | JSON array of active deals |
| `cache:categories:tree` | 600s | `cache.invalidate` job after category sync | JSON category tree |
| `cache:inventory:<variantId>` | 300s | `cache.invalidate` job after inventory sync | `{ available: 150, reserved: 12 }` |
| `cache:erp:sync_cursor:products` | No TTL | Updated after each sync | ISO timestamp of last successful sync |
| `cache:erp:sync_cursor:inventory` | No TTL | Updated after each sync | ISO timestamp of last successful sync |

### 6.3 Session Data

```json
{
  "cartId": "cart_01JXY...",
  "customerId": null,
  "locale": "ar",
  "customerGroup": "retail",
  "createdAt": "2026-07-19T10:00:00Z",
  "lastActivity": "2026-07-19T14:30:00Z"
}
```

### 6.4 Redis Configuration

```conf
# Production overrides
maxmemory 512mb
maxmemory-policy allkeys-lru

# AOF for session and queue persistence
appendonly yes
appendfsync everysec

# Separate logical databases (optional, for isolation)
# db0: cache (volatile)
# db1: sessions (persistent)
# db2: BullMQ queues (persistent)
```

---

## 7. BullMQ — Job Processing

### 7.1 Role

BullMQ is the asynchronous nervous system of GGH. It decouples services, absorbs traffic spikes, and provides reliable retry semantics for operations that must eventually succeed — especially ERP synchronization.

### 7.2 Queue Registry

| Queue Name | Purpose | Concurrency | Retry | Backoff |
|---|---|---|---|---|
| `erp.sync.inventory` | Pull stock levels from ERPNext → update Medusa | 5 | 3 | Exponential (30s, 120s, 300s) |
| `erp.sync.products` | Pull product data + prices from ERPNext → update Medusa | 2 | 5 | Exponential (30s, 120s, 300s, 600s, 1200s) |
| `erp.sync.customers` | Push customer data from Medusa → ERPNext | 3 | 3 | Linear (60s) |
| `erp.push.order` | Push confirmed order from Medusa → ERPNext as Sales Order | 5 | 5 | Exponential (10s, 30s, 120s, 300s, 600s) |
| `erp.sync.invoice` | Pull invoice/payment data from ERPNext → update Medusa | 3 | 3 | Exponential (60s, 300s, 900s) |
| `order.confirmation` | Send order confirmation email + SMS | 10 | 3 | Linear (30s) |
| `order.shipping` | Send shipping notification with delivery ETA | 10 | 3 | Linear (30s) |
| `notification.sms` | Send SMS (verification, delivery updates) | 20 | 2 | Linear (10s) |
| `notification.email` | Send transactional email | 10 | 3 | Linear (30s) |
| `cache.invalidate` | Purge Redis cache keys + trigger Next.js ISR revalidation | 5 | 2 | Linear (5s) |
| `report.generate` | Generate sales reports, inventory valuation | 1 | 0 | No retry (regenerated on next run) |

### 7.3 Job Lifecycle

```
Enqueued ──► Active ──► Completed
                │
                ├──► Failed ──► Waiting (retry with backoff)
                │                  │
                │                  └──► Failed (max retries) ──► Dead Letter Queue
                │
                └──► Stalled (worker crashed mid-job) ──► Re-queued automatically
```

### 7.4 Dead Letter Queue Handling

| Step | Action |
|---|---|
| 1. Job exceeds max retries | Moved to DLQ automatically by BullMQ |
| 2. Alert fires | PagerDuty notification for critical queues (`erp.push.order`, `order.confirmation`) |
| 3. Engineer reviews | Check `erp_sync_log` for error details |
| 4. Fix and replay | Engineer fixes root cause, then re-queues the job programmatically |
| 5. Verify | Confirm job completes; check downstream system for consistency |

### 7.5 Scheduled Jobs (Cron)

| Queue | Schedule | Job Data |
|---|---|---|
| `erp.sync.inventory` | Every 5 minutes | `{ fullSync: false }` |
| `erp.sync.products` | Every 10 minutes | `{ fullSync: false }` |
| `erp.sync.invoice` | Every 15 minutes | `{}` |
| `report.generate` | Daily at 02:00 UTC | `{ type: "daily_sales" }` |
| `report.generate` | Weekly Monday 03:00 UTC | `{ type: "weekly_inventory_valuation" }` |
| `cache.invalidate` | Daily at 04:00 UTC | `{ keys: ["cache:*"], reason: "nightly_full_purge" }` |

### 7.6 Worker Process Architecture

```
┌──────────────────────────────────────────────────┐
│              BullMQ Worker Process                │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │          Redis Connection Pool              │  │
│  │          (shared across queues)             │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ┌──────────────┐  ┌──────────────┐             │
│  │ ERP Sync     │  │ Order Jobs   │             │
│  │ Processors   │  │ Processors   │             │
│  │ (5 queues)   │  │ (2 queues)   │             │
│  └──────────────┘  └──────────────┘             │
│                                                  │
│  ┌──────────────┐  ┌──────────────┐             │
│  │ Notification │  │ Maintenance  │             │
│  │ Processors   │  │ Processors   │             │
│  │ (3 queues)   │  │ (1 queue)    │             │
│  └──────────────┘  └──────────────┘             │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │  Shared Clients                             │  │
│  │  ├── Medusa Admin API Client                │  │
│  │  ├── ERPNext REST Client                    │  │
│  │  ├── PostgreSQL Connection (audit log)      │  │
│  │  └── Next.js Revalidation Webhook Client    │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

---

## 8. ERPNext — ERP System

### 8.1 Role

ERPNext is the **financial and inventory source of truth**. Medusa holds operational data for the storefront; ERPNext holds the books. When they disagree, ERPNext wins.

### 8.2 ERPNext Modules Used

| Module | What GGH Uses It For |
|---|---|
| **Item Master** | Canonical product definitions: SKU, name (EN/AR), cost price, supplier, unit of measure, item group |
| **Stock Ledger** | Real-time inventory quantities per warehouse (Cairo Central, Giza Hub, 6th October Depot) |
| **Sales Order** | Mirror of every GGH order. Triggers delivery note and invoice creation. |
| **Sales Invoice** | Financial record with VAT calculation. Payment entries reconcile here. |
| **Delivery Note** | Proof of shipment. Used for driver tracking and weight verification. |
| **Purchase Order** | Restocking from suppliers. Triggered when inventory falls below reorder level. |
| **Customer** | B2B customer records with credit terms, payment history, and contact details |
| **Accounts & Finance** | Chart of accounts, general ledger, profit & loss, balance sheet |
| **Supplier** | Supplier master data, lead times, pricing agreements |

### 8.3 ERPNext API Endpoints Consumed

| Endpoint | Method | Used By | Purpose |
|---|---|---|---|
| `/api/resource/Item` | GET | `erp.sync.products` | Fetch product catalog |
| `/api/resource/Item Price` | GET | `erp.sync.products` | Fetch pricing tiers |
| `/api/resource/Item Group` | GET | `erp.sync.products` | Fetch category tree |
| `/api/resource/Stock Ledger Entry` | GET | `erp.sync.inventory` | Fetch inventory levels |
| `/api/resource/Customer` | POST/PUT | `erp.sync.customers` | Create/update customer records |
| `/api/resource/Sales Order` | POST | `erp.push.order` | Create sales order from GGH order |
| `/api/resource/Delivery Note` | GET | `erp.sync.invoice` | Check shipment status |
| `/api/resource/Sales Invoice` | GET | `erp.sync.invoice` | Fetch invoice data |
| `/api/resource/Payment Entry` | GET | `erp.sync.invoice` | Fetch payment status |
| `/api/method/ggh_erp.webhook.order_status` | POST | ERPNext internal | Push order status updates to GGH |

### 8.4 Custom Frappe App: `ggh_erp`

A custom Frappe application installed on the ERPNext instance to provide GGH-specific functionality:

| DocType | Purpose |
|---|---|
| `GGH Order Sync Log` | Tracks every sync attempt between GGH and ERPNext, with timestamps and error details |
| `GGH Delivery Zone` | Maps Egyptian postal codes/areas to delivery zones, synced with Medusa |
| `GGH Pricing Tier` | Custom pricing rules for bulk-break tiers, synced with Medusa |
| `GGH Sync Config` | Configuration for sync intervals, retry policies, and field mappings |

### 8.5 ERPNext Authentication

| Method | Credential | Scope |
|---|---|---|
| **Token Auth** | `api_key` + `api_secret` in headers | Used by BullMQ workers for all API calls |
| **Webhook Secret** | Shared secret in `x-erpnext-webhook-token` header | Used for push notifications from ERPNext → GGH |
| **OAuth (future)** | ERPNext OAuth2 provider | For admin dashboard SSO in Phase 3 |

---

## 9. Docker — Containerization

### 9.1 Container Map

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Environment                        │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────────────┐ │
│  │  ggh-web    │  │ ggh-medusa  │  │  ggh-worker        │ │
│  │  Next.js    │  │ Medusa v2   │  │  BullMQ Worker     │ │
│  │  :3000      │  │ :9000       │  │  (no port exposed) │ │
│  └──────┬──────┘  └──────┬──────┘  └────────┬───────────┘ │
│         │                │                   │              │
│         └────────────────┼───────────────────┘              │
│                          │                                  │
│         ┌────────────────┼────────────────┐                 │
│         ▼                ▼                ▼                 │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────────────┐ │
│  │ PostgreSQL  │  │   Redis     │  │   ERPNext          │ │
│  │   :5432     │  │   :6379     │  │   :8000            │ │
│  └─────────────┘  └─────────────┘  └────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 Docker Compose Configuration

```yaml
version: "3.9"

services:
  # ── Data Layer ──────────────────────────────────────────
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: medusa
      POSTGRES_USER: medusa
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U medusa"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru --appendonly yes --appendfsync everysec
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  # ── Commerce Layer ──────────────────────────────────────
  medusa:
    build:
      context: .
      dockerfile: docker/medusa/Dockerfile
    environment:
      DATABASE_URL: postgres://medusa:${DB_PASSWORD}@postgres:5432/medusa
      REDIS_URL: redis://redis:6379
      MEDUSA_ADMIN_ONBOARDING_EMAIL: ${ADMIN_EMAIL}
      JWT_SECRET: ${JWT_SECRET}
      COOKIE_SECRET: ${COOKIE_SECRET}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    ports:
      - "9000:9000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/health"]
      interval: 10s
      timeout: 5s
      retries: 10
    restart: unless-stopped

  # ── Worker Layer ────────────────────────────────────────
  worker:
    build:
      context: .
      dockerfile: docker/worker/Dockerfile
    environment:
      MEDUSA_URL: http://medusa:9000
      MEDUSA_API_KEY: ${MEDUSA_API_KEY}
      REDIS_URL: redis://redis:6379
      ERP_URL: http://erpnext:8000
      ERP_API_KEY: ${ERP_API_KEY}
      ERP_API_SECRET: ${ERP_API_SECRET}
      DATABASE_URL: postgres://medusa:${DB_PASSWORD}@postgres:5432/medusa
      NEXTJS_URL: http://web:3000
    depends_on:
      medusa:
        condition: service_healthy
      redis:
        condition: service_healthy
      erpnext:
        condition: service_started
    restart: unless-stopped

  # ── Frontend Layer ──────────────────────────────────────
  web:
    build:
      context: .
      dockerfile: docker/nextjs/Dockerfile
    environment:
      MEDUSA_URL: http://medusa:9000
      MEDUSA_PUBLISHABLE_KEY: ${MEDUSA_PUBLISHABLE_KEY}
      MEDUSA_API_KEY: ${MEDUSA_API_KEY}
      REDIS_URL: redis://redis:6379
      ERP_URL: http://erpnext:8000
      SESSION_SECRET: ${SESSION_SECRET}
      WEBHOOK_SECRET: ${WEBHOOK_SECRET}
    depends_on:
      medusa:
        condition: service_healthy
      redis:
        condition: service_healthy
    ports:
      - "3000:3000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  # ── ERP Layer ───────────────────────────────────────────
  erpnext:
    build:
      context: .
      dockerfile: docker/erpnext/Dockerfile
    volumes:
      - erpnext_data:/home/frappe/frappe-bench/sites
    ports:
      - "8000:8000"
    restart: unless-stopped

volumes:
  pg_data:
  redis_data:
  erpnext_data:
```

### 9.3 Development vs. Production

| Aspect | Development | Production |
|---|---|---|
| **Docker Compose file** | `docker-compose.dev.yml` | `docker-compose.yml` |
| **Hot reload** | Next.js: mounted volumes + turbopack; Medusa: mounted volumes; Worker: `bun --hot` | No hot reload; pre-built images |
| **ERPNext** | Optional (mock API with MSW) | Required |
| **Database** | Same PostgreSQL container, seeded with fixtures | Managed PostgreSQL with backups |
| **Redis** | Same container, no persistence | AOF persistence enabled |
| **Logging** | Pretty-print to stdout | Structured JSON to stdout → log aggregator |

---

## 10. Inter-Service Communication

### 10.1 Communication Matrix

| From | To | Protocol | Pattern | When |
|---|---|---|---|---|
| Next.js | Medusa | HTTP REST | Synchronous request-response | Every storefront API call |
| Next.js | Redis | Redis protocol | Synchronous read/write | Session lookup, cache read |
| Medusa | Redis | Redis protocol | Pub/Sub + read/write | Event bus, internal cache |
| Medusa | BullMQ | Redis-backed queue | Async fire-and-forget | Emit event → enqueue job |
| BullMQ Worker | Medusa | HTTP REST (Admin API) | Synchronous request-response | Sync data, update records |
| BullMQ Worker | ERPNext | HTTP REST | Synchronous request-response | Fetch/push ERP data |
| BullMQ Worker | PostgreSQL | SQL | Synchronous write | Audit log entries |
| BullMQ Worker | Next.js | HTTP POST (webhook) | Async fire-and-forget | Trigger ISR revalidation |
| ERPNext | Next.js | HTTP POST (webhook) | Async push notification | Item updated, order status changed |

### 10.2 Communication Patterns Explained

#### Synchronous Request-Response (HTTP REST)

Used when the caller needs an immediate answer to proceed.

```
Next.js ──GET /store/products──► Medusa
         ◄──200 { products }────
```

**Rules:**
- All calls have a timeout (5 seconds for storefront, 30 seconds for worker → ERP)
- All calls are retried once on network error (except user-facing mutations)
- All responses are validated against expected shape before returning to the client

#### Asynchronous Fire-and-Forget (BullMQ)

Used when the operation can be deferred and the caller does not need to wait.

```
Medusa ──emit "order.placed"──► Redis Pub/Sub ──► Subscriber ──► BullMQ.enqueue("erp.push.order", { orderId })
```

**Rules:**
- Every job carries a `jobId` for tracing
- Every job logs start time, end time, and outcome to `erp_sync_log`
- Critical jobs (`erp.push.order`) have 5 retries with exponential backoff
- Non-critical jobs (`cache.invalidate`) have 2 retries with linear backoff

#### Push Notification (Webhook)

Used when ERPNext needs to notify GGH of a change without being asked.

```
ERPNext ──POST /api/webhooks/erpnext──► Next.js ──verify HMAC──► BullMQ.enqueue("erp.sync.*")
```

**Rules:**
- All webhooks are verified via shared secret (`x-erpnext-webhook-token`)
- Webhook handlers return 200 immediately, then enqueue a job
- No business logic in webhook handlers — they are thin intake pipes

---

## 11. Data Flow

### 11.1 Product Browsing (Read Path — User Facing)

This is the most frequent flow. It must be fast, cached, and render server-side.

```
User's Browser
    │
    │  GET /categories/rice-grains
    │
    ▼
Next.js Server (RSC or Route Handler)
    │
    ├─── Check Next.js Data Cache (tag: "products:rice-grains")
    │         │
    │         ├── HIT ──► Return cached HTML/JSON (0ms latency)
    │         │
    │         └── MISS ──► Continue
    │
    ├─── Check Redis Cache (key: "cache:products:category:rice-grains")
    │         │
    │         ├── HIT ──► Return cached data → render → store in Data Cache
    │         │
    │         └── MISS ──► Continue
    │
    └─── Call Medusa Store API
              │
              │  GET /store/products?category_id=cat_rice&limit=20
              │
              ▼
         Medusa
              │
              ├── Query PostgreSQL (product + variant + price tables)
              ├── Calculate wholesale price for current customer group
              ├── Check inventory levels
              └── Return product list
              │
              ▼
         Next.js
              ├── Store in Redis cache (TTL: 300s)
              ├── Store in Next.js Data Cache (revalidate: 60s)
              ├── Render HTML (SSR)
              └── Return to browser
              │
              ▼
         Browser
              ├── Display page instantly (SSR)
              ├── Hydrate interactive elements (quantity stepper, add-to-cart)
              └── TanStack Query takes over for subsequent navigations (SWR)
```

**Total latency target:**
- Cache hit: < 50ms
- Cache miss: < 300ms
- Cold start (no cache anywhere): < 500ms

### 11.2 Product Sync (Write Path — ERP → Medusa)

This flow keeps Medusa's product data aligned with ERPNext's Item Master.

```
Trigger (one of):
  a) ERPNext webhook: Item updated
  b) Cron: every 10 minutes
  c) Manual: admin dashboard "Sync Now" button
    │
    ▼
BullMQ: erp.sync.products
    │
    ▼
Worker Processor: sync-products
    │
    ├── 1. Fetch modified items from ERPNext
    │      GET /api/resource/Item?filters=[["modified", ">", "{last_cursor}"]]
    │      GET /api/resource/Item Price?filters=[["item_code", "in", [...item_codes]]]
    │
    ├── 2. Transform each ERP Item → Medusa Product DTO
    │      {
    │        erp_item_code: "RICE-BASMATI-5KG",
    │        title_en: "Basmati Rice 5kg",
    │        title_ar: "أرز بسمتي ٥ كيلو",
    │        sku: "RICE-BASMATI-5KG",
    │        category: "Rice & Grains",      // mapped from Item Group
    │        variants: [
    │          { sku: "RICE-BASMATI-5KG", weight: 5, unit: "kg",
    │            prices: { retail: 125, wholesale: 110, bulk: 100 } }
    │        ]
    │      }
    │
    ├── 3. Upsert into Medusa via Admin API
    │      POST /admin/products (if new)
    │      POST /admin/products/:id (if existing)
    │      POST /admin/price-lists/:id/prices (update wholesale tiers)
    │
    ├── 4. Update sync cursor in Redis
    │      SET cache:erp:sync_cursor:products "<latest_modified_timestamp>"
    │
    ├── 5. Log result to PostgreSQL
    │      INSERT INTO ggh.erp_sync_log (entity_type, entity_id, direction, status, ...)
    │
    └── 6. Enqueue cache invalidation
           BullMQ: cache.invalidate { keys: ["cache:products:*", "cache:categories:*"] }
```

### 11.3 Inventory Sync (Write Path — ERP → Medusa)

```
Trigger: Cron every 5 minutes
    │
    ▼
BullMQ: erp.sync.inventory
    │
    ▼
Worker Processor: sync-inventory
    │
    ├── 1. Fetch stock levels from ERPNext
    │      GET /api/resource/Stock Ledger Entry
    │        ?filters=[["warehouse","in",["Cairo Central","Giza Hub"]],
    │                   ["item_code","in",<active_items>]]
    │
    ├── 2. For each item, calculate available quantity
    │      available = actual_qty - reserved_qty - ordered_qty
    │
    ├── 3. Update Medusa inventory
    │      POST /admin/inventory-items/:id/stock-location/:locationId
    │        { stocked_quantity: <available> }
    │
    ├── 4. Update Redis cache
    │      SET cache:inventory:<variantId> '{"available":150,"reserved":12}'
    │
    ├── 5. If quantity changed from >0 to 0, mark variant as "out_of_stock"
    │      If quantity changed from 0 to >0, mark variant as "in_stock"
    │
    └── 6. Enqueue cache invalidation
           BullMQ: cache.invalidate { keys: ["cache:inventory:*", "cache:products:*"] }
```

### 11.4 Order Placement (Write Path — User → Medusa → ERP)

This is the most critical write flow. It must be reliable, idempotent, and auditable.

```
User clicks "Complete Order"
    │
    ▼
Browser ──POST /api/checkout/complete──► Next.js API Route
    │
    ├── 1. Validate input (Zod schema)
    │      { cartId, shippingMethodId, paymentMethodId, deliverySlotId }
    │
    ├── 2. Check minimum order value
    │      B2C: ≥ EGP 500 | B2B: ≥ EGP 2,000
    │
    ├── 3. Verify delivery slot availability
    │      SELECT current_orders FROM ggh.delivery_slot WHERE id = :slotId
    │      IF current_orders >= max_orders → return 409 Conflict
    │
    ├── 4. Call Medusa: complete cart
    │      POST /store/carts/:cartId/complete-cart
    │      (Medusa handles: inventory reservation, payment capture, order creation)
    │
    ├── 5. Increment delivery slot order count
    │      UPDATE ggh.delivery_slot SET current_orders = current_orders + 1
    │
    ├── 6. Return order confirmation to browser
    │      { orderId, orderNumber, estimatedDelivery, summary }
    │
    └── 7. Medusa emits "order.placed" event
              │
              ▼
         Medusa Subscriber
              │
              ├── Enqueue BullMQ: erp.push.order { orderId }
              └── Enqueue BullMQ: order.confirmation { orderId }
```

### 11.5 Order → ERP Push (Critical Async Flow)

```
BullMQ: erp.push.order
    │
    ▼
Worker Processor: push-order
    │
    ├── 1. Fetch order from Medusa Admin API
    │      GET /admin/orders/:orderId
    │
    ├── 2. Transform → ERPNext Sales Order DTO
    │      {
    │        customer: "CUST-001",
    │        items: [
    │          { item_code: "RICE-BASMATI-5KG", qty: 5, rate: 110.00 },
    │          { item_code: "OIL-SUNFLOWER-1L", qty: 3, rate: 65.00 }
    │        ],
    │        delivery_date: "2026-07-22",
    │        ggh_order_id: "order_01JXY..."
    │      }
    │
    ├── 3. Create Sales Order in ERPNext
    │      POST /api/resource/Sales Order
    │
    ├── 4. On success:
    │      a. Store ERP Sales Order ID on Medusa order metadata
    │      b. Log success to ggh.erp_sync_log
    │      c. Enqueue cache.invalidate for order-related caches
    │
    └── 5. On failure:
           a. Log error to ggh.erp_sync_log
           b. BullMQ retries with exponential backoff
           c. After 5 failures: move to dead letter queue → alert
```

### 11.6 Cache Invalidation Flow

```
BullMQ: cache.invalidate { keys: ["cache:products:*", "cache:categories:*"] }
    │
    ▼
Worker Processor: cache-invalidate
    │
    ├── 1. Delete matching Redis keys
    │      SCAN for keys matching pattern → DEL each key
    │
    ├── 2. Trigger Next.js ISR revalidation
    │      POST http://web:3000/api/webhooks/revalidate
    │        { tags: ["products", "categories"], secret: WEBHOOK_SECRET }
    │
    └── 3. Next.js revalidation handler
              │
              ├── revalidateTag("products")
              ├── revalidateTag("categories")
              └── Return 200
```

### 11.7 Customer Registration Flow

```
Browser ──POST /api/auth/register──► Next.js API Route
    │
    ├── 1. Validate input
    │      { name, email, phone, password, type: "retail"|"wholesale" }
    │
    ├── 2. Create customer in Medusa
    │      POST /store/customers
    │
    ├── 3. If type === "wholesale":
    │      Set customer_group to "wholesale-pending"
    │      (Admin must verify business documents before upgrading to "wholesale-verified")
    │
    ├── 4. Create session
    │      SET sess:<id> { customerId, locale, customerGroup }
    │
    ├── 5. Medusa emits "customer.created"
    │      → BullMQ: erp.sync.customers
    │
    └── 6. Return { customer, session }
              │
              ▼
         Worker: sync-customers
              │
              ├── Fetch customer from Medusa
              ├── Transform → ERPNext Customer DTO
              └── POST /api/resource/Customer in ERPNext
```

---

## 12. Failure Modes & Degradation

### 12.1 Failure Impact Matrix

| What Fails | User Impact | Automatic Recovery | Manual Action |
|---|---|---|---|
| **PostgreSQL** | Complete outage. No product browsing, no checkout. | Container restart with health check. If data corrupted, restore from backup. | Monitor pg_isready. Restore from daily backup if corruption detected. |
| **Redis** | No sessions (users logged out). No cache (slower page loads). No job processing (ERP sync stops). | Container restart. AOF replay on startup. | Monitor memory usage. Scale if OOM persists. |
| **Medusa** | No product data, no cart, no checkout. Homepage shows cached content (ISR), but interactions fail. | Container restart with health check. | Check Medusa logs. Verify DB connectivity. |
| **BullMQ Worker** | ERP sync stops. Orders still placed in Medusa but not pushed to ERP. Notifications not sent. | Container restart. Jobs resume from queue. | Check dead letter queue. Manually re-queue failed jobs. |
| **ERPNext** | No inventory updates from ERP. Product sync jobs fail and retry. Orders cannot be pushed to ERP (queue builds). | Container restart (slow, ~60s). | Check ERPNext logs. If prolonged, pause sync jobs to prevent queue buildup. |
| **Next.js** | 502 Bad Gateway. No storefront. | Container restart with health check. | Check build logs. Verify upstream connectivity. |

### 12.2 Degradation Strategy

The system degrades gracefully, not catastrophically:

| Scenario | Behavior |
|---|---|
| **ERPNext is down** | Products display with last-known prices and inventory. Orders are accepted and queued for ERP push when ERPNext recovers. A banner reads: "Prices may be slightly delayed. Confirmed at checkout." |
| **Redis is down** | Sessions fall back to JWT tokens in cookies (stateless mode). Caching disabled — all reads hit Medusa directly (slower but functional). Job processing paused until Redis recovers. |
| **Medusa is down** | Homepage and category pages serve from ISR cache (stale but visible). Cart and checkout are unavailable. Error page: "We're experiencing issues. Please try again in a few minutes." |
| **Worker is down** | All frontend operations work normally. ERP sync accumulates as scheduled jobs in Redis queue. Workers process backlog when they restart. |
| **PostgreSQL is down** | Complete outage. Medusa cannot function without its database. Redis-served pages may still render if cached. |

### 12.3 Data Consistency Guarantees

| Scenario | Guarantee | Resolution |
|---|---|---|
| Order placed in Medusa but not pushed to ERP | **At-least-once delivery**. The `erp.push.order` job retries until it succeeds. The order will eventually appear in ERP. | Monitor dead letter queue. Manual replay if needed. |
| Product price updated in ERP but not synced to Medusa | **Eventually consistent**. Max staleness: 10 minutes (sync interval). | Acceptable for display. Price confirmed at checkout from live Medusa data. |
| Inventory shows 5 units in Medusa but ERP says 0 | **ERP wins**. On next sync cycle, Medusa inventory will be corrected. If an order was placed against stale inventory, Medusa's reservation system will flag the oversell. | Customer service contacts the customer. Offer alternative or refund. |
| Customer updates profile in GGH but ERP shows old data | **Eventually consistent**. Max staleness: until next `erp.sync.customers` job runs (event-driven, near-immediate). | Acceptable for non-financial data. Accounting uses ERP's copy. |

---

## 13. Security Boundaries

### 13.1 Network Topology

```
┌─────────────────────────────────────────────────────┐
│                  PUBLIC INTERNET                     │
│                                                     │
│   Browser ──HTTPS──► :443 (Nginx/Caddy)             │
│                          │                          │
└──────────────────────────┼──────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────┐
│                  DMZ (Port 3000 only)                │
│                          │                          │
│                    Next.js Web                       │
│                          │                          │
└──────────────────────────┼──────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────┐
│              INTERNAL NETWORK                        │
│              (no external access)                    │
│                                                     │
│   Next.js ──────► Medusa (:9000)                    │
│   Next.js ──────► Redis (:6379)                     │
│   Worker  ──────► Medusa (:9000)                    │
│   Worker  ──────► ERPNext (:8000)                   │
│   Worker  ──────► PostgreSQL (:5432)                │
│   Worker  ──────► Redis (:6379)                     │
│   Medusa  ──────► PostgreSQL (:5432)                │
│   Medusa  ──────► Redis (:6379)                     │
│   ERPNext ──────► Next.js (:3000) [webhook only]    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 13.2 Authentication Between Services

| Caller | Target | Auth Method |
|---|---|---|
| Browser | Next.js | Session cookie (`__ggh_sess`) |
| Next.js | Medusa Store API | Publishable API key (`x-publishable-api-key` header) + customer JWT (when authenticated) |
| Next.js | Medusa Admin API | Admin API key (`x-publishable-api-key` header) |
| BullMQ Worker | Medusa Admin API | Admin API key |
| BullMQ Worker | ERPNext | `api_key` + `api_secret` in request headers |
| ERPNext | Next.js | Shared webhook secret (`x-erpnext-webhook-token`) |
| Medusa | Next.js | HMAC-SHA256 signature (`x-medusa-signature`) |

### 13.3 Data Protection Rules

| Rule | Implementation |
|---|---|
| **No PII in logs** | Customer names, emails, and phone numbers are never logged. Use customer IDs only. |
| **No PII in cache** | Redis cache keys contain entity IDs, not personal data. Session objects are encrypted. |
| **No backend URLs in the browser** | The browser only talks to Next.js `/api/*`. Medusa and ERPNext URLs are never exposed in client-side code or network requests. |
| **All internal traffic over HTTP** | Within the Docker network, services communicate over plain HTTP. The TLS termination happens at the reverse proxy (Nginx/Caddy) at the edge. |
| **Secrets in environment variables only** | API keys, database passwords, and webhook secrets are injected via environment variables. Never committed to code. |
| **Rate limiting** | API routes enforce per-IP and per-session rate limits. 100 requests/minute for browsing, 10 requests/minute for checkout. |

---

## 14. Architectural Decision Records

### ADR-001: Monorepo with Turborepo

**Context:** The frontend, worker, Medusa extensions, and shared types need to be developed, tested, and deployed together.

**Decision:** Use a Turborepo monorepo with three apps (`web`, `worker`, `medusa`) and one shared package (`@ggh/shared`).

**Consequences:**
- (+) Atomic commits across service boundaries. A type change in `@ggh/shared` is immediately reflected in both the frontend and the worker.
- (+) Single CI pipeline. One `turbo lint` and `turbo test` command validates everything.
- (-) Larger repository. Clone time is longer. CI runs take longer.
- (-) Tighter coupling. Teams must coordinate releases.

**Accepted because:** The team is small (≤8 developers). The coupling benefit outweighs the independence benefit at this scale.

### ADR-002: Redis for Everything (Cache + Sessions + Queues)

**Context:** We need a cache, a session store, and a job queue. These could be three separate systems.

**Decision:** Use Redis for all three, with key prefix separation.

**Consequences:**
- (+) One operational dependency instead of three.
- (+) BullMQ is built on Redis natively — no adapter layer.
- (-) Memory pressure on one system affects all three.
- (-) A Redis outage is catastrophic (mitigated by AOF persistence and health checks).

**Accepted because:** Operational simplicity at the current scale. If Redis becomes a bottleneck, we can split into separate instances without changing application code (just change the connection URL per function).

### ADR-003: ERPNext as Source of Truth for Inventory and Pricing

**Context:** Both Medusa and ERPNext can store product prices and inventory levels.

**Decision:** ERPNext is the authoritative source. Medusa holds an operational copy that is periodically synced.

**Consequences:**
- (+) Financial reports always match the commerce system (single source of truth).
- (+) The finance team manages pricing in ERPNext (their tool) without learning Medusa.
- (-) Stale data in Medusa (up to 10 minutes for products, 5 minutes for inventory).
- (-) Complex sync logic with conflict resolution.

**Accepted because:** Accounting integrity is non-negotiable for a business handling real money in Egypt. Staleness is acceptable because the checkout flow re-validates pricing and inventory against the latest data.

### ADR-004: Next.js API Routes as BFF (Not a Separate API Gateway)

**Context:** We need a layer between the browser and Medusa/ERPNext for auth, validation, and response transformation.

**Decision:** Use Next.js API route handlers as the BFF layer. No separate API gateway service (no Kong, no Express gateway).

**Consequences:**
- (+) One less service to deploy, monitor, and debug.
- (+) Frontend and BFF share TypeScript types and utilities directly.
- (+) SSR and API routes are in the same deployment unit — no CORS issues.
- (-) Rate limiting and request logging must be implemented in Next.js middleware (less mature than dedicated gateway solutions).
- (-) Scaling the BFF means scaling the entire Next.js instance.

**Accepted because:** The overhead of a separate gateway does not justify itself at current scale. Next.js middleware + API routes handle rate limiting, logging, and validation adequately. We can extract a gateway later if needed.

### ADR-005: BullMQ Over Direct Medusa Subscribers for Critical Operations

**Context:** Medusa has a built-in subscriber system that can execute code when events fire.

**Decision:** Medusa subscribers only enqueue BullMQ jobs. All business logic (ERP sync, notifications) runs in BullMQ processors, not in Medusa subscribers.

**Consequences:**
- (+) Job retries, backoff, and dead-letter handling come free from BullMQ.
- (+) Medusa stays lightweight — it serves API requests, not background jobs.
- (+) Job monitoring via BullBoard dashboard.
- (-) Additional latency: event → subscriber → enqueue → processor (vs. event → subscriber → done).
- (-) Redis dependency for all async operations.

**Accepted because:** Reliability > latency for ERP sync and notifications. A 2-second delay in sending an order confirmation is acceptable. A lost order confirmation is not.

---

*This document is maintained by the GGH engineering team. For proposed changes, open a PR against `docs/02_Architecture.md` and tag `@ggh/arch-reviewers`.*

*Last updated: July 2026*
