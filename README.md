# GGH — Gomla Go Home

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)](https://www.prisma.io/)
[![bun](https://img.shields.io/badge/bun-runtime-000000?logo=bun)](https://bun.sh/)

**GGH (Gomla Go Home / جملة لحد البيت)** is a wholesale grocery e-commerce platform built for the Egyptian market. It connects customers with wholesale grocery prices and delivers directly to their doorstep.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Folder Structure](#folder-structure)
5. [Prerequisites](#prerequisites)
6. [Installation](#installation)
7. [Environment Variables](#environment-variables)
8. [Development Workflow](#development-workflow)
9. [Running the Backend](#running-the-backend)
10. [Running the Frontend](#running-the-frontend)
11. [Database Setup](#database-setup)
12. [ERPNext Integration](#erpnext-integration)
13. [GPS & Maps](#gps--maps)
14. [Delivery Tracking](#delivery-tracking)
15. [API Reference](#api-reference)
16. [Design System](#design-system)
17. [Troubleshooting](#troubleshooting)
18. [Production Deployment](#production-deployment)
19. [Contributing](#contributing)

---

## Project Overview

GGH is a full-stack wholesale grocery delivery platform targeting Egyptian consumers and businesses. The name translates to "Wholesale to Your Doorstep" in Arabic.

**Who is it for:**
- Retail customers buying groceries at wholesale prices
- Wholesale buyers (restaurants, shops, offices) ordering in bulk
- Dispatchers and warehouse operators managing fulfillment
- Drivers picking up and delivering orders

**Key Features:**
- Bilingual interface (English / Arabic) with full RTL support
- OTP-based phone authentication (Egyptian phone format +20)
- Product catalog with daily pricing, deals, and flash sales
- Cart with real-time totals and free-delivery thresholds
- Multi-step checkout: address selection, delivery slot, payment
- Order tracking with 13-step state machine and live driver GPS
- ERPNext integration for inventory, accounting, and reporting
- GPS/Maps with 4 provider support (OSM, Google, Mapbox, HERE)
- Driver auto-assignment scored by distance (40%), rating (35%), load (25%)
- Warehouse packing queue and driver handoff workflow
- Dispatcher dashboard with real-time overview
- All monetary values stored as integer piastres (EGP 14.50 = 1450)
- Elder-friendly design with 48px+ touch targets

---

## Architecture

### BFF (Backend-for-Frontend) Pattern

GGH uses a BFF architecture where the Next.js API routes serve as the backend. The frontend client (`src/services/api.ts`) communicates exclusively with these API routes, never with external services directly.

```
Browser  →  API Routes (BFF)  →  Prisma / SQLite
                           ↘  ERPNext (optional)
                           ↘  Map Provider (optional)
```

### Money as Piastres

All monetary values are stored and transmitted as **integer piastres** to eliminate floating-point errors. A branded TypeScript type `Piastres` prevents accidental mixing with plain numbers.

| EGP Display | Internal Value |
|-------------|---------------|
| EGP 14.50   | 1450          |
| EGP 200     | 20000         |
| Free        | 0             |

Conversion utilities live in `src/types/ggh.ts`:
- `toPiastres(14.50)` → `1450` (Piastres)
- `fromPiastres(1450)` → `14.50` (number)
- `formatPriceWithCurrency(piastres, 'ar')` → `"14.50 ج.م"`

### Bilingual EN/AR

Every user-facing string passes through the i18n system (`src/lib/ggh/i18n.ts`) with 150+ translation keys. Database models use dual fields (`nameEn` / `nameAr`). RTL layout is toggled via the language store.

### View-Based SPA

The app runs as a single-page application within `src/app/page.tsx`. Navigation switches between views (`shop`, `checkout`, `orders`, `account`, `tracking`, `dispatcher`, `warehouse`) using state — no client-side router is needed. Views are animated with Framer Motion.

---

## Technology Stack

| Category | Technology | Version |
|----------|-----------|---------|
| Framework | Next.js (App Router) | 16 |
| Language | TypeScript | 5 |
| Styling | Tailwind CSS | 4 |
| UI Components | shadcn/ui (New York style) | — |
| Icons | Lucide React | 0.525+ |
| Animation | Framer Motion | 12 |
| Database | SQLite via Prisma ORM | 6 |
| Client State | Zustand (with persist) | 5 |
| Server State | TanStack React Query | 5 |
| Validation | Zod | 4 |
| Forms | React Hook Form + resolvers | 7 |
| HTTP Client | Native fetch (no axios) | — |
| Notifications | Sonner (toast) | 2 |
| Carousels | Embla Carousel | 8 |
| Charts | Recharts | 2 |
| Package Manager | bun | 1.3+ |
| Linting | ESLint + eslint-config-next | 9 |

---

## Folder Structure

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # API route handlers (BFF)
│   │   ├── addresses/            #   Address CRUD
│   │   ├── auth/                 #   OTP send/verify, session, logout
│   │   ├── cart/                 #   Cart summary, add/update/remove items
│   │   ├── categories/           #   Category list and detail
│   │   ├── checkout/             #   Create order from cart
│   │   ├── customer/             #   Customer profile
│   │   ├── deals/                #   Active deals
│   │   ├── delivery/             #   Tracking, assignment, driver, warehouse, dispatcher
│   │   ├── erp/                  #   ERPNext sync, inventory, warehouses, reports, webhooks
│   │   ├── location/             #   Geocode, route, geofences, track, optimize-route
│   │   ├── orders/               #   Order list/detail/cancel/reorder
│   │   ├── products/             #   Product list (paginated)
│   │   ├── search/               #   Product + category search
│   │   ├── seed/                 #   Database seed endpoint
│   │   └── route.ts              #   Health check
│   ├── layout.tsx                # Root layout with providers
│   └── page.tsx                  # Main SPA entry (view orchestrator)
│
├── components/
│   ├── ggh/                      # GGH-specific layout components
│   │   ├── Header.tsx            #   Sticky header, search, lang toggle, cart badge
│   │   ├── Footer.tsx            #   Full footer with links and social
│   │   └── MobileNav.tsx         #   Bottom nav with 4 tabs
│   └── ui/                       # shadcn/ui base components (40+)
│
├── features/                     # Feature modules (components + barrel exports)
│   ├── auth/                     #   AccountView, LoginForm, OtpInput, WelcomeScreen
│   ├── cart/                     #   CartSlideOut, CartItemRow, CartSummary
│   ├── checkout/                 #   CheckoutFlow, AddressCard/Form, DeliverySlotPicker, PaymentMethodSelector, OrderSummary, OrderSuccess
│   ├── delivery/                 #   TrackingPage, DriverTimeline, LiveMap, DriverCard, DispatcherDashboard, WarehouseDashboard
│   ├── order/                    #   OrderCard, OrderDetail, OrderTimeline, OrdersView
│   ├── product/                  #   ProductCard, ProductGrid, ProductDetail, CategoryGrid, DealCard, DealTimer
│   ├── search/                   #   SearchBar, SearchOverlay, SearchResults
│   └── shop/                     #   ShopView (hero, categories, deals, featured, products)
│
├── hooks/                        # Shared React hooks
│   ├── use-mobile.ts             #   Mobile breakpoint detection
│   └── use-toast.ts              #   Toast notification hook
│
├── lib/                          # Core libraries and utilities
│   ├── db.ts                     #   Prisma client singleton
│   ├── utils.ts                  #   cn() classname merge utility
│   ├── ggh/                      #   GGH shared utilities
│   │   ├── auth/index.ts         #     Session management, requireAuth, phone validation
│   │   └── i18n.ts              #     150+ bilingual translation keys
│   ├── erp/                      #   ERPNext integration module
│   │   ├── config.ts             #     Zod-validated ERP config
│   │   ├── client.ts             #     HTTP client with rate limiting and retry
│   │   ├── types.ts              #     25+ ERPNext document types
│   │   ├── mappers.ts            #     GGH ↔ ERP data mappers (10 functions)
│   │   ├── sync.ts               #     Sync orchestrator with audit log
│   │   ├── webhook.ts            #     Webhook signature verification and routing
│   │   ├── index.ts              #     Barrel export
│   │   └── modules/              #     Domain modules
│   │       ├── inventory.ts      #       Stock levels, ledger, reorder
│   │       ├── warehouse.ts      #       Warehouse CRUD, capacity
│   │       ├── stock-transfer.ts #       Inter-warehouse transfers
│   │       ├── purchase-order.ts #       PO creation, receiving
│   │       ├── sales-order.ts    #       SO creation, status updates
│   │       ├── delivery-note.ts  #       Delivery note creation
│   │       ├── supplier.ts       #       Supplier list, pricing
│   │       ├── customer.ts       #       Customer sync to ERP
│   │       ├── accounting.ts     #       Payment, invoice, outstanding
│   │       └── reporting.ts      #       Sales, stock, profit reports
│   ├── location/                 #   GPS/Maps/Geofencing module
│   │   ├── config.ts             #     Map provider config (Zod)
│   │   ├── types.ts              #     LatLng, Route, Geocode, Geofence types
│   │   ├── geocoding.ts          #     Forward/reverse geocode with LRU cache
│   │   ├── routing.ts            #     Route, ETA, distance, haversine
│   │   ├── geofencing.ts         #     Circle/polygon containment, events
│   │   ├── gps-tracking.ts       #     Position logging, nearby drivers
│   │   ├── route-optimization.ts #     Nearest-neighbor route optimizer
│   │   ├── index.ts              #     Barrel export
│   │   └── providers/            #     Map provider implementations
│   │       ├── interface.ts      #       Abstract MapProvider
│   │       ├── osm.ts            #       OpenStreetMap / Nominatim / OSRM
│   │       ├── google.ts         #       Google Maps Geocoding + Directions
│   │       ├── mapbox.ts         #       Mapbox Geocoding + Directions
│   │       ├── here.ts           #       HERE Geocoder + Routing
│   │       └── index.ts          #       Provider factory with fallback
│   └── delivery/                 #   Delivery tracking module
│       ├── config.ts             #     Driver search, traffic, scoring weights
│       ├── types.ts              #     13 DeliverySteps, state machine, labels
│       ├── tracking.ts           #     State machine, transition validation
│       ├── assignment.ts         #     Manual/auto driver assignment
│       ├── dispatcher.ts         #     Dispatcher overview and queries
│       ├── warehouse-ops.ts      #     Packing queue, pack, handoff
│       ├── eta.ts                #     ETA with traffic multipliers
│       ├── notifications.ts      #     13 bilingual notification templates
│       └── index.ts              #     Barrel export
│
├── providers/
│   └── query-provider.tsx        # TanStack React Query provider
│
├── services/
│   └── api.ts                    # BFF API client class (all endpoints)
│
├── stores/                       # Zustand client stores
│   ├── auth-store.ts             #   Auth state (persisted)
│   ├── cart-store.ts             #   Cart state (persisted)
│   └── lang-store.ts             #   Language/RTL state (persisted)
│
├── types/
│   └── ggh.ts                    # Shared types: Piastres, domain models, API contracts
│
└── utils/
    └── money.ts                  # Re-exports from ggh.ts (piastres helpers)
```

---

## Prerequisites

| Requirement | Minimum Version | Install |
|------------|----------------|---------|
| Node.js | 18+ | [nodejs.org](https://nodejs.org/) |
| bun | 1.3+ | `curl -fsSL https://bun.sh/install \| bash` |
| Git | 2.x | [git-scm.com](https://git-scm.com/) |

Optional (for ERPNext integration):
- ERPNext instance v14+ running and accessible

Optional (for premium map providers):
- Google Maps API key with Geocoding + Directions API enabled
- Mapbox API key with Geocoding + Directions API enabled
- HERE Maps API key with Geocoder + Routing API enabled

---

## Installation

```bash
# 1. Clone the repository
git clone <repository-url>
cd my-project

# 2. Install dependencies
bun install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your configuration (see Environment Variables section)

# 4. Initialize the database
bun run db:push

# 5. Generate Prisma client
bun run db:generate

# 6. Start the development server
bun run dev
```

The app will be available at `http://localhost:3000`. The database seeds automatically on first page load.

---

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | SQLite database file path | `file:./db/custom.db` | Yes |
| `NEXT_PUBLIC_APP_URL` | Public app URL | `http://localhost:3000` | Yes |
| `NODE_ENV` | Runtime environment | `development` | Yes |
| `ERP_NEXT_URL` | ERPNext server URL | (empty) | No |
| `ERP_NEXT_API_KEY` | ERPNext API key for token auth | (empty) | No |
| `ERP_NEXT_API_SECRET` | ERPNext API secret for token auth | (empty) | No |
| `ERP_NEXT_COMPANY` | ERPNext default company name | `GGH Wholesale` | No |
| `ERP_NEXT_MAX_RETRIES` | Max retry attempts for ERP requests | `3` | No |
| `ERP_NEXT_RETRY_DELAY_MS` | Base delay for exponential backoff | `1000` | No |
| `ERP_NEXT_TIMEOUT_MS` | Request timeout in milliseconds | `30000` | No |
| `ERP_NEXT_WEBHOOK_SECRET` | Secret for webhook HMAC verification | (empty) | No |
| `MAP_PROVIDER` | Map provider: `osm`, `google`, `mapbox`, `here` | `osm` | No |
| `GOOGLE_MAPS_API_KEY` | Google Maps API key | (empty) | No |
| `MAPBOX_API_KEY` | Mapbox API key | (empty) | No |
| `HERE_MAPS_API_KEY` | HERE Maps API key | (empty) | No |

When ERPNext is not configured (empty URL/key/secret), all ERP modules gracefully return `null` or empty arrays. When a map provider is selected without its API key, the system falls back to OSM.

---

## Development Workflow

### Starting the Dev Server

```bash
bun run dev
```

The dev server starts on port 3000 with hot module replacement. Logs are written to `dev.log`.

### Making Changes

1. **Frontend changes** — Edit files in `src/features/`, `src/components/`, or `src/app/page.tsx`. Changes hot-reload instantly.
2. **API route changes** — Edit files in `src/app/api/`. Next.js rebuilds the route on the next request.
3. **Database schema changes** — Edit `prisma/schema.prisma`, then run `bun run db:push`.
4. **Shared types** — Edit `src/types/ggh.ts` for domain types and `src/lib/ggh/i18n.ts` for translations.

### Linting

```bash
bun run lint
```

ESLint runs with `eslint-config-next` and project-specific rules. The codebase targets 0 errors.

### Key Conventions

- All API routes use Zod for request validation
- All authenticated routes call `requireAuth()` from `src/lib/ggh/auth/index.ts`
- All monetary values use the `Piastres` branded type — never raw numbers
- All user-facing strings go through the `t(lang, key)` i18n function
- All components use shadcn/ui building blocks with GGH design tokens
- All touch targets are 48px minimum (elder-friendly design)
- TypeScript strict mode with `noImplicitAny: true`

---

## Running the Backend

The backend is the Next.js API routes — there is no separate server process.

### API Routes

All routes are under `/api/` and return JSON. Authentication uses HTTP-only session cookies (`ggh-session` token).

### Auth Helper

The `requireAuth()` function in `src/lib/ggh/auth/index.ts` extracts the session token from cookies, validates it against the database, and returns the customer ID. Unauthenticated requests receive a 401 response.

```typescript
import { requireAuth } from '@/lib/ggh/auth';

export async function GET(request: Request) {
  const customerId = await requireAuth(request);
  if (!customerId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... authorized logic
}
```

### Seed Data

The seed endpoint populates the database with Egyptian grocery sample data:

```bash
curl -X POST http://localhost:3000/api/seed
```

This creates: 10 categories, 39 products, 13 deals, 10 delivery zones, and sample warehouse/driver data. The seed is idempotent — it only creates data if tables are empty. **Disabled in production** (returns 403 when `NODE_ENV=production`).

---

## Running the Frontend

### Development

```bash
bun run dev
```

The frontend is served at `http://localhost:3000`. It is a single-page application — all views render within `src/app/page.tsx` based on state.

### Building for Production

```bash
bun run build
```

This generates a standalone output in `.next/standalone/` (configured via `next.config.ts` `output: "standalone"`).

### Running Production Build

```bash
bun run start
```

---

## Database Setup

### Prisma Commands

```bash
# Push schema changes to SQLite (dev workflow — no migrations)
bun run db:push

# Generate Prisma client after schema changes
bun run db:generate

# Create a proper migration (production workflow)
bun run db:migrate

# Reset database (destroys all data)
bun run db:reset
```

### Schema Overview

The database uses SQLite with 22 Prisma models organized into 8 domain groups:

| Group | Models |
|-------|--------|
| Authentication | `Customer`, `OtpCode`, `Session` |
| Product Catalog | `Category`, `Product`, `ProductImage` |
| Cart & Checkout | `CartItem`, `Order`, `OrderItem`, `OrderStatusHistory` |
| Addresses | `Address` |
| Wishlist & Reviews | `Wishlist`, `Review` |
| Order Templates | `OrderTemplate`, `OrderTemplateItem` |
| Delivery | `DeliveryZone`, `Notification`, `Deal` |
| Warehouse & Logistics | `Warehouse`, `Driver`, `DeliveryAssignment` |
| ERP Integration | `ErpSyncLog` |
| Location Intelligence | `Geofence`, `GpsPositionLog` |

### Key Schema Conventions

- All IDs use CUID (`@id @default(cuid())`)
- All monetary fields are integers (piastres)
- Bilingual fields use `nameEn` / `nameAr` pattern
- Soft deletes use `deletedAt` (nullable DateTime)
- Tables are explicitly mapped with `@@map("snake_case")`

---

## ERPNext Integration

### Configuration

ERPNext integration is configured via environment variables (see [Environment Variables](#environment-variables)). When all three credentials (`ERP_NEXT_URL`, `ERP_NEXT_API_KEY`, `ERP_NEXT_API_SECRET`) are provided, the integration is active. Otherwise, all ERP functions return gracefully with null/empty results.

### Modules

| Module | File | Capabilities |
|--------|------|-------------|
| Inventory | `modules/inventory.ts` | Stock levels, ledger entries, stock entries, reorder levels |
| Warehouse | `modules/warehouse.ts` | List/get/create warehouses, capacity check |
| Stock Transfer | `modules/stock-transfer.ts` | Inter-warehouse transfers, transfer history |
| Purchase Order | `modules/purchase-order.ts` | Create PO, list POs, receive PO |
| Sales Order | `modules/sales-order.ts` | Create SO, list SOs, update status |
| Delivery Note | `modules/delivery-note.ts` | Create/list delivery notes |
| Supplier | `modules/supplier.ts` | List/create suppliers, get pricing |
| Customer | `modules/customer.ts` | Sync GGH customer to ERP, lookup |
| Accounting | `modules/accounting.ts` | Payment entries, invoices, outstanding |
| Reporting | `modules/reporting.ts` | Sales summary, stock balance, top sellers, profit |

### Sync Orchestrator

`src/lib/erp/sync.ts` provides:

- `syncOrderToErp(orderId)` — Push a GGH order to ERPNext as a Sales Order
- `syncAllPendingOrders()` — Batch sync all orders with `erpSyncStatus=pending`
- `syncStockFromErp()` — Pull stock levels from ERPNext into GGH
- `syncCustomerToErp(customerId)` — Push customer data to ERPNext
- `retryFailedSyncs()` — Retry all syncs with status `failed`
- `getSyncStatus()` — Get pending/failed counts and recent logs

All sync operations are logged to the `ErpSyncLog` model for audit trail and retry.

### Webhooks

`src/lib/erp/webhook.ts` handles incoming webhooks from ERPNext:

- **Signature verification** using HMAC-SHA256 with `ERP_NEXT_WEBHOOK_SECRET`
- **Stock update** — updates product stock levels when ERPNext reports changes
- **Order status update** — syncs order status from ERPNext back to GGH
- **Payment update** — updates payment status on payment events

The webhook endpoint is `/api/erp/webhooks` (POST). It is the only ERP route that does not require GGH auth.

### API Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/erp/sync` | Trigger manual sync (orders/stock/customer/all) |
| GET | `/api/erp/sync/status` | Check sync status and recent logs |
| POST | `/api/erp/webhooks` | Receive ERPNext webhooks |
| GET | `/api/erp/inventory` | Get stock levels |
| POST | `/api/erp/inventory` | Create stock entry |
| GET | `/api/erp/warehouses` | List warehouses |
| GET | `/api/erp/sales-orders` | List synced sales orders |
| GET | `/api/erp/reports` | Get dashboard reports |

---

## GPS & Maps

### Provider Configuration

The map provider is set via the `MAP_PROVIDER` environment variable. Four providers are supported:

| Provider | Key Required | Capabilities | Rate Limits |
|----------|-------------|-------------|-------------|
| `osm` | None (free) | Geocoding (Nominatim), Routing (OSRM) | 1.1s geocode, 0.5s route |
| `google` | `GOOGLE_MAPS_API_KEY` | Geocoding, Directions, Distance Matrix | Per Google quota |
| `mapbox` | `MAPBOX_API_KEY` | Geocoding, Directions, batch distance | Per Mapbox quota |
| `here` | `HERE_MAPS_API_KEY` | Geocoding, Routing | Per HERE quota |

**Default**: `osm` — works without any API key. Unconfigured providers automatically fall back to OSM.

### Capabilities

| Feature | File | Description |
|---------|------|-------------|
| Geocoding | `geocoding.ts` | Forward/reverse geocode with LRU cache (100 entries, 1hr TTL) |
| Routing | `routing.ts` | Turn-by-turn routes, ETA, distance, multi-stop, distance matrix |
| Geofencing | `geofencing.ts` | Circle (Haversine) and polygon (ray-casting) containment checks |
| GPS Tracking | `gps-tracking.ts` | Position logging, history, nearby driver search, ETA calculation |
| Route Optimization | `route-optimization.ts` | Nearest-neighbor heuristic with time window support |
| Haversine | `routing.ts` | Geometric distance fallback when routing API unavailable |

### API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/location/geocode` | Forward/reverse geocode |
| POST | `/api/location/route` | Calculate route between points |
| GET | `/api/location/geofences` | List all geofences |
| POST | `/api/location/geofences` | Create geofence (circle or polygon) |
| GET/PUT/DELETE | `/api/location/geofences/[id]` | Geofence CRUD |
| GET | `/api/location/track` | Get driver position or nearby drivers |
| POST | `/api/location/track` | Update GPS position |
| POST | `/api/location/optimize-route` | Optimize multi-stop route |

---

## Delivery Tracking

### State Machine

Orders follow a strict 13-step state machine. Each step can only transition to explicitly allowed next steps:

```
order_placed → order_confirmed → being_packed → ready_for_pickup
    ↓               ↓               ↓                ↓
 cancelled      cancelled       cancelled         cancelled
                                   ↓
                              driver_assigned → driver_en_route → driver_arrived_pickup
                                                   ↓
                                               picked_up → driver_en_route_delivery
                                                              ↓
                                                     driver_arrived_delivery
                                                        ↙           ↘
                                                 delivered    delivery_failed
```

Any step can transition to `cancelled`. Terminal states (`delivered`, `delivery_failed`, `cancelled`) have no outgoing transitions.

### Driver Assignment

**Manual**: `POST /api/delivery/assign` with `orderId` and `driverId`.

**Auto-assignment** (`POST /api/delivery/auto-assign`):
1. Find warehouse serving the order's delivery zone
2. Find available drivers within 15km of warehouse
3. Score each candidate: `distance (40%) + rating (35%) + currentLoad (25%)`
4. Assign the highest-scoring driver
5. Requirements: driver must be active, available, have rating >= 3.5, and fewer than 3 active deliveries

### Warehouse Operations

| Operation | Endpoint | Description |
|-----------|----------|-------------|
| View packing queue | `GET /api/delivery/warehouse/pending` | Orders awaiting pack |
| Mark as packed | `POST /api/delivery/warehouse/ready` | Transition `being_packed` → `ready_for_pickup` |
| Hand off to driver | `POST /api/delivery/warehouse/handoff` | Transition `ready_for_pickup` → `picked_up` |

### ETA Calculation

ETAs use the Haversine distance between warehouse and customer, adjusted by:
- Vehicle type speed (motorcycle: 25 km/h, car: 30 km/h, van: 25 km/h, truck: 20 km/h)
- Time-of-day traffic multipliers (morning rush: 1.4x, evening rush: 1.5x, late night: 0.8x)
- Packing and pickup time estimates

### Tracking UI

The customer tracking page (`TrackingPage.tsx`) polls every 30 seconds and shows:
- Current delivery step with animated timeline
- Driver information card with call button
- Live map placeholder with GPS markers
- Estimated delivery window

### Notifications

13 bilingual (EN/AR) notification templates are defined in `src/lib/delivery/notifications.ts`, one for each delivery step. Notifications are stored in the `Notification` model.

---

## API Reference

### Health Check

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api` | Health check (status, service, version, timestamp) | No |

### Authentication

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/auth/otp/send` | Send OTP to phone number | No |
| POST | `/api/auth/otp/verify` | Verify OTP and create/get customer | No |
| GET | `/api/auth/session` | Check current session | No |
| POST | `/api/auth/logout` | Invalidate session | No |

### Products & Categories

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/products` | List products (paginated, filterable, sortable) | No |
| GET | `/api/products/[handle]` | Get single product by handle | No |
| GET | `/api/categories` | List categories with product counts | No |
| GET | `/api/categories/[slug]` | Get category with products | No |
| GET | `/api/deals` | List active deals with product info | No |

### Cart

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/cart` | Get cart summary | Yes |
| POST | `/api/cart/items` | Add item to cart (upsert) | Yes |
| PATCH | `/api/cart/items/[id]` | Update item quantity | Yes |
| DELETE | `/api/cart/items/[id]` | Remove item from cart | Yes |

### Checkout & Orders

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/checkout` | Create order from cart | Yes |
| GET | `/api/orders` | List orders (paginated) | Yes |
| GET | `/api/orders/[id]` | Get order with items and history | Yes |
| POST | `/api/orders/[id]/cancel` | Cancel an order | Yes |
| POST | `/api/orders/[id]/reorder` | Re-add order items to cart | Yes |

### Addresses

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/addresses` | List customer addresses | Yes |
| POST | `/api/addresses` | Create new address | Yes |
| PATCH | `/api/addresses/[id]` | Update address | Yes |
| DELETE | `/api/addresses/[id]` | Soft-delete address | Yes |

### Delivery

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/delivery/track/[orderId]` | Public tracking view | No |
| POST | `/api/delivery/assign` | Manual driver assignment | Yes |
| POST | `/api/delivery/auto-assign` | Auto-assign best driver | Yes |
| POST | `/api/delivery/update-status` | Update delivery status | Yes |
| GET | `/api/delivery/driver/active-orders` | Driver's current deliveries | Yes |
| POST | `/api/delivery/driver/accept` | Driver accepts assignment | Yes |
| POST | `/api/delivery/driver/arrived` | Driver arrived at location | Yes |
| POST | `/api/delivery/driver/complete` | Driver completes delivery | Yes |
| GET | `/api/delivery/warehouse/pending` | Orders awaiting packing | Yes |
| POST | `/api/delivery/warehouse/ready` | Mark order as packed | Yes |
| POST | `/api/delivery/warehouse/handoff` | Hand off to driver | Yes |
| GET | `/api/delivery/dispatcher/dashboard` | Dispatcher overview | Yes |
| POST | `/api/delivery/dispatcher/reassign` | Reassign driver | Yes |
| GET | `/api/delivery/zones` | List delivery zones | No |
| GET | `/api/delivery/slots` | Get delivery slots by zone and date | No |

### Location

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/location/geocode` | Forward/reverse geocode | No |
| POST | `/api/location/route` | Calculate route | No |
| GET | `/api/location/geofences` | List geofences | No |
| POST | `/api/location/geofences` | Create geofence | No |
| GET | `/api/location/geofences/[id]` | Get geofence | No |
| PUT | `/api/location/geofences/[id]` | Update geofence | No |
| DELETE | `/api/location/geofences/[id]` | Delete geofence | No |
| GET | `/api/location/track` | Get GPS position | No |
| POST | `/api/location/track` | Update GPS position | No |
| POST | `/api/location/optimize-route` | Optimize multi-stop route | No |

### ERPNext

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/erp/sync` | Trigger manual sync | Yes |
| GET | `/api/erp/sync/status` | Check sync status | Yes |
| POST | `/api/erp/webhooks` | Receive ERPNext webhooks | No (signature verified) |
| GET | `/api/erp/inventory` | Get stock levels | Yes |
| POST | `/api/erp/inventory` | Create stock entry | Yes |
| GET | `/api/erp/warehouses` | List warehouses | Yes |
| GET | `/api/erp/sales-orders` | List synced sales orders | Yes |
| GET | `/api/erp/reports` | Dashboard reports | Yes |

### Customer & Search

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/customer/profile` | Get customer profile | Yes |
| PATCH | `/api/customer/profile` | Update customer profile | Yes |
| GET | `/api/search` | Search products and categories | No |
| POST | `/api/seed` | Seed database with sample data | No (disabled in production) |

---

## Design System

### GGH Design Tokens

The GGH design system uses CSS custom properties integrated with shadcn/ui's theming:

| Token | Usage |
|-------|-------|
| `--ggh-primary` | Primary brand color (green) |
| `--ggh-primary-foreground` | Text on primary background |
| `--ggh-accent` | Accent color for deals and highlights |
| `--ggh-destructive` | Error and destructive actions |
| `--ggh-muted` | Muted backgrounds and borders |

### Color System

- Uses Tailwind CSS built-in variables (`bg-primary`, `text-primary-foreground`, `bg-background`)
- No indigo or blue colors in the brand palette
- Light/dark mode support via `next-themes`
- Status colors: green (delivered), amber (in progress), red (failed/cancelled)

### RTL Support

- Language store toggles `dir="rtl"` on the root element
- Tailwind RTL-aware classes used throughout
- Layout components handle bidirectional spacing
- Arabic text uses proper Unicode bidirectional algorithm

### Accessibility

- All interactive elements have proper ARIA labels
- Screen reader content via `sr-only` class
- Minimum 48px touch targets (elder-friendly design, 56px for OTP inputs)
- Keyboard navigation supported on all interactive elements
- Semantic HTML (`main`, `header`, `nav`, `section`, `article`)
- Color is never the sole indicator of state — always paired with icons or text

### Component Standards

- Built on shadcn/ui building blocks (New York style)
- Framer Motion for subtle transitions (hover, focus, view changes)
- Loading states with skeleton components
- Error states with clear, actionable messages
- Toast notifications (Sonner) for user action feedback

---

## Troubleshooting

### Database Issues

**Problem**: `PrismaClient could not locate the Query Engine`
```bash
bun run db:generate
```

**Problem**: Schema drift after pulling changes
```bash
bun run db:push
```

**Problem**: Need to start fresh
```bash
rm prisma/db/custom.db
bun run db:push
curl -X POST http://localhost:3000/api/seed
```

### ERPNext Connection

**Problem**: ERP routes return empty results
- Verify `ERP_NEXT_URL`, `ERP_NEXT_API_KEY`, and `ERP_NEXT_API_SECRET` are set in `.env`
- Check the ERPNext instance is accessible from the server
- Restart the dev server after changing environment variables

**Problem**: Webhook verification fails
- Ensure `ERP_NEXT_WEBHOOK_SECRET` matches the secret configured in ERPNext
- Verify the webhook payload is sent as raw JSON (not form-encoded)

### Map Provider Issues

**Problem**: Geocoding returns errors
- If using OSM: respect rate limits (1.1s between geocode calls)
- If using a paid provider: verify the API key and that the required APIs are enabled
- Check that the `MAP_PROVIDER` env var matches a supported value

**Problem**: OSRM routing returns 400
- OSRM public server has usage limits; use self-hosted OSRM for production
- Ensure coordinates are in the correct order (lng, lat for OSRM)

### Authentication Issues

**Problem**: OTP always accepts "1234"
- This is expected in development mode. Production OTP would integrate with an SMS provider.

**Problem**: Session expired unexpectedly
- Session tokens are stored in HTTP-only cookies named `ggh-session`
- Check that cookies are not being cleared by browser settings
- Sessions expire based on `expiresAt` in the `sessions` table

### General

**Problem**: Dev server crashes on startup
- Read `dev.log` for the specific error
- Ensure `bun run db:push` has been run
- Delete `.next` and restart

**Problem**: Lint errors after changes
```bash
bun run lint
```
- Fix errors; warnings are acceptable at warn level

---

## Production Deployment

### Docker

The project uses Next.js standalone output mode (`output: "standalone"` in `next.config.ts`):

```dockerfile
FROM oven/bun:1 AS base
WORKDIR /app

FROM base AS install
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

FROM base AS builder
COPY --from=install /app/node_modules ./node_modules
COPY . .
RUN bun run db:generate
RUN bun run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000
CMD ["bun", "server.js"]
```

### Environment

Production requires setting these environment variables:

| Variable | Production Value |
|----------|-----------------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | SQLite file path or external DB URL |
| `NEXT_PUBLIC_APP_URL` | Your public domain URL |
| `ERP_NEXT_URL` | ERPNext instance URL (if using) |
| `ERP_NEXT_API_KEY` | ERPNext API key (if using) |
| `ERP_NEXT_API_SECRET` | ERPNext API secret (if using) |
| `MAP_PROVIDER` | Preferred map provider |

### Security Considerations

- The `/api/seed` endpoint is disabled in production (returns 403)
- Session tokens are stored in HTTP-only cookies
- ERPNext webhook endpoints verify HMAC-SHA256 signatures
- All authenticated API routes call `requireAuth()`
- OTP codes expire and have attempt limits
- Soft deletes preserve audit trail

### Monitoring

- Health check endpoint: `GET /api` returns `{ status, service, version, timestamp }`
- ERP sync status: `GET /api/erp/sync/status` returns pending/failed counts
- Delivery dashboard: `GET /api/delivery/dispatcher/dashboard` returns operational overview

### Gateway (Caddy)

The project includes a `Caddyfile` for reverse proxy configuration:

- Default: proxies all requests to `localhost:3000`
- Cross-port requests: use `?XTransformPort=<port>` query parameter
- Forwards `Host`, `X-Forwarded-For`, `X-Forwarded-Proto`, `X-Real-IP` headers

---

## Contributing

### Code Style

- **TypeScript strict mode** with `noImplicitAny: true`
- **ESLint** with `eslint-config-next` for linting
- **No `any` types** — use proper TypeScript types throughout
- **Named exports** preferred over default exports (except pages)
- **Barrel exports** (`index.ts`) for each feature module

### Commit Conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add driver rating filter to auto-assignment
fix: correct piastres conversion in cart summary
docs: update API reference for delivery endpoints
refactor: extract address validation into shared utility
test: add integration tests for checkout flow
chore: update dependencies
```

### PR Process

1. Create a feature branch from `main`
2. Make changes with proper TypeScript types and Zod validation
3. Run `bun run lint` and fix all errors
4. Verify the dev server starts without crashes
5. Test the affected user flows manually
6. Submit PR with a description of changes and testing steps

### Project-Specific Guidelines

- All new API routes must use Zod for request validation
- All new API routes requiring auth must call `requireAuth()`
- All monetary values must use the `Piastres` branded type
- All user-facing strings must go through the i18n system
- All components must support both EN and AR with RTL
- All touch targets must be 48px minimum
- No external HTTP libraries — use native `fetch` only
- No direct database access from client components — use API routes
