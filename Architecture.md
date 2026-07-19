# GGH — Gomla Go Home Architecture

> **جملة لحد البيت** — Wholesale grocery marketplace for Egyptian households. Buy household food staples at wholesale prices with home delivery across Egypt.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Principles](#2-architecture-principles)
3. [Service Responsibilities](#3-service-responsibilities)
4. [Folder Structure & Responsibilities](#4-folder-structure--responsibilities)
5. [Data Flow](#5-data-flow)
6. [Authentication & Authorization Flow](#6-authentication--authorization-flow)
7. [Order Flow](#7-order-flow)
8. [ERP Synchronization](#8-erp-synchronization)
9. [Infrastructure & Deployment](#9-infrastructure--deployment)
10. [Observability & Monitoring](#10-observability--monitoring)
11. [Future Scalability](#11-future-scalability)
12. [Glossary](#12-glossary)

---

## 1. System Overview

GGH is a wholesale grocery marketplace operating in a B2B and B2C model serving Egyptian households and small businesses. The platform enables customers to purchase household staples—rice, pasta, flour, sugar, oil, ghee, beans, lentils, tea, coffee, spices, tomato paste, canned foods, frozen food, cleaning products, paper products, and other household essentials—at wholesale quantities with home delivery.

The system follows a **service-oriented architecture** composed of four primary services orchestrated through Docker, communicating via REST APIs, message queues, and shared event buses.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │   Web App (SSR)  │  │  Mobile (Future) │  │  Admin Dashboard │  │
│  │  Next.js 15 RSC  │  │   React Native   │  │   Medusa Admin   │  │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘  │
└───────────┼──────────────────────┼──────────────────────┼───────────┘
            │                      │                      │
            ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY                                 │
│              Next.js API Routes (Route Handlers)                    │
│         Rate Limiting · Input Validation · CSRF Protection          │
└───────────┬──────────────────────────┬─────────────────┬───────────┘
            │                          │                 │
            ▼                          ▼                 ▼
┌───────────────────┐  ┌───────────────────────┐  ┌──────────────────┐
│   MEDUSA v2       │  │      BULLMQ WORKER    │  │    ERPNext       │
│   (Core Engine)   │  │   (Background Jobs)   │  │   (ERP System)   │
│                   │  │                       │  │                  │
│ • Product Catalog │  │ • Order processing    │  │ • Accounting     │
│ • Cart & Pricing  │  │ • ERP sync jobs       │  │ • Inventory Mgmt │
│ • Order Mgmt      │  │ • Notification jobs   │  │ • Purchasing     │
│ • Customer Mgmt   │  │ • Report generation   │  │ • HR & Payroll   │
│ • Payment Mgmt    │  │ • Cache invalidation  │  │ • CRM            │
│ • Shipping Mgmt   │  │ • Index rebuilds      │  │ • Supply Chain   │
└───────┬───────────┘  └───────────┬───────────┘  └────────┬─────────┘
        │                          │                        │
        ▼                          ▼                        ▼
┌───────────────────┐  ┌───────────────────────┐  ┌──────────────────┐
│   PostgreSQL      │  │       Redis           │  │  MariaDB/Postgres│
│   (Primary DB)    │  │   (Cache · Queue ·    │  │  (ERP DB)        │
│                   │  │    Session Store)      │  │                  │
└───────────────────┘  └───────────────────────┘  └──────────────────┘
```

### High-Level Data Boundary

| Service | Owns Data | Reads From | Writes To |
|---|---|---|---|
| **Next.js Frontend** | UI state, SSR cache | Medusa API, Redis | Redis (session), Medusa API |
| **Medusa v2** | Products, Orders, Customers, Payments, Shipping | PostgreSQL, Redis | PostgreSQL, Redis, BullMQ |
| **BullMQ Worker** | Job state, audit logs | PostgreSQL, Redis, ERPNext | PostgreSQL, Redis, ERPNext |
| **ERPNext** | Accounting, procurement, inventory ledger | Owns DB | Owns DB, REST webhooks |

---

## 2. Architecture Principles

| Principle | Application |
|---|---|
| **Separation of Concerns** | Each service owns a bounded context. Medusa owns commerce data; ERPNext owns financial/inventory truth; BullMQ owns async orchestration. |
| **Event-Driven Integration** | Services communicate asynchronously through BullMQ queues. Synchronous REST calls are limited to read paths and critical writes. |
| **ERP as Source of Truth** | For inventory quantities, cost prices, and accounting entries, ERPNext is the authoritative system. Medusa holds operational copies. |
| **Progressive Enhancement** | The frontend must render server-side first. Client-side JavaScript enhances interactivity but is not required for core browsing. |
| **Bilingual-First** | Every user-facing string flows through the i18n layer. RTL layout support is a first-class concern, not an afterthought. |
| **Wholesale Semantics** | The data model reflects wholesale operations: bulk pricing tiers, case-pack quantities, minimum order values, delivery zones—not retail unit sales. |
| **Fail-Safe Defaults** | If ERP sync fails, the system degrades gracefully: products remain visible with last-known pricing, orders queue for later reconciliation. |
| **Zero Trust Network** | All inter-service calls authenticate via service tokens. No implicit trust based on network proximity. |

---

## 3. Service Responsibilities

### 3.1 Next.js 15 Frontend (Port 3000)

**Role:** Server-rendered web application, API gateway, and BFF (Backend-for-Frontend) layer.

| Responsibility | Detail |
|---|---|
| **Server-Side Rendering** | Product pages, category listings, and marketing content render via React 19 Server Components for SEO and initial load performance. |
| **API Route Handlers** | All client-to-backend requests route through `/api/*` handlers. These validate input, attach service tokens, and proxy to Medusa or ERPNext. No backend URL is exposed to the browser. |
| **Internationalization** | EN/AR locale resolution via `next-intl`. RTL/LTR direction applied at the `<html>` level. Translation files managed per-namespace. |
| **Session Management** | Customer sessions stored in Redis via `ioredis` store adapter. Cart IDs, auth tokens, and locale preferences persisted in encrypted cookies. |
| **Image Optimization** | Product images served through `next/image` with automatic WebP/AVIF conversion, responsive `srcset`, and lazy loading. |
| **Caching** | Full Route Cache for static pages, ISR for product/category pages with on-demand revalidation via Medusa webhooks. |
| **CSRF & Security** | CSRF tokens on state-mutating requests, `Content-Security-Policy` headers, strict `SameSite` cookie policy. |

### 3.2 Medusa v2 (Port 9000)

**Role:** Core commerce engine. Owns the product catalog, cart lifecycle, order management, customer identity, and payment/shipping orchestration.

| Module | Responsibility |
|---|---|
| **Product Module** | Product definitions, variants (pack sizes: 500g, 1kg, 5kg, 25kg), categories, collections, tags, and wholesale pricing tiers. |
| **Pricing Module** | Tiered pricing rules: retail price, wholesale price, bulk-break thresholds (e.g., 10+ units, 50+ units, case price). Price lists per customer group. |
| **Cart Module** | Cart creation, line item management, quantity validation against minimum order values, shipping method selection, discount application. |
| **Order Module** | Order placement, status transitions (pending → confirmed → picked → shipped → delivered), cancellations, returns, and refund orchestration. |
| **Customer Module** | Registration, authentication delegation, address book, order history, customer groups (B2B vs. B2C), wholesale account verification. |
| **Payment Module** | Payment session management, provider integration (cash on delivery, Fawry, Paymob, Instapay), payment capture, and refund processing. |
| **Shipping Module** | Delivery zone configuration (Cairo zones, Giza, national), shipping rate calculation based on order weight/zone, fulfillment provider integration. |
| **Inventory Module** | Stock reservation on order placement, availability checks, stock level display (synced from ERPNext via BullMQ). |
| **Notification Module** | Email and SMS dispatch templates (order confirmation, shipping updates, delivery ETA). Integrates with Twilio/WhatsApp Business API. |
| **API Extension** | Custom endpoints under `/store/custom/*` for wholesale-specific flows: bulk order templates, quick-reorder, and subscription scheduling. |

### 3.3 BullMQ Worker (Port 3001 — metrics only; primary loop is process-based)

**Role:** Asynchronous job processing, inter-service orchestration, and scheduled tasks.

| Queue | Jobs | Concurrency | Retry Policy |
|---|---|---|---|
| `erp.sync.inventory` | Pull inventory levels from ERPNext every 5 min; on-demand after purchase orders are received | 5 | Exponential backoff, 3 retries, 30s initial delay |
| `erp.sync.products` | Sync product definitions, cost prices, and category changes from ERPNext | 2 | Exponential backoff, 5 retries |
| `erp.sync.customers` | Push new/updated customer records to ERPNext as Customers/Leads | 3 | Linear, 3 retries, 60s delay |
| `erp.push.order` | Push confirmed orders to ERPNext as Sales Orders | 5 | Exponential backoff, 5 retries, critical queue |
| `erp.sync.invoice` | Pull Sales Invoices from ERPNext and update order payment status | 3 | Exponential backoff, 3 retries |
| `order.confirmation` | Send order confirmation email + SMS after order placement | 10 | Linear, 3 retries |
| `order.shipment` | Send shipping notification with tracking info | 10 | Linear, 3 retries |
| `notification.sms` | Generic SMS dispatch (verification codes, delivery ETA) | 20 | Linear, 2 retries |
| `report.generate` | Generate daily/weekly sales reports, inventory valuation | 1 | No retry (next run regenerates) |
| `cache.invalidate` | Purge specific Redis keys and trigger Next.js ISR revalidation | 5 | Linear, 2 retries |
| `index.rebuild` | Rebuild product search index after bulk product updates | 1 | No retry |

**Dead Letter Handling:** Failed jobs after max retries move to a dead-letter queue monitored by an alerting pipeline. On-call engineers receive PagerDuty notifications for critical queues (`erp.push.order`, `order.confirmation`).

### 3.4 ERPNext (Port 8000)

**Role:** Enterprise resource planning. Authoritative system for financial accounting, procurement, and inventory valuation.

| Module | Responsibility |
|---|---|
| **Item Master** | Canonical product definitions with SKU codes, cost prices, supplier references, and UOM conversions. GGH reads these; ERPNext is the source. |
| **Stock Ledger** | Real-time inventory quantities per warehouse (Cairo Central, Giza Hub, 6th October Depot). Stock entries, stock transfers, and stock reconciliation. |
| **Sales Order** | Mirrors GGH orders. Created by the `erp.push.order` worker. Triggers delivery note and sales invoice creation. |
| **Sales Invoice** | Financial record of sales. Payment entries reconcile against this. GST/VAT calculations applied here. |
| **Purchase Order** | Procurement workflow for restocking. Generated when inventory falls below reorder levels. |
| **Supplier Portal** | Supplier quotation management, lead time tracking, and purchase receipt processing. |
| **Accounts & Finance** | Chart of accounts, general ledger, profit & loss, balance sheet. All financial reporting originates here. |
| **CRM** | Customer acquisition pipeline for B2B wholesale accounts: lead → opportunity → quotation → sales order. |

---

## 4. Folder Structure & Responsibilities

```
ggh-platform/
├── apps/
│   ├── web/                          # Next.js 15 Frontend
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (shop)/           # Public storefront route group
│   │   │   │   │   ├── page.tsx      # Homepage
│   │   │   │   │   ├── categories/
│   │   │   │   │   │   └── [slug]/
│   │   │   │   │   │       └── page.tsx
│   │   │   │   │   ├── products/
│   │   │   │   │   │   └── [handle]/
│   │   │   │   │   │       └── page.tsx
│   │   │   │   │   ├── cart/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── checkout/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── account/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── layout.tsx    # Shop layout with header/footer
│   │   │   │   ├── (auth)/           # Auth route group
│   │   │   │   │   ├── login/
│   │   │   │   │   ├── register/
│   │   │   │   │   └── layout.tsx
│   │   │   │   ├── api/              # Route handlers (BFF)
│   │   │   │   │   ├── auth/
│   │   │   │   │   ├── cart/
│   │   │   │   │   ├── products/
│   │   │   │   │   ├── orders/
│   │   │   │   │   ├── erp/
│   │   │   │   │   └── webhooks/     # Medusa & ERPNext webhooks
│   │   │   │   ├── layout.tsx        # Root layout (providers, fonts)
│   │   │   │   └── globals.css
│   │   │   ├── components/
│   │   │   │   ├── ui/               # shadcn/ui primitives
│   │   │   │   ├── common/           # Shared: Header, Footer, Logo
│   │   │   │   ├── product/          # ProductCard, ProductGrid, QuickAdd
│   │   │   │   ├── cart/             # CartSlideOut, CartItem, CartSummary
│   │   │   │   ├── checkout/         # CheckoutForm, DeliverySlots, PaymentSelect
│   │   │   │   ├── category/         # CategoryGrid, CategoryHero
│   │   │   │   ├── deal/             # HotDeals, CountdownTimer, DealBadge
│   │   │   │   └── search/           # SearchBar, SearchResults, SuggestionList
│   │   │   ├── hooks/                # Custom React hooks
│   │   │   │   ├── use-cart.ts
│   │   │   │   ├── use-auth.ts
│   │   │   │   ├── use-locale.ts
│   │   │   │   └── use-debounce.ts
│   │   │   ├── lib/
│   │   │   │   ├── medusa/           # Medusa SDK client wrapper
│   │   │   │   ├── erp/              # ERPNext API client wrapper
│   │   │   │   ├── redis/            # Redis connection & helpers
│   │   │   │   ├── i18n/             # Locale config, translation loader
│   │   │   │   ├── utils/            # Formatting (EGP currency, dates)
│   │   │   │   └── validators/       # Zod schemas for API input
│   │   │   ├── store/                # Zustand stores
│   │   │   │   ├── cart-store.ts
│   │   │   │   ├── ui-store.ts
│   │   │   │   └── auth-store.ts
│   │   │   └── types/                # Shared TypeScript types
│   │   │       ├── product.ts
│   │   │       ├── order.ts
│   │   │       ├── cart.ts
│   │   │       └── customer.ts
│   │   ├── messages/                 # next-intl translation files
│   │   │   ├── en.json
│   │   │   └── ar.json
│   │   ├── public/                   # Static assets
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── worker/                       # BullMQ Worker Process
│       ├── src/
│       │   ├── queues/               # Queue definitions & configs
│       │   │   ├── erp-sync.ts
│       │   │   ├── order-jobs.ts
│       │   │   ├── notifications.ts
│       │   │   └── reports.ts
│       │   ├── processors/           # Job handler functions
│       │   │   ├── erp/
│       │   │   │   ├── sync-inventory.ts
│       │   │   │   ├── sync-products.ts
│       │   │   │   ├── push-order.ts
│       │   │   │   └── sync-invoice.ts
│       │   │   ├── orders/
│       │   │   │   ├── send-confirmation.ts
│       │   │   │   └── send-shipping.ts
│       │   │   └── notifications/
│       │   │       ├── send-sms.ts
│       │   │       └── send-email.ts
│       │   ├── clients/
│       │   │   ├── medusa.ts         # Medusa admin API client
│       │   │   └── erpnext.ts        # ERPNext REST client
│       │   ├── lib/
│       │   │   ├── redis.ts          # BullMQ Redis connection
│       │   │   ├── logger.ts         # Structured JSON logger
│       │   │   └── metrics.ts        # Prometheus counters/histograms
│       │   └── index.ts              # Worker entry point
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   ├── medusa/                       # Medusa v2 project
│   │   ├── src/
│   │   │   ├── api/                  # Custom API routes
│   │   │   │   ├── store/
│   │   │   │   │   └── custom/       # Wholesale endpoints
│   │   │   │   └── admin/
│   │   │   │       └── custom/       # Admin extensions
│   │   │   ├── modules/              # Custom Medusa modules
│   │   │   │   ├── wholesale/        # Bulk pricing, MOQ logic
│   │   │   │   ├── delivery-zones/   # Cairo/Giza zone management
│   │   │   │   └── subscription/     # Recurring order scheduling
│   │   │   ├── subscribers/          # Event subscribers
│   │   │   │   ├── order-placed.ts
│   │   │   │   └── payment-captured.ts
│   │   │   ├── workflows/            # Medusa workflows
│   │   │   │   ├── create-wholesale-order.ts
│   │   │   │   ├── validate-inventory-erp.ts
│   │   │   │   └── apply-bulk-pricing.ts
│   │   │   └── loaders/              # Startup loaders
│   │   ├── medusa-config.ts
│   │   └── package.json
│   │
│   └── shared/                       # Shared types & utilities
│       ├── src/
│       │   ├── types/                # Shared TypeScript interfaces
│       │   │   ├── product.ts
│       │   │   ├── order.ts
│       │   │   ├── erp.ts
│       │   │   └── events.ts         # Event name constants
│       │   ├── constants/            # Shared constants
│       │   │   ├── queues.ts         # Queue name registry
│       │   │   ├── currency.ts
│       │   │   └── locales.ts
│       │   └── utils/                # Pure utility functions
│       │       ├── pricing.ts        # Wholesale price calculation
│       │       ├── formatting.ts     # EGP formatting, date locales
│       │       └── validation.ts     # Shared Zod schemas
│       └── package.json
│
├── erpnext/                          # ERPNext configuration
│   ├── custom_apps/                  # Custom Frappe apps
│   │   └── ggh_erp/                 # GGH-specific ERPNext app
│   │       ├── ggh_erp/
│   │       │   ├── doctype/
│   │       │   │   ├── ggh_delivery_zone/
│   │       │   │   ├── ggh_order_sync_log/
│   │       │   │   └── ggh_pricing_tier/
│   │       │   ├── api/
│   │       │   │   └── sync_endpoints.py
│   │       │   └── hooks.py
│   │       └── setup.py
│   └── sites/                        # Frappe site config
│       └── ggh/
│           └── site_config.json
│
├── docker/
│   ├── docker-compose.yml            # Production compose
│   ├── docker-compose.dev.yml        # Development compose
│   ├── nextjs/
│   │   └── Dockerfile
│   ├── medusa/
│   │   └── Dockerfile
│   ├── worker/
│   │   └── Dockerfile
│   └── erpnext/
│       └── Dockerfile
│
├── infra/                            # Infrastructure as Code
│   ├── nginx/
│   │   └── nginx.conf
│   ├── scripts/
│   │   ├── seed-products.sh
│   │   └── sync-erp-initial.sh
│   └── migrations/
│       └── medusa/
│
├── docs/
│   ├── architecture.md               # This file
│   ├── runbooks/
│   │   ├── erp-sync-failure.md
│   │   ├── order-stuck-pending.md
│   │   └── redis-memory-pressure.md
│   └── api/
│       ├── storefront-api.md
│       └── erp-sync-api.md
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── deploy-staging.yml
│       └── deploy-production.yml
│
├── turbo.json                        # Turborepo config
├── package.json                      # Workspace root
└── README.md
```

### Key Folder Rationale

| Directory | Why It Exists |
|---|---|
| `apps/web/src/app/api/` | All browser-to-backend calls pass through here. Prevents exposing Medusa/ERP URLs to the client and centralizes auth/validation. |
| `apps/web/src/components/` | Component domains mirror the business domain (product, cart, checkout), not technical layers. Makes it easy for a developer to find all checkout-related UI in one place. |
| `apps/worker/src/processors/erp/` | Isolating ERP integration logic in its own directory ensures that ERP API changes only affect files in this subtree. |
| `packages/medusa/src/modules/` | Custom Medusa modules encapsulate wholesale business logic (bulk pricing, MOQs, delivery zones) that doesn't belong in core. |
| `packages/shared/` | The `@ggh/shared` package is the single source of truth for types, constants, and pure functions consumed by both the frontend and the worker. Prevents type drift. |
| `erpnext/custom_apps/` | A Frappe custom app preserves ERPNext customizations (DocTypes, API endpoints, hooks) in version control, separate from ERPNext core. |

---

## 5. Data Flow

### 5.1 Product Browsing Flow (Read Path)

```
User Browser
    │
    ▼
Next.js SSR (Route Handler or RSC)
    │
    ├─── Cache Hit? ──► Return cached HTML (ISR, 60s revalidation)
    │
    └─── Cache Miss ──► Medusa Store API
                            │
                            ├── GET /store/products?category_id=...
                            │
                            └── Response: products with variants, prices,
                                inventory levels (from Medusa's copy)
    │
    ▼
Render HTML with product data → Cache result → Return to browser
```

**Caching Strategy:**

| Layer | TTL | Invalidation Trigger |
|---|---|---|
| Next.js Full Route Cache | 60 seconds | On-demand via `revalidatePath()` called by webhook |
| Next.js Data Cache (fetch) | 60 seconds | On-demand via `revalidateTag()` |
| Redis (product list) | 5 minutes | `cache.invalidate` BullMQ job after ERP sync |
| Browser (SWR via TanStack Query) | 30 seconds staleTime | Refetch on window focus |
| CDN (future: CloudFront) | 300 seconds | Purge via API on product update |

### 5.2 Product Data Sync Flow (Write Path — ERP → Medusa)

```
ERPNext (Item updated)
    │
    ├─── Option A: Webhook ──► Next.js /api/webhooks/erp
    │                              │
    │                              ▼
    │                          BullMQ: erp.sync.products
    │                              │
    ├─── Option B: Scheduled ──► BullMQ: erp.sync.products (cron: */10 * * * *)
    │                              │
    ▼                              ▼
Worker Processor: sync-products
    │
    ├── Fetch items from ERPNext REST API
    │       GET /api/resource/Item?filters=[["modified", ">", last_sync]]
    │
    ├── Transform ERP Item → Medusa Product DTO
    │       Map: item_code → sku, item_name → title,
    │            standard_rate → wholesale_price,
    │            item_group → category
    │
    ├── Upsert into Medusa via Admin API
    │       POST/PUT /admin/products
    │       POST/PUT /admin/prices (wholesale tiers)
    │
    ├── Update sync cursor in Redis
    │       SET erp:sync:products:last_cursor <timestamp>
    │
    └── Enqueue cache invalidation
            BullMQ: cache.invalidate { keys: ["products:*", "categories:*"] }
```

### 5.3 Inventory Sync Flow (ERP → Medusa)

```
BullMQ: erp.sync.inventory (every 5 minutes)
    │
    ▼
Worker Processor: sync-inventory
    │
    ├── Fetch stock levels from ERPNext
    │       GET /api/resource/Stock Ledger Entry
    │       ?filters=[["warehouse","in",["Cairo Central","Giza Hub"]]]
    │
    ├── For each item:
    │       GET /admin/inventory-items?sku=<item_code>
    │       POST /admin/inventory-items/<id>/stock-location
    │           { stocked_quantity: <available_qty> }
    │
    └── Enqueue cache invalidation
            BullMQ: cache.invalidate { keys: ["inventory:*"] }
```

### 5.4 Customer Data Sync Flow (Medusa → ERP)

```
Event: customer.created / customer.updated
    │
    ▼
Medusa Subscriber → BullMQ: erp.sync.customers
    │
    ▼
Worker Processor: sync-customers
    │
    ├── Fetch customer from Medusa Admin API
    │
    ├── Transform → ERPNext Customer DTO
    │       Map: email → customer_name,
    │            phone → mobile_no,
    │            metadata.customer_group → customer_group
    │
    ├── Upsert into ERPNext
    │       POST/PUT /api/resource/Customer
    │
    └── Log sync result
            PostgreSQL: erp_sync_log { entity, direction, status, timestamp }
```

---

## 6. Authentication & Authorization Flow

### 6.1 Customer Authentication (Medusa JWT)

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Browser │     │  Next.js │     │  Medusa  │     │  Redis   │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ POST /api/auth/login           │                │
     │ { email, password }            │                │
     │───────────────►│                │                │
     │                │ POST /auth/customer/emailpass   │
     │                │───────────────►│                │
     │                │                │                │
     │                │   { token, customer }           │
     │                │◄───────────────│                │
     │                │                │                │
     │                │ Store session: SET sess:<id>    │
     │                │ { cart_id, customer_id, token } │
     │                │───────────────────────────────►│
     │                │                │                │
     │ Set-Cookie: __ggh_sess=<id>;   │                │
     │ HttpOnly; Secure; SameSite=Lax │                │
     │◄───────────────│                │                │
     │                │                │                │
     │ Subsequent requests with cookie│                │
     │───────────────►│                │                │
     │                │ GET sess:<id> from Redis       │
     │                │───────────────────────────────►│
     │                │◄───────────────────────────────│
     │                │ Attach Authorization: Bearer <token>
     │                │───────────────►│                │
     │                │     Data       │                │
     │                │◄───────────────│                │
     │◄───────────────│                │                │
```

### 6.2 Customer Groups & Wholesale Access

| Group | Criteria | Permissions |
|---|---|---|
| `retail` | Default on registration | View retail pricing, standard delivery zones |
| `wholesale-verified` | Admin approval after business document submission | View wholesale pricing, bulk-break tiers, priority delivery slots |
| `wholesale-enterprise` | Manual assignment by sales team | Custom pricing lists, dedicated account manager, net-30 payment terms |

### 6.3 Service-to-Service Authentication

| Caller | Target | Method |
|---|---|---|
| Next.js → Medusa | Admin API | API Key in `x-publishable-api-key` header |
| Next.js → Medusa | Store API | Publishable key + customer JWT (when available) |
| Worker → Medusa | Admin API | API Key in `x-publishable-api-key` header |
| Worker → ERPNext | REST API | `api_key` + `api_secret` in headers (ERPNext token auth) |
| Next.js → Worker | BullMQ | Shared Redis connection (VPC-only, no external access) |
| Medusa → Next.js | Webhook | HMAC-SHA256 signature in `x-medusa-signature` header |
| ERPNext → Next.js | Webhook | Shared secret in `x-erpnext-webhook-token` header |

### 6.4 Token Lifecycle

| Token Type | Issuer | Lifetime | Refresh Strategy |
|---|---|---|---|
| Customer JWT | Medusa | 24 hours | Silent refresh via `/auth/customer/refresh` before expiry |
| Admin JWT | Medusa | 8 hours | Manual re-login; admin sessions are short-lived |
| Session Cookie | Next.js | 30 days (rolling) | Renewed on every request |
| API Key (Medusa) | Admin console | No expiry | Rotated quarterly; old key valid for 24h after rotation |
| ERPNext Token | ERPNext | No expiry | Rotated quarterly |

---

## 7. Order Flow

### 7.1 Complete Order Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                     ORDER STATE MACHINE                         │
│                                                                 │
│  [created] ──► [confirmed] ──► [picked] ──► [shipped] ──► [delivered]
│      │              │              │            │
│      │              │              │            └──► [return_requested]
│      │              │              │                    │
│      │              │              │               [returned]
│      │              │              │
│      │              └──► [cancelled]  (before picking)
│      │
│      └──► [abandoned]  (cart timeout, 24h)
│
│  Payment:  [awaiting] ──► [captured] ──► [partially_refunded] ──► [refunded]
│                              │
│                              └──► [failed]  (payment gateway decline)
│
│  Fulfillment: [not_fulfilled] ──► [partially_fulfilled] ──► [fulfilled]
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Order Placement Sequence

```
Browser                    Next.js                   Medusa               BullMQ              ERPNext
  │                          │                         │                    │                    │
  │ POST /api/checkout       │                         │                    │                    │
  │ { cart_id, shipping,     │                         │                    │                    │
  │   payment_method }       │                         │                    │                    │
  │─────────────────────────►│                         │                    │                    │
  │                          │                         │                    │                    │
  │                          │ Validate input (Zod)    │                    │                    │
  │                          │ Check MOQ constraints   │                    │                    │
  │                          │                         │                    │                    │
  │                          │ POST /store/carts/<id>/complete-cart         │                    │
  │                          │────────────────────────►│                    │                    │
  │                          │                         │                    │                    │
  │                          │                         │ 1. Reserve inventory                   │
  │                          │                         │ 2. Create Payment Session              │
  │                          │                         │ 3. Capture Payment                     │
  │                          │                         │ 4. Create Order                        │
  │                          │                         │    status: [confirmed]                  │
  │                          │                         │                    │                    │
  │                          │   { order }             │                    │                    │
  │                          │◄────────────────────────│                    │                    │
  │                          │                         │                    │                    │
  │                          │                         │ Emit: order.placed │                    │
  │                          │                         │───────────────────►│                    │
  │                          │                         │                    │                    │
  │  202 { order_id }       │                         │                    │ erp.push.order     │
  │◄─────────────────────────│                         │                    │───────────────────►│
  │                          │                         │                    │                    │
  │                          │                         │                    │  Create Sales Order │
  │                          │                         │                    │  Create Delivery    │
  │                          │                         │                    │  Note (if ready)    │
  │                          │                         │                    │                    │
  │                          │                         │                    │◄───────────────────│
  │                          │                         │                    │                    │
  │                          │                         │                    │ order.confirmation  │
  │                          │                         │                    │ (send email + SMS)  │
  │                          │                         │                    │                    │
  │                          │                         │◄───────────────────│                    │
  │                          │                         │ Update order       │                    │
  │                          │                         │ external_id:       │                    │
  │                          │                         │  SO-ERP-XXXXX      │                    │
```

### 7.3 Wholesale-Specific Order Rules

| Rule | Implementation |
|---|---|
| **Minimum Order Value** | EGP 500 for retail customers; EGP 2,000 for wholesale-verified. Enforced in the API route handler before completing cart. |
| **Minimum Order Quantity (MOQ)** | Per-variant MOQ (e.g., rice 5kg minimum). Stored as `variant.metadata.moq`. Validated server-side. |
| **Case-Pack Quantities** | Variants flagged as `is_case_pack = true` only accept quantities that are multiples of `case_size`. |
| **Bulk-Break Pricing** | Automatically applied at the cart level. `price_tier` resolved by mapping total quantity against `PricingRule` records. |
| **Delivery Zone Restrictions** | Some wholesale SKUs are restricted to specific delivery zones (Cairo/Giza only). Enforced in cart shipping step. |
| **Out-of-Stock Fallback** | If ERPNext reports zero stock during `erp.sync.inventory`, Medusa marks the variant as `stock_status: out_of_stock` and the frontend shows "Available soon — pre-order" instead of hiding the product. |
| **Payment on Delivery** | COD is the default for B2C. B2B customers may request net-30 terms after credit approval in ERPNext. |

---

## 8. ERP Synchronization

### 8.1 Sync Architecture

The ERP synchronization layer is **eventually consistent** by design. ERPNext is the system of record for financial and inventory data. Medusa holds an operational cache that is "close enough" for storefront operations.

```
┌─────────────────────────────────────────────────────────┐
│               ERP SYNC TOPOLOGY                         │
│                                                         │
│  ERPNext ──► Webhook ──► Next.js ──► BullMQ Queue      │
│                                                         │
│  Cron (5 min) ──► BullMQ Scheduler ──► Worker          │
│                                                         │
│  Worker ──► ERPNext REST API (read)                    │
│  Worker ──► Medusa Admin API (write)                   │
│  Worker ──► Redis (update sync cursors & caches)       │
│  Worker ──► PostgreSQL (write sync audit log)          │
│                                                         │
│  Conflict Resolution: ERP Wins. Always.                 │
└─────────────────────────────────────────────────────────┘
```

### 8.2 Entity Mapping

| GGH (Medusa) | ERPNext Entity | Sync Direction | Frequency |
|---|---|---|---|
| Product | Item | ERP → Medusa | On change (webhook) + every 10 min |
| Product Variant | Item (UOM variants) | ERP → Medusa | On change + every 10 min |
| Product Category | Item Group | ERP → Medusa | On change + daily full sync |
| Price (wholesale) | Item Price | ERP → Medusa | On change + every 10 min |
| Inventory Level | Stock Ledger Entry | ERP → Medusa | Every 5 minutes |
| Customer | Customer | Medusa → ERP | On create/update |
| Order | Sales Order | Medusa → ERP | On order placement |
| Payment | Payment Entry | ERP → Medusa | Every 15 minutes |
| Delivery | Delivery Note | ERP → Medusa | On status change (webhook) |
| Invoice | Sales Invoice | ERP → Medusa | On creation (webhook) |

### 8.3 Sync Audit Log

Every sync operation is recorded in the `erp_sync_log` table:

```sql
CREATE TABLE erp_sync_log (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type   TEXT NOT NULL,          -- 'product', 'inventory', 'customer', 'order'
    entity_id     TEXT NOT NULL,          -- Medusa or ERP entity ID
    direction     TEXT NOT NULL,          -- 'erp_to_medusa' | 'medusa_to_erp'
    status        TEXT NOT NULL,          -- 'success' | 'conflict' | 'error'
    medusa_data   JSONB,                  -- Snapshot of Medusa state before sync
    erp_data      JSONB,                  -- Snapshot of ERP state
    error_message TEXT,
    duration_ms   INTEGER,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sync_log_entity ON erp_sync_log (entity_type, entity_id);
CREATE INDEX idx_sync_log_status ON erp_sync_log (status, created_at DESC);
```

### 8.4 Conflict Resolution Strategy

| Scenario | Resolution | Rationale |
|---|---|---|
| Price discrepancy (ERP vs Medusa) | ERP price overwrites Medusa | Finance team controls pricing in ERP. Medusa is a display cache. |
| Inventory discrepancy | ERP stock level overwrites Medusa | Stock ledger is the source of truth for available-to-promise. |
| Product deleted in ERP but active in Medusa | Mark Medusa product as `status: draft` (soft delete) | Prevents breaking existing cart/order references. |
| Order exists in Medusa but not in ERP | Retry `erp.push.order` (up to 5 times), then alert | Orders must reach ERP for accounting compliance. |
| Customer data mismatch | Medusa customer data pushes to ERP on next update | Customer self-service edits in GGH should propagate to ERP. |

### 8.5 ERP API Endpoints Consumed

| ERPNext Endpoint | Purpose | Called By |
|---|---|---|
| `GET /api/resource/Item` | Fetch product catalog | `sync-products` processor |
| `GET /api/resource/Stock Ledger Entry` | Fetch inventory levels | `sync-inventory` processor |
| `GET /api/resource/Item Price` | Fetch pricing tiers | `sync-products` processor |
| `GET /api/resource/Item Group` | Fetch category tree | `sync-products` processor |
| `POST /api/resource/Sales Order` | Create sales order from GGH order | `push-order` processor |
| `POST /api/resource/Customer` | Create/update customer record | `sync-customers` processor |
| `GET /api/resource/Delivery Note` | Check shipment status | `sync-invoice` processor |
| `GET /api/resource/Sales Invoice` | Fetch invoice data | `sync-invoice` processor |
| `POST /api/method/ggh_erp.api.sync_webhook` | Custom webhook receiver | ERPNext internal triggers |

---

## 9. Infrastructure & Deployment

### 9.1 Docker Compose (Production)

```yaml
services:
  web:
    build: ./docker/nextjs
    ports:
      - "3000:3000"
    environment:
      - MEDUSA_URL=http://medusa:9000
      - MEDUSA_API_KEY=${MEDUSA_API_KEY}
      - REDIS_URL=redis://redis:6379
      - ERP_URL=http://erpnext:8000
      - ERP_API_KEY=${ERP_API_KEY}
      - ERP_API_SECRET=${ERP_API_SECRET}
    depends_on:
      - medusa
      - redis
    restart: unless-stopped

  medusa:
    build: ./docker/medusa
    ports:
      - "9000:9000"
    environment:
      - DATABASE_URL=postgres://medusa:${DB_PASSWORD}@postgres:5432/medusa
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  worker:
    build: ./docker/worker
    environment:
      - MEDUSA_URL=http://medusa:9000
      - MEDUSA_API_KEY=${MEDUSA_API_KEY}
      - REDIS_URL=redis://redis:6379
      - ERP_URL=http://erpnext:8000
      - ERP_API_KEY=${ERP_API_KEY}
      - ERP_API_SECRET=${ERP_API_SECRET}
      - DATABASE_URL=postgres://medusa:${DB_PASSWORD}@postgres:5432/medusa
    depends_on:
      - medusa
      - redis
      - postgres
    restart: unless-stopped

  erpnext:
    build: ./docker/erpnext
    ports:
      - "8000:8000"
    volumes:
      - erpnext_data:/home/frappe/frappe-bench/sites
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=medusa
      - POSTGRES_USER=medusa
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - pg_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  pg_data:
  redis_data:
  erpnext_data:
```

### 9.2 Environment Variables

| Variable | Service | Description |
|---|---|---|
| `MEDUSA_URL` | web, worker | Internal Medusa API base URL |
| `MEDUSA_API_KEY` | web, worker | Medusa Admin API key |
| `MEDUSA_PUBLISHABLE_KEY` | web | Medusa Store API publishable key |
| `REDIS_URL` | web, worker, medusa | Redis connection string |
| `ERP_URL` | web, worker | Internal ERPNext base URL |
| `ERP_API_KEY` | worker | ERPNext API key |
| `ERP_API_SECRET` | worker | ERPNext API secret |
| `DATABASE_URL` | medusa, worker | PostgreSQL connection string |
| `SESSION_SECRET` | web | Encryption key for session cookies |
| `WEBHOOK_SECRET` | web | HMAC secret for Medusa webhooks |
| `ERP_WEBHOOK_TOKEN` | web | Shared secret for ERPNext webhooks |
| `TWILIO_SID` | worker | Twilio account SID for SMS |
| `SMTP_HOST` | worker | SMTP relay for transactional email |

### 9.3 CI/CD Pipeline

```
Push to main
    │
    ├── Lint & Type Check (turbo lint, turbo typecheck)
    │
    ├── Unit Tests (turbo test)
    │
    ├── Build Docker Images
    │   ├── ggh-web:sha-<short>
    │   ├── ggh-medusa:sha-<short>
    │   └── ggh-worker:sha-<short>
    │
    ├── Integration Tests (against docker-compose.dev.yml)
    │
    └── Deploy to Staging
        │
        ├── Smoke Tests (health check endpoints)
        ├── ERP Sync Verification (test order round-trip)
        └── Manual Approval Gate → Production
```

---

## 10. Observability & Monitoring

### 10.1 Logging

All services emit structured JSON logs to stdout, collected by a log aggregator.

| Service | Format | Key Fields |
|---|---|---|
| Next.js | `pino` JSON | `requestId`, `method`, `path`, `status`, `duration_ms`, `userId` |
| Medusa | Built-in logger | `level`, `message`, `module` |
| Worker | Custom `pino` | `jobId`, `queue`, `processor`, `attempts`, `duration_ms` |
| ERPNext | Frappe logger | `doctype`, `method`, `user` |

### 10.2 Metrics (Prometheus)

| Metric | Type | Labels | Service |
|---|---|---|---|
| `ggh_http_requests_total` | Counter | `method`, `route`, `status` | web |
| `ggh_http_request_duration_seconds` | Histogram | `method`, `route` | web |
| `ggh_cart_created_total` | Counter | `customer_group` | medusa |
| `ggh_order_placed_total` | Counter | `customer_group`, `payment_method` | medusa |
| `ggh_order_value_egp` | Histogram | `customer_group` | medusa |
| `ggh_erp_sync_duration_seconds` | Histogram | `entity_type`, `direction`, `status` | worker |
| `ggh_erp_sync_errors_total` | Counter | `entity_type`, `direction` | worker |
| `ggh_bullmq_queue_size` | Gauge | `queue` | worker |
| `ggh_bullmq_job_duration_seconds` | Histogram | `queue`, `status` | worker |
| `ggh_inventory_sync_lag_seconds` | Gauge | — | worker |

### 10.3 Alerting Rules

| Alert | Condition | Severity | Runbook |
|---|---|---|---|
| ERP Sync Stalled | No successful `erp.sync.inventory` job in 15 minutes | Critical | `runbooks/erp-sync-failure.md` |
| Order Push Failed | `erp.push.order` dead-letter count > 0 | Critical | `runbooks/order-stuck-pending.md` |
| Redis Memory Pressure | `used_memory` > 80% of `maxmemory` | Warning | `runbooks/redis-memory-pressure.md` |
| High Error Rate | `ggh_http_requests_total{status=~"5.."}` > 5% over 5 min | Warning | — |
| Queue Backlog | `ggh_bullmq_queue_size{queue="erp.push.order"}` > 50 | Warning | — |

### 10.4 Health Checks

| Endpoint | Service | What It Checks |
|---|---|---|
| `GET /health` | web | Next.js process alive |
| `GET /health/ready` | web | Redis + Medusa connectivity |
| `GET /health` | medusa | Medusa process + DB connectivity |
| `GET /health` | worker | Worker process + Redis + DB connectivity |
| `GET /api/method/ping` | erpnext | ERPNext process alive |

---

## 11. Future Scalability

### 11.1 Horizontal Scaling Path

| Component | Current | Scale Trigger | Target Architecture |
|---|---|---|---|
| **Next.js Web** | 1 container | CPU > 70% sustained | 2+ containers behind load balancer; sticky sessions for cart |
| **Medusa** | 1 container | Request latency > 500ms p95 | 2+ containers; Medusa v2 supports horizontal scaling |
| **BullMQ Worker** | 1 process | Queue backlog > 100 jobs | Scale processors independently per queue; dedicated workers for `erp.push.order` |
| **PostgreSQL** | Single instance | Connection saturation > 80% | Read replica for storefront queries; primary for writes; PgBouncer for connection pooling |
| **Redis** | Single instance | Memory > 80% or commands > 50k/s | Redis Cluster with sharding; separate instances for cache vs. queue |
| **ERPNext** | 1 container | API latency > 2s | Dedicated worker nodes; Redis cache for frequent ERP queries |

### 11.2 Feature Roadmap

| Phase | Timeline | Features |
|---|---|---|
| **Phase 1: MVP** | Months 1–3 | Product browsing, cart, checkout (COD), ERP inventory sync, EN/AR, Cairo delivery only |
| **Phase 2: B2B** | Months 4–6 | Wholesale account verification, bulk pricing, net-30 terms, order templates, quick reorder |
| **Phase 3: Payments** | Months 7–8 | Paymob/Fawry integration, Instapay, payment on delivery receipt scanning |
| **Phase 4: Intelligence** | Months 9–11 | Demand forecasting (ML model), dynamic pricing suggestions, reorder recommendations, inventory alerts |
| **Phase 5: Mobile** | Months 12–14 | React Native mobile app, push notifications, offline cart, barcode scanning for quick-add |
| **Phase 6: Marketplace** | Months 15–18 | Multi-vendor support, seller onboarding, commission management, seller dashboard |

### 11.3 Regional Expansion Considerations

When expanding beyond Cairo/Giza to Alexandria, Upper Egypt, and the Delta region:

| Concern | Solution |
|---|---|
| **Delivery Zones** | Add warehouse entities in Medusa per region. ERPNext Stock Ledger already supports multi-warehouse. |
| **Pricing by Region** | Medusa Price Lists per region. Shipping cost tables per zone. |
| **Localization** | Additional `messages/<locale>.json` files. Date/number formatting via `Intl` API. |
| **Compliance** | VAT rate changes per jurisdiction handled in ERPNext tax templates. |
| **Latency** | CDN for static assets. Database read replicas in regional proximity. |

### 11.4 Technology Migration Path

| From | To | Trigger | Migration Strategy |
|---|---|---|---|
| Single PostgreSQL | Read replica + PgBouncer | Connection count > 200 | Blue-green: add replica, shift reads, add PgBouncer |
| Redis single | Redis Cluster | Memory > 1 GB | Shard by key prefix (`queue:*`, `cache:*`, `session:*`) |
| Docker Compose | Kubernetes | Need auto-scaling, zero-downtime deploys | Helm charts; Terraform for cloud resources |
| Monolithic Medusa | Microservices (Medusa modules) | Team size > 8 developers | Extract modules one at a time; maintain monorepo |
| PostgreSQL full-text | Meilisearch / Typesense | Search latency > 200ms | Async index builder; switch query path; A/B test |

### 11.5 Performance Budgets

| Metric | Target | Measurement |
|---|---|---|
| First Contentful Paint (homepage) | < 1.5s | Lighthouse CI |
| Largest Contentful Paint (product page) | < 2.0s | Lighthouse CI |
| Time to Interactive (checkout) | < 3.0s | Lighthouse CI |
| API response time (p95, product list) | < 300ms | Prometheus histogram |
| API response time (p95, cart operations) | < 500ms | Prometheus histogram |
| ERP sync lag (inventory) | < 10 minutes | Prometheus gauge |
| Order-to-ERP propagation | < 60 seconds | BullMQ job duration metric |
| BullMQ job processing (p95) | < 30 seconds | Prometheus histogram |

---

## 12. Glossary

| Term | Definition |
|---|---|
| **GGH** | Gomla Go Home — جملة لحد البيت. The brand name meaning "Wholesale to Your Doorstep." |
| **Gomla** | جملة — Arabic for "wholesale." Core business model. |
| **MOQ** | Minimum Order Quantity. The smallest quantity a customer can purchase for a given SKU. |
| **Case Pack** | A wholesale packaging unit containing multiple retail units. Sold only in multiples of `case_size`. |
| **Bulk-Break** | A pricing tier where the per-unit price decreases as the ordered quantity increases. |
| **ERP** | Enterprise Resource Planning. In this context, specifically ERPNext. |
| **ISR** | Incremental Static Regeneration. Next.js feature that regenerates static pages on-demand. |
| **RSC** | React Server Components. Server-rendered components with zero client-side JavaScript. |
| **BFF** | Backend-for-Frontend. The Next.js API layer that aggregates and transforms backend data for the client. |
| **DLQ** | Dead Letter Queue. Where failed jobs go after exceeding retry limits. |
| **COD** | Cash on Delivery. Primary payment method for Egyptian B2C customers. |
| **EGP** | Egyptian Pound (جنيه مصري). The platform's base currency. |
| **ATP** | Available-to-Promise. The quantity of a product that can be promised for delivery based on current inventory minus existing reservations. |

---

*This document is maintained by the GGH engineering team. For questions or proposed changes, open a pull request against `docs/architecture.md` and tag the `@ggh/arch-reviewers` team.*

*Last updated: July 2026*
