# 07 — API

> **GGH — Gomla Go Home** — API conventions, request/response formats, versioning, authentication, error handling, and endpoint organization. The contract between frontend and backend.

---

## Table of Contents

1. [API Philosophy](#1-api-philosophy)
2. [Architecture Overview](#2-architecture-overview)
3. [URL Structure & Versioning](#3-url-structure--versioning)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [Request Format](#5-request-format)
6. [Response Format](#6-response-format)
7. [Error Responses](#7-error-responses)
8. [Pagination](#8-pagination)
9. [Filtering & Sorting](#9-filtering--sorting)
10. [Endpoint Organization](#10-endpoint-organization)
11. [BFF Endpoints — Customer](#11-bff-endpoints--customer)
12. [BFF Endpoints — Product](#12-bff-endpoints--product)
13. [BFF Endpoints — Cart & Checkout](#13-bff-endpoints--cart--checkout)
14. [BFF Endpoints — Order](#14-bff-endpoints--order)
15. [BFF Endpoints — Delivery](#15-bff-endpoints--delivery)
16. [BFF Endpoints — Account](#16-bff-endpoints--account)
17. [Admin Endpoints](#17-admin-endpoints)
18. [Medusa API Proxy Rules](#18-medusa-api-proxy-rules)
19. [ERPNext Integration Endpoints](#19-erpnext-integration-endpoints)
20. [Webhook Endpoints](#20-webhook-endpoints)
21. [Rate Limiting](#21-rate-limiting)
22. [Caching Strategy](#22-caching-strategy)
23. [Localization & RTL in API](#23-localization--rtl-in-api)
24. [Elder-Friendly API Design](#24-elder-friendly-api-design)
25. [WebSocket Events](#25-websocket-events)
26. [API Changelog Convention](#26-api-changelog-convention)

---

## 1. API Philosophy

| Principle | Rule | Why |
|---|---|---|
| **BFF owns the contract** | The frontend never calls Medusa directly. All requests go through Next.js BFF routes. | Shield the frontend from Medusa API changes. Add GGH-specific logic (delivery, pricing) without coupling. |
| **Minimal payloads** | Every response includes only what the UI needs. No `SELECT *` leaking into JSON. | Elder users on slow mobile connections. Smaller payloads = faster loads. |
| **Arabic-first, bilingual always** | API responses include both `name_en` and `name_ar`. The frontend picks based on locale. No server-side locale switching. | RTL/LTR is a presentation concern. The API serves data; the UI renders it. |
| **Predictable structure** | Every response follows the same envelope. Every error follows the same shape. | Om Ibrahim should never see a raw stack trace. The frontend should never need `if (error.type === ...)` spaghetti. |
| **Idempotent by default** | `PUT` and `DELETE` are idempotent. `POST` for creation returns the created resource. `PATCH` for partial updates. | Accidental double-taps (elder users) must not create duplicate orders. |
| **Money as integers** | All monetary values in API payloads are piastres (integer). The frontend formats to EGP. | Same reason as the database: no floating-point errors. EGP 110.50 → `11050`. |

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                          │
│                                                                  │
│   fetch('/api/v1/...')    ──→  Always relative, same origin      │
│                                                                  │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                 NEXT.JS BFF  (Port 3000)                         │
│                                                                  │
│   /api/v1/*          →  Customer-facing BFF routes               │
│   /api/admin/v1/*    →  Admin-facing BFF routes                  │
│   /api/webhooks/*    →  Incoming webhook handlers                │
│   /api/erp/*         →  ERPNext sync endpoints (internal)        │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐    │
│   │  BFF Middleware Stack:                                   │    │
│   │  1. CORS (same-origin only)                             │    │
│   │  2. Rate limiter (Redis-backed)                         │    │
│   │  3. Auth (session JWT validation)                       │    │
│   │  4. Locale extraction (Accept-Language header)          │    │
│   │  5. Request logging (trace ID injection)                │    │
│   │  6. Response envelope wrapping                          │    │
│   └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└────────────┬──────────────────────────┬──────────────────────────┘
             │                          │
             ▼                          ▼
┌──────────────────────┐   ┌──────────────────────────────────────┐
│   MEDUSA v2          │   │   ERPNext                            │
│   (Port 9000)        │   │   (Port 8000)                        │
│                      │   │                                      │
│   REST API           │   │   REST API                           │
│   /admin/*           │   │   /api/resource/*                    │
│   /store/*           │   │                                      │
│                      │   │   (Internal network only,            │
│   (Internal network) │   │    never exposed to client)          │
└──────────────────────┘   └──────────────────────────────────────┘
```

### Who Calls What

| Caller | Calls | How |
|---|---|---|
| Browser | Next.js BFF (`/api/v1/*`) | `fetch()` with credentials |
| Next.js BFF | Medusa Store API | Server-side HTTP (internal) |
| Next.js BFF | Medusa Admin API | Server-side HTTP (internal, service token) |
| Next.js BFF | ERPNext API | Server-side HTTP (internal, API key) |
| Medusa | PostgreSQL | Prisma / MikroORM (internal) |
| External webhooks | Next.js `/api/webhooks/*` | HTTPS POST (signature verified) |

---

## 3. URL Structure & Versioning

### 3.1 Version Strategy

| Decision | Choice | Rationale |
|---|---|---|
| Versioning style | URL path prefix (`/api/v1/`) | Explicit, cacheable, elder-friendly — no hidden headers to explain |
| Current version | `v1` | First production release |
| When to bump | Breaking changes only. Additive changes (new fields, new endpoints) do not bump. | Follow SemVer principles. Clients must ignore unknown fields. |
| Max supported versions | 2 concurrent (`v1`, `v2` during migration) | We deprecate old versions with 6-month sunset notice. |
| Medusa API versioning | Handled internally by BFF. Frontend never sees Medusa version numbers. | BFF absorbs Medusa version changes. |

### 3.2 URL Patterns

```
Customer endpoints:
  GET    /api/v1/products                    List products
  GET    /api/v1/products/:id                Get product detail
  POST   /api/v1/cart                        Create cart
  POST   /api/v1/cart/items                  Add item to cart
  GET    /api/v1/orders                      List my orders
  GET    /api/v1/orders/:id                  Get order detail

Admin endpoints:
  GET    /api/admin/v1/products              List all products (admin view)
  PATCH  /api/admin/v1/products/:id          Update product
  GET    /api/admin/v1/orders                List all orders
  GET    /api/admin/v1/delivery/zones        List delivery zones

Webhook endpoints:
  POST   /api/webhooks/medusa                Medusa event webhooks
  POST   /api/webhooks/payment               Payment provider callbacks

Internal endpoints:
  POST   /api/erp/sync                       Trigger ERP sync
  GET    /api/erp/sync/status                Check sync status
```

### 3.3 URL Naming Rules

| Rule | Convention | Example |
|---|---|---|
| Resource names | Plural nouns | `/products`, `/orders`, `/cart/items` |
| Nested resources | Maximum 2 levels | `/orders/:id/items` ✓ — `/orders/:id/items/:itemId/variants` ✗ |
| Actions as verbs | Only when not CRUD | `/cart/checkout`, `/auth/login`, `/auth/logout` |
| No verbs in CRUD | Use HTTP method | `POST /cart/items` (not `POST /cart/add-item`) |
| Kebab-case for multi-word | `delivery-zones`, `price-tiers` | `/delivery-zones/:id/slots` |
| IDs in path | Only for single-resource operations | `/products/prod_01ABC` |
| Query for filtering | Never in path | `/products?category=rice&in_stock=true` |

---

## 4. Authentication & Authorization

### 4.1 Authentication Flow

```
┌──────────┐         ┌──────────┐         ┌──────────┐
│  Browser │         │  Next.js │         │  Medusa  │
│          │         │   BFF    │         │          │
└────┬─────┘         └────┬─────┘         └────┬─────┘
     │                    │                    │
     │  POST /api/v1/    │                    │
     │  auth/login       │                    │
     │  { phone, otp }   │                    │
     │──────────────────→│                    │
     │                    │  POST /auth/emailpass  │
     │                    │  (or custom OTP auth)   │
     │                    │───────────────────→│
     │                    │                    │
     │                    │  { token, customer }   │
     │                    │←───────────────────│
     │                    │                    │
     │  Set-Cookie:       │                    │
     │  ggh_session       │                    │
     │  (HttpOnly,        │                    │
     │   Secure, SameSite)│                    │
     │←──────────────────│                    │
     │                    │                    │
     │  GET /api/v1/cart  │                    │
     │  Cookie: ggh_session                   │
     │──────────────────→│                    │
     │                    │  Extract session   │
     │                    │  Forward to Medusa │
     │                    │───────────────────→│
```

### 4.2 Session Strategy

| Property | Value | Why |
|---|---|---|
| Token type | HttpOnly cookie (`ggh_session`) | XSS-safe. No token in localStorage. |
| Cookie attributes | `Secure; SameSite=Strict; Path=/; Max-Age=86400` | 24-hour session. Strict CSRF protection. |
| Token format | JWT (signed, not encrypted) | Stateless validation. No session store needed for auth. |
| Guest carts | Session-bound cart ID in cookie | No login required to browse and build a cart. |
| Admin auth | Separate cookie (`ggh_admin_session`) | Isolated from customer sessions. Different expiry (8 hours). |

### 4.3 JWT Payload Structure

```
{
  "sub": "cus_01ABC123",          // Medusa customer ID
  "phone": "+201012345678",       // Verified phone number
  "role": "customer",             // "customer" | "admin" | "driver"
  "zone_id": "zone_01DEF456",     // Customer's delivery zone
  "iat": 1700000000,              // Issued at
  "exp": 1700086400               // Expires at (24h)
}
```

### 4.4 Authorization Matrix

| Resource | Guest | Customer | Admin | Driver |
|---|---|---|---|---|
| Browse products | ✓ | ✓ | ✓ | ✓ |
| View product detail | ✓ | ✓ | ✓ | ✓ |
| Create cart | ✓ | ✓ | ✗ | ✗ |
| Add to cart | ✓ (guest cart) | ✓ | ✗ | ✗ |
| Checkout | ✗ | ✓ | ✗ | ✗ |
| View own orders | ✗ | ✓ | ✗ | ✓ (assigned) |
| View all orders | ✗ | ✗ | ✓ | ✓ (assigned area) |
| Manage products | ✗ | ✗ | ✓ | ✗ |
| Manage delivery zones | ✗ | ✗ | ✓ | ✗ |
| Update order status | ✗ | ✗ | ✓ | ✓ (assigned) |
| ERP sync triggers | ✗ | ✗ | ✓ | ✗ |

### 4.5 OTP Authentication (Egypt-Specific)

GGH uses phone-based OTP instead of email/password. This is critical for the Egyptian market where many elder users don't use email.

```
Step 1:  POST /api/v1/auth/otp/request
         { "phone": "+201012345678" }
         → SMS sent to phone
         → Response: { "expires_in": 300 }  (5 minutes)

Step 2:  POST /api/v1/auth/otp/verify
         { "phone": "+201012345678", "code": "1234" }
         → On success: Set-Cookie with session
         → On new customer: auto-create customer record
         → Response: { "customer": { ... }, "is_new": true }
```

**OTP Rules:**

| Rule | Value | Why |
|---|---|---|
| Code length | 4 digits | Elder-friendly. Easy to read and type. |
| Expiry | 5 minutes | Security vs. usability balance. |
| Max attempts | 3 per code | Prevent brute force. |
| Resend cooldown | 60 seconds | Prevent SMS abuse. |
| Max sends per day | 5 per phone number | Rate limit SMS costs. |

---

## 5. Request Format

### 5.1 Common Headers

| Header | Required | Description |
|---|---|---|
| `Content-Type` | Yes (for body) | `application/json` |
| `Accept-Language` | Optional | `ar` or `en`. Defaults to `ar` for Egyptian market. |
| `X-Request-ID` | Optional | Client-generated UUID for tracing. Server generates if missing. |
| `X-Idempotency-Key` | Optional | For safe retries on `POST` requests. Prevents duplicates. |

### 5.2 Request Body Rules

| Rule | Convention |
|---|---|
| Content type | `application/json` only. No form-encoded. |
| Encoding | UTF-8 always |
| Null handling | Omit null fields rather than sending `"field": null` |
| Empty strings | Send `""` for cleared text fields. Never send `"null"` as a string. |
| Money in requests | Integer (piastres). Client sends `11050` for EGP 110.50. |
| Phone numbers | E.164 format: `+201012345678` |
| Dates | ISO 8601: `2025-01-15T10:30:00Z` |
| IDs | String (Medusa format): `"prod_01ABC"`, `"ord_01DEF"` |
| Arrays | Always wrap in field: `{ "variant_ids": ["var_01", "var_02"] }` |
| Bilingual fields | Send both or one: `{ "name_en": "Rice", "name_ar": "أرز" }` |

### 5.3 Example Request

```
POST /api/v1/cart/items
Content-Type: application/json
Accept-Language: ar
X-Request-ID: req_uuid_abc123

{
  "variant_id": "variant_01JKL789",
  "quantity": 2
}
```

---

## 6. Response Format

### 6.1 Success Envelope

Every successful response follows this structure:

```
{
  "data": T,                    // The actual payload
  "meta": {                     // Request metadata
    "request_id": "req_uuid_abc123",
    "timestamp": "2025-01-15T10:30:00Z"
  }
}
```

For paginated collections:

```
{
  "data": [ ... ],              // Array of items
  "meta": {
    "request_id": "req_uuid_abc123",
    "timestamp": "2025-01-15T10:30:00Z"
  },
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 147,
    "total_pages": 8,
    "has_next": true,
    "has_prev": false
  }
}
```

### 6.2 Field Naming in Responses

| Convention | Rule | Example |
|---|---|---|
| camelCase | All JSON keys are camelCase | `variantId`, `createdAt`, `totalAmount` |
| Money fields | Integer + `_amount` suffix | `totalAmount: 11050` (piastres) |
| Timestamps | ISO 8601 string | `"createdAt": "2025-01-15T10:30:00Z"` |
| Bilingual | Both languages always present | `nameEn: "Rice"`, `nameAr: "أرز"` |
| IDs | String type | `"id": "prod_01ABC"` |
| Booleans | Always explicit `true`/`false` | `"inStock": true`, never `0`/`1` |
| Null vs. missing | Missing field = not applicable. Explicit `null` = known absent value. | `discountAmount` missing = no discount. `discountAmount: null` = discount not yet calculated. |

### 6.3 Example Product Response

```
{
  "data": {
    "id": "prod_01JKL789",
    "nameEn": "Egyptian Rice - 5kg",
    "nameAr": "أرز مصري - ٥ كيلو",
    "descriptionEn": "Premium short-grain Egyptian rice",
    "descriptionAr": "أرز مصري قصير الحبة فاخر",
    "thumbnail": "/uploads/rice-5kg.jpg",
    "category": {
      "id": "cat_01RICE",
      "nameEn": "Rice & Grains",
      "nameAr": "أرز وحبوب"
    },
    "variants": [
      {
        "id": "var_01JKL789",
        "titleEn": "5kg Bag",
        "titleAr": "كيس ٥ كيلو",
        "sku": "RICE-EG-5KG",
        "priceAmount": 27500,
        "currencyCode": "EGP",
        "inStock": true,
        "stockQuantity": 340,
        "isCasePack": false,
        "minOrderQty": 1,
        "casePackQty": null
      }
    ],
    "tags": ["staple", "wholesale"],
    "createdAt": "2025-01-10T08:00:00Z",
    "updatedAt": "2025-01-15T06:30:00Z"
  },
  "meta": {
    "request_id": "req_uuid_abc123",
    "timestamp": "2025-01-15T10:30:00Z"
  }
}
```

### 6.4 Money Formatting Contract

The API **always** sends piastres (integer). The frontend **always** formats for display.

```
Database:   27500  (piastres, INTEGER)
     ↕
API:        27500  (piastres, JSON number)
     ↕
Frontend:   "٢٧٥٫٠٠ ج.م"  (Arabic-Indic numerals, EGP)
Frontend:   "EGP 275.00"  (Western numerals, EGP)
```

**No formatting happens in the API.** The API is locale-agnostic.

---

## 7. Error Responses

### 7.1 Error Envelope

Every error follows this exact structure:

```
{
  "error": {
    "code": "CART_ITEM_OUT_OF_STOCK",
    "message": "The item you selected is no longer available in the quantity requested",
    "messageAr": "الصنف المحدد غير متوفر بالكمية المطلوبة",
    "detail": {
      "variantId": "var_01JKL789",
      "requestedQty": 10,
      "availableQty": 3
    },
    "docUrl": "https://docs.ggh.eg/api/errors/CART_ITEM_OUT_OF_STOCK"
  },
  "meta": {
    "request_id": "req_uuid_abc123",
    "timestamp": "2025-01-15T10:30:00Z"
  }
}
```

### 7.2 Error Code System

Error codes are `UPPER_SNAKE_CASE` with a domain prefix. They are **stable** — once published, they never change meaning.

| Domain | Prefix | Examples |
|---|---|---|
| Authentication | `AUTH_` | `AUTH_INVALID_OTP`, `AUTH_OTP_EXPIRED`, `AUTH_SESSION_EXPIRED`, `AUTH_UNAUTHORIZED` |
| Cart | `CART_` | `CART_NOT_FOUND`, `CART_ITEM_OUT_OF_STOCK`, `CART_MIN_QTY_NOT_MET`, `CART_EMPTY_CHECKOUT` |
| Order | `ORDER_` | `ORDER_NOT_FOUND`, `ORDER_CANT_CANCEL`, `ORDER_ALREADY_DELIVERED` |
| Product | `PRODUCT_` | `PRODUCT_NOT_FOUND`, `PRODUCT_UNAVAILABLE`, `PRODUCT_VARIANT_NOT_FOUND` |
| Delivery | `DELIVERY_` | `DELIVERY_ZONE_NOT_COVERED`, `DELIVERY_SLOT_FULL`, `DELIVERY_SLOT_EXPIRED` |
| Payment | `PAYMENT_` | `PAYMENT_FAILED`, `PAYMENT_TIMEOUT`, `PAYMENT_METHOD_UNSUPPORTED` |
| Validation | `VALIDATION_` | `VALIDATION_INVALID_PHONE`, `VALIDATION_REQUIRED_FIELD`, `VALIDATION_QTY_TOO_LOW` |
| System | `SYSTEM_` | `SYSTEM_INTERNAL_ERROR`, `SYSTEM_SERVICE_UNAVAILABLE`, `SYSTEM_RATE_LIMITED` |
| ERP | `ERP_` | `ERP_SYNC_FAILED`, `ERP_CONNECTION_ERROR`, `ERP_DATA_CONFLICT` |

### 7.3 HTTP Status Code Mapping

| Status | When Used | Example |
|---|---|---|
| `200` | Successful retrieval or update | GET product, PATCH order |
| `201` | Successful creation | POST new cart, POST checkout |
| `204` | Successful deletion (no body) | DELETE cart item |
| `400` | Validation error, malformed request | Missing required field, invalid phone format |
| `401` | Not authenticated | Missing or expired session cookie |
| `403` | Authenticated but not authorized | Customer trying to access admin endpoint |
| `404` | Resource not found | Product ID doesn't exist |
| `409` | Conflict / state violation | Trying to cancel a delivered order |
| `422` | Business logic validation | Order minimum not met, delivery zone not covered |
| `429` | Rate limited | Too many OTP requests |
| `500` | Unexpected server error | Unhandled exception (never expose stack trace) |
| `502` | Upstream service failure | Medusa or ERPNext is down |
| `503` | Service temporarily unavailable | Maintenance mode |

### 7.4 Validation Error Detail

When multiple fields fail validation, return all errors at once — never one at a time. This is critical for elder-friendly UX: fix everything in one go.

```
{
  "error": {
    "code": "VALIDATION_MULTIPLE_ERRORS",
    "message": "Please correct the highlighted fields",
    "messageAr": "يرجى تصحيح الحقول المحددة",
    "detail": {
      "fields": [
        {
          "field": "phone",
          "code": "VALIDATION_INVALID_PHONE",
          "message": "Phone number must start with +20",
          "messageAr": "يجب أن يبدأ رقم الهاتف بـ +20"
        },
        {
          "field": "quantity",
          "code": "VALIDATION_QTY_TOO_LOW",
          "message": "Minimum order is 5 units for this product",
          "messageAr": "الحد الأدنى للطلب ٥ وحدات لهذا المنتج"
        }
      ]
    }
  },
  "meta": {
    "request_id": "req_uuid_abc123",
    "timestamp": "2025-01-15T10:30:00Z"
  }
}
```

### 7.5 Error Rules

| Rule | Why |
|---|---|
| **Never expose stack traces** | Security risk. Confusing for users. |
| **Always include Arabic message** | Elder users see Arabic error messages. |
| **Always include `request_id`** | Support can trace the exact request in logs. |
| **Never return raw Medusa errors** | BFF translates Medusa errors into GGH error codes. |
| **Never return raw ERPNext errors** | Same reason. Wrap and translate. |
| **5xx errors are generic** | "Something went wrong. Please try again." — no internal details. |
| **4xx errors are specific** | Tell the user exactly what to fix and how. |

---

## 8. Pagination

### 8.1 Pagination Style

GGH uses **page-based pagination**. Not cursor-based. Why?

| Factor | Decision | Rationale |
|---|---|---|
| Page numbers in UI | Elder users understand "Page 3 of 8" | Cursor pagination is opaque and confusing |
| Dataset size | Product catalog ~500–2000 items | Not large enough to need cursor pagination |
| Jump to page | Users need to jump to page 5 | Cursor can't do arbitrary page jumps |
| SEO / sharing | URLs are shareable: `/products?page=3` | Cursor URLs are not human-readable |

### 8.2 Pagination Parameters

| Parameter | Type | Default | Max | Description |
|---|---|---|---|---|
| `page` | integer | 1 | — | Page number (1-based) |
| `per_page` | integer | 20 | 100 | Items per page |

### 8.3 Request Example

```
GET /api/v1/products?category=rice&page=2&per_page=20
```

### 8.4 Response Example

```
{
  "data": [ ... 20 products ... ],
  "meta": {
    "request_id": "req_uuid_abc123",
    "timestamp": "2025-01-15T10:30:00Z"
  },
  "pagination": {
    "page": 2,
    "per_page": 20,
    "total": 47,
    "total_pages": 3,
    "has_next": true,
    "has_prev": true
  }
}
```

### 8.5 Pagination Rules

| Rule | Convention |
|---|---|
| Empty page | Return `200` with `data: []` and correct pagination metadata. Not `404`. |
| `per_page` over max | Silently cap at 100. Don't error. |
| `page` over total | Return `200` with `data: []` and `has_next: false`. |
| Zero or negative values | Return `400` with `VALIDATION_INVALID_PARAMETER`. |

---

## 9. Filtering & Sorting

### 9.1 Filter Parameters

Filters are passed as query parameters. Only predefined filters are supported — no arbitrary field filtering.

```
GET /api/v1/products?category=rice&in_stock=true&price_max=50000&sort=price_asc
```

### 9.2 Common Filter Patterns

| Filter | Type | Example | Description |
|---|---|---|---|
| `category` | string (slug) | `category=rice` | Filter by category slug |
| `in_stock` | boolean | `in_stock=true` | Only show available items |
| `price_min` | integer (piastres) | `price_min=5000` | Minimum price filter |
| `price_max` | integer (piastres) | `price_max=50000` | Maximum price filter |
| `search` | string | `search=أرز` | Full-text search (Arabic + English) |
| `tag` | string | `tag=staple` | Filter by product tag |
| `brand` | string | `brand=egyptian` | Filter by brand slug |

### 9.3 Sort Parameters

| Parameter | Values | Default |
|---|---|---|
| `sort` | `price_asc`, `price_desc`, `name_asc`, `name_desc`, `newest`, `popularity` | `popularity` |

Sort values are human-readable strings, not raw column names. This prevents injection and makes the API self-documenting.

### 9.4 Filter Rules

| Rule | Convention |
|---|---|
| Unknown filters | Silently ignored. Don't error. |
| Invalid filter values | Return `400` with `VALIDATION_INVALID_FILTER`. |
| Multiple filters | AND logic. `category=rice&in_stock=true` = rice AND in stock. |
| Empty result set | Return `200` with `data: []`. Not `404`. |
| Search is special | `search` triggers full-text search across `name_en`, `name_ar`, `description_en`, `description_ar`, and `sku`. |

---

## 10. Endpoint Organization

### 10.1 File Structure in Next.js

```
src/app/api/
├── v1/                          # Customer API v1
│   ├── auth/
│   │   ├── otp/
│   │   │   ├── request/
│   │   │   │   └── route.ts     # POST - Request OTP
│   │   │   └── verify/
│   │   │       └── route.ts     # POST - Verify OTP
│   │   ├── logout/
│   │   │   └── route.ts         # POST - Logout
│   │   └── session/
│   │       └── route.ts         # GET - Check session
│   ├── products/
│   │   ├── route.ts             # GET - List products
│   │   └── [id]/
│   │       └── route.ts         # GET - Product detail
│   ├── cart/
│   │   ├── route.ts             # GET - Get cart, POST - Create cart
│   │   └── items/
│   │       ├── route.ts         # POST - Add item
│   │       └── [itemId]/
│   │           └── route.ts     # PATCH - Update qty, DELETE - Remove
│   ├── checkout/
│   │   ├── route.ts             # POST - Initiate checkout
│   │   ├── delivery/
│   │   │   ├── zones/
│   │   │   │   └── route.ts     # GET - Available delivery zones
│   │   │   └── slots/
│   │   │       └── route.ts     # GET - Available delivery slots
│   │   └── complete/
│   │       └── route.ts         # POST - Complete checkout
│   ├── orders/
│   │   ├── route.ts             # GET - List my orders
│   │   └── [id]/
│   │       └── route.ts         # GET - Order detail
│   ├── account/
│   │   ├── route.ts             # GET - Profile, PATCH - Update profile
│   │   ├── addresses/
│   │   │   ├── route.ts         # GET - List, POST - Create
│   │   │   └── [addressId]/
│   │   │       └── route.ts     # PATCH - Update, DELETE - Remove
│   │   └── templates/
│   │       ├── route.ts         # GET - List order templates
│   │       └── [templateId]/
│   │           └── route.ts     # GET - Template detail, DELETE - Remove
│   ├── categories/
│   │   ├── route.ts             # GET - List categories
│   │   └── [slug]/
│   │       └── route.ts         # GET - Category detail + products
│   └── search/
│       └── route.ts             # GET - Search products
│
├── admin/
│   └── v1/                      # Admin API v1
│       ├── auth/
│       │   └── login/
│       │       └── route.ts     # POST - Admin login
│       ├── products/
│       │   ├── route.ts         # GET - List, POST - Create
│       │   └── [id]/
│       │       └── route.ts     # GET, PATCH - Product management
│       ├── orders/
│       │   ├── route.ts         # GET - List all orders
│       │   └── [id]/
│       │       └── route.ts     # GET, PATCH - Order management
│       ├── delivery/
│       │   ├── zones/
│       │   │   ├── route.ts     # GET - List, POST - Create
│       │   │   └── [zoneId]/
│       │   │       └── route.ts # GET, PATCH, DELETE
│       │   └── slots/
│       │       ├── route.ts     # GET - List, POST - Create
│       │       └── [slotId]/
│       │           └── route.ts # GET, PATCH, DELETE
│       ├── erp/
│       │   ├── sync/
│       │   │   └── route.ts     # POST - Trigger sync
│       │   └── sync-status/
│       │       └── route.ts     # GET - Check sync status
│       └── dashboard/
│           └── route.ts         # GET - Dashboard stats
│
├── webhooks/                    # Incoming webhooks
│   ├── medusa/
│   │   └── route.ts             # POST - Medusa event webhooks
│   └── payment/
│       └── route.ts             # POST - Payment provider callbacks
│
└── health/
    └── route.ts                 # GET - Health check
```

### 10.2 Route Handler Pattern

Every route handler follows this structure:

```
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middleware/auth';
import { withErrorHandler } from '@/lib/api/middleware/error-handler';
import { withRateLimit } from '@/lib/api/middleware/rate-limit';
import { validateRequest } from '@/lib/api/validation';
import { productSearchSchema } from '@/lib/api/schemas/product';
import { productService } from '@/services/product';

export const GET = withErrorHandler(
  withRateLimit('product-list',
    withAuth(async (request: NextRequest, { user }) => {
      const params = validateRequest(request, productSearchSchema);

      const result = await productService.search(params);

      return NextResponse.json({
        data: result.items,
        meta: {
          request_id: request.headers.get('x-request-id'),
          timestamp: new Date().toISOString(),
        },
        pagination: result.pagination,
      });
    }, { optional: true })   // optional auth = guests can browse
  )
);
```

---

## 11. BFF Endpoints — Customer

### 11.1 Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/otp/request` | None | Send OTP to phone number |
| `POST` | `/api/v1/auth/otp/verify` | None | Verify OTP and create session |
| `POST` | `/api/v1/auth/logout` | Customer | Destroy session |
| `GET` | `/api/v1/auth/session` | Customer | Check if session is valid |

**OTP Request:**

```
Request:
  POST /api/v1/auth/otp/request
  { "phone": "+201012345678" }

Success (200):
  { "data": { "expires_in": 300, "resend_cooldown": 60 }, "meta": { ... } }

Error (429):
  { "error": { "code": "SYSTEM_RATE_LIMITED", "message": "Too many OTP requests. Try again later.", "messageAr": "طلبات كثيرة. حاول لاحقاً." }, "meta": { ... } }
```

**OTP Verify:**

```
Request:
  POST /api/v1/auth/otp/verify
  { "phone": "+201012345678", "code": "1234" }

Success (200):
  {
    "data": {
      "customer": { "id": "cus_01ABC", "phone": "+201012345678", "nameEn": null, "nameAr": null },
      "is_new": true
    },
    "meta": { ... }
  }
  + Set-Cookie: ggh_session=eyJ...; HttpOnly; Secure; SameSite=Strict; Max-Age=86400; Path=/

Error (401):
  { "error": { "code": "AUTH_INVALID_OTP", "message": "The code you entered is incorrect", "messageAr": "الكود الذي أدخلته غير صحيح" }, "meta": { ... } }
```

### 11.2 Products

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/products` | Optional | List/search products with filters |
| `GET` | `/api/v1/products/:id` | Optional | Get product detail with variants |
| `GET` | `/api/v1/categories` | Optional | List all categories |
| `GET` | `/api/v1/categories/:slug` | Optional | Category detail with products |
| `GET` | `/api/v1/search` | Optional | Full-text search across products |

**Product List:**

```
GET /api/v1/products?category=rice&in_stock=true&sort=price_asc&page=1&per_page=20

Response (200):
{
  "data": [
    {
      "id": "prod_01JKL",
      "nameEn": "Egyptian Rice - 5kg",
      "nameAr": "أرز مصري - ٥ كيلو",
      "thumbnail": "/uploads/rice-5kg.jpg",
      "priceRange": {
        "minAmount": 27500,
        "maxAmount": 27500,
        "currencyCode": "EGP"
      },
      "inStock": true,
      "category": { "id": "cat_01RICE", "nameEn": "Rice & Grains", "nameAr": "أرز وحبوب" }
    }
  ],
  "meta": { ... },
  "pagination": { "page": 1, "per_page": 20, "total": 12, "total_pages": 1, "has_next": false, "has_prev": false }
}
```

**Product Detail:**

```
GET /api/v1/products/prod_01JKL

Response (200):
{
  "data": {
    "id": "prod_01JKL",
    "nameEn": "Egyptian Rice - 5kg",
    "nameAr": "أرز مصري - ٥ كيلو",
    "descriptionEn": "Premium short-grain Egyptian rice, perfect for everyday cooking.",
    "descriptionAr": "أرز مصري قصير الحبة فاخر، مثالي للطبخ اليومي.",
    "thumbnail": "/uploads/rice-5kg.jpg",
    "images": ["/uploads/rice-5kg.jpg", "/uploads/rice-5kg-2.jpg"],
    "category": {
      "id": "cat_01RICE",
      "nameEn": "Rice & Grains",
      "nameAr": "أرز وحبوب"
    },
    "variants": [
      {
        "id": "var_01JKL",
        "titleEn": "5kg Bag",
        "titleAr": "كيس ٥ كيلو",
        "sku": "RICE-EG-5KG",
        "priceAmount": 27500,
        "originalPriceAmount": null,
        "currencyCode": "EGP",
        "inStock": true,
        "stockQuantity": 340,
        "isCasePack": false,
        "minOrderQty": 1,
        "casePackQty": null,
        "unitLabelEn": "Bag",
        "unitLabelAr": "كيس"
      },
      {
        "id": "var_02JKL",
        "titleEn": "25kg Sack (Case Pack)",
        "titleAr": "شيكارة ٢٥ كيلو (جملة)",
        "sku": "RICE-EG-25KG",
        "priceAmount": 125000,
        "originalPriceAmount": 137500,
        "currencyCode": "EGP",
        "inStock": true,
        "stockQuantity": 85,
        "isCasePack": true,
        "minOrderQty": 1,
        "casePackQty": 25,
        "unitLabelEn": "Sack",
        "unitLabelAr": "شيكارة"
      }
    ],
    "tags": ["staple", "wholesale"],
    "relatedProducts": ["prod_02WHEAT", "prod_03PASTA"]
  },
  "meta": { ... }
}
```

### 11.3 Categories

```
GET /api/v1/categories

Response (200):
{
  "data": [
    {
      "id": "cat_01RICE",
      "nameEn": "Rice & Grains",
      "nameAr": "أرز وحبوب",
      "slug": "rice-grains",
      "thumbnail": "/uploads/cat-rice.jpg",
      "productCount": 12,
      "parentCategory": null
    },
    {
      "id": "cat_02OIL",
      "nameEn": "Oils & Ghee",
      "nameAr": "زيوت وسمنة",
      "slug": "oils-ghee",
      "thumbnail": "/uploads/cat-oil.jpg",
      "productCount": 8,
      "parentCategory": null
    }
  ],
  "meta": { ... }
}
```

---

## 12. BFF Endpoints — Product

### 12.1 Search

```
GET /api/v1/search?q=أرز&per_page=10

Response (200):
{
  "data": {
    "query": "أرز",
    "products": [ ... ],
    "categories": [
      { "id": "cat_01RICE", "nameEn": "Rice & Grains", "nameAr": "أرز وحبوب", "slug": "rice-grains" }
    ]
  },
  "meta": { ... },
  "pagination": { ... }
}
```

Search rules:

| Rule | Convention |
|---|---|
| Minimum query length | 2 characters. Return empty for 0–1 chars. |
| Arabic normalization | Strip diacritics (tashkeel) before searching. |
| Bilingual search | Search both `_en` and `_ar` columns regardless of query script. |
| Fuzzy matching | Use PostgreSQL `pg_trgm` with similarity threshold 0.3. |
| Result limit | Max 50 results per search. |

---

## 13. BFF Endpoints — Cart & Checkout

### 13.1 Cart

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/cart` | Optional | Get current cart (creates if missing) |
| `POST` | `/api/v1/cart/items` | Optional | Add item to cart |
| `PATCH` | `/api/v1/cart/items/:itemId` | Optional | Update item quantity |
| `DELETE` | `/api/v1/cart/items/:itemId` | Optional | Remove item from cart |
| `DELETE` | `/api/v1/cart` | Optional | Clear entire cart |

**Add to Cart:**

```
Request:
  POST /api/v1/cart/items
  { "variant_id": "var_01JKL", "quantity": 2 }

Response (200):
{
  "data": {
    "id": "cart_01XYZ",
    "items": [
      {
        "id": "item_01AA",
        "variantId": "var_01JKL",
        "nameEn": "Egyptian Rice - 5kg",
        "nameAr": "أرز مصري - ٥ كيلو",
        "thumbnail": "/uploads/rice-5kg.jpg",
        "quantity": 2,
        "unitPriceAmount": 27500,
        "totalPriceAmount": 55000,
        "currencyCode": "EGP",
        "inStock": true,
        "maxQuantity": 340
      }
    ],
    "summary": {
      "subtotalAmount": 55000,
      "deliveryFeeAmount": 2500,
      "discountAmount": 0,
      "totalAmount": 57500,
      "currencyCode": "EGP",
      "itemCount": 1
    }
  },
  "meta": { ... }
}
```

**Cart Error — Out of Stock:**

```
Request:
  POST /api/v1/cart/items
  { "variant_id": "var_01JKL", "quantity": 500 }

Response (409):
{
  "error": {
    "code": "CART_ITEM_OUT_OF_STOCK",
    "message": "Only 340 units available. Would you like to add the maximum available?",
    "messageAr": "٣٤٠ وحدة متاحة فقط. هل تريد إضافة أقصى كمية متاحة؟",
    "detail": {
      "variantId": "var_01JKL",
      "requestedQty": 500,
      "availableQty": 340
    }
  },
  "meta": { ... }
}
```

### 13.2 Checkout Flow

```
Step 1:  GET  /api/v1/checkout/delivery/zones      → Pick delivery zone
Step 2:  GET  /api/v1/checkout/delivery/slots?zone_id=zone_01  → Pick delivery slot
Step 3:  POST /api/v1/checkout                      → Submit checkout
Step 4:  POST /api/v1/checkout/complete             → Confirm after payment
```

**Checkout Submission:**

```
Request:
  POST /api/v1/checkout
  {
    "delivery_zone_id": "zone_01CAIRO",
    "delivery_slot_id": "slot_01MORNING",
    "delivery_address_id": "addr_01HOME",
    "payment_method": "cash_on_delivery",
    "customer_notes": "Ring the doorbell loudly please"
  }

Response (200):
{
  "data": {
    "orderId": "ord_01CHECKOUT",
    "status": "pending",
    "totalAmount": 57500,
    "currencyCode": "EGP",
    "deliveryWindow": {
      "date": "2025-01-16",
      "slotEn": "Morning (8 AM - 12 PM)",
      "slotAr": "الصبح (٨ ص - ١٢ م)"
    },
    "paymentMethod": "cash_on_delivery",
    "estimatedDelivery": "2025-01-16T12:00:00Z"
  },
  "meta": { ... }
}
```

---

## 14. BFF Endpoints — Order

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/orders` | Customer | List my orders |
| `GET` | `/api/v1/orders/:id` | Customer | Order detail with items and timeline |

**Order List:**

```
GET /api/v1/orders?page=1&per_page=10

Response (200):
{
  "data": [
    {
      "id": "ord_01ABC",
      "status": "delivered",
      "statusLabelEn": "Delivered",
      "statusLabelAr": "تم التوصيل",
      "totalAmount": 57500,
      "currencyCode": "EGP",
      "itemCount": 3,
      "createdAt": "2025-01-10T14:30:00Z",
      "deliveredAt": "2025-01-11T10:15:00Z",
      "deliverySlot": {
        "date": "2025-01-11",
        "slotAr": "الصبح (٨ ص - ١٢ م)"
      }
    }
  ],
  "meta": { ... },
  "pagination": { ... }
}
```

**Order Detail:**

```
GET /api/v1/orders/ord_01ABC

Response (200):
{
  "data": {
    "id": "ord_01ABC",
    "status": "delivered",
    "statusLabelEn": "Delivered",
    "statusLabelAr": "تم التوصيل",
    "items": [
      {
        "id": "item_01AA",
        "nameEn": "Egyptian Rice - 5kg",
        "nameAr": "أرز مصري - ٥ كيلو",
        "thumbnail": "/uploads/rice-5kg.jpg",
        "quantity": 2,
        "unitPriceAmount": 27500,
        "totalPriceAmount": 55000,
        "currencyCode": "EGP"
      }
    ],
    "summary": {
      "subtotalAmount": 55000,
      "deliveryFeeAmount": 2500,
      "discountAmount": 0,
      "totalAmount": 57500,
      "currencyCode": "EGP"
    },
    "delivery": {
      "zoneNameEn": "Cairo - Nasr City",
      "zoneNameAr": "القاهرة - مدينة نصر",
      "addressEn": "5 Abbas El-Akkad St., Nasr City",
      "addressAr": "٥ شارع عباس العقاد، مدينة نصر",
      "slotDate": "2025-01-11",
      "slotEn": "Morning (8 AM - 12 PM)",
      "slotAr": "الصبح (٨ ص - ١٢ م)"
    },
    "payment": {
      "method": "cash_on_delivery",
      "methodLabelEn": "Cash on Delivery",
      "methodLabelAr": "الدفع عند الاستلام",
      "status": "captured"
    },
    "timeline": [
      { "status": "pending", "timestamp": "2025-01-10T14:30:00Z", "labelEn": "Order Placed", "labelAr": "تم تأكيد الطلب" },
      { "status": "confirmed", "timestamp": "2025-01-10T15:00:00Z", "labelEn": "Confirmed", "labelAr": "تم التأكيد" },
      { "status": "out_for_delivery", "timestamp": "2025-01-11T08:30:00Z", "labelEn": "Out for Delivery", "labelAr": "في الطريق" },
      { "status": "delivered", "timestamp": "2025-01-11T10:15:00Z", "labelEn": "Delivered", "labelAr": "تم التوصيل" }
    ],
    "createdAt": "2025-01-10T14:30:00Z",
    "updatedAt": "2025-01-11T10:15:00Z"
  },
  "meta": { ... }
}
```

---

## 15. BFF Endpoints — Delivery

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/checkout/delivery/zones` | Customer | Available delivery zones |
| `GET` | `/api/v1/checkout/delivery/slots?zone_id=X` | Customer | Available slots for a zone |

**Delivery Zones:**

```
GET /api/v1/checkout/delivery/zones

Response (200):
{
  "data": [
    {
      "id": "zone_01CAIRO",
      "nameEn": "Cairo - Nasr City",
      "nameAr": "القاهرة - مدينة نصر",
      "baseDeliveryFeeAmount": 2500,
      "freeDeliveryThresholdAmount": 100000,
      "estimatedHoursEn": "Next day",
      "estimatedHoursAr": "اليوم التالي",
      "isAvailable": true
    }
  ],
  "meta": { ... }
}
```

**Delivery Slots:**

```
GET /api/v1/checkout/delivery/slots?zone_id=zone_01CAIRO&date=2025-01-16

Response (200):
{
  "data": [
    {
      "id": "slot_01MORNING",
      "labelEn": "Morning (8 AM - 12 PM)",
      "labelAr": "الصبح (٨ ص - ١٢ م)",
      "date": "2025-01-16",
      "availableOrders": 5,
      "isAvailable": true
    },
    {
      "id": "slot_02EVENING",
      "labelEn": "Evening (4 PM - 8 PM)",
      "labelAr": "بعد العصر (٤ م - ٨ م)",
      "date": "2025-01-16",
      "availableOrders": 0,
      "isAvailable": false
    }
  ],
  "meta": { ... }
}
```

---

## 16. BFF Endpoints — Account

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/account` | Customer | Get profile |
| `PATCH` | `/api/v1/account` | Customer | Update profile |
| `GET` | `/api/v1/account/addresses` | Customer | List addresses |
| `POST` | `/api/v1/account/addresses` | Customer | Add address |
| `PATCH` | `/api/v1/account/addresses/:addressId` | Customer | Update address |
| `DELETE` | `/api/v1/account/addresses/:addressId` | Customer | Delete address |
| `GET` | `/api/v1/account/templates` | Customer | List order templates |
| `POST` | `/api/v1/account/templates` | Customer | Create order template |
| `GET` | `/api/v1/account/templates/:templateId` | Customer | Template detail |
| `DELETE` | `/api/v1/account/templates/:templateId` | Customer | Delete template |

**Profile:**

```
GET /api/v1/account

Response (200):
{
  "data": {
    "id": "cus_01ABC",
    "phone": "+201012345678",
    "nameEn": "Ibrahim Mohamed",
    "nameAr": "إبراهيم محمد",
    "email": null,
    "defaultDeliveryZoneId": "zone_01CAIRO",
    "addresses": [
      {
        "id": "addr_01HOME",
        "labelEn": "Home",
        "labelAr": "البيت",
        "address1En": "5 Abbas El-Akkad St.",
        "address1Ar": "٥ شارع عباس العقاد",
        "cityEn": "Cairo",
        "cityAr": "القاهرة",
        "isDefault": true
      }
    ],
    "orderStats": {
      "totalOrders": 12,
      "totalSpentAmount": 450000,
      "currencyCode": "EGP"
    },
    "createdAt": "2024-06-15T10:00:00Z"
  },
  "meta": { ... }
}
```

**Order Template (Reorder Feature):**

```
GET /api/v1/account/templates

Response (200):
{
  "data": [
    {
      "id": "tpl_01WEEKLY",
      "nameEn": "Weekly Essentials",
      "nameAr": "احتياجات الأسبوع",
      "itemCount": 5,
      "estimatedTotalAmount": 125000,
      "currencyCode": "EGP",
      "lastOrderedAt": "2025-01-08T14:00:00Z"
    }
  ],
  "meta": { ... }
}
```

---

## 17. Admin Endpoints

All admin endpoints require the `ggh_admin_session` cookie with `role: "admin"`.

### 17.1 Admin Auth

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/admin/v1/auth/login` | Email/password login |
| `POST` | `/api/admin/v1/auth/logout` | Destroy admin session |
| `GET` | `/api/admin/v1/auth/session` | Check admin session |

### 17.2 Admin Resources

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/v1/dashboard` | Dashboard statistics |
| `GET` | `/api/admin/v1/products` | All products (including unpublished) |
| `POST` | `/api/admin/v1/products` | Create product |
| `GET` | `/api/admin/v1/products/:id` | Product detail (admin view) |
| `PATCH` | `/api/admin/v1/products/:id` | Update product |
| `GET` | `/api/admin/v1/orders` | All orders |
| `GET` | `/api/admin/v1/orders/:id` | Order detail (admin view) |
| `PATCH` | `/api/admin/v1/orders/:id` | Update order status |
| `GET` | `/api/admin/v1/delivery/zones` | List delivery zones |
| `POST` | `/api/admin/v1/delivery/zones` | Create zone |
| `PATCH` | `/api/admin/v1/delivery/zones/:zoneId` | Update zone |
| `GET` | `/api/admin/v1/delivery/slots` | List delivery slots |
| `POST` | `/api/admin/v1/delivery/slots` | Create slot |
| `PATCH` | `/api/admin/v1/delivery/slots/:slotId` | Update slot |
| `GET` | `/api/admin/v1/erp/sync/status` | Last sync status |
| `POST` | `/api/admin/v1/erp/sync` | Trigger ERP sync |

### 17.3 Dashboard Response

```
GET /api/admin/v1/dashboard

Response (200):
{
  "data": {
    "today": {
      "ordersCount": 23,
      "revenueAmount": 2850000,
      "currencyCode": "EGP",
      "avgOrderAmount": 123913
    },
    "pendingDeliveries": 8,
    "lowStockProducts": 3,
    "recentOrders": [ ... last 5 orders ... ]
  },
  "meta": { ... }
}
```

---

## 18. Medusa API Proxy Rules

The BFF acts as a smart proxy to Medusa. It never passes Medusa responses through unchanged.

### 18.1 Translation Layer

```
Browser Request          BFF Processing              Medusa Call
───────────────          ───────────────              ───────────
GET /api/v1/products     → Validate params            → GET /store/products
                         → Add GGH price tiers         →  (with includes)
                         → Add delivery zone context
                         → Transform response
                         → Wrap in envelope
                         ← Return to browser
```

### 18.2 Proxy Rules

| Rule | Implementation |
|---|---|
| **Never expose Medusa URLs** | BFF maps GGH paths to Medusa paths internally. |
| **Translate error codes** | Medusa's `invalid_input` → GGH's `VALIDATION_REQUIRED_FIELD`. |
| **Inject GGH data** | Price tiers, delivery zones, and stock levels from `ggh` schema are merged into Medusa responses. |
| **Strip internal IDs** | Remove Medusa internal fields the frontend doesn't need. |
| **Add computed fields** | `isCasePack`, `minOrderQty`, `estimatedTotalAmount`. |
| **Cache product reads** | Product list and detail are cached in Redis with 5-minute TTL. |
| **Don't cache cart/order** | Cart and order data is always fresh. |

### 18.3 Request Forwarding

| BFF Path | Medusa Path | Method |
|---|---|---|
| `GET /api/v1/products` | `GET /store/products` | Proxy with filter translation |
| `GET /api/v1/products/:id` | `GET /store/products/:id` | Proxy with enrichment |
| `POST /api/v1/cart/items` | `POST /store/carts/:id/line-items` | Proxy with validation |
| `POST /api/v1/checkout` | `POST /store/carts/:id/complete` | Proxy with delivery data |
| `GET /api/v1/orders` | `GET /store/orders` | Proxy with auth |
| `GET /api/admin/v1/products` | `GET /admin/products` | Proxy with admin auth |

---

## 19. ERPNext Integration Endpoints

These are **internal-only** endpoints. They are never called by the browser. They are called by BullMQ workers or admin triggers.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/erp/sync` | Trigger full or incremental ERP sync |
| `GET` | `/api/erp/sync/status` | Get last sync status and timestamp |
| `POST` | `/api/erp/push/order` | Push order data to ERPNext |

**Sync Trigger:**

```
POST /api/erp/sync
{
  "type": "incremental",          // "full" | "incremental"
  "entities": ["products", "stock", "pricing"],
  "since": "2025-01-15T00:00:00Z"  // Only for incremental
}

Response (202):
{
  "data": {
    "jobId": "job_01SYNC",
    "status": "queued",
    "entities": ["products", "stock", "pricing"]
  },
  "meta": { ... }
}
```

**Sync Status:**

```
GET /api/erp/sync/status

Response (200):
{
  "data": {
    "lastSyncAt": "2025-01-15T10:00:00Z",
    "lastSyncStatus": "completed",
    "nextScheduledAt": "2025-01-15T22:00:00Z",
    "entities": {
      "products": { "lastSyncAt": "...", "recordCount": 450, "status": "completed" },
      "stock": { "lastSyncAt": "...", "recordCount": 380, "status": "completed" },
      "pricing": { "lastSyncAt": "...", "recordCount": 380, "status": "completed" }
    }
  },
  "meta": { ... }
}
```

---

## 20. Webhook Endpoints

### 20.1 Medusa Webhooks

```
POST /api/webhooks/medusa
X-Medusa-Signature: sha256=abcdef...

Payload:
{
  "event": "order.placed",
  "data": { "id": "ord_01ABC" },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

**Handled Events:**

| Event | Action |
|---|---|
| `order.placed` | Trigger ERP push job. Send customer notification. |
| `order.shipped` | Send "out for delivery" SMS to customer. |
| `order.delivered` | Send "delivered" SMS. Trigger satisfaction survey. |
| `payment.captured` | Update order payment status. |
| `payment.refunded` | Update order status. Notify customer. |
| `stock.updated` | Invalidate product cache. Update availability. |

### 20.2 Payment Webhooks

```
POST /api/webhooks/payment
X-Payment-Signature: sha256=abcdef...

Payload: (provider-specific, normalized by BFF)
```

### 20.3 Webhook Security

| Rule | Implementation |
|---|---|
| **Signature verification** | Every webhook must have a valid HMAC signature. Reject unsigned requests with `401`. |
| **Idempotency** | Process each event exactly once using `event_id` deduplication. |
| **Timeout** | Return `200` immediately. Process asynchronously via BullMQ. |
| **No auth required** | Webhooks use signature-based auth, not session cookies. |
| **Rate limited** | Stricter rate limits: 100 req/min per source IP. |

---

## 21. Rate Limiting

### 21.1 Rate Limit Strategy

Rate limits are enforced per-route-group using Redis counters.

| Route Group | Window | Limit | Key | Response on Exceed |
|---|---|---|---|---|
| OTP request | 60s / 24h | 1/min, 5/day | `rl:otp:{phone}` | `429 SYSTEM_RATE_LIMITED` |
| OTP verify | 5 min | 3 attempts | `rl:otp-verify:{phone}` | `429 AUTH_INVALID_OTP` (locked) |
| Product browse | 1 min | 60 requests | `rl:browse:{ip}` | `429 SYSTEM_RATE_LIMITED` |
| Cart operations | 1 min | 30 requests | `rl:cart:{session}` | `429 SYSTEM_RATE_LIMITED` |
| Checkout | 1 min | 5 requests | `rl:checkout:{session}` | `429 SYSTEM_RATE_LIMITED` |
| Search | 1 min | 30 requests | `rl:search:{ip}` | `429 SYSTEM_RATE_LIMITED` |
| Admin operations | 1 min | 100 requests | `rl:admin:{user_id}` | `429 SYSTEM_RATE_LIMITED` |
| Webhooks | 1 min | 100 requests | `rl:webhook:{ip}` | `429 SYSTEM_RATE_LIMITED` |

### 21.2 Rate Limit Headers

Every response includes rate limit headers:

| Header | Description |
|---|---|
| `X-RateLimit-Limit` | Maximum requests in the window |
| `X-RateLimit-Remaining` | Requests remaining in current window |
| `X-RateLimit-Reset` | Unix timestamp when the window resets |

### 21.3 Rate Limit Error Response

```
HTTP 429 Too Many Requests

{
  "error": {
    "code": "SYSTEM_RATE_LIMITED",
    "message": "Too many requests. Please wait a moment and try again.",
    "messageAr": "طلبات كثيرة. انتظر لحظة ثم حاول مرة أخرى.",
    "detail": {
      "retryAfterSeconds": 45
    }
  },
  "meta": { ... }
}
```

---

## 22. Caching Strategy

### 22.1 Cache Layers

```
┌─────────────────────────────────────────────────────────┐
│                    BROWSER CACHE                         │
│   Cache-Control headers on static assets & ISR pages     │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│                  NEXT.JS ISR CACHE                       │
│   Static pages regenerated on schedule or on-demand      │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│                  REDIS API CACHE                         │
│   API response caching with TTL per resource type        │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│                  MEDUSA / DATABASE                       │
│   Source of truth. Always fresh for mutations.           │
└─────────────────────────────────────────────────────────┘
```

### 22.2 Cache TTL by Resource

| Resource | TTL | Cache Key | Invalidation Trigger |
|---|---|---|---|
| Product list | 5 min | `products:list:{hash(filters)}` | Product update, stock change, price change |
| Product detail | 5 min | `products:detail:{id}` | Product update, variant change |
| Category list | 30 min | `categories:list` | Category CRUD |
| Delivery zones | 30 min | `delivery:zones` | Zone CRUD |
| Delivery slots | 2 min | `delivery:slots:{zone_id}:{date}` | Slot booking, slot config change |
| Cart | No cache | — | Always read from Medusa |
| Orders | No cache | — | Always fresh |
| Search results | 1 min | `search:{hash(query)}` | Product update |

### 22.3 Cache Invalidation Rules

| Rule | Implementation |
|---|---|
| **Write-through** | Any mutation (POST, PATCH, DELETE) invalidates related cache keys. |
| **Tag-based invalidation** | Cache entries are tagged: `products`, `categories`, `zones`. Invalidate by tag. |
| **Webhook-triggered** | Medusa `stock.updated` event invalidates product caches. |
| **Manual invalidation** | Admin can trigger `POST /api/admin/v1/cache/invalidate` with tag parameter. |
| **Never cache auth** | OTP, session, and auth endpoints are never cached. |

### 22.4 Cache Headers for Browser

| Resource | Cache-Control |
|---|---|
| Static assets (images, fonts) | `public, max-age=31536000, immutable` |
| ISR pages (product pages) | `public, s-maxage=300, stale-while-revalidate=60` |
| API responses | `private, no-cache` (Redis handles server-side caching) |
| API error responses | `no-store` |

---

## 23. Localization & RTL in API

### 23.1 Bilingual Field Convention

Every user-facing text in API responses includes both languages:

```
{
  "nameEn": "Egyptian Rice",
  "nameAr": "أرز مصري"
}
```

The frontend selects the appropriate field based on the current locale. The API **never** decides which language to return.

### 23.2 Why Both Fields, Always

| Approach | Problem |
|---|---|
| Server-side locale switching | Requires two API calls for bilingual comparison. Breaks caching (different cache per locale). |
| Client-side language selection | One response serves both languages. Cache hit rate is higher. |
| Single field with language toggle | Elder users switching between languages lose their page state. |

### 23.3 Accept-Language Header

The `Accept-Language` header is used for **default** values only — when a field is missing an Arabic translation, the API falls back to English. It never changes the response structure.

| Header Value | Behavior |
|---|---|
| `ar` | If `nameAr` is null, fall back to `nameEn` in the `nameAr` field. |
| `en` | If `nameEn` is null, fall back to `nameAr` in the `nameEn` field. |
| Missing | Treat as `ar` (Egyptian market default). |

### 23.4 Number Formatting

The API returns raw numbers. The frontend formats:

| Data | API Returns | Frontend Renders (AR) | Frontend Renders (EN) |
|---|---|---|---|
| Price | `27500` (piastres) | `٢٧٥٫٠٠ ج.م` | `EGP 275.00` |
| Quantity | `5` | `٥` | `5` |
| Phone | `+201012345678` | `+20 101 234 5678` | `+20 101 234 5678` |
| Date | `2025-01-15T10:30:00Z` | `١٥ يناير ٢٠٢٥` | `Jan 15, 2025` |
| Time | `2025-01-15T10:30:00Z` | `١٠:٣٠ ص` | `10:30 AM` |

---

## 24. Elder-Friendly API Design

These rules exist specifically because GGH serves Egyptian households where the primary user may be Om Ibrahim — a 60-year-old woman using a phone on a 3G connection.

### 24.1 Payload Minimization

| Rule | Why |
|---|---|
| Product list returns only: id, names, thumbnail, price range, in stock | A list of 20 products with full detail is 200KB+ vs 20KB. On 3G, that's 2 seconds vs 20 seconds. |
| Product detail is a separate request | Only fetch when the user taps. |
| Cart summary, not full items, for header badge | Don't re-fetch the entire cart to show "3 items". |
| Image URLs, not base64 | Let the browser cache images natively. |

### 24.2 Tolerance for User Mistakes

| Rule | Implementation |
|---|---|
| **Auto-correct phone format** | `01012345678` → `+201012345678`. `00201012345678` → `+201012345678`. Don't reject; fix. |
| **Trim whitespace** | All string inputs are trimmed before validation. |
| **Quantity capping, not rejection** | If user requests 500 but only 340 available, offer 340 instead of erroring. |
| **Cart recovery** | Guest carts persist for 7 days. If the user closes the browser and returns, their cart is still there. |
| **Double-submit protection** | `X-Idempotency-Key` header prevents duplicate orders from accidental double-taps. |
| **Graceful degradation** | If ERP is down, show cached product data with a "prices may vary" notice. Don't show an error page. |

### 24.3 Clear Status Communication

Every order status has both a machine code and human labels:

| Status Code | Label EN | Label AR | Description |
|---|---|---|---|
| `pending` | Order Placed | تم تأكيد الطلب | Waiting for confirmation |
| `confirmed` | Confirmed | تم التأكيد | Store confirmed availability |
| `preparing` | Being Prepared | جاري التحضير | Items being packed |
| `out_for_delivery` | On the Way | في الطريق | Driver is heading to you |
| `delivered` | Delivered | تم التوصيل | Order delivered successfully |
| `cancelled` | Cancelled | تم الإلغاء | Order was cancelled |
| `returned` | Returned | تم الاسترجاع | Order was returned |

---

## 25. WebSocket Events

GGH uses Socket.io for real-time updates. WebSocket connections go through the same BFF.

### 25.1 Connection

```
Client connects:
  io("/?XTransformPort=3003")

Authentication:
  Send session cookie on handshake.
  Server validates JWT and joins user to their room.
```

### 25.2 Event Catalog

| Event | Direction | Room | Payload |
|---|---|---|---|
| `order:status_updated` | Server → Client | `customer:{customerId}` | `{ orderId, status, statusLabelEn, statusLabelAr, timestamp }` |
| `delivery:eta_updated` | Server → Client | `customer:{customerId}` | `{ orderId, eta, driverName, driverPhone }` |
| `stock:changed` | Server → Client | `product:{productId}` | `{ variantId, inStock, stockQuantity }` |
| `admin:order_new` | Server → Client | `admin:orders` | `{ orderId, customerName, totalAmount }` |
| `admin:sync_completed` | Server → Client | `admin:system` | `{ jobId, status, recordCount }` |

### 25.3 WebSocket Rules

| Rule | Convention |
|---|---|
| Never send sensitive data | No phone numbers, no addresses in WebSocket events. Use IDs and fetch detail via REST. |
| Reconnect with backoff | Client reconnects with exponential backoff: 1s, 2s, 4s, 8s, max 30s. |
| Missed events recovery | On reconnect, client fetches current state via REST. WebSocket is supplemental, not primary. |
| No WebSocket-only features | Every real-time feature has a REST fallback. |

---

## 26. API Changelog Convention

### 26.1 Change Categories

| Category | Description | Version Impact |
|---|---|---|
| **Added** | New endpoint, new optional field, new filter | No version bump |
| **Changed** | Field type change, field renamed, behavior change | Version bump |
| **Deprecated** | Field or endpoint marked for removal | No version bump, 6-month sunset |
| **Removed** | Field or endpoint deleted | Version bump |
| **Fixed** | Bug fix that doesn't change contract | No version bump |

### 26.2 Changelog Format

Every API change is recorded in `docs/api-changelog.md`:

```
## 2025-01-15

### Added
- `GET /api/v1/search` — Full-text search endpoint
- `relatedProducts` field on product detail response

### Changed
- `priceAmount` on variant is now always present (previously null for some case packs)
  → Migrate before upgrading to v2

### Fixed
- `GET /api/v1/cart` now correctly calculates delivery fee for edge-case zones
```

### 26.3 Breaking Change Policy

| Policy | Rule |
|---|---|
| **Announce early** | Breaking changes are announced 6 months before activation. |
| **Coexist** | Old and new versions run simultaneously during migration. |
| **Sunset notice** | Deprecated endpoints return `Warning: 299 - "Deprecated: see /docs/api-changelog"` header. |
| **No silent breaks** | A field never changes meaning without a version bump. Adding a new field is never breaking. |

---

> **Next document:** `08_StateManagement.md` — Client state architecture, server state patterns, caching boundaries, and Zustand + TanStack Query conventions.
