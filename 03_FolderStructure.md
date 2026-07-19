# 03 — Folder Structure

> **GGH — Gomla Go Home** — Complete project structure, folder responsibilities, and file organization conventions.

---

## Table of Contents

1. [Structure Philosophy](#1-structure-philosophy)
2. [Repository Layout](#2-repository-layout)
3. [frontend/ — Next.js Application](#3-frontend--nextjs-application)
4. [frontend/src/app/ — Routing & Pages](#4-frontendsrcapp--routing--pages)
5. [frontend/src/components/ — UI Components](#5-frontendsrccomponents--ui-components)
6. [frontend/src/features/ — Domain Modules](#6-frontendsrcfeatures--domain-modules)
7. [frontend/src/hooks/ — Custom React Hooks](#7-frontendsrchooks--custom-react-hooks)
8. [frontend/src/lib/ — Core Libraries & Clients](#8-frontendsrclib--core-libraries--clients)
9. [frontend/src/services/ — API Service Layer](#9-frontendsrcservices--api-service-layer)
10. [frontend/src/types/ — TypeScript Definitions](#10-frontendsrctypes--typescript-definitions)
11. [frontend/src/styles/ — Global Styles & Tokens](#11-frontendsrcstyles--global-styles--tokens)
12. [frontend/src/public/ — Static Assets](#12-frontendsrcpublic--static-assets)
13. [frontend/src/locales/ — Translations](#13-frontendsrclocales--translations)
14. [frontend/src/providers/ — Context Providers](#14-frontendsrcproviders--context-providers)
15. [frontend/src/utils/ — Pure Utility Functions](#15-frontendsrcutils--pure-utility-functions)
16. [backend/ — Medusa v2 & Worker](#16-backend--medusa-v2--worker)
17. [plugins/ — Custom Medusa Modules](#17-plugins--custom-medusa-modules)
18. [docker/ — Containerization](#18-docker--containerization)
19. [docs/ — Documentation](#19-docs--documentation)
20. [scripts/ — Automation & Tooling](#20-scripts--automation--tooling)
21. [File Naming Conventions](#21-file-naming-conventions)
22. [Import Rules & Boundaries](#22-import-rules--boundaries)
23. [Adding a New Feature — Checklist](#23-adding-a-new-feature--checklist)

---

## 1. Structure Philosophy

Before listing folders, the principles that govern where files go:

| Principle | Rule | Why |
|---|---|---|
| **Feature locality** | Files that change together live together. A product card component, its hooks, and its types belong in the same feature directory, not scattered across three top-level folders. | Reduces cognitive load. When you fix a bug in "product card," you open one folder, not five. |
| **Dependency direction** | Dependencies flow inward. `features/` depends on `components/` and `lib/`. `components/` depends on `lib/` and `types/`. `lib/` depends on nothing internal. `utils/` depends on nothing at all. | Prevents circular dependencies. Makes the dependency graph a tree, not a web. |
| **No orphan files** | Every file has a home. If you cannot decide where a file belongs, the folder structure is wrong — fix the structure, not the file. | Prevents `misc/`, `shared/`, and `common/` from becoming junk drawers. |
| **Elder-friendly for developers too** | A new developer should find any file within 10 seconds by following the folder naming convention. No hidden files. No clever aliases. | If Om Ibrahim needs clear navigation, so does the junior developer joining the team. |
| **RTL-first organization** | Localization files are first-class citizens, not an afterthought in a `lang/` folder at the bottom. The `locales/` directory sits at the same level as `components/` and `features/`. | Arabic is the primary language. The folder structure must reflect this priority. |

### Dependency Graph

```
utils/          ← Pure functions. Zero dependencies on anything internal.
  │
  ▼
types/          ← Type definitions. May import from utils/ for branded types.
  │
  ▼
lib/            ← Core libraries, clients, configurations. Imports types/, utils/.
  │
  ▼
styles/         ← Design tokens, global CSS. No imports from features/ or components/.
  │
  ▼
locales/        ← Translation files. No code imports. Consumed by next-intl at build time.
  │
  ▼
components/     ← Reusable UI primitives. Imports lib/, types/, utils/. Never imports features/.
  │
  ▼
services/       ← API call functions. Imports lib/, types/. Never imports components/ or features/.
  │
  ▼
hooks/          ← Shared React hooks. Imports lib/, services/, types/. Never imports features/.
  │
  ▼
providers/      ← Context wrappers. Imports hooks/, lib/, types/.
  │
  ▼
features/       ← Domain modules. Imports everything above. Nothing imports from features/.
  │
  ▼
app/            ← Next.js routing. Imports features/, components/, providers/. The top of the tree.
```

---

## 2. Repository Layout

```
ggh-platform/
│
├── frontend/                 # Next.js 15 web application
├── backend/                  # Medusa v2 project + BullMQ worker
├── plugins/                  # Custom Medusa modules (wholesale, delivery zones, etc.)
├── docker/                   # Dockerfiles and compose configurations
├── docs/                     # Project documentation (the files you are reading now)
├── scripts/                  # Automation scripts (seed, sync, deploy)
│
├── turbo.json                # Turborepo pipeline configuration
├── package.json              # Workspace root with bun workspaces
├── .env.example              # Template for environment variables
├── .gitignore
├── .eslintrc.js              # Shared ESLint config
├── .prettierrc               # Shared Prettier config
└── README.md
```

### Top-Level Folder Summary

| Folder | Purpose | Who Touches It |
|---|---|---|
| `frontend/` | The entire Next.js application: pages, components, API routes, translations, styles | Frontend engineers |
| `backend/` | Medusa v2 configuration, database migrations, and the BullMQ worker process | Backend engineers |
| `plugins/` | Custom Medusa modules that extend commerce logic (wholesale pricing, delivery zones) | Backend engineers |
| `docker/` | Container definitions and orchestration configs for all services | DevOps / all engineers |
| `docs/` | Architecture, guides, runbooks, API documentation | All engineers |
| `scripts/` | One-off and recurring automation: database seeding, ERP initial sync, deployment helpers | DevOps / backend engineers |

---

## 3. frontend/ — Next.js Application

```
frontend/
├── src/
│   ├── app/                  # Next.js App Router — routes, layouts, API handlers
│   ├── components/           # Reusable UI components (design system)
│   ├── features/             # Domain-specific modules (product, cart, checkout, etc.)
│   ├── hooks/                # Shared custom React hooks
│   ├── lib/                  # Core libraries, API clients, configurations
│   ├── services/             # API service functions (one per backend resource)
│   ├── types/                # Shared TypeScript type definitions
│   ├── styles/               # Global CSS, design tokens, Tailwind config
│   ├── public/               # Static assets served at root
│   ├── locales/              # Translation files (en.json, ar.json)
│   ├── providers/            # React context providers
│   └── utils/                # Pure utility functions (no side effects)
│
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── postcss.config.js
├── package.json
└── .env.example
```

---

## 4. frontend/src/app/ — Routing & Pages

### Purpose

The `app/` directory is the Next.js App Router. It defines every URL the user can visit, every API endpoint the frontend exposes, and the layout hierarchy that wraps them. This folder maps directly to the browser's address bar.

### What Belongs Here

| Subdirectory | Contents |
|---|---|
| Route groups `(shop)/`, `(auth)/`, `(account)/` | Page components, layouts, loading states, error boundaries |
| `api/` | Route handlers (BFF endpoints) |
| `layout.tsx` | Root layout with providers, fonts, and HTML attributes (`dir`, `lang`) |
| `globals.css` | Tailwind directives and CSS custom properties |
| `not-found.tsx` | Custom 404 page |
| `error.tsx` | Global error boundary |
| `loading.tsx` | Global loading skeleton |

### What Should NOT Be Here

| Anti-pattern | Why |
|---|---|
| Business logic | Pages import from `features/` and delegate. They do not contain logic themselves. |
| Direct API calls to Medusa or ERPNext | All backend calls go through `services/`. Pages never import `lib/medusa.ts` directly. |
| Complex components | Pages compose feature modules. If a page file exceeds 80 lines, extract a feature component. |
| State management | State lives in `features/` or `hooks/`. Pages read state, they do not define it. |

### Full Structure

```
app/
├── (shop)/                           # Public storefront route group
│   ├── layout.tsx                    # Shop layout: header + footer + nav
│   ├── page.tsx                      # Homepage: hero, categories, deals
│   ├── categories/
│   │   └── [slug]/
│   │       ├── page.tsx              # Category listing page
│   │       └── loading.tsx           # Category skeleton
│   ├── products/
│   │   └── [handle]/
│   │       ├── page.tsx              # Product detail page
│   │       └── loading.tsx
│   ├── search/
│   │   ├── page.tsx                  # Search results page
│   │   └── loading.tsx
│   ├── cart/
│   │   └── page.tsx                  # Cart page
│   ├── checkout/
│   │   ├── page.tsx                  # Checkout flow (multi-step)
│   │   └── success/
│   │       └── page.tsx              # Order confirmation
│   └── deals/
│       └── page.tsx                  # All active deals
│
├── (auth)/                           # Authentication route group
│   ├── layout.tsx                    # Minimal layout: no header/footer
│   ├── login/
│   │   └── page.tsx
│   ├── register/
│   │   └── page.tsx
│   └── verify/
│       └── page.tsx                  # Email/phone verification
│
├── (account)/                        # Authenticated customer area
│   ├── layout.tsx                    # Account layout: sidebar navigation
│   ├── page.tsx                      # Account dashboard
│   ├── orders/
│   │   ├── page.tsx                  # Order history
│   │   └── [id]/
│   │       └── page.tsx              # Order detail
│   ├── addresses/
│   │   └── page.tsx                  # Saved addresses
│   ├── templates/                    # B2B order templates
│   │   └── page.tsx
│   └── settings/
│       └── page.tsx                  # Notification preferences, language
│
├── api/                              # BFF API route handlers
│   ├── auth/
│   │   ├── login/route.ts
│   │   ├── register/route.ts
│   │   ├── logout/route.ts
│   │   └── session/route.ts
│   ├── cart/
│   │   ├── route.ts                  # GET cart
│   │   ├── items/route.ts            # POST add item
│   │   └── items/[id]/route.ts       # PATCH qty / DELETE item
│   ├── products/
│   │   ├── route.ts                  # GET list
│   │   └── [handle]/route.ts         # GET detail
│   ├── categories/
│   │   ├── route.ts                  # GET list
│   │   └── [slug]/route.ts           # GET category with products
│   ├── orders/
│   │   ├── route.ts                  # GET list
│   │   └── [id]/route.ts             # GET detail
│   ├── checkout/
│   │   ├── route.ts                  # POST initiate
│   │   └── complete/route.ts         # POST confirm
│   └── webhooks/
│       ├── medusa/route.ts           # POST Medusa event notifications
│       └── erpnext/route.ts          # POST ERPNext push notifications
│
├── layout.tsx                        # Root layout: <html dir={} lang={}>, providers, fonts
├── globals.css                       # Tailwind @tailwind directives + CSS custom properties
├── not-found.tsx                     # 404 page
├── error.tsx                         # Global error boundary
└── loading.tsx                       # Global loading skeleton
```

### Best Practices

| Practice | Detail |
|---|---|
| **One concern per route** | `page.tsx` files compose features. They import from `features/`, pass props, and handle metadata. No business logic. |
| **Server Components by default** | Every page is a Server Component unless it needs interactivity. Mark `'use client'` only when required. |
| **Loading states for every route** | Every route that fetches data has a `loading.tsx` sibling with a skeleton matching the final layout shape. No blank screens. |
| **RTL in the root layout** | `layout.tsx` reads locale from the session and sets `<html dir="rtl" lang="ar">` or `<html dir="ltr" lang="en">`. This is set once, at the root, never overridden. |
| **API routes are thin** | An API route validates input (Zod), calls a service function, and returns a response. Maximum 30 lines. If it grows, move logic to `services/`. |

---

## 5. frontend/src/components/ — UI Components

### Purpose

The `components/` directory holds the **design system**: reusable, domain-agnostic UI primitives. These components know nothing about products, carts, or orders. They know about buttons, cards, inputs, and modals.

### What Belongs Here

- shadcn/ui components (installed and customized)
- Custom wrappers around shadcn/ui with GGH-specific styling
- Layout primitives (Container, Section, Grid)
- Shared structural components (Header, Footer, Navigation)
- Accessible form controls with RTL support built in

### What Should NOT Be Here

| Anti-pattern | Where It Belongs Instead |
|---|---|
| Components that display product data | `features/product/components/` |
| Components that read from cart state | `features/cart/components/` |
| Components that call APIs | `features/*/components/` or `services/` |
| Page-specific layouts | `app/(group)/layout.tsx` |
| One-off components used in a single feature | That feature's `components/` folder |

### Structure

```
components/
├── ui/                               # shadcn/ui primitives (auto-generated)
│   ├── button.tsx
│   ├── card.tsx
│   ├── input.tsx
│   ├── select.tsx
│   ├── sheet.tsx                     # Slide-out panel (used for cart)
│   ├── dialog.tsx
│   ├── badge.tsx
│   ├── separator.tsx
│   ├── skeleton.tsx
│   ├── toast.tsx
│   ├── dropdown-menu.tsx
│   ├── accordion.tsx
│   ├── tabs.tsx
│   ├── checkbox.tsx
│   ├── radio-group.tsx
│   ├── stepper.tsx                   # Custom: quantity stepper with +/−
│   └── countdown.tsx                 # Custom: deal countdown timer
│
├── layout/                           # Structural layout components
│   ├── container.tsx                 # Max-width centered wrapper
│   ├── section.tsx                   # Page section with heading + optional "View All"
│   ├── grid.tsx                      # Responsive product grid
│   └── scroll-row.tsx                # Horizontal scroll container (categories, deals)
│
├── navigation/                       # Navigation components
│   ├── header.tsx                    # Main header: logo, search, locale toggle, cart
│   ├── footer.tsx                    # Footer: links, contact, social
│   ├── mobile-nav.tsx                # Mobile bottom navigation bar
│   ├── category-nav.tsx              # Category horizontal scroll nav
│   └── breadcrumbs.tsx               # RTL-aware breadcrumb trail
│
├── feedback/                         # User feedback components
│   ├── loading-spinner.tsx           # Inline loading indicator
│   ├── empty-state.tsx               # "No items yet" with illustration + CTA
│   ├── error-state.tsx               # "Something went wrong" with retry button
│   ├── savings-badge.tsx             # "Save X EGP" / "وفّر X ج.م" badge
│   └── price-display.tsx             # Today/yesterday price with savings calc
│
└── index.ts                          # Barrel export for all components
```

### Best Practices

| Practice | Detail |
|---|---|
| **No business logic** | A `ProductCard` does not live here. A `Card` does. The difference: `Card` accepts `title`, `image`, `price` as props. It does not know they come from a product. |
| **RTL built in** | Every component that renders directionally (stepper, price display, badge with icon) uses `rtl:` Tailwind variants. Never `ml-` or `mr-` — use `ms-` and `me-` (logical properties). |
| **Touch targets** | Every interactive element meets the 48px minimum. If a shadcn/ui component falls short, wrap it in a `TouchTarget` component that adds padding. |
| **Controlled + accessible** | Every form control accepts `aria-label` in both languages. Every button has a visible text label (no icon-only buttons except in the header, where `aria-label` is mandatory). |

---

## 6. frontend/src/features/ — Domain Modules

### Purpose

The `features/` directory is the heart of the application. Each subfolder is a **domain module** that groups everything related to one business capability: components, hooks, types, utils, and constants. Features are self-contained and do not import from each other.

### What Belongs Here

Everything specific to a business domain: product display, cart management, checkout flow, order history, deal management, customer account, search, and wholesale operations.

### What Should NOT Be Here

| Anti-pattern | Where It Belongs Instead |
|---|---|
| Generic UI components (buttons, cards) | `components/ui/` |
| Shared hooks used across features | `hooks/` |
| API client configuration | `lib/` |
| Pure utility functions (formatEGP, formatDate) | `utils/` |
| Cross-cutting types (User, Locale) | `types/` |

### Structure

```
features/
├── product/
│   ├── components/
│   │   ├── product-card.tsx           # Card with image, name, weight, price, add button
│   │   ├── product-detail.tsx         # Full product page content
│   │   ├── product-gallery.tsx        # Image gallery with zoom
│   │   ├── variant-selector.tsx       # Pack size picker (500g / 1kg / 5kg / 25kg)
│   │   ├── price-tier-display.tsx     # Shows pricing tiers: "Buy 5+ save 10%"
│   │   ├── bulk-quantity-input.tsx    # Large stepper for wholesale quantities
│   │   └── savings-calculator.tsx     # "You save X EGP vs. retail" display
│   ├── hooks/
│   │   ├── use-product.ts            # Fetch single product
│   │   └── use-products-by-category.ts
│   ├── types/
│   │   └── product.types.ts          # Product, Variant, PriceTier
│   └── utils/
│       ├── calculate-price-tier.ts    # Determine which pricing tier applies
│       └── format-product-variant.ts  # Transform Medusa product → display model
│
├── category/
│   ├── components/
│   │   ├── category-grid.tsx          # Homepage category circle grid
│   │   ├── category-hero.tsx          # Category page header
│   │   └── category-product-list.tsx  # Paginated product list for a category
│   ├── hooks/
│   │   ├── use-categories.ts
│   │   └── use-category-by-slug.ts
│   └── types/
│       └── category.types.ts
│
├── cart/
│   ├── components/
│   │   ├── cart-slide-out.tsx         # Sheet-based cart panel
│   │   ├── cart-item.tsx              # Single line item with qty controls
│   │   ├── cart-summary.tsx           # Subtotal, savings, delivery, total
│   │   ├── cart-empty.tsx             # Empty cart state
│   │   └── minimum-order-notice.tsx   # "Add X more EGP to reach minimum"
│   ├── hooks/
│   │   ├── use-cart.ts               # Cart CRUD operations
│   │   └── use-cart-summary.ts       # Calculated totals, savings, tier status
│   ├── store/
│   │   └── cart-store.ts             # Zustand store for optimistic UI updates
│   └── types/
│       └── cart.types.ts
│
├── checkout/
│   ├── components/
│   │   ├── checkout-flow.tsx          # Multi-step checkout orchestrator
│   │   ├── delivery-slot-picker.tsx   # Date + time window selection
│   │   ├── address-form.tsx           # Delivery address form (RTL-aware)
│   │   ├── payment-method-select.tsx  # COD / digital payment choice
│   │   ├── order-review.tsx          # Final review before confirming
│   │   └── order-confirmation.tsx     # Success page with order details
│   ├── hooks/
│   │   ├── use-checkout.ts
│   │   └── use-delivery-slots.ts
│   ├── utils/
│   │   └── validate-checkout.ts       # MOQ, delivery zone, slot availability
│   └── types/
│       └── checkout.types.ts
│
├── order/
│   ├── components/
│   │   ├── order-history-list.tsx     # Paginated order list
│   │   ├── order-detail.tsx           # Full order with line items + tracking
│   │   ├── order-status-bar.tsx       # Visual status: confirmed→picked→shipped→delivered
│   │   ├── reorder-button.tsx         # One-tap reorder entire order
│   │   └── weight-verification.tsx    # Display driver weight photo
│   ├── hooks/
│   │   ├── use-orders.ts
│   │   └── use-order-detail.ts
│   └── types/
│       └── order.types.ts
│
├── deal/
│   ├── components/
│   │   ├── hot-deals-carousel.tsx     # Homepage deals section
│   │   ├── deal-card.tsx              # Single deal with countdown + savings
│   │   └── countdown-timer.tsx        # HH:MM:SS countdown (not auto-advancing)
│   ├── hooks/
│   │   └── use-deals.ts
│   └── types/
│       └── deal.types.ts
│
├── search/
│   ├── components/
│   │   ├── search-bar.tsx             # Header search with Arabic/English input
│   │   ├── search-results.tsx         # Results page
│   │   └── search-suggestions.tsx     # Typeahead dropdown
│   ├── hooks/
│   │   └── use-search.ts
│   └── utils/
│       └── normalize-arabic.ts        # Normalize أ/إ/آ → ا for search
│
├── auth/
│   ├── components/
│   │   ├── login-form.tsx
│   │   ├── register-form.tsx
│   │   └── wholesale-application.tsx  # Business document upload form
│   ├── hooks/
│   │   ├── use-auth.ts
│   │   └── use-session.ts
│   └── types/
│       └── auth.types.ts
│
└── wholesale/                         # B2B-specific features
    ├── components/
    │   ├── order-template-list.tsx     # Saved order templates
    │   ├── order-template-card.tsx     # Single template with "Reorder" button
    │   ├── bulk-upload.tsx             # CSV/spreadsheet order upload
    │   └── credit-status.tsx           # Net-30 terms status display
    ├── hooks/
    │   ├── use-templates.ts
    │   └── use-credit.ts
    └── types/
        └── wholesale.types.ts
```

### Feature Isolation Rules

| Rule | Enforcement |
|---|---|
| **No cross-feature imports** | `features/product/` never imports from `features/cart/`. If product-card needs to add to cart, it calls `useCart().addItem()` from the shared `hooks/` layer, or receives an `onAddToCart` callback. |
| **Every feature is a leaf** | Features are consumed by `app/` pages. Nothing depends on features except pages and layouts. |
| **Shared state via hooks** | Cart state lives in `features/cart/store/`. Any feature that needs cart data imports `use-cart.ts` from `features/cart/hooks/`. This is the one exception to cross-feature imports: cart hooks are the public API of the cart feature. |
| **Feature types are local** | `features/product/types/product.types.ts` defines the Product type used within that feature. If the type is needed globally, it moves to `types/`. |

---

## 7. frontend/src/hooks/ — Custom React Hooks

### Purpose

Shared React hooks that are **not specific to one feature**. Feature-specific hooks live inside their `features/*/hooks/` directory. Only hooks used by two or more features belong here.

### What Belongs Here

| Hook | Purpose |
|---|---|
| `use-locale.ts` | Current locale, direction (RTL/LTR), and locale toggle function |
| `use-debounce.ts` | Debounce a value (search input, resize events) |
| `use-media-query.ts` | Responsive breakpoint detection |
| `use-intersection.ts` | Intersection Observer for lazy loading and infinite scroll |
| `use-keyboard.ts` | Keyboard shortcut handler for accessibility |
| `use-click-outside.ts` | Detect clicks outside an element (close dropdowns) |
| `use-local-storage.ts` | Persist state in localStorage with type safety |
| `use-async.ts` | Generic async state handler (loading, error, data) |

### What Should NOT Be Here

| Anti-pattern | Where It Belongs |
|---|---|
| `use-cart.ts` | `features/cart/hooks/` (domain-specific) |
| `use-products.ts` | `features/product/hooks/` (domain-specific) |
| `useSWR` or `useQuery` wrappers | `lib/` (configuration, not hooks) |
| Non-React functions | `utils/` |

### Example File

```typescript
// hooks/use-locale.ts
import { useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

type Locale = 'en' | 'ar';
type Direction = 'ltr' | 'rtl';

export function useLocale() {
  const searchParams = useSearchParams();
  const locale: Locale = (searchParams.get('lang') as Locale) ?? 'ar';
  const direction: Direction = locale === 'ar' ? 'rtl' : 'ltr';

  const toggleLocale = useCallback(() => {
    const newLocale = locale === 'ar' ? 'en' : 'ar';
    // Set cookie and trigger navigation
    document.cookie = `ggh_locale=${newLocale};path=/;max-age=${60 * 60 * 24 * 365}`;
    window.location.reload();
  }, [locale]);

  return { locale, direction, toggleLocale } as const;
}
```

---

## 8. frontend/src/lib/ — Core Libraries & Clients

### Purpose

Configuration objects, API client instances, and initialization code. This is the "wiring" layer — it creates and configures the tools that `services/` and `hooks/` use. No business logic lives here.

### What Belongs Here

| File | Purpose |
|---|---|
| `medusa.ts` | Medusa JS SDK client instance (Store API + Admin API) |
| `erp.ts` | ERPNext REST client instance |
| `redis.ts` | Redis client instance (for server-side caching) |
| `i18n.ts` | next-intl configuration, locale detection logic |
| `validators.ts` | Zod schema registry for API input validation |
| `constants.ts` | Application-wide constants (MOQ values, delivery zones, etc.) |
| `analytics.ts` | Analytics event tracking setup |
| `error-tracking.ts` | Sentry or error tracking initialization |

### What Should NOT Be Here

| Anti-pattern | Where It Belongs |
|---|---|
| Business logic (price calculation) | `features/*/utils/` or `utils/` |
| API call functions (getProducts) | `services/` |
| React hooks | `hooks/` |
| UI components | `components/` |

### Structure

```
lib/
├── medusa.ts                # Medusa SDK client with auth headers
├── erp.ts                   # ERPNext REST client
├── redis.ts                 # ioredis client (server-side only)
├── i18n.ts                  # Locale config: supported locales, default locale, detection
├── validators.ts            # Zod schemas: loginSchema, registerSchema, checkoutSchema, etc.
├── constants.ts             # MIN_ORDER_B2C, MIN_ORDER_B2B, DELIVERY_ZONES, etc.
├── analytics.ts             # Event tracking: trackAddToCart, trackPurchase, etc.
├── error-tracking.ts        # Sentry init with DSN from env
└── config.ts                # Feature flags, environment detection (isDev, isProd)
```

### Example File

```typescript
// lib/medusa.ts
import Medusa from '@medusajs/js-sdk';

const BACKEND_URL = process.env.MEDUSA_URL ?? 'http://localhost:9000';
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? '';

export const medusa = new Medusa({
  baseUrl: BACKEND_URL,
  publishableKey: PUBLISHABLE_KEY,
});

// Server-side admin client (used in API routes only)
export const medusaAdmin = new Medusa({
  baseUrl: BACKEND_URL,
  apiKey: process.env.MEDUSA_API_KEY,
});
```

---

## 9. frontend/src/services/ — API Service Layer

### Purpose

The `services/` directory contains **one file per backend resource**. Each file exports async functions that call the BFF API routes (`/api/*`). These functions are the only way frontend code interacts with the backend. No component or hook ever calls `fetch('/api/...')` directly.

### What Belongs Here

| File | Functions |
|---|---|
| `product.service.ts` | `getProducts()`, `getProductByHandle()`, `getProductsByCategory()` |
| `category.service.ts` | `getCategories()`, `getCategoryBySlug()` |
| `cart.service.ts` | `getCart()`, `addToCart()`, `updateCartItem()`, `removeCartItem()` |
| `order.service.ts` | `getOrders()`, `getOrderById()`, `reorder()` |
| `auth.service.ts` | `login()`, `register()`, `logout()`, `getSession()` |
| `checkout.service.ts` | `initiateCheckout()`, `completeCheckout()` |
| `search.service.ts` | `searchProducts()` |
| `deal.service.ts` | `getActiveDeals()` |

### What Should NOT Be Here

| Anti-pattern | Where It Belongs |
|---|---|
| Direct Medusa or ERPNext API calls | `lib/` clients are used in API routes, not in services |
| State management | `features/*/store/` or `hooks/` |
| Component rendering logic | `features/*/components/` |
| Business logic (price calculation) | `features/*/utils/` |

### Example File

```typescript
// services/product.service.ts
import type { Product, ProductListResponse } from '@/types/product';

const API_BASE = '/api/products';

export async function getProducts(params?: {
  categoryId?: string;
  query?: string;
  page?: number;
  limit?: number;
}): Promise<ProductListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.categoryId) searchParams.set('categoryId', params.categoryId);
  if (params?.query) searchParams.set('q', params.query);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));

  const res = await fetch(`${API_BASE}?${searchParams.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}

export async function getProductByHandle(handle: string): Promise<Product> {
  const res = await fetch(`${API_BASE}/${handle}`);
  if (!res.ok) throw new Error('Failed to fetch product');
  return res.json();
}
```

### Best Practices

| Practice | Detail |
|---|---|
| **One file per resource** | `product.service.ts` handles all product API calls. Do not split into `product-get.service.ts` and `product-create.service.ts`. |
| **Type every function** | Every service function has a typed return value using types from `types/`. No `any`. |
| **Handle errors consistently** | Every function throws on non-2xx. The calling hook or component catches and displays the error. |
| **No caching logic** | Services are pure data fetchers. Caching is handled by TanStack Query configuration in the calling hook. |

---

## 10. frontend/src/types/ — TypeScript Definitions

### Purpose

Shared TypeScript type definitions used across multiple features, services, and components. Types specific to one feature live in that feature's `types/` folder.

### What Belongs Here

| File | Contents |
|---|---|
| `product.ts` | `Product`, `ProductVariant`, `PriceTier`, `ProductListResponse` |
| `cart.ts` | `Cart`, `CartItem`, `CartSummary` |
| `order.ts` | `Order`, `OrderLineItem`, `OrderStatus`, `DeliverySlot` |
| `customer.ts` | `Customer`, `Address`, `CustomerGroup` |
| `category.ts` | `Category`, `CategoryTree` |
| `deal.ts` | `Deal`, `DealStatus` |
| `api.ts` | `ApiResponse<T>`, `PaginatedResponse<T>`, `ApiError` |
| `common.ts` | `Locale`, `Direction`, `Money`, `Currency` |
| `erp.ts` | `ErpSyncStatus`, `ErpSyncLog` (used by admin features) |

### What Should NOT Be Here

| Anti-pattern | Where It Belongs |
|---|---|
| Types used by only one feature | That feature's local `types/` folder |
| Runtime values (constants) | `lib/constants.ts` |
| Zod schemas | `lib/validators.ts` |
| Component prop types | Co-located in the component file or `features/*/types/` |

### Example File

```typescript
// types/common.ts
export type Locale = 'en' | 'ar';
export type Direction = 'ltr' | 'rtl';

/** Monetary amount stored in piastres (integer) to avoid floating-point errors */
export type Piastres = number;

export interface Money {
  amount: Piastres;
  currency: string;
}

export interface LocalizedText {
  en: string;
  ar: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
```

---

## 11. frontend/src/styles/ — Global Styles & Tokens

### Purpose

Global CSS, design tokens (CSS custom properties), and Tailwind configuration extensions. This is where the visual identity of GGH is defined as code.

### What Belongs Here

| File | Contents |
|---|---|
| `globals.css` | Tailwind directives, CSS custom properties (colors, spacing, radii), font-face declarations |
| `animations.css` | Shared keyframe animations (fade-in, slide-up, pulse) |
| `rtl.css` | RTL-specific overrides that cannot be handled by Tailwind's `rtl:` variant |

### What Should NOT Be Here

| Anti-pattern | Where It Belongs |
|---|---|
| Component-specific styles | Co-located with the component using Tailwind classes |
| Third-party CSS (shadcn/ui) | `components/ui/` (each component imports its own styles) |
| JavaScript/TypeScript | `lib/` or `utils/` |

### Structure

```
styles/
├── globals.css              # Root: @tailwind directives, :root CSS variables, font-face
├── animations.css           # @keyframes for shared animations
└── rtl.css                  # RTL overrides (e.g., flip specific background gradients)
```

### Example: Design Tokens in globals.css

```css
@import "tailwindcss";

:root {
  /* Primary — Deep Emerald Green */
  --color-primary-50:  #F1F8F2;
  --color-primary-100: #E8F5E9;
  --color-primary-500: #2EA043;
  --color-primary-600: #228B22;
  --color-primary-700: #1B6820;
  --color-primary-800: #145216;
  --color-primary-900: #0D3B0F;

  /* Accent — Warm Amber */
  --color-accent-50:  #FFF8F0;
  --color-accent-100: #FFF3E0;
  --color-accent-500: #FF6D00;
  --color-accent-600: #E64A19;
  --color-accent-700: #BF360C;

  /* Typography — Elder-Friendly Sizes */
  --font-size-body:    1rem;     /* 16px — minimum readable size */
  --font-size-price:   1.25rem;  /* 20px — prices must be prominent */
  --font-size-heading: 1.5rem;   /* 24px — section headings */
  --font-size-hero:    2rem;     /* 32px — hero titles */

  /* Touch Targets */
  --touch-target-min:   48px;
  --touch-target-small: 44px;

  /* Radii */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
}
```

---

## 12. frontend/src/public/ — Static Assets

### Purpose

Files served at the root URL path. These are not processed by Next.js's build pipeline — they are copied as-is.

### What Belongs Here

| File/Folder | Contents |
|---|---|
| `images/logo.svg` | GGH logo (used in `<img>` tags, not `next/image`) |
| `images/logo-ar.svg` | Arabic logo variant |
| `images/og-image.png` | Open Graph social sharing image |
| `images/empty-cart.svg` | Empty state illustration |
| `favicon.ico` | Browser tab icon |
| `manifest.json` | PWA manifest |
| `robots.txt` | Search engine crawl rules |

### What Should NOT Be Here

| Anti-pattern | Where It Belongs |
|---|---|
| Product images | Served from CDN (Medusa media storage or S3) |
| Large files (>100KB) | CDN or optimized via `next/image` from external URL |
| JavaScript or CSS | `src/` directory |

---

## 13. frontend/src/locales/ — Translations

### Purpose

Translation files for the bilingual (EN/AR) interface. Managed by `next-intl`. These are the single source of truth for every user-facing string in the application.

### What Belongs Here

| File | Contents |
|---|---|
| `en.json` | English translations, organized by namespace |
| `ar.json` | Arabic translations, matching the same namespace structure |

### What Should NOT Be Here

| Anti-pattern | Where It Belongs |
|---|---|
| Runtime translation logic | `lib/i18n.ts` |
| Component-specific string formatting | `utils/` (e.g., `formatEGP()`) |
| Non-string data (number formats, date formats) | `lib/i18n.ts` (ICU message format config) |

### Structure (namespace organization)

```json
{
  "common": {
    "brandName": "GGH — Gomla Go Home",
    "slogan": "Wholesale Groceries Delivered",
    "shopNow": "Shop Now",
    "viewAll": "View All",
    "loading": "Loading...",
    "retry": "Try Again",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "close": "Close",
    "back": "Back"
  },
  "nav": {
    "home": "Home",
    "categories": "Categories",
    "deals": "Hot Deals",
    "cart": "Cart",
    "account": "My Account",
    "search": "Search products...",
    "switchLang": "عربي"
  },
  "product": {
    "addToCart": "Add to Cart",
    "perUnit": "per {unit}",
    "todayPrice": "Today's Price",
    "yesterdayPrice": "Yesterday",
    "savings": "Save {amount}",
    "outOfStock": "Available Soon — Pre-order",
    "bulkPricing": "Buy {min}+ save {percent}%",
    "casePack": "Case of {count} units",
    "weight": "{value} {unit}"
  },
  "cart": {
    "title": "Your Cart",
    "empty": "Your cart is empty",
    "emptyAction": "Browse wholesale groceries",
    "subtotal": "Subtotal",
    "delivery": "Delivery",
    "savings": "You Save",
    "total": "Total",
    "minimumNotice": "Add {amount} more to reach the minimum order",
    "checkout": "Complete Order",
    "removeItem": "Remove",
    "quantity": "Quantity"
  },
  "checkout": {
    "title": "Checkout",
    "deliverySlot": "Choose Delivery Time",
    "address": "Delivery Address",
    "payment": "Payment Method",
    "cod": "Cash on Delivery",
    "digital": "Pay Online",
    "review": "Review Order",
    "confirm": "Place Order",
    "success": "Order Confirmed!",
    "orderNumber": "Order #{number}"
  },
  "order": {
    "status": {
      "confirmed": "Confirmed",
      "picked": "Being Picked",
      "shipped": "On the Way",
      "delivered": "Delivered"
    },
    "reorder": "Reorder",
    "history": "Order History"
  },
  "category": {
    "riceGrains": "Rice & Grains",
    "pastaNoodles": "Pasta & Noodles",
    "flourBaking": "Flour & Baking",
    "sugarSweeteners": "Sugar & Sweeteners",
    "oilsFats": "Oils & Fats",
    "gheeButter": "Ghee & Butter",
    "beansLentils": "Beans & Lentils",
    "teaCoffee": "Tea & Coffee",
    "spicesSeasonings": "Spices & Seasonings",
    "tomatoPasteSauces": "Tomato Paste & Sauces",
    "cannedFoods": "Canned Foods",
    "frozenFood": "Frozen Food",
    "cleaningProducts": "Cleaning Products",
    "paperProducts": "Paper Products",
    "householdEssentials": "Household Essentials"
  },
  "deal": {
    "hotDeals": "Hot Deals",
    "endsIn": "Ends in",
    "limitedOffer": "Limited Time Offer"
  },
  "auth": {
    "login": "Log In",
    "register": "Create Account",
    "email": "Email",
    "password": "Password",
    "phone": "Phone Number",
    "name": "Full Name",
    "forgotPassword": "Forgot Password?",
    "wholesaleAccount": "Apply for Wholesale Account"
  },
  "error": {
    "network": "Could not connect. Please check your internet and try again.",
    "server": "Something went wrong on our end. Please try again.",
    "validation": "Please check the information you entered.",
    "notFound": "Page not found.",
    "cartMinNotMet": "Minimum order amount not reached."
  }
}
```

### Best Practices

| Practice | Detail |
|---|---|
| **Arabic file is not a translation of English** | The Arabic file is written by an Arabic-speaking team member. Machine translation is forbidden for UI strings. |
| **Every key has both languages** | CI checks that `en.json` and `ar.json` have identical key sets. Missing keys fail the build. |
| **Use ICU message format** | For interpolation (`{count}`, `{amount}`), plural rules (`{count, plural, one{item} other{items}}`), and RTL-aware formatting. |
| **No hardcoded strings in components** | Every user-facing string comes from the translation file. Developer-facing strings (console.error, log messages) stay in English. |

---

## 14. frontend/src/providers/ — Context Providers

### Purpose

React context providers that wrap the application at the root layout level. These are the "plumbing" that makes global state and configuration available to all components.

### What Belongs Here

| File | Purpose |
|---|---|
| `query-provider.tsx` | TanStack Query client provider (server state management) |
| `locale-provider.tsx` | next-intl provider (translations + RTL direction) |
| `theme-provider.tsx` | next-themes provider (light/dark mode — future) |
| `toast-provider.tsx` | Sonner/toast notification provider |
| `app-provider.tsx` | Composes all providers into a single wrapper |

### What Should NOT Be Here

| Anti-pattern | Where It Belongs |
|---|---|
| Business logic | `features/*/store/` |
| Cart state (it is not global context) | `features/cart/store/cart-store.ts` (Zustand — no provider needed) |
| API calls | `services/` |
| Component rendering | `components/` |

### Example File

```typescript
// providers/app-provider.tsx
'use client';

import { QueryProvider } from './query-provider';
import { LocaleProvider } from './locale-provider';
import { ToastProvider } from './toast-provider';
import type { ReactNode } from 'react';

interface AppProviderProps {
  children: ReactNode;
  locale: string;
}

export function AppProvider({ children, locale }: AppProviderProps) {
  return (
    <QueryProvider>
      <LocaleProvider locale={locale}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </LocaleProvider>
    </QueryProvider>
  );
}
```

---

## 15. frontend/src/utils/ — Pure Utility Functions

### Purpose

Pure functions with **zero side effects** and **zero external dependencies** (no React, no API calls, no DOM access). These are the most reusable and testable functions in the codebase.

### What Belongs Here

| File | Functions |
|---|---|
| `currency.ts` | `formatEGP()`, `parsePiastres()`, `calculateSavings()` |
| `date.ts` | `formatDate()`, `formatRelativeTime()`, `getDeliveryETA()` |
| `string.ts` | `truncate()`, `slugify()`, `normalizeArabic()` |
| `number.ts` | `clamp()`, `roundToNearest()`, `calculatePriceTier()` |
| `validation.ts` | `isValidEgyptianPhone()`, `isValidEmail()`, `meetsMOQ()` |
| `object.ts` | `pick()`, `omit()`, `deepMerge()` |
| `array.ts` | `groupBy()`, `uniqueBy()`, `paginate()` |

### What Should NOT Be Here

| Anti-pattern | Where It Belongs |
|---|---|
| React hooks | `hooks/` |
| API calls | `services/` |
| Functions that read from `localStorage` or `document` | `hooks/` (side effects belong in hooks, not utils) |
| Functions that import from `lib/`, `services/`, or `features/` | Utils are leaf nodes. They import nothing internal. |
| Business logic with domain knowledge | `features/*/utils/` |

### Example File

```typescript
// utils/currency.ts

/** Format piastres as Egyptian Pounds string */
export function formatEGP(piastres: number, locale: 'en' | 'ar' = 'ar'): string {
  const pounds = piastres / 100;
  if (locale === 'ar') {
    return `${pounds.toFixed(2)} ج.م`;
  }
  return `${pounds.toFixed(2)} EGP`;
}

/** Calculate savings between two prices (in piastres) */
export function calculateSavings(todayPrice: number, yesterdayPrice: number): {
  savingsAmount: number;
  savingsPercent: number;
} {
  const savingsAmount = yesterdayPrice - todayPrice;
  const savingsPercent = Math.round((savingsAmount / yesterdayPrice) * 100);
  return { savingsAmount, savingsPercent };
}

/** Check if a quantity meets the minimum order quantity */
export function meetsMOQ(quantity: number, moq: number): boolean {
  return quantity >= moq;
}
```

---

## 16. backend/ — Medusa v2 & Worker

### Purpose

The `backend/` directory contains the Medusa v2 commerce engine, the BullMQ worker process, and the shared configuration that ties them together.

### Structure

```
backend/
├── medusa/                            # Medusa v2 project
│   ├── src/
│   │   ├── api/                       # Custom API routes
│   │   │   ├── store/                 # Storefront-facing custom endpoints
│   │   │   │   └── custom/
│   │   │   │       ├── wholesale-prices/route.ts
│   │   │   │       ├── delivery-zones/route.ts
│   │   │   │       └── order-templates/route.ts
│   │   │   └── admin/                 # Admin-facing custom endpoints
│   │   │       └── custom/
│   │   │           ├── erp-sync/route.ts
│   │   │           └── reports/route.ts
│   │   ├── modules/                   # Custom Medusa modules
│   │   │   ├── wholesale/
│   │   │   │   ├── models/
│   │   │   │   │   └── price-tier.ts
│   │   │   │   ├── services/
│   │   │   │   │   └── wholesale-pricing.service.ts
│   │   │   │   └── index.ts
│   │   │   ├── delivery/
│   │   │   │   ├── models/
│   │   │   │   │   ├── delivery-zone.ts
│   │   │   │   │   └── delivery-slot.ts
│   │   │   │   ├── services/
│   │   │   │   │   └── delivery.service.ts
│   │   │   │   └── index.ts
│   │   │   └── subscription/
│   │   │       ├── models/
│   │   │       │   └── subscription-schedule.ts
│   │   │       ├── services/
│   │   │       │   └── subscription.service.ts
│   │   │       └── index.ts
│   │   ├── subscribers/               # Medusa event subscribers
│   │   │   ├── order-placed.subscriber.ts
│   │   │   ├── customer-created.subscriber.ts
│   │   │   └── payment-captured.subscriber.ts
│   │   ├── workflows/                 # Medusa workflows
│   │   │   ├── create-wholesale-order.ts
│   │   │   ├── validate-erp-inventory.ts
│   │   │   └── apply-bulk-pricing.ts
│   │   └── loaders/                   # Startup configuration loaders
│   │       └── redis-loader.ts
│   ├── medusa-config.ts
│   ├── package.json
│   └── tsconfig.json
│
├── worker/                            # BullMQ worker process
│   ├── src/
│   │   ├── queues/                    # Queue definitions
│   │   │   ├── erp-sync.queues.ts
│   │   │   ├── order.queues.ts
│   │   │   ├── notification.queues.ts
│   │   │   └── maintenance.queues.ts
│   │   ├── processors/                # Job handler functions
│   │   │   ├── erp/
│   │   │   │   ├── sync-inventory.processor.ts
│   │   │   │   ├── sync-products.processor.ts
│   │   │   │   ├── push-order.processor.ts
│   │   │   │   ├── sync-customers.processor.ts
│   │   │   │   └── sync-invoice.processor.ts
│   │   │   ├── orders/
│   │   │   │   ├── send-confirmation.processor.ts
│   │   │   │   └── send-shipping.processor.ts
│   │   │   ├── notifications/
│   │   │   │   ├── send-sms.processor.ts
│   │   │   │   └── send-email.processor.ts
│   │   │   └── maintenance/
│   │   │       ├── cache-invalidate.processor.ts
│   │   │       └── report-generate.processor.ts
│   │   ├── clients/
│   │   │   ├── medusa-admin.client.ts  # Medusa Admin API client
│   │   │   └── erpnext.client.ts       # ERPNext REST client
│   │   ├── lib/
│   │   │   ├── redis.ts                # BullMQ Redis connection
│   │   │   ├── logger.ts               # Structured JSON logger (pino)
│   │   │   └── metrics.ts              # Prometheus counters/histograms
│   │   └── index.ts                    # Worker entry point: registers all queues + processors
│   ├── package.json
│   └── tsconfig.json
│
└── shared/                            # Shared types between Medusa + Worker
    ├── src/
    │   ├── types/
    │   │   ├── product.types.ts
    │   │   ├── order.types.ts
    │   │   ├── erp.types.ts
    │   │   └── events.types.ts         # Event name constants
    │   ├── constants/
    │   │   ├── queues.ts               # Queue name registry
    │   │   ├── erp-field-mappings.ts   # ERP Item → Medusa Product field map
    │   │   └── currencies.ts
    │   └── utils/
    │       ├── pricing.ts              # Wholesale price calculation (shared with frontend)
    │       ├── formatting.ts           # EGP formatting, date locales
    │       └── validation.ts           # Shared Zod schemas
    └── package.json
```

### Backend Folder Rules

| Rule | Detail |
|---|---|
| **Medusa modules are self-contained** | Each module in `medusa/src/modules/` owns its models, services, and index. No cross-module imports. |
| **Processors are stateless** | A BullMQ processor receives job data, performs work, and returns. No global mutable state. |
| **Shared code lives in `shared/`** | Types, constants, and pure functions used by both Medusa and the Worker go in `backend/shared/`. Neither imports from the other directly. |
| **ERP field mappings are centralized** | `shared/src/constants/erp-field-mappings.ts` is the single source of truth for how ERP Item fields map to Medusa Product fields. When ERP changes a field name, one file changes. |

---

## 17. plugins/ — Custom Medusa Modules

### Purpose

The `plugins/` directory holds standalone Medusa module packages that can be published and reused across Medusa projects. These are more formal than the modules in `backend/medusa/src/modules/` — they have their own `package.json`, tests, and documentation.

### When to Use `plugins/` vs `backend/medusa/src/modules/`

| Use `backend/medusa/src/modules/` | Use `plugins/` |
|---|---|
| GGH-specific business logic (delivery zones for Cairo) | Reusable commerce patterns (wholesale pricing engine) |
| Tightly coupled to GGH's ERP field mappings | Framework-agnostic domain logic |
| Not intended for reuse outside GGH | Could be used by other Medusa projects |

### Structure

```
plugins/
├── medusa-wholesale/                  # Wholesale pricing module
│   ├── src/
│   │   ├── models/
│   │   │   └── price-tier.ts
│   │   ├── services/
│   │   │   ├── wholesale-pricing.service.ts
│   │   │   └── bulk-break-calculator.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── package.json                   # @ggh/medusa-wholesale
│   ├── tsconfig.json
│   └── README.md
│
├── medusa-delivery-zones/             # Delivery zone management module
│   ├── src/
│   │   ├── models/
│   │   │   ├── delivery-zone.ts
│   │   │   └── delivery-slot.ts
│   │   ├── services/
│   │   │   ├── zone-resolver.ts
│   │   │   └── slot-availability.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── package.json                   # @ggh/medusa-delivery-zones
│   ├── tsconfig.json
│   └── README.md
│
└── medusa-order-templates/            # B2B order template module
    ├── src/
    │   ├── models/
    │   │   └── order-template.ts
    │   ├── services/
    │   │   └── template.service.ts
    │   ├── types/
    │   │   └── index.ts
    │   └── index.ts
    ├── package.json                   # @ggh/medusa-order-templates
    ├── tsconfig.json
    └── README.md
```

---

## 18. docker/ — Containerization

### Purpose

Dockerfiles for each service and Docker Compose configurations for development and production environments.

### Structure

```
docker/
├── docker-compose.yml                 # Production orchestration
├── docker-compose.dev.yml             # Development environment (hot reload, mock ERP)
├── docker-compose.test.yml            # Integration test environment
│
├── nextjs/
│   ├── Dockerfile                     # Multi-stage: deps → build → production
│   └── .dockerignore
│
├── medusa/
│   ├── Dockerfile                     # Multi-stage: deps → build → production
│   └── .dockerignore
│
├── worker/
│   ├── Dockerfile                     # Single-stage: deps → run
│   └── .dockerignore
│
├── erpnext/
│   ├── Dockerfile                     # Based on frappe/erpnext image + custom app
│   └── .dockerignore
│
└── nginx/
    ├── nginx.conf                     # Reverse proxy + TLS termination + rate limiting
    └── Dockerfile
```

### Dockerfile Best Practices

| Practice | Detail |
|---|---|
| **Multi-stage builds** | Separate `deps` stage (install everything) from `build` stage (compile TypeScript) from `production` stage (copy only what's needed). Keeps images small. |
| **Non-root user** | Production stage runs as `nextjs` or `node` user, never `root`. |
| **Health checks** | Every Dockerfile includes a `HEALTHCHECK` instruction that hits the service's `/health` endpoint. |
| **Layer caching** | Copy `package.json` and lock file first, install deps, then copy source code. Code changes don't invalidate the deps layer. |

---

## 19. docs/ — Documentation

### Purpose

All project documentation, organized as numbered files for sequential reading and themed folders for operational guides.

### Structure

```
docs/
├── 01_ProjectVision.md                # ✅ Project goals, personas, design philosophy
├── 02_Architecture.md                 # ✅ Service responsibilities, data flow, communication
├── 03_FolderStructure.md              # ✅ This file
├── 04_DesignSystem.md                 # Visual design tokens, component specs, RTL rules
├── 05_CodingStandards.md              # TypeScript rules, naming, linting, PR conventions
├── 06_Database.md                     # Schema, migrations, indexing, backup strategy
├── 07_API.md                          # Endpoint catalog, request/response shapes, auth
├── 08_Authentication.md               # Auth flows, session management, service tokens
├── 09_CommerceFlow.md                 # Cart → checkout → order → fulfillment lifecycle
├── 10_ProductCatalog.md               # Product model, categories, pricing tiers, sync
├── 11_ERPIntegration.md               # Sync rules, field mappings, conflict resolution
├── 12_TestingStrategy.md              # Unit, integration, E2E, accessibility testing
├── 13_Deployment.md                   # Environments, CI/CD, rollback, monitoring
├── 14_Backlog.md                      # Feature backlog, priorities, phase assignments
├── 15_DeveloperGuide.md               # Onboarding, local setup, development workflow
│
├── runbooks/                          # Operational runbooks for incident response
│   ├── erp-sync-failure.md
│   ├── order-stuck-pending.md
│   ├── redis-memory-pressure.md
│   └── deployment-rollback.md
│
└── api/                               # Auto-generated API documentation
    ├── storefront-api.md              # Next.js BFF API reference
    └── erp-sync-api.md                # ERP integration API reference
```

---

## 20. scripts/ — Automation & Tooling

### Purpose

One-off and recurring scripts for database seeding, data migration, ERP initial sync, and deployment helpers. These are run manually or triggered by CI, not by the application at runtime.

### Structure

```
scripts/
├── seed/
│   ├── seed-products.ts               # Populate Medusa with sample product data
│   ├── seed-categories.ts             # Create category tree
│   ├── seed-deals.ts                  # Create sample hot deals
│   └── seed-all.ts                    # Run all seed scripts in order
│
├── sync/
│   ├── initial-erp-sync.ts            # Full product + inventory pull from ERPNext
│   ├── backfill-erp-orders.ts         # Push historical orders to ERPNext
│   └── verify-sync-consistency.ts     # Compare Medusa vs ERP data, report discrepancies
│
├── migrate/
│   ├── ggh-schema-init.ts             # Create ggh schema and custom tables
│   └── ggh-schema-seed.ts             # Seed delivery zones and slots
│
├── deploy/
│   ├── pre-deploy-checks.sh           # Verify environment variables, health endpoints
│   ├── post-deploy-verify.sh          # Smoke test critical paths after deploy
│   └── rollback.sh                    # Rollback to previous container image
│
└── dev/
    ├── setup-local.sh                 # First-time local development setup
    └── reset-db.sh                    # Drop and recreate local database
```

### Script Rules

| Rule | Detail |
|---|---|
| **Idempotent** | Every script can be run multiple times safely. `seed-products.ts` checks if products exist before inserting. |
| **TypeScript** | All scripts are written in TypeScript and run with `tsx` or `bun`. No bare `.sh` scripts except for CI/deploy helpers. |
| **Dry-run mode** | Destructive scripts (`reset-db.sh`, `backfill-erp-orders.ts`) accept a `--dry-run` flag that logs what would happen without executing. |
| **Documented** | Every script has a comment header explaining what it does, when to run it, and what arguments it accepts. |

---

## 21. File Naming Conventions

### General Rules

| Pattern | Convention | Example |
|---|---|---|
| React components | `kebab-case.tsx` | `product-card.tsx` |
| React hooks | `kebab-case.ts` with `use-` prefix | `use-cart.ts` |
| Utility functions | `kebab-case.ts` | `format-egp.ts` |
| Type definitions | `kebab-case.types.ts` | `product.types.ts` |
| API route handlers | `route.ts` (Next.js convention) | `app/api/cart/route.ts` |
| Service files | `kebab-case.service.ts` | `product.service.ts` |
| Test files | `kebab-case.test.ts` (co-located) | `product-card.test.tsx` |
| CSS files | `kebab-case.css` | `globals.css` |
| Translation files | `locale.json` | `en.json`, `ar.json` |
| Docker files | `Dockerfile` (capital D) | `docker/nextjs/Dockerfile` |
| Environment templates | `.env.example` | `frontend/.env.example` |

### Directory Naming

| Pattern | Convention | Example |
|---|---|---|
| Route groups | `(kebab-case)` — parentheses in Next.js | `(shop)/`, `(auth)/` |
| Dynamic routes | `[kebab-case]` — brackets in Next.js | `[slug]/`, `[handle]/` |
| Feature directories | `kebab-case` | `features/product/`, `features/order-template/` |
| Component directories | `kebab-case` | `components/navigation/` |

---

## 22. Import Rules & Boundaries

### Allowed Import Directions

```
app/         ← imports from: features/, components/, providers/, lib/, types/
features/    ← imports from: components/, hooks/, services/, lib/, utils/, types/
components/  ← imports from: lib/, utils/, types/
hooks/       ← imports from: services/, lib/, utils/, types/
services/    ← imports from: lib/, types/, utils/
lib/         ← imports from: types/, utils/
providers/   ← imports from: hooks/, lib/, types/
utils/       ← imports from: NOTHING (pure functions only)
types/       ← imports from: utils/ (rarely)
locales/     ← no imports (data files only)
styles/      ← no imports (CSS only)
```

### Forbidden Imports

| From | To | Why |
|---|---|---|
| `components/` | `features/` | UI primitives must not depend on domain logic |
| `utils/` | `lib/`, `services/`, `hooks/` | Utils are leaf nodes. Zero internal dependencies. |
| `services/` | `features/` | Services are data fetchers, not domain-aware |
| `features/product/` | `features/cart/` | No cross-feature imports (except cart hooks — see below) |
| Any file | `node_modules` direct import without barrel | All third-party imports should go through a named import |

### The Cart Exception

The cart is unique because multiple features need to add items to it (product card, deal card, reorder button). The cart feature exposes its hooks as a **public API**:

```typescript
// features/cart/hooks/use-cart.ts — PUBLIC API
export function useCart() {
  // ... implementation
  return { cart, addItem, updateItem, removeItem, summary } as const;
}
```

Other features may import `useCart` from `features/cart/hooks/use-cart`. This is the **only** permitted cross-feature import. All other cross-feature communication happens through:
- **Props** (parent page passes callbacks)
- **Events** (BullMQ on the backend)
- **Shared state** (Zustand store in `features/cart/store/`)

---

## 23. Adding a New Feature — Checklist

When a developer adds a new feature (e.g., "Wishlist"), follow this checklist:

```
1. Create the feature directory
   mkdir -p frontend/src/features/wishlist/{components,hooks,types,utils}

2. Define types
   Create frontend/src/features/wishlist/types/wishlist.types.ts
   If types are shared across features, move to frontend/src/types/

3. Create service functions
   Add wishlist functions to frontend/src/services/wishlist.service.ts

4. Create hooks
   Create frontend/src/features/wishlist/hooks/use-wishlist.ts

5. Create components
   Create frontend/src/features/wishlist/components/wishlist-card.tsx
   Create frontend/src/features/wishlist/components/wishlist-page.tsx

6. Add translations
   Add "wishlist" namespace to frontend/src/locales/en.json and ar.json

7. Add API route (if needed)
   Create frontend/src/app/api/wishlist/route.ts

8. Add page route
   Create frontend/src/app/(account)/wishlist/page.tsx

9. Verify import boundaries
   - No import from other features (except useCart if adding to cart)
   - No business logic in page.tsx
   - All API calls go through service functions

10. Verify accessibility
    - 48px touch targets on all interactive elements
    - Arabic labels on all elements
    - RTL layout tested with dir="rtl"
    - Screen reader announces state changes (added/removed from wishlist)
```

---

*This document is maintained by the GGH engineering team. When the folder structure changes, update this document in the same PR.*

*Last updated: July 2026*
