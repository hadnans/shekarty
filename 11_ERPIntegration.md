# 11 — ERP Integration

> **GGH — Gomla Go Home** — ERPNext synchronization, inventory updates, orders, customers, invoices, queues, retry strategy, and conflict resolution. Because when ERPNext and Medusa disagree, someone loses money — and it must never be Om Ibrahim.

---

## Table of Contents

1. [ERP Integration Philosophy](#1-erp-integration-philosophy)
2. [Architecture Overview](#2-architecture-overview)
3. [Sync Direction Map](#3-sync-direction-map)
4. [Product & Category Sync](#4-product--category-sync)
5. [Inventory Sync](#5-inventory-sync)
6. [Pricing Sync](#6-pricing-sync)
7. [Customer Sync](#7-customer-sync)
8. [Order Sync](#8-order-sync)
9. [Invoice & Payment Sync](#9-invoice--payment-sync)
10. [Delivery Note & Fulfillment Sync](#10-delivery-note--fulfillment-sync)
11. [Webhook Integration](#11-webhook-integration)
12. [Field Mapping Reference](#12-field-mapping-reference)
13. [Conflict Resolution](#13-conflict-resolution)
14. [Queue Strategy & Job Processing](#14-queue-strategy--job-processing)
15. [Retry Strategy & Dead Letter Queue](#15-retry-strategy--dead-letter-queue)
16. [Idempotency & Deduplication](#16-idempotency--deduplication)
17. [Monitoring & Observability](#17-monitoring--observability)
18. [Manual Override & Admin Tools](#18-manual-override--admin-tools)
19. [Development & Testing with ERPNext](#19-development--testing-with-erpnext)
20. [Elder-Friendly ERP Decisions](#20-elder-friendly-erp-decisions)
21. [Bilingual & RTL in ERP Integration](#21-bilingual--rtl-in-erp-integration)
22. [Security & Access Control](#22-security--access-control)

---

## 1. ERP Integration Philosophy

| Principle | Rule | Why |
|---|---|---|
| **ERPNext is the source of truth** | When Medusa and ERPNext disagree, ERPNext wins for inventory and cost. Medusa wins for customer-facing price. | The accounting system owns the books. If ERP says 50 units and Medusa says 60, there are 50. But if Medusa shows a price the customer already saw, we honor it. |
| **Async by default** | All ERP communication goes through BullMQ queues. No synchronous ERP calls in the request path. | ERPNext is slow (200–800ms per call). Om Ibrahim should never wait for ERP. The queue absorbs latency. |
| **Eventually consistent** | Data may be stale for up to 5 minutes. That's acceptable. What's not acceptable is a failed order. | Wholesale grocery doesn't need real-time stock. Yesterday's stock is close enough. A failed checkout is not. |
| **Log everything** | Every sync attempt, success or failure, is recorded in `ggh.erp_sync_log`. Every cursor position in `ggh.erp_sync_cursor`. | When stock is wrong at 3 AM, the on-call engineer needs to know exactly what happened and when. |
| **Never block the customer** | If ERP is down, orders still go through. If stock is stale, products are still orderable. If prices are old, we show a disclaimer. | Om Ibrahim placed her order. She's waiting. ERP can catch up later. |
| **Deduplication is mandatory** | Every push to ERP includes an idempotency key. Every pull uses a cursor. No duplicate records. | BullMQ retries jobs. Without idempotency, a retried order push creates a duplicate Sales Order. |
| **Override with care** | GGH admin can override ERP data (product names, pricing tiers). Overrides are tracked and preserved across syncs. | ERP doesn't know Arabic product names. GGH adds them. The next sync must not erase them. |
| **Fail loudly, recover quietly** | Failed syncs trigger alerts. Successful recoveries log but don't notify. | Engineers need to know when ERP is broken. They don't need to know it self-healed at 4 AM. |

---

## 2. Architecture Overview

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                          ERP INTEGRATION ARCHITECTURE                             │
│                                                                                   │
│   ERPNext                      BullMQ Worker                   Medusa v2          │
│   (Port 8000)                  (Background)                    (Port 9000)        │
│                                                                                   │
│   ┌─────────────────┐          ┌──────────────────┐          ┌────────────────┐  │
│   │  Item Master     │◄────────│  erp.sync.        │────────►│  Product       │  │
│   │  Item Group      │  Pull   │  products         │  Push   │  ProductVariant│  │
│   │  Item Price      │         │  (every 10 min)   │         │  Price         │  │
│   └─────────────────┘          └──────────────────┘          │  ProductCat.   │  │
│                                                               └────────────────┘  │
│   ┌─────────────────┐          ┌──────────────────┐          ┌────────────────┐  │
│   │  Stock Ledger    │────────►│  erp.sync.        │────────►│  InventoryItem │  │
│   │  Entry           │  Pull   │  inventory        │  Update │  InventoryLevel│  │
│   │                  │         │  (every 5 min)    │         │  Reservation   │  │
│   └─────────────────┘          └──────────────────┘          └────────────────┘  │
│                                                                                   │
│   ┌─────────────────┐          ┌──────────────────┐          ┌────────────────┐  │
│   │  Customer        │◄────────│  erp.sync.        │────────►│  Customer      │  │
│   │                  │  Push   │  customers        │  Pull   │  CustomerGroup │  │
│   │                  │         │  (on event)       │         │  Address       │  │
│   └─────────────────┘          └──────────────────┘          └────────────────┘  │
│                                                                                   │
│   ┌─────────────────┐          ┌──────────────────┐          ┌────────────────┐  │
│   │  Sales Order     │◄────────│  erp.push.        │  Read   │  Order         │  │
│   │                  │  Push   │  order            │◄────────│  OrderLineItem │  │
│   │                  │         │  (on event)       │         │  Fulfillment   │  │
│   └─────────────────┘          └──────────────────┘          └────────────────┘  │
│                                                                                   │
│   ┌─────────────────┐          ┌──────────────────┐          ┌────────────────┐  │
│   │  Sales Invoice   │────────►│  erp.sync.        │────────►│  Payment       │  │
│   │  Payment Entry   │  Pull   │  invoice          │  Update │  PaymentSession│  │
│   │  Delivery Note   │         │  (every 15 min)   │         │  Refund        │  │
│   └─────────────────┘          └──────────────────┘          └────────────────┘  │
│                                                                                   │
│   ┌─────────────────┐          ┌──────────────────┐          ┌────────────────┐  │
│   │  ggh_erp App     │────────►│  Webhook Handler  │────────►│  Next.js BFF   │  │
│   │  Order Status    │  Push   │  /api/webhooks/   │  Update │  ISR Cache     │  │
│   │  Webhook         │         │  erpnext          │  Cache   │  Revalidation  │  │
│   └─────────────────┘          └──────────────────┘          └────────────────┘  │
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘

                         SHARED INFRASTRUCTURE

   ┌──────────────────────────┐        ┌──────────────────────────────────┐
   │  PostgreSQL              │        │  Redis 7                         │
   │  ┌────────────────────┐  │        │  ┌────────────────────────────┐  │
   │  │ ggh.erp_sync_log   │  │        │  │ cache:erp:sync_cursor:*    │  │
   │  │ ggh.erp_sync_cursor│  │        │  │ bull:erp.sync.*            │  │
   │  │ ggh.order_status_  │  │        │  │ cache:inventory:*          │  │
   │  │ log                │  │        │  │ cache:products:*           │  │
   │  └────────────────────┘  │        │  └────────────────────────────┘  │
   └──────────────────────────┘        └──────────────────────────────────┘
```

### 2.1 Communication Patterns

| Pattern | Direction | Transport | When |
|---|---|---|---|
| **Scheduled pull** | ERPNext → Medusa | BullMQ cron → ERPNext REST API → Medusa Admin API | Every 5–15 minutes |
| **Event-driven push** | Medusa → ERPNext | Medusa event → BullMQ job → ERPNext REST API | On order confirmation, customer creation |
| **Webhook push** | ERPNext → GGH | ERPNext webhook → Next.js `/api/webhooks/erpnext` | On status change (fulfilled, invoiced) |
| **On-demand sync** | Either direction | Admin dashboard trigger → BullMQ job | Manual admin action |
| **Full sync** | ERPNext → Medusa | Admin trigger → paginated ERPNext API → Medusa bulk update | Initial load, disaster recovery |

### 2.2 Data Flow: Who Owns What

```
┌──────────────────────────────────────────────────────────────────┐
│                     DATA OWNERSHIP MATRIX                        │
│                                                                  │
│   ERPNext OWNS            Medusa OWNS           GGH OWNS        │
│   ─────────────           ───────────           ─────────       │
│   Item Master             Cart                  Delivery Zones   │
│   Item Price (base)       Cart Line Items       Delivery Slots   │
│   Stock Ledger            Order (operational)   Price Tiers      │
│   Item Group              Customer (oper.)      Order Templates  │
│   Sales Order (financial) Payment Sessions      Wholesale Accts  │
│   Sales Invoice           Fulfillment (oper.)   Delivery Proof   │
│   Payment Entry           Shipping Methods      Notif. Pref.     │
│   Delivery Note           Promotions/Deals      Sync Logs        │
│   Purchase Order          Product Images        Sync Cursors     │
│   Supplier                Product Metadata      Status Logs      │
│   Chart of Accounts       Customer Groups                        │
│                                                                  │
│   Rule: ERPNext owns the books. Medusa owns the storefront.     │
│   GGH owns the delivery experience and sync plumbing.            │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Sync Direction Map

### 3.1 ERPNext → Medusa (Pull Sync)

| Entity | ERPNext DocType | Medusa Entity | Frequency | Trigger |
|---|---|---|---|---|
| Products | `Item` | `Product` + `ProductVariant` | Every 10 min | Cron + on-demand |
| Categories | `Item Group` | `ProductCategory` | Every 10 min | Cron + on-demand |
| Prices | `Item Price` | `Price` + `PriceSet` | Every 10 min | Cron + on-demand |
| Stock levels | `Stock Ledger Entry` | `InventoryLevel` | Every 5 min | Cron + on-demand |
| Invoices | `Sales Invoice` | `Payment` metadata | Every 15 min | Cron + on-demand |
| Payments | `Payment Entry` | `Payment` status | Every 15 min | Cron + on-demand |
| Delivery notes | `Delivery Note` | `Fulfillment` metadata | Every 15 min | Cron + on-demand |

### 3.2 Medusa → ERPNext (Push Sync)

| Entity | Medusa Entity | ERPNext DocType | Frequency | Trigger |
|---|---|---|---|---|
| Orders | `Order` | `Sales Order` | On event | Order confirmed |
| Customers | `Customer` | `Customer` | On event | Customer created / updated |
| Order status | `Fulfillment` | `Sales Order` status | On event | Status change |
| Delivery proof | `delivery_proof` | `Delivery Note` | On event | Proof uploaded |

### 3.3 Bidirectional Sync (Rare)

| Entity | ERP → Medusa | Medusa → ERP | Conflict Resolution |
|---|---|---|---|
| Customer data | Pull credit terms, payment history | Push contact info, addresses | Latest timestamp wins |
| Order status | Pull ERP-computed status | Push GGH operational status | See §13 Conflict Resolution |

---

## 4. Product & Category Sync

### 4.1 Product Sync Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      PRODUCT SYNC FLOW                                   │
│                                                                          │
│   Cron Trigger (every 10 min)                                            │
│       │                                                                  │
│       ▼                                                                  │
│   Read cursor: cache:erp:sync_cursor:products                            │
│   (last_synced_at timestamp)                                             │
│       │                                                                  │
│       ▼                                                                  │
│   GET /api/resource/Item                                                 │
│   ?filters=[["modified", ">", "{cursor}"]]                               │
│   &fields=["name","item_name","item_group","stock_uom",                  │
│            "is_stock_item","disabled","standard_rate",                    │
│            "valuation_rate","brand","description",                        │
│            "modified","custom_name_ar"]                                   │
│   &limit_page_length=200                                                 │
│       │                                                                  │
│       ▼                                                                  │
│   For each Item:                                                         │
│       │                                                                  │
│       ├── Existing in Medusa?                                            │
│       │   ├── YES → Compare modified timestamps                          │
│       │   │   ├── ERP newer → Update Medusa Product                      │
│       │   │   └── Medusa newer → Skip (GGH override active)              │
│       │   └── NO → Create new Product in Medusa                          │
│       │                                                                  │
│       ├── Preserve GGH overrides:                                        │
│       │   ├── title_ar (Arabic name) — keep if non-empty                 │
│       │   ├── custom metadata (is_case_pack, case_size, moq)             │
│       │   └── custom images — never overwrite                            │
│       │                                                                  │
│       └── Log to ggh.erp_sync_log                                       │
│           ├── entity_type = 'product'                                    │
│           ├── entity_id = Item.name                                      │
│           ├── direction = 'erp_to_medusa'                                │
│           ├── status = 'success' | 'conflict' | 'error'                 │
│           └── medusa_data + erp_data snapshots                           │
│       │                                                                  │
│       ▼                                                                  │
│   Update cursor: cache:erp:sync_cursor:products = max(modified)          │
│       │                                                                  │
│       ▼                                                                  │
│   Enqueue cache.invalidate job for affected product keys                 │
│       │                                                                  │
│       ▼                                                                  │
│   Done                                                                   │
└──────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Item → Product Mapping

| ERPNext Field | Medusa Field | Transform | Notes |
|---|---|---|---|
| `Item.name` | `Product.id` (external_id) | Direct | ERPNext item code (e.g., "RICE-EG-5KG") |
| `Item.item_name` | `Product.title` | Direct | English name from ERP |
| `Item.custom_name_ar` | `Product.metadata.name_ar` | Direct if non-empty; else empty | Arabic name — GGH override takes priority |
| `Item.item_group` | `ProductCategory` | Lookup by `handle` | Maps Item Group → Category via handle mapping |
| `Item.description` | `Product.description` | Direct | May contain HTML; sanitize to plain text |
| `Item.is_stock_item` | `Product.metadata.is_stock_item` | Direct | Non-stock items (services) still synced |
| `Item.disabled` | `Product.status` | `disabled=true → "draft"`, `false → "published"` | Disabled items become draft, not deleted |
| `Item.stock_uom` | `ProductVariant.metadata.uom` | Direct | "Kg", "Ltr", "Pcs", "Box" |
| `Item.brand` | `Product.metadata.brand` | Direct | Brand stored as metadata; not a separate entity |
| `Item.standard_rate` | `Price.amount` | Piastres conversion: `rate * 100` | ERP stores in EGP; Medusa in piastres |
| `Item.valuation_rate` | `Product.metadata.cost_amount` | Piastres conversion | Internal cost; not shown to customers |
| `Item.image` | — | Ignored | ERP images are low-quality; GGH uploads its own |
| `Item.has_variants` | Multiple `ProductVariant` | Expand variants | See §4.3 |
| `Item.modified` | `Product.metadata.erp_modified_at` | ISO timestamp | Used for incremental sync cursor |

### 4.3 Variant Handling

ERPNext supports item variants through Item Templates and Item Variants. GGH maps them as follows:

| ERPNext Pattern | Medusa Mapping |
|---|---|
| Item Template (`has_variants=1`) | Parent `Product` with `ProductOption` entries |
| Item Variant (`variant_of=TEMPLATE`) | `ProductVariant` linked to parent |
| Variant attributes (e.g., Size, Weight) | `ProductOptionValue` entries |

```
ERPNext Item Template: "RICE-BASMATI" (has_variants=1)
  ├── Item Variant: "RICE-BASMATI-1KG"  (attr: Size=1kg)
  ├── Item Variant: "RICE-BASMATI-5KG"  (attr: Size=5kg)
  └── Item Variant: "RICE-BASMATI-25KG" (attr: Size=25kg)

Maps to Medusa:
  Product: "RICE-BASMATI"
    ├── ProductOption: "Size" (title_en="Size", title_ar="الحجم")
    │     ├── "1kg" / "١ كيلو"
    │     ├── "5kg" / "٥ كيلو"
    │     └── "25kg" / "٢٥ كيلو"
    ├── ProductVariant: "RICE-BASMATI-1KG" (options: Size=1kg)
    ├── ProductVariant: "RICE-BASMATI-5KG" (options: Size=5kg)
    └── ProductVariant: "RICE-BASMATI-25KG" (options: Size=25kg)
```

### 4.4 Non-Variant Items

For items without variants (single-SKU products), GGH creates a single default variant:

| ERPNext Item | Medusa Product | Medusa Variant |
|---|---|---|
| `OIL-SUN-1L` (no variants) | Product: "OIL-SUN-1L" | Variant: "OIL-SUN-1L" (default, title="Default") |

### 4.5 Category Sync

```
ERPNext Item Group Tree:
  All Item Groups
  ├── Rice & Grains (أرز وحبوب)
  │   ├── White Rice (أرز أبيض)
  │   ├── Basmati Rice (أرز بسمتي)
  │   └── Pasta & Noodles (مكرونة)
  ├── Oils & Fats (زيوت ودهون)
  │   ├── Cooking Oil (زيت طعام)
  │   └── Ghee & Butter (سمنة وزبدة)
  └── Beverages (مشروبات)
      ├── Tea (شاي)
      └── Coffee (قهوة)

Maps to Medusa ProductCategory (two-level hierarchy only):
  Parent Category: "Rice & Grains"
    Child Category: "White Rice"
    Child Category: "Basmati Rice"
    Child Category: "Pasta & Noodles"

  Rule: Flatten ERPNext tree to 2 levels max.
  If ERP has 3+ levels, the deepest levels are merged into their grandparent.
```

### 4.6 Category Field Mapping

| ERPNext Field | Medusa Field | Transform | Notes |
|---|---|---|---|
| `Item Group.name` | `ProductCategory.handle` | slugify | "Rice & Grains" → "rice-grains" |
| `Item Group.item_group_name` | `ProductCategory.name` | Direct | English name |
| `Item Group.custom_name_ar` | `ProductCategory.metadata.name_ar` | Direct | Arabic name — GGH override |
| `Item Group.parent_item_group` | `ProductCategory.parent_category_id` | Lookup by handle | NULL for top-level |
| `Item Group.is_group` | — | Used for hierarchy only | Group=true means it has children |
| `Item Group.image` | — | Ignored | GGH uploads its own category icons |

### 4.7 GGH Override Preservation

When a sync would overwrite a field that has a GGH override, the override is preserved:

```typescript
interface GghOverride {
  name_ar?: string;            // Arabic name entered by GGH admin
  description_ar?: string;     // Arabic description
  category_override?: string;  // Category reassigned by admin
  price_tiers?: PriceTier[];   // Custom bulk-break pricing
  is_case_pack?: boolean;      // Case pack flag
  case_size?: number;          // Units per case
  moq?: number;                // Minimum order quantity
}

// During sync, before writing to Medusa:
function mergeWithOverrides(erpData: ErpProduct, existingMedusa: MedusaProduct): MedusaProduct {
  return {
    ...erpData,
    // Preserve GGH overrides if they exist
    title: existingMedusa.metadata?.name_ar
      ? { ...erpData.title, ar: existingMedusa.metadata.name_ar }
      : erpData.title,
    metadata: {
      ...erpData.metadata,
      // Keep GGH-specific fields
      name_ar: existingMedusa.metadata?.name_ar || erpData.metadata?.name_ar,
      is_case_pack: existingMedusa.metadata?.is_case_pack,
      case_size: existingMedusa.metadata?.case_size,
      moq: existingMedusa.metadata?.moq,
    },
  };
}
```

---

## 5. Inventory Sync

### 5.1 Inventory Sync Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    INVENTORY SYNC FLOW                                   │
│                                                                          │
│   Cron Trigger (every 5 min)                                             │
│       │                                                                  │
│       ▼                                                                  │
│   Read cursor: cache:erp:sync_cursor:inventory                           │
│       │                                                                  │
│       ▼                                                                  │
│   GET /api/resource/Stock Ledger Entry                                   │
│   ?filters=[["posting_date", ">=", "{cursor_date}"],                    │
│             ["posting_time", ">", "{cursor_time}"],                      │
│             ["warehouse", "IN", ["Cairo Central",                        │
│             "Giza Hub", "6th October Depot"]]]                           │
│   &fields=["item_code","warehouse","actual_qty","qty_after_transaction", │
│            "posting_date","posting_time","voucher_type"]                  │
│   &limit_page_length=500                                                 │
│       │                                                                  │
│       ▼                                                                  │
│   Aggregate stock by item_code:                                          │
│   ┌──────────────────────────────────────────────────────────────┐       │
│   │  item_code   │ Cairo Central │ Giza Hub │ 6th October │ SUM │       │
│   │  RICE-EG-5KG│     150        │    200    │     50      │ 400 │       │
│   │  OIL-SUN-1L │     80         │    120    │     30      │ 230 │       │
│   └──────────────────────────────────────────────────────────────┘       │
│       │                                                                  │
│       ▼                                                                  │
│   For each item:                                                         │
│       ├── Find Medusa InventoryItem by SKU (item_code)                   │
│       ├── Find/create InventoryLevel per warehouse → StockLocation       │
│       ├── Update InventoryLevel.stocked_quantity = qty_after_transaction │
│       ├── Update Redis cache:inventory:{variantId}                       │
│       └── Log to ggh.erp_sync_log                                       │
│       │                                                                  │
│       ▼                                                                  │
│   Update cursor: cache:erp:sync_cursor:inventory                         │
│       │                                                                  │
│       ▼                                                                  │
│   Enqueue cache.invalidate for inventory keys                            │
│       │                                                                  │
│       ▼                                                                  │
│   Done                                                                   │
└──────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Warehouse Mapping

| ERPNext Warehouse | Medusa Stock Location | Location Code |
|---|---|---|
| Cairo Central | `loc-cairo-central` | CAI-01 |
| Giza Hub | `loc-giza-hub` | GIZ-01 |
| 6th October Depot | `loc-october-depot` | OCT-01 |

### 5.3 Stock Level Calculation

ERPNext's `Stock Ledger Entry` provides `qty_after_transaction` — the running balance. GGH uses the latest entry per item per warehouse as the authoritative stock level.

```typescript
interface StockAggregation {
  itemCode: string;
  warehouses: {
    warehouse: string;
    quantity: number;       // qty_after_transaction from latest SLE
    updatedAt: Date;
  }[];
  totalQuantity: number;    // Sum across all warehouses
}
```

### 5.4 Inventory Reservation

When a customer places an order, Medusa creates a `ReservationItem` to deduct stock from the available quantity. This reservation is **not** pushed to ERPNext until the order is confirmed and pushed as a Sales Order.

```
Available Stock (Medusa) = Stocked Quantity - Reserved Quantity

Example:
  Cairo Central: 150 units stocked
  Reserved by pending orders: 12 units
  Available for new orders: 138 units

  Display to customer: "138 available" (or just "In Stock" if > 10)
```

### 5.5 Out-of-Stock Handling

| Stock Level | UI Display | Backend Behavior |
|---|---|---|
| > 20 units | "In Stock · متوفر" | Normal ordering |
| 1–20 units | "Low Stock · كمية محدودة" | Normal ordering, urgency label |
| 0 units | "Out of Stock · غير متوفر حالياً" | Cannot add to cart, "Notify me" button |
| Stale (> 15 min old) | "In Stock · متوفر" + "Prices may vary · الأسعار قد تتغير" | Normal ordering, disclaimer |

---

## 6. Pricing Sync

### 6.1 Pricing Sync Flow

Pricing sync is combined with the product sync job (`erp.sync.products`) and runs every 10 minutes.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      PRICING SYNC FLOW                                   │
│                                                                          │
│   Alongside Product Sync:                                                │
│       │                                                                  │
│       ▼                                                                  │
│   GET /api/resource/Item Price                                           │
│   ?filters=[["item_code", "IN", [synced_item_codes]],                   │
│             ["price_list", "=", "GGH Wholesale"],                        │
│             ["selling", "=", 1]]                                          │
│   &fields=["item_code","price_list","price_list_rate",                   │
│            "currency","valid_from","valid_upto","min_qty"]               │
│       │                                                                  │
│       ▼                                                                  │
│   For each Item Price:                                                   │
│       ├── Find Medusa PriceSet by variant_id (mapped from item_code)     │
│       ├── Find existing Price in PriceSet                                │
│       │   ├── Exists → Update if ERP rate differs                        │
│       │   └── Not exists → Create new Price                              │
│       ├── Convert to piastres: Math.round(rate * 100)                    │
│       ├── Handle min_qty → Price Tier mapping (see §6.3)                │
│       └── Log to ggh.erp_sync_log                                       │
│       │                                                                  │
│       ▼                                                                  │
│   Check for GGH override prices (price_tier table)                       │
│   Override prices are preserved and take priority over ERP prices         │
│       │                                                                  │
│       ▼                                                                  │
│   Done                                                                   │
└──────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Price List Mapping

ERPNext uses `Price List` to organize different price levels. GGH maps them as follows:

| ERPNext Price List | Medusa Price List | GGH Usage |
|---|---|---|
| `GGH Wholesale` | `pl-wholesale` | Default B2C and B2B prices |
| `GGH Retail` | `pl-retail` | Reference retail price (for savings calculation) |
| `GGH Bulk` | `pl-bulk` | Case-pack and high-quantity pricing |

### 6.3 Bulk-Break Pricing (Price Tiers)

ERPNext's `Item Price` can have a `min_qty` field. GGH maps this to the `ggh.price_tier` table for tiered pricing:

| min_qty | Price (EGP) | Tier Name | Savings vs Retail |
|---|---|---|---|
| 1 | 55.00 | Retail · قطاعي | — (baseline) |
| 5 | 50.00 | Wholesale · جملة | 9% |
| 25 | 45.00 | Bulk · كميات | 18% |

```
ERPNext Item Prices:
  RICE-EG-5KG | GGH Wholesale | min_qty=1  | rate=55.00
  RICE-EG-5KG | GGH Wholesale | min_qty=5  | rate=50.00
  RICE-EG-5KG | GGH Wholesale | min_qty=25 | rate=45.00
  RICE-EG-5KG | GGH Retail    | min_qty=1  | rate=60.00

Maps to Medusa:
  PriceSet for variant RICE-EG-5KG:
    Price: amount=5500  (55.00 EGP * 100) | min_quantity=1  | price_list=wholesale
    Price: amount=5000  (50.00 EGP * 100) | min_quantity=5  | price_list=wholesale
    Price: amount=4500  (45.00 EGP * 100) | min_quantity=25 | price_list=wholesale
    Price: amount=6000  (60.00 EGP * 100) | min_quantity=1  | price_list=retail

  ggh.price_tier entries:
    variant_id=RICE-EG-5KG | tier_name_en="Retail"   | tier_name_ar="قطاعي"   | min_quantity=1  | price_amount=5500 | savings_label_en="" | savings_label_ar=""
    variant_id=RICE-EG-5KG | tier_name_en="Wholesale"| tier_name_ar="جملة"    | min_quantity=5  | price_amount=5000 | savings_label_en="Save 9%" | savings_label_ar="وفّر ٩٪"
    variant_id=RICE-EG-5KG | tier_name_en="Bulk"     | tier_name_ar="كميات"   | min_quantity=25 | price_amount=4500 | savings_label_en="Save 18%"| savings_label_ar="وفّر ١٨٪"
```

### 6.4 Price Override Handling

When GGH admin creates a custom price tier not present in ERPNext:

```typescript
// Price tier with GGH override flag
interface PriceTier {
  variantId: string;
  tierNameEn: string;
  tierNameAr: string;
  minQuantity: number;
  maxQuantity: number | null;
  priceAmount: number;          // Piastres
  isErpSourced: boolean;       // true = came from ERP sync, false = GGH override
  erpSourcePriceList: string | null;  // "GGH Wholesale" if ERP-sourced
}

// During sync: GGH overrides are never overwritten
function mergePriceTiers(erpTiers: PriceTier[], existingTiers: PriceTier[]): PriceTier[] {
  const gghOverrides = existingTiers.filter(t => !t.isErpSourced);
  const updatedErpTiers = erpTiers.map(erp => {
    // Update price amounts from ERP, keep GGH labels
    return { ...erp };
  });
  return [...updatedErpTiers, ...gghOverrides];
}
```

### 6.5 Yesterday's Price Tracking

GGH shows "price yesterday" comparison to build trust:

| Field | Source | Storage |
|---|---|---|
| `current_price` | Latest sync from ERP | `Price.amount` in Medusa |
| `yesterday_price` | Yesterday's closing price | `Product.metadata.yesterday_price_amount` |
| `price_change_amount` | `current - yesterday` | Computed at display time |
| `price_change_direction` | `up / down / same` | Computed at display time |

```
Nightly job (daily at 00:05 UTC):
  1. For all active products, snapshot current price → yesterday_price
  2. Store in Product.metadata.yesterday_price_amount
  3. Allow frontend to show: "↓ EGP 12 from yesterday · أقل ١٢ جنيه من أمس"
```

---

## 7. Customer Sync

### 7.1 Customer Sync Flow

Customer sync is **bidirectional** but with clear ownership rules:

| Direction | Trigger | What Syncs | Frequency |
|---|---|---|---|
| GGH → ERPNext | Customer created/updated | Contact info, addresses, phone | On event |
| ERPNext → GGH | Credit terms updated | Credit limit, payment terms, outstanding | Every 15 min |

### 7.2 Customer Push (GGH → ERPNext)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    CUSTOMER PUSH FLOW                                    │
│                                                                          │
│   Customer created/updated in Medusa                                     │
│       │                                                                  │
│       ▼                                                                  │
│   Enqueue erp.sync.customers job                                         │
│       │                                                                  │
│       ▼                                                                  │
│   Check: Does customer exist in ERPNext?                                 │
│   (Lookup by phone: Customer.custom_ggh_phone = "{phone}")              │
│       │                                                                  │
│       ├── NO → POST /api/resource/Customer                              │
│       │   {                                                              │
│       │     "customer_name": "GGH-{customer_id}",                       │
│       │     "custom_ggh_phone": "+201012345678",                        │
│       │     "custom_ggh_customer_id": "cus_01JXY...",                    │
│       │     "customer_group": "GGH Retail",  // or "GGH Wholesale"      │
│       │     "territory": "Egypt",                                        │
│       │     "customer_type": "Individual"    // or "Company"             │
│       │   }                                                              │
│       │                                                                  │
│       └── YES → PUT /api/resource/Customer/{name}                       │
│           {                                                              │
│             "custom_ggh_phone": "+201012345678",                        │
│             // Only update contact info, not financial data              │
│           }                                                              │
│       │                                                                  │
│       ▼                                                                  │
│   Store ERP Customer ID in Medusa Customer.metadata.erp_customer_id     │
│       │                                                                  │
│       ▼                                                                  │
│   Log to ggh.erp_sync_log                                               │
└──────────────────────────────────────────────────────────────────────────┘
```

### 7.3 Customer Pull (ERPNext → GGH)

| ERPNext Field | Medusa Field | Direction | Notes |
|---|---|---|---|
| `Customer.custom_ggh_phone` | — | Lookup key | Phone number is the cross-system identifier |
| `Customer.credit_limit` | `wholesale_account.credit_limit_amount` | Pull only | Credit terms managed in ERP |
| `Customer.outstanding_amount` | `wholesale_account.credit_used_amount` | Pull only | Outstanding balance from ERP |
| `Customer.payment_terms` | `wholesale_account.payment_terms_days` | Pull only | Net-30, Net-60, etc. |
| `Customer.customer_group` | `CustomerGroup` assignment | Pull only | B2B vs B2C group |

### 7.4 Wholesale Customer Handling

When a customer is verified as wholesale in GGH:

```
GGH wholesale_account.verification_status = "verified"
       │
       ▼
Push to ERPNext: Update Customer
  customer_group = "GGH Wholesale"
  customer_type = "Company"
  tax_id = wholesale_account.tax_registration_number

       │
       ▼
Pull from ERPNext: Credit terms
  credit_limit → wholesale_account.credit_limit_amount
  payment_terms → wholesale_account.payment_terms_days
```

---

## 8. Order Sync

### 8.1 Order Push Flow

This is the most critical sync. Every confirmed GGH order must appear as a Sales Order in ERPNext.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     ORDER PUSH FLOW                                      │
│                                                                          │
│   Order status → "confirmed" in Medusa                                   │
│       │                                                                  │
│       ▼                                                                  │
│   Enqueue erp.push.order job                                             │
│   { orderId: "order_01JXY...", idempotencyKey: "order_01JXY..._v1" }    │
│       │                                                                  │
│       ▼                                                                  │
│   Check: Does ERP Sales Order already exist for this order?              │
│   (Lookup by metadata.erp_so_id)                                        │
│       │                                                                  │
│       ├── YES → Skip (idempotent)                                       │
│       │                                                                  │
│       └── NO → POST /api/resource/Sales Order                           │
│           {                                                              │
│             "customer": "GGH-{customer_id}",                             │
│             "custom_ggh_order_id": "order_01JXY...",                     │
│             "delivery_date": "2025-01-16",                               │
│             "custom_delivery_zone": "Cairo Central",                     │
│             "custom_delivery_slot": "Morning 8AM-12PM",                  │
│             "items": [                                                   │
│               {                                                          │
│                 "item_code": "RICE-EG-5KG",                              │
│                 "qty": 2,                                                │
│                 "rate": 275.00,       // EGP, not piastres               │
│                 "warehouse": "Cairo Central"                             │
│               },                                                         │
│               {                                                          │
│                 "item_code": "OIL-SUN-1L",                               │
│                 "qty": 3,                                                │
│                 "rate": 85.00,                                           │
│                 "warehouse": "Cairo Central"                             │
│               }                                                          │
│             ],                                                           │
│             "taxes": [                                                   │
│               {                                                          │
│                 "charge_type": "On Net Total",                           │
│                 "account_head": "VAT 14% - GGH",                        │
│                 "rate": 14                                               │
│               }                                                          │
│             ],                                                           │
│             "custom_payment_method": "COD",                              │
│             "custom_ggh_idempotency_key": "order_01JXY..._v1"           │
│           }                                                              │
│       │                                                                  │
│       ├── Success →                                                      │
│       │   Store ERP SO ID: Order.metadata.erp_so_id = SO-01234         │
│       │   Log success in ggh.erp_sync_log                               │
│       │   Enqueue order.confirmation job                                │
│       │                                                                  │
│       └── Failure →                                                      │
│           Log error in ggh.erp_sync_log                                  │
│           BullMQ retries (5 attempts, exponential backoff)               │
│           After max retries → Dead Letter Queue + alert                  │
└──────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Order → Sales Order Field Mapping

| Medusa Order Field | ERPNext Sales Order Field | Transform | Notes |
|---|---|---|---|
| `Order.id` | `custom_ggh_order_id` | Direct | Cross-reference key |
| `Order.customer_id` | `customer` | `"GGH-" + customer_id` | Must exist in ERPNext |
| `Order.created_at` | `transaction_date` | ISO → Date only | |
| `Order.shipping_address` | `shipping_address` | Map address fields | Separate address DocType |
| `Order.billing_address` | `customer_address` | Map address fields | |
| `LineItem.variant.sku` | `item_code` | Direct | Must match ERP Item code |
| `LineItem.quantity` | `qty` | Direct | |
| `LineItem.unit_price` (piastres) | `rate` | `price / 100` | Piastres → EGP for ERP |
| `ShippingMethod.price` | Shipping line item | `charge_type: "Actual"` | |
| `Order.total_tax` (piastres) | Computed by ERP | Not sent | ERP recalculates VAT |
| `Order.metadata.delivery_zone` | `custom_delivery_zone` | Direct | |
| `Order.metadata.delivery_slot` | `custom_delivery_slot` | Direct | |
| `Order.metadata.payment_method` | `custom_payment_method` | "COD" / "Card" / "Wallet" | |

### 8.3 Order Status Sync

| GGH Order Status | ERPNext SO Status | Sync Direction |
|---|---|---|
| `pending` | — (not yet pushed) | N/A |
| `confirmed` | `To Deliver and Bill` | GGH → ERP (push SO) |
| `preparing` | `To Deliver and Bill` | No ERP status change |
| `out_for_delivery` | `To Deliver and Bill` | No ERP status change |
| `delivered` | `Delivered` | ERP → GGH (after Delivery Note) |
| `cancelled` | `Cancelled` | GGH → ERP (cancel SO) |
| `returned` | `Return` | GGH → ERP (Sales Return) |

### 8.4 COD Order Handling

Cash on Delivery orders require special handling in ERPNext:

```
COD Order in Medusa:
  payment_method = "COD"
  payment_status = "pending"  // No payment captured

In ERPNext:
  Sales Order created → Delivery Note → Sales Invoice
  Payment Entry: NOT created (cash not yet received)

When driver collects cash:
  GGH marks payment as "captured"
  Push to ERPNext: Create Payment Entry against Sales Invoice
    payment_type = "Receive"
    mode_of_payment = "Cash"
    paid_amount = order total
    reference_date = delivery date
```

---

## 9. Invoice & Payment Sync

### 9.1 Invoice Sync Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    INVOICE SYNC FLOW                                     │
│                                                                          │
│   Cron Trigger (every 15 min)                                            │
│       │                                                                  │
│       ▼                                                                  │
│   For orders with erp_so_id but no erp_invoice_id:                      │
│       │                                                                  │
│       ▼                                                                  │
│   GET /api/resource/Sales Invoice                                        │
│   ?filters=[["custom_ggh_order_id", "=", "{order_id}"]]                 │
│       │                                                                  │
│       ├── Found → Sync invoice data to Medusa                            │
│       │   ├── Store ERP invoice ID in Order.metadata.erp_invoice_id     │
│       │   ├── Update payment status based on Payment Entry               │
│       │   └── Log to ggh.erp_sync_log                                   │
│       │                                                                  │
│       └── Not found → Skip (invoice not yet created in ERP)              │
│                                                                          │
│   For orders with erp_invoice_id:                                        │
│       │                                                                  │
│       ▼                                                                  │
│   GET /api/resource/Payment Entry                                        │
│   ?filters=[["reference_name", "=", "{erp_invoice_id}"]]                 │
│       │                                                                  │
│       ├── Found → Update Medusa Payment status                           │
│       │   ├── COD: payment_captured = true                               │
│       │   ├── Card: match payment session                                │
│       │   └── Log to ggh.erp_sync_log                                   │
│       │                                                                  │
│       └── Not found → Payment not yet recorded in ERP                    │
└──────────────────────────────────────────────────────────────────────────┘
```

### 9.2 Invoice Field Mapping

| ERPNext Sales Invoice | Medusa Entity | Field | Notes |
|---|---|---|---|
| `name` (e.g., "SINV-00123") | `Order.metadata` | `erp_invoice_id` | Cross-reference |
| `grand_total` | `Payment.amount` | Piastres conversion | Should match Medusa total |
| `total_taxes_and_charges` | `Order.tax_total` | Compare | Alert if mismatch > 1 EGP |
| `outstanding_amount` | — | Display only | Remaining unpaid amount |
| `status` ("Paid", "Unpaid", "Overdue") | `Payment.status` | Map | |
| `due_date` | `Payment.metadata.due_date` | Direct | For credit customers |

### 9.3 VAT Handling

Egyptian VAT is 14%. ERPNext calculates VAT on the Sales Order based on the tax template. GGH does **not** independently calculate VAT — it relies on ERPNext's calculation and reflects it in the frontend.

| Scenario | GGH Behavior | ERPNext Behavior |
|---|---|---|
| Order with taxable items | Show "VAT included" on invoice | Calculate 14% on taxable items |
| Order with exempt items (some groceries) | Show "Exempt" on line item | Tax template marks as exempt |
| Mixed order | Show VAT breakdown in invoice | Apply per-item tax rules |

---

## 10. Delivery Note & Fulfillment Sync

### 10.1 Delivery Note Sync

```
ERPNext Flow (after Sales Order is created):
  Sales Order → Delivery Note → Sales Invoice

GGH syncs the Delivery Note to get:
  1. Shipment confirmation (items actually shipped)
  2. Actual quantities (partial shipments)
  3. Weight verification data

Sync Flow:
  GET /api/resource/Delivery Note
  ?filters=[["custom_ggh_order_id", "=", "{order_id}"],
            ["docstatus", "=", 1]]  // Only submitted notes
       │
       ▼
  Update Medusa Fulfillment:
    tracking_number = Delivery Note.name
    shipped_at = Delivery Note.posting_date + posting_time
    metadata.actual_qty = per-item quantities
```

### 10.2 Delivery Proof Push

When a driver uploads delivery proof in GGH:

```
GGH uploads delivery proof (photo + weight)
       │
       ▼
Store in ggh.delivery_proof table
       │
       ▼
Push to ERPNext: Update Delivery Note
  custom_ggh_delivery_photo_url = photo URL
  custom_ggh_weight_photo_url = weight photo URL
  custom_ggh_actual_weight_kg = actual weight
  custom_ggh_delivered_to = recipient name
  custom_ggh_delivered_at = timestamp
```

---

## 11. Webhook Integration

### 11.1 ERPNext → GGH Webhooks

ERPNext can push events to GGH via webhooks, reducing sync latency for critical updates.

| Webhook Event | ERPNext Trigger | GGH Endpoint | What Happens |
|---|---|---|---|
| Order status change | Sales Order status update | `POST /api/webhooks/erpnext/order-status` | Update Medusa order status |
| Invoice created | Sales Invoice submitted | `POST /api/webhooks/erpnext/invoice` | Update payment status |
| Stock update | Stock Entry submitted | `POST /api/webhooks/erpnext/stock` | Update inventory cache |
| Price update | Item Price changed | `POST /api/webhooks/erpnext/price` | Invalidate price cache |
| Delivery Note | Delivery Note submitted | `POST /api/webhooks/erpnext/delivery` | Update fulfillment status |

### 11.2 Webhook Security

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    WEBHOOK VERIFICATION FLOW                             │
│                                                                          │
│   ERPNext sends POST to GGH webhook endpoint                            │
│       │                                                                  │
│       ▼                                                                  │
│   Verify: x-erpnext-webhook-token header matches WEBHOOK_SECRET         │
│       │                                                                  │
│       ├── Invalid → 401 Unauthorized, log attempt                       │
│       │                                                                  │
│       └── Valid → Process webhook                                       │
│           │                                                              │
│           ▼                                                              │
│   Verify: payload checksum (HMAC-SHA256 of body + secret)               │
│           │                                                              │
│           ├── Invalid → 401 Unauthorized, log attempt                   │
│           │                                                              │
│           └── Valid → Process event                                      │
│               │                                                          │
│               ▼                                                          │
│   Enqueue appropriate BullMQ job                                         │
│   (Don't process synchronously — webhooks must return 200 quickly)       │
│               │                                                          │
│               ▼                                                          │
│   Return 200 OK immediately                                              │
└──────────────────────────────────────────────────────────────────────────┘
```

### 11.3 Webhook Payload Format

```json
{
  "event": "Sales Order Update",
  "doctype": "Sales Order",
  "name": "SO-01234",
  "custom_ggh_order_id": "order_01JXY...",
  "status": "Delivered",
  "modified": "2025-01-16 14:30:00",
  "timestamp": "2025-01-16T14:30:00Z"
}
```

### 11.4 Webhook Idempotency

ERPNext may send the same webhook multiple times. GGH handles this:

```typescript
// Webhook deduplication using Redis
async function handleWebhook(payload: WebhookPayload): Promise<void> {
  const dedupKey = `webhook:erpnext:${payload.doctype}:${payload.name}:${payload.modified}`;

  // Check if we already processed this exact event
  const exists = await redis.get(dedupKey);
  if (exists) {
    logger.info('Duplicate webhook ignored', { dedupKey });
    return;
  }

  // Mark as processed (TTL: 1 hour)
  await redis.set(dedupKey, '1', 'EX', 3600);

  // Enqueue job for actual processing
  await webhookQueue.add('process', payload, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  });
}
```

---

## 12. Field Mapping Reference

### 12.1 Product Mapping

| # | ERPNext Item | Transform | Medusa Product | Notes |
|---|---|---|---|---|
| 1 | `name` | Direct | `external_id` / `metadata.erp_item_code` | e.g., "RICE-EG-5KG" |
| 2 | `item_name` | Direct | `title` | English name |
| 3 | `custom_name_ar` | Direct if non-empty | `metadata.name_ar` | GGH override preserved |
| 4 | `item_group` | Lookup mapping | `category_id` | Via Item Group → Category map |
| 5 | `description` | HTML → plain text | `description` | Sanitize ERP HTML |
| 6 | `disabled` | `true→"draft"`, `false→"published"` | `status` | Disabled = hidden, not deleted |
| 7 | `is_stock_item` | Direct | `metadata.is_stock_item` | Non-stock items still synced |
| 8 | `stock_uom` | Direct | `metadata.uom` | "Kg", "Ltr", "Pcs" |
| 9 | `brand` | Direct | `metadata.brand` | Stored as metadata |
| 10 | `standard_rate` | `× 100` | `Price.amount` | EGP → piastres |
| 11 | `valuation_rate` | `× 100` | `metadata.cost_amount` | Internal cost |
| 12 | `image` | Ignored | — | GGH manages its own images |
| 13 | `modified` | Direct | `metadata.erp_modified_at` | Sync cursor |
| 14 | `creation` | Direct | `metadata.erp_created_at` | Audit |
| 15 | `has_variants` | Branch logic | — | Determines variant handling |
| 16 | `variant_of` | Lookup parent | — | Links variant to template |

### 12.2 Order Mapping

| # | Medusa Order | Transform | ERPNext Sales Order | Notes |
|---|---|---|---|---|
| 1 | `id` | Direct | `custom_ggh_order_id` | Cross-reference |
| 2 | `customer_id` | `"GGH-" + id` | `customer` | Must exist in ERP |
| 3 | `created_at` | ISO → Date | `transaction_date` | Date only |
| 4 | `LineItem.variant.sku` | Direct | `item_code` | Per line |
| 5 | `LineItem.quantity` | Direct | `qty` | Per line |
| 6 | `LineItem.unit_price` | `÷ 100` | `rate` | Piastres → EGP |
| 7 | `ShippingMethod.price` | `÷ 100` | Shipping line | `charge_type: "Actual"` |
| 8 | `metadata.delivery_zone` | Direct | `custom_delivery_zone` | |
| 9 | `metadata.delivery_slot` | Direct | `custom_delivery_slot` | |
| 10 | `metadata.payment_method` | Direct | `custom_payment_method` | "COD" / "Card" |
| 11 | `total` | `÷ 100` | `grand_total` (computed) | ERP recalculates |
| 12 | `shipping_address` | Map fields | `shipping_address` | Address DocType |
| 13 | `billing_address` | Map fields | `customer_address` | Address DocType |

### 12.3 Customer Mapping

| # | Medusa Customer | Transform | ERPNext Customer | Notes |
|---|---|---|---|---|
| 1 | `id` | `"GGH-" + id` | `name` | ERP customer ID |
| 2 | `phone` | Direct | `custom_ggh_phone` | Primary lookup key |
| 3 | `email` | Direct | `email_id` | |
| 4 | `first_name` + `last_name` | Concatenate | `customer_name` | |
| 5 | `customer_group.name` | Map | `customer_group` | "GGH Retail" / "GGH Wholesale" |
| 6 | `metadata.erp_customer_id` | Direct | `name` | Reverse lookup |
| 7 | `addresses` | Map fields | Address DocType | Separate DocType in ERP |

### 12.4 Address Mapping

| Medusa Address | ERPNext Address | Transform |
|---|---|---|
| `first_name` + `last_name` | `address_title` | Concatenate |
| `address_1` | `address_line1` | Direct |
| `address_2` | `address_line2` | Direct |
| `city` | `city` | Direct |
| `province` | `state` | Map Egyptian governorates |
| `postal_code` | `pincode` | Direct |
| `phone` | `phone` | Direct |
| `metadata.area` | `custom_area` | Egyptian area/neighborhood |

---

## 13. Conflict Resolution

### 13.1 Conflict Detection

A conflict occurs when the same entity has been modified in both ERPNext and Medusa since the last sync.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    CONFLICT DETECTION                                    │
│                                                                          │
│   Read ERP entity (modified = ERP_T2)                                    │
│   Read Medusa entity (updated_at = MED_T2)                              │
│   Read last sync cursor (last_synced_at = SYNC_T1)                      │
│                                                                          │
│   If ERP_T2 > SYNC_T1 AND MED_T2 > SYNC_T1:                            │
│       → CONFLICT: Both modified since last sync                         │
│   If ERP_T2 > SYNC_T1 AND MED_T2 <= SYNC_T1:                           │
│       → UPDATE: Only ERP modified, safe to update Medusa                │
│   If ERP_T2 <= SYNC_T1 AND MED_T2 > SYNC_T1:                           │
│       → SKIP: Only Medusa modified, GGH override active                 │
│   If ERP_T2 <= SYNC_T1 AND MED_T2 <= SYNC_T1:                          │
│       → SKIP: Neither modified                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 13.2 Resolution Strategies

| Entity | Field | Strategy | Winner | Rationale |
|---|---|---|---|---|
| Product | `title` (EN) | **ERP wins** | ERPNext | ERP is the product master |
| Product | `name_ar` | **GGH wins** | GGH | ERP doesn't have Arabic names |
| Product | `description` | **ERP wins** | ERPNext | ERP is the product master |
| Product | `category` | **ERP wins** | ERPNext | ERP owns item grouping |
| Product | `price` (base) | **ERP wins** | ERPNext | ERP is the price master |
| Product | `price_tiers` (GGH) | **GGH wins** | GGH | Custom bulk-break tiers |
| Product | `images` | **GGH wins** | GGH | GGH manages its own images |
| Product | `metadata.is_case_pack` | **GGH wins** | GGH | GGH-specific attribute |
| Customer | `contact info` | **Latest wins** | By timestamp | Who changed it last |
| Customer | `credit_limit` | **ERP wins** | ERPNext | Finance owns credit terms |
| Customer | `payment_terms` | **ERP wins** | ERPNext | Finance owns payment terms |
| Customer | `addresses` | **Latest wins** | By timestamp | Who changed it last |
| Order | `status` (operational) | **GGH wins** | GGH | GGH manages delivery |
| Order | `status` (financial) | **ERP wins** | ERPNext | ERP manages invoicing |
| Inventory | `stock levels` | **ERP wins** | ERPNext | ERP is the stock ledger |
| Invoice | `amount` | **ERP wins** | ERPNext | ERP is the financial record |

### 13.3 Conflict Logging

Every conflict is logged with full snapshots so it can be reviewed and manually resolved:

```sql
INSERT INTO ggh.erp_sync_log (
  entity_type, entity_id, direction, status,
  medusa_data, erp_data, error_message
) VALUES (
  'product',
  'RICE-EG-5KG',
  'erp_to_medusa',
  'conflict',
  '{"title": "Egyptian Rice 5kg", "price": 5500, "updated_at": "2025-01-16T14:30:00Z"}',
  '{"item_name": "Egyptian Rice 5kg (Updated)", "standard_rate": 57.5, "modified": "2025-01-16T14:25:00Z"}',
  'Both modified since last sync. ERP price change: 55.00 → 57.50 EGP. Applied ERP price.'
);
```

### 13.4 Price Conflict: Special Handling

Price conflicts are the most sensitive because they affect what Om Ibrahim pays:

| Scenario | Resolution | Customer Impact |
|---|---|---|
| ERP price increased, Medusa still has old price | Apply ERP price. Show updated price immediately. | Customer sees new price on next page load |
| ERP price decreased, Medusa still has old price | Apply ERP price. Show new lower price. | Customer benefits from lower price |
| Customer has item in cart at old price | Use current (ERP) price at checkout. Show "Price updated · السعر اتحدث" notice. | Transparent price change |
| Order already placed at old price | Honor the price the customer saw. Don't retroactively change. | Trust over correctness |

---

## 14. Queue Strategy & Job Processing

### 14.1 Queue Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                       QUEUE ARCHITECTURE                                 │
│                                                                          │
│   ┌────────────────────────────────────────────────────────────────┐     │
│   │                     Redis (BullMQ Backend)                      │     │
│   │                                                                  │     │
│   │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           │     │
│   │  │ erp.sync.    │ │ erp.push.    │ │ erp.sync.    │           │     │
│   │  │ products     │ │ order        │ │ inventory    │           │     │
│   │  │ Priority:LOW │ │ Priority:HIGH│ │ Priority:MED │           │     │
│   │  │ Conc:2       │ │ Conc:5       │ │ Conc:5       │           │     │
│   │  └──────────────┘ └──────────────┘ └──────────────┘           │     │
│   │                                                                  │     │
│   │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           │     │
│   │  │ erp.sync.    │ │ order.       │ │ cache.       │           │     │
│   │  │ customers    │ │ confirmation │ │ invalidate   │           │     │
│   │  │ Priority:MED │ │ Priority:HIGH│ │ Priority:LOW │           │     │
│   │  │ Conc:3       │ │ Conc:10      │ │ Conc:5       │           │     │
│   │  └──────────────┘ └──────────────┘ └──────────────┘           │     │
│   │                                                                  │     │
│   │  ┌──────────────┐ ┌──────────────┐                              │     │
│   │  │ erp.sync.    │ │ notification.│                              │     │
│   │  │ invoice      │ │ sms          │                              │     │
│   │  │ Priority:MED │ │ Priority:HIGH│                              │     │
│   │  │ Conc:3       │ │ Conc:20      │                              │     │
│   │  └──────────────┘ └──────────────┘                              │     │
│   └────────────────────────────────────────────────────────────────┘     │
│                                                                          │
│   ┌────────────────────────────────────────────────────────────────┐     │
│   │                     BullMQ Worker Process                       │     │
│   │                                                                  │     │
│   │  Shared Clients:                                                 │     │
│   │  ├── Medusa Admin API Client (with service token)               │     │
│   │  ├── ERPNext REST Client (with api_key + api_secret)            │     │
│   │  ├── PostgreSQL Connection (for ggh.erp_sync_log writes)        │     │
│   │  └── Next.js Revalidation Webhook Client                        │     │
│   └────────────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────────────┘
```

### 14.2 Queue Priority Levels

| Priority | Level | Queues | Rationale |
|---|---|---|---|
| **Critical** | 1 (highest) | `erp.push.order`, `order.confirmation` | Revenue-impacting: orders must reach ERP |
| **High** | 2 | `notification.sms`, `erp.sync.inventory` | Customer-impacting: stock accuracy and OTP delivery |
| **Medium** | 3 | `erp.sync.customers`, `erp.sync.invoice` | Operational: data consistency |
| **Low** | 4 | `erp.sync.products`, `cache.invalidate`, `report.generate` | Background: catalog updates and cache |

### 14.3 Job Data Schema

Each job carries a structured payload for processing:

#### erp.sync.products

```typescript
interface ErpProductSyncJob {
  fullSync: boolean;           // true = pull all, false = incremental
  cursorTimestamp?: string;    // ISO timestamp for incremental sync
  itemCodes?: string[];        // Specific items to sync (on-demand)
  triggeredBy: 'cron' | 'admin' | 'webhook';
}
```

#### erp.sync.inventory

```typescript
interface ErpInventorySyncJob {
  fullSync: boolean;
  cursorTimestamp?: string;
  itemCodes?: string[];
  warehouses?: string[];       // Filter by warehouse
  triggeredBy: 'cron' | 'admin' | 'webhook';
}
```

#### erp.push.order

```typescript
interface ErpOrderPushJob {
  orderId: string;
  idempotencyKey: string;
  attemptNumber: number;
  triggeredBy: 'order_confirmed' | 'admin_retry';
}
```

#### erp.sync.customers

```typescript
interface ErpCustomerSyncJob {
  customerId: string;
  direction: 'push' | 'pull';
  idempotencyKey: string;
  triggeredBy: 'customer_created' | 'customer_updated' | 'cron';
}
```

#### erp.sync.invoice

```typescript
interface ErpInvoiceSyncJob {
  orderIds?: string[];          // Specific orders to check
  fullSync: boolean;
  triggeredBy: 'cron' | 'admin';
}
```

### 14.4 Scheduled Jobs Configuration

```typescript
// Worker scheduler configuration
const scheduledJobs = [
  {
    queueName: 'erp.sync.inventory',
    pattern: '*/5 * * * *',          // Every 5 minutes
    data: { fullSync: false, triggeredBy: 'cron' },
    opts: { priority: 2 },
  },
  {
    queueName: 'erp.sync.products',
    pattern: '*/10 * * * *',         // Every 10 minutes
    data: { fullSync: false, triggeredBy: 'cron' },
    opts: { priority: 4 },
  },
  {
    queueName: 'erp.sync.invoice',
    pattern: '*/15 * * * *',         // Every 15 minutes
    data: { fullSync: false, triggeredBy: 'cron' },
    opts: { priority: 3 },
  },
  {
    queueName: 'cache.invalidate',
    pattern: '0 4 * * *',            // Daily at 04:00 UTC
    data: { keys: ['cache:*'], reason: 'nightly_full_purge' },
    opts: { priority: 4 },
  },
];
```

---

## 15. Retry Strategy & Dead Letter Queue

### 15.1 Retry Configuration

| Queue | Max Retries | Backoff Strategy | Backoff Delays | Rationale |
|---|---|---|---|---|
| `erp.sync.inventory` | 3 | Exponential | 30s, 120s, 300s | Inventory syncs frequently; next sync covers |
| `erp.sync.products` | 5 | Exponential | 30s, 120s, 300s, 600s, 1200s | Product sync is less urgent but must complete |
| `erp.sync.customers` | 3 | Linear | 60s each | Customer push must succeed for order flow |
| `erp.push.order` | 5 | Exponential | 10s, 30s, 120s, 300s, 600s | **Critical**: every order must reach ERP |
| `erp.sync.invoice` | 3 | Exponential | 60s, 300s, 900s | Invoice sync is not time-sensitive |
| `order.confirmation` | 3 | Linear | 30s each | Customer must get confirmation |
| `notification.sms` | 2 | Linear | 10s each | SMS is time-sensitive; few retries |
| `cache.invalidate` | 2 | Linear | 5s each | Cache will naturally expire |

### 15.2 Retry Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                       RETRY FLOW                                         │
│                                                                          │
│   Job enqueued                                                           │
│       │                                                                  │
│       ▼                                                                  │
│   Attempt 1                                                              │
│       │                                                                  │
│       ├── Success → Completed ✓                                          │
│       │                                                                  │
│       └── Failure →                                                      │
│           ├── Attempt < max_retries?                                     │
│           │   ├── YES → Move to "waiting" with backoff delay             │
│           │   │         Increment attempt_number                         │
│           │   │         Log to erp_sync_log (status='error', attempt=N)  │
│           │   └── NO → Move to Dead Letter Queue                        │
│           │              Log to erp_sync_log (status='error', final)     │
│           │              Alert admin (PagerDuty / Slack)                 │
│           │                                                              │
│           ▼                                                              │
│   Attempt 2 (after backoff delay)                                        │
│       │                                                                  │
│       ├── Success → Completed ✓                                          │
│       │   Log recovery to erp_sync_log (status='success', attempt=2)    │
│       │                                                                  │
│       └── Failure → Continue retry loop...                               │
└──────────────────────────────────────────────────────────────────────────┘
```

### 15.3 Backoff Strategy Detail

```typescript
// Exponential backoff with jitter
function calculateBackoff(attempt: number, baseDelays: number[]): number {
  const delay = baseDelays[Math.min(attempt - 1, baseDelays.length - 1)];
  // Add jitter: ±20% of delay to prevent thundering herd
  const jitter = delay * 0.2 * (Math.random() * 2 - 1);
  return Math.max(1000, Math.round(delay + jitter));
}

// Example for erp.push.order (delays: 10s, 30s, 120s, 300s, 600s)
// Attempt 1 fails → wait ~10s (8s–12s with jitter)
// Attempt 2 fails → wait ~30s (24s–36s with jitter)
// Attempt 3 fails → wait ~120s (96s–144s with jitter)
// Attempt 4 fails → wait ~300s (240s–360s with jitter)
// Attempt 5 fails → Dead Letter Queue
```

### 15.4 Dead Letter Queue Handling

| Step | Action | Owner | Timeline |
|---|---|---|---|
| 1. Job enters DLQ | BullMQ moves failed job automatically | System | Immediate |
| 2. Alert fires | PagerDuty for critical queues, Slack for others | System | < 1 minute |
| 3. Engineer reviews | Check `ggh.erp_sync_log` for error details | On-call engineer | < 15 minutes (critical) |
| 4. Diagnose root cause | ERP down? API change? Data corruption? | On-call engineer | Varies |
| 5. Fix and replay | Re-queue the job programmatically | On-call engineer | After fix |
| 6. Verify | Confirm job completes; check downstream consistency | On-call engineer | After replay |
| 7. Document | Post-incident review in wiki | Team | Within 24 hours |

### 15.5 Critical Queue Alerts

| Queue | Alert Channel | Severity | Response Time |
|---|---|---|---|
| `erp.push.order` | PagerDuty | P1 — Critical | < 15 minutes |
| `order.confirmation` | PagerDuty | P1 — Critical | < 15 minutes |
| `erp.sync.inventory` | Slack #ops | P2 — High | < 1 hour |
| `erp.sync.products` | Slack #ops | P3 — Medium | < 4 hours |
| `erp.sync.customers` | Slack #ops | P3 — Medium | < 4 hours |
| `erp.sync.invoice` | Slack #ops | P3 — Medium | < 4 hours |
| `cache.invalidate` | Log only | P4 — Low | Next business day |

---

## 16. Idempotency & Deduplication

### 16.1 Idempotency Keys

Every push operation includes an idempotency key that ERPNext can use to prevent duplicate processing:

| Operation | Key Format | Example |
|---|---|---|
| Order push | `ggh-order-{orderId}-v{version}` | `ggh-order-order_01JXY-v1` |
| Customer push | `ggh-customer-{customerId}-v{version}` | `ggh-customer-cus_01ABC-v1` |
| Delivery proof push | `ggh-proof-{orderId}` | `ggh-proof-order_01JXY` |

### 16.2 Idempotency Implementation

```typescript
// Before pushing an order to ERPNext
async function pushOrderToErp(order: Order): Promise<ErpSalesOrder> {
  const idempotencyKey = `ggh-order-${order.id}-v${order.metadata.syncVersion ?? 1}`;

  // Check if already pushed (idempotency)
  const existingSoId = order.metadata.erp_so_id;
  if (existingSoId) {
    logger.info('Order already pushed to ERP', { orderId: order.id, soId: existingSoId });
    return fetchSalesOrder(existingSoId);
  }

  // Push with idempotency key
  const response = await erpClient.post('/api/resource/Sales Order', {
    ...mapOrderToSalesOrder(order),
    custom_ggh_idempotency_key: idempotencyKey,
  });

  // Check for duplicate (ERPNext might have created it from a retry)
  if (response.data?.name) {
    // Store ERP SO ID to prevent future pushes
    await medusaClient.admin.orders.update(order.id, {
      metadata: {
        ...order.metadata,
        erp_so_id: response.data.name,
        erp_synced_at: new Date().toISOString(),
      },
    });
  }

  return response.data;
}
```

### 16.3 Pull Deduplication

For pull syncs, deduplication uses the sync cursor:

```typescript
// Only fetch records modified after the last sync
async function pullModifiedItems(cursor: string): Promise<ErpItem[]> {
  const response = await erpClient.get('/api/resource/Item', {
    params: {
      filters: JSON.stringify([['modified', '>', cursor]]),
      limit_page_length: 200,
      order_by: 'modified asc',
    },
  });

  return response.data.data;
}
```

### 16.4 BullMQ Job Deduplication

BullMQ provides built-in job deduplication via the `jobId` option:

```typescript
// Prevent duplicate jobs for the same order
await erpPushOrderQueue.add(
  'push-order',
  { orderId: order.id, idempotencyKey },
  {
    jobId: `push-order-${order.id}`,   // Deduplication key
    attempts: 5,
    backoff: { type: 'exponential', delay: 10000 },
  }
);
// If a job with this jobId already exists and is not completed/failed,
// BullMQ silently ignores the duplicate add.
```

---

## 17. Monitoring & Observability

### 17.1 Monitoring Dashboard

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    ERP SYNC MONITORING DASHBOARD                         │
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  SYNC HEALTH                       Last 24 hours                │   │
│   │                                                                  │   │
│   │  Products:  ████████████░░  2,340 / 2,500 synced  (93.6%)      │   │
│   │  Inventory: ██████████████  1,890 / 1,890 synced  (100%)       │   │
│   │  Customers: ████████████░  890 / 900 synced      (98.9%)       │   │
│   │  Orders:    ██████████████  456 / 456 pushed      (100%)       │   │
│   │  Invoices:  ████████████░  380 / 400 synced      (95.0%)       │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   ┌──────────────────────────────┐  ┌──────────────────────────────┐   │
│   │  QUEUE STATUS                │  │  RECENT FAILURES             │   │
│   │                              │  │                              │   │
│   │  erp.push.order:   0 active  │  │  14:23  Order push failed   │   │
│   │                     0 waiting │  │         SO-01234 timeout    │   │
│   │                     2 DLQ    │  │  14:15  Inventory sync err  │   │
│   │                              │  │         ERP API 503          │   │
│   │  erp.sync.inventory:         │  │  13:58  Product sync conflict│   │
│   │              1 active        │  │         RICE-EG-5KG price    │   │
│   │              0 waiting       │  │                              │   │
│   │              0 DLQ           │  │                              │   │
│   └──────────────────────────────┘  └──────────────────────────────┘   │
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  SYNC LATENCY (p95)                                            │   │
│   │                                                                  │   │
│   │  Products:   2.3s  ████████░░░░░░░░░░░░░░                      │   │
│   │  Inventory:  1.1s  ████░░░░░░░░░░░░░░░░░░                      │   │
│   │  Customers:  0.8s  ███░░░░░░░░░░░░░░░░░░░                      │   │
│   │  Orders:     3.5s  ████████████░░░░░░░░░░                      │   │
│   │  Invoices:  1.9s  ██████░░░░░░░░░░░░░░░░                      │   │
│   └─────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
```

### 17.2 Key Metrics

| Metric | Source | Target | Alert Threshold |
|---|---|---|---|
| Sync success rate | `ggh.erp_sync_log` | > 99% | < 95% for 15 min |
| Sync latency (p95) | BullMQ job duration | < 5 seconds | > 10 seconds |
| Queue depth | BullMQ `waiting` count | < 100 jobs | > 500 jobs |
| DLQ size | BullMQ `failed` count | 0 | > 0 for critical queues |
| Cursor lag | `ggh.erp_sync_cursor` vs `NOW()` | < 15 minutes | > 30 minutes |
| ERP API error rate | Worker HTTP logs | < 1% | > 5% for 5 min |
| Conflict rate | `ggh.erp_sync_log` status='conflict' | < 0.1% | > 1% |

### 17.3 Logging Standards

Every sync operation logs a structured entry:

```typescript
interface SyncLogEntry {
  timestamp: string;           // ISO 8601
  level: 'info' | 'warn' | 'error';
  traceId: string;             // Distributed trace ID
  jobId: string;               // BullMQ job ID
  queue: string;               // Queue name
  entityType: string;          // 'product' | 'inventory' | 'customer' | 'order' | 'invoice'
  entityId: string;            // ERP or Medusa ID
  direction: 'erp_to_medusa' | 'medusa_to_erp';
  status: 'started' | 'success' | 'conflict' | 'error';
  durationMs: number;
  attempt: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}
```

### 17.4 Health Check Endpoint

```typescript
// GET /api/erp/health — Internal health check
interface ErpHealthResponse {
  status: 'healthy' | 'degraded' | 'down';
  erpReachable: boolean;
  lastSuccessfulSync: {
    products: string;    // ISO timestamp
    inventory: string;
    customers: string;
    orders: string;
    invoices: string;
  };
  cursorLag: {
    products: number;    // Minutes behind
    inventory: number;
    customers: number;
    orders: number;
    invoices: number;
  };
  queueStatus: {
    [queueName: string]: {
      active: number;
      waiting: number;
      failed: number;
      dlq: number;
    };
  };
}
```

---

## 18. Manual Override & Admin Tools

### 18.1 Admin Dashboard — ERP Sync Page

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ERP Sync Dashboard · لوحة تحكم المزامنة                                │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Quick Actions                                                  │    │
│  │                                                                  │    │
│  │  [🔄 Sync Products Now · مزامنة المنتجات]                     │    │
│  │  [📦 Sync Inventory Now · مزامنة المخزون]                      │    │
│  │  [👥 Sync Customers Now · مزامنة العملاء]                      │    │
│  │  [💰 Sync Invoices Now · مزامنة الفواتير]                      │    │
│  │  [🔃 Full Sync (All) · مزامنة كاملة]                           │    │
│  │                                                                  │    │
│  │  Touch targets: 56px minimum                                     │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Sync Log (last 50 entries)                                     │    │
│  │                                                                  │    │
│  │  Time       │ Entity    │ ID            │ Status   │ Duration   │    │
│  │  14:30:15   │ Product   │ RICE-EG-5KG   │ ✓ Synced │ 1.2s       │    │
│  │  14:30:12   │ Product   │ OIL-SUN-1L    │ ⚠ Conflict│ 0.8s      │    │
│  │  14:29:58   │ Inventory │ RICE-EG-5KG   │ ✓ Synced │ 0.3s       │    │
│  │  14:29:55   │ Order     │ order_01JXY   │ ✗ Error  │ 5.0s       │    │
│  │                                                                  │    │
│  │  [ ↻ Retry Failed · إعادة المحاولة ]                           │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  DLQ (Dead Letter Queue)                                        │    │
│  │                                                                  │    │
│  │  2 items in DLQ                                                  │    │
│  │  ┌──────────────────────────────────────────────────────────┐   │    │
│  │  │ Order order_01JXY → SO push failed (5 attempts)         │   │    │
│  │  │ Error: ERP API timeout                                  │   │    │
│  │  │ [ ↻ Replay · إعادة ]  [ ✗ Dismiss · تجاهل ]            │   │    │
│  │  └──────────────────────────────────────────────────────────┘   │    │
│  │  ┌──────────────────────────────────────────────────────────┐   │    │
│  │  │ Product OIL-SUN-5L → Sync failed (5 attempts)           │   │    │
│  │  │ Error: Invalid item_code in ERP                          │   │    │
│  │  │ [ ↻ Replay · إعادة ]  [ ✗ Dismiss · تجاهل ]            │   │    │
│  │  └──────────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘
```

### 18.2 Manual Override Actions

| Action | API Endpoint | Method | Who Can Trigger |
|---|---|---|---|
| Trigger product sync | `/api/admin/v1/erp/sync/products` | POST | Admin |
| Trigger inventory sync | `/api/admin/v1/erp/sync/inventory` | POST | Admin |
| Trigger full sync | `/api/admin/v1/erp/sync/full` | POST | Super Admin |
| Replay DLQ job | `/api/admin/v1/erp/dlq/{jobId}/replay` | POST | Admin |
| Dismiss DLQ job | `/api/admin/v1/erp/dlq/{jobId}/dismiss` | POST | Super Admin |
| Override product price | `/api/admin/v1/products/{id}/price-override` | POST | Admin |
| Reset sync cursor | `/api/admin/v1/erp/cursor/{entityType}/reset` | POST | Super Admin |
| Get sync status | `/api/admin/v1/erp/sync/status` | GET | Admin |

### 18.3 Full Sync Procedure

Full sync is a heavyweight operation that re-pulls everything from ERPNext. Use only for:

- Initial data load
- Disaster recovery
- After ERPNext upgrade or migration
- When incremental sync has been broken for > 1 hour

```
Full Sync Steps:
  1. Admin clicks "Full Sync" button (56px touch target)
  2. Confirmation dialog: "This will re-sync all data from ERPNext. Continue? · إعادة مزامنة كاملة. استمر؟"
  3. System creates full sync jobs with fullSync=true
  4. Cursor reset to epoch (1970-01-01)
  5. Paginated fetch from ERPNext (200 items per page)
  6. For each item: upsert (create or update) in Medusa
  7. Preserve GGH overrides throughout
  8. Update cursor to latest timestamp
  9. Invalidate all caches
  10. Notify admin: "Full sync complete · المزامنة الكاملة تمت"
```

---

## 19. Development & Testing with ERPNext

### 19.1 Local Development Without ERPNext

ERPNext is difficult to set up locally. GGH developers use a **mock ERPNext API** for local development:

```typescript
// Mock ERPNext API using MSW (Mock Service Worker)
const erpHandlers = [
  // Mock Item list
  http.get('*/api/resource/Item', () => {
    return HttpResponse.json({
      data: mockItems,  // 50-item fixture
    });
  }),

  // Mock Stock Ledger
  http.get('*/api/resource/Stock Ledger Entry', () => {
    return HttpResponse.json({
      data: mockStockLedger,
    });
  }),

  // Mock Sales Order creation
  http.post('*/api/resource/Sales Order', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      data: { name: `SO-${Math.floor(Math.random() * 99999)}` },
    });
  }),

  // Simulate ERP downtime (toggle in dev)
  http.get('*/api/resource/Item', ({ request }) => {
    if (process.env.MOCK_ERP_DOWN === 'true') {
      return new HttpResponse(null, { status: 503 });
    }
    return HttpResponse.json({ data: mockItems });
  }),
];
```

### 19.2 ERPNext Mock Data Fixtures

```typescript
// fixtures/erp-items.ts
export const mockErpItems: ErpItem[] = [
  {
    name: 'RICE-EG-5KG',
    item_name: 'Egyptian Rice 5kg',
    custom_name_ar: 'أرز مصري ٥ كيلو',
    item_group: 'Rice & Grains',
    stock_uom: 'Pcs',
    is_stock_item: true,
    disabled: false,
    standard_rate: 55.00,
    valuation_rate: 42.00,
    brand: 'Al Doha',
    has_variants: false,
    modified: '2025-01-16T14:00:00Z',
  },
  {
    name: 'OIL-SUN-1L',
    item_name: 'Sunflower Oil 1L',
    custom_name_ar: 'زيت عباد الشمس ١ لتر',
    item_group: 'Oils & Fats',
    stock_uom: 'Pcs',
    is_stock_item: true,
    disabled: false,
    standard_rate: 85.00,
    valuation_rate: 68.00,
    brand: 'Crystal',
    has_variants: false,
    modified: '2025-01-16T13:30:00Z',
  },
  // ... 48 more items
];
```

### 19.3 Integration Test Environment

For integration tests that need a real ERPNext instance:

| Environment | ERPNext | Purpose |
|---|---|---|
| Local dev | Mock (MSW) | Fast iteration, no ERP dependency |
| CI | Docker ERPNext (lightweight) | Integration test suite |
| Staging | Full ERPNext instance | Pre-release validation |
| Production | Production ERPNext | Live data |

### 19.4 ERPNext Custom App: `ggh_erp`

The custom Frappe app installed on ERPNext provides GGH-specific DocTypes and webhooks:

```
ggh_erp/
├── ggh_erp/
│   ├── ggh_erp/
│   │   ├── doctype/
│   │   │   ├── ggh_order_sync_log/
│   │   │   │   ├── ggh_order_sync_log.json     (DocType definition)
│   │   │   │   ├── ggh_order_sync_log.py        (Server-side logic)
│   │   │   │   └── __init__.py
│   │   │   ├── ggh_delivery_zone/
│   │   │   │   ├── ggh_delivery_zone.json
│   │   │   │   ├── ggh_delivery_zone.py
│   │   │   │   └── __init__.py
│   │   │   ├── ggh_pricing_tier/
│   │   │   │   ├── ggh_pricing_tier.json
│   │   │   │   ├── ggh_pricing_tier.py
│   │   │   │   └── __init__.py
│   │   │   └── ggh_sync_config/
│   │   │       ├── ggh_sync_config.json
│   │   │       ├── ggh_sync_config.py
│   │   │       └── __init__.py
│   │   ├── api/
│   │   │   └── webhook.py    (Webhook endpoints for GGH)
│   │   └── hooks.py          (Frappe event hooks)
│   ├── setup.py
│   ├── requirements.txt
│   └── license.txt
```

### 19.5 Custom Fields in ERPNext

GGH adds custom fields to standard ERPNext DocTypes via the `ggh_erp` app:

| DocType | Custom Field | Type | Purpose |
|---|---|---|---|
| `Item` | `custom_name_ar` | Data (text) | Arabic product name |
| `Item` | `custom_ggh_sync_enabled` | Check | Whether to sync this item to GGH |
| `Customer` | `custom_ggh_phone` | Data (phone) | Cross-system phone identifier |
| `Customer` | `custom_ggh_customer_id` | Data (text) | Medusa customer ID |
| `Sales Order` | `custom_ggh_order_id` | Data (text) | Medusa order ID |
| `Sales Order` | `custom_ggh_idempotency_key` | Data (text) | Idempotency key |
| `Sales Order` | `custom_delivery_zone` | Data (text) | GGH delivery zone |
| `Sales Order` | `custom_delivery_slot` | Data (text) | GGH delivery slot |
| `Sales Order` | `custom_payment_method` | Data (text) | Payment method |
| `Delivery Note` | `custom_ggh_delivery_photo_url` | Data (URL) | Delivery proof photo |
| `Delivery Note` | `custom_ggh_weight_photo_url` | Data (URL) | Weight proof photo |
| `Delivery Note` | `custom_ggh_actual_weight_kg` | Float | Actual weight |
| `Delivery Note` | `custom_ggh_delivered_to` | Data (text) | Recipient name |
| `Delivery Note` | `custom_ggh_delivered_at` | Datetime | Delivery timestamp |

---

## 20. Elder-Friendly ERP Decisions

### 20.1 How ERP Integration Affects the Customer

| ERP Decision | Customer-Facing Impact | Elder-Friendly Rule |
|---|---|---|
| Stock sync every 5 min | Item may show "In Stock" but be out of stock | Show "Prices may vary" disclaimer if data is stale |
| Price sync every 10 min | Price may change between add-to-cart and checkout | Always use current price; show "Price updated" notice in Arabic |
| Order push to ERP within 1 min | Order confirmation may be delayed if ERP is slow | Show "Order received · طلبك اتسجل" immediately; send SMS when confirmed |
| ERP downtime | Products still orderable; stock may be inaccurate | Show warning banner: "Some info may be delayed · بعض المعلومات قد تتأخر" |
| Conflict resolution (ERP wins) | Price may change after customer sees it | Honor the price at time of checkout, not at time of page load |
| Inventory reservation | Stock reserved when order placed, not when in cart | No "stock countdown" anxiety. Show simple "In Stock" / "Out of Stock" |

### 20.2 Error Messages for ERP Issues

When ERP sync fails and it affects the customer experience:

| ERP Issue | Customer Message (AR) | Customer Message (EN) | Action Available |
|---|---|---|---|
| Price stale | "الأسعار قد تتغير · Prices may vary" | Same | Continue shopping |
| Stock uncertain | "المخزون قد يتغير · Stock may vary" | Same | Continue shopping |
| Order delayed | "طلبك اتسجل وهن أكدوا قريب · Order received, confirming soon" | Same | Wait for SMS |
| ERP completely down | "بعض المعلومات متأخرة · Some info is delayed" | Same | Continue; orders still accepted |

### 20.3 No-Threshold Anxiety

Elder users should never see "Only 3 left!" or stock countdowns. These create urgency that contradicts GGH's trust-first approach:

| Standard E-commerce | GGH Decision | Why |
|---|---|---|
| "Only 3 left — order now!" | "In Stock · متوفر" or "Out of Stock · غير متوفر" | Stock counts create anxiety. Om Ibrahim doesn't need to know exact quantities. |
| "Price valid for 30 minutes" | No countdown. Price is the price. | Elder users don't understand urgency timers. They feel manipulated. |
| "Your cart will expire!" | Cart persists for 7 days | No artificial pressure. |
| Real-time stock updates | Stock updates every 5 min | Good enough for wholesale grocery. No one is buying the last bag of rice at 3 AM. |

---

## 21. Bilingual & RTL in ERP Integration

### 21.1 Arabic Data in ERPNext

ERPNext is primarily English-language. GGH adds Arabic data through custom fields:

| Data | English Source | Arabic Source | Who Enters Arabic |
|---|---|---|---|
| Product name | ERPNext `item_name` | ERPNext `custom_name_ar` or GGH override | GGH Admin (ERPNext doesn't provide Arabic) |
| Category name | ERPNext `item_group_name` | GGH override in Medusa | GGH Admin |
| Variant option values | ERPNext attribute values | GGH override in Medusa | GGH Admin |
| Customer name | Medusa `first_name` + `last_name` | Same (Arabic names entered in Arabic) | Customer |
| Delivery zone name | GGH database `name_en` | GGH database `name_ar` | GGH Admin |
| Delivery slot label | GGH database `label_en` | GGH database `label_ar` | System-generated |

### 21.2 Arabic in ERPNext Payloads

ERPNext payloads are always in English. Arabic names are carried as custom fields:

```json
{
  "name": "RICE-EG-5KG",
  "item_name": "Egyptian Rice 5kg",
  "custom_name_ar": "أرز مصري ٥ كيلو",
  "item_group": "Rice & Grains",
  "standard_rate": 55.00
}
```

When `custom_name_ar` is empty (new items not yet translated):

1. The sync stores `name_ar = ""` in Medusa metadata
2. The product appears with English name only in Arabic locale
3. The admin dashboard shows a "Missing Arabic name · الاسم العربي مفقود" badge
4. GGH Admin can add the Arabic name, which is preserved across future syncs

### 21.3 Number Formatting

| Context | Format | Example |
|---|---|---|
| Price in ERPNext payload | Western Arabic numerals (0-9) | `55.00` |
| Price displayed to customer (Arabic locale) | Eastern Arabic numerals (٠-٩) | `٥٥٫٠٠ ج.م` |
| Price stored in Medusa | Integer (piastres), Western numerals | `5500` |
| Order ID in ERP | Western numerals | `SO-01234` |

### 21.4 RTL Considerations for Sync Logs

The admin dashboard shows sync logs in both languages:

```
┌──────────────────────────────────────────────────────────────────────┐
│  14:30:15 │ منتج · Product │ RICE-EG-5KG │ ✓ تمت المزامنة · Synced │
│  14:30:12 │ منتج · Product │ OIL-SUN-1L  │ ⚠ تعارض · Conflict     │
│  14:29:55 │ طلب · Order    │ order_01JXY │ ✗ خطأ · Error           │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 22. Security & Access Control

### 22.1 ERPNext API Security

| Security Layer | Implementation | Details |
|---|---|---|
| **Authentication** | Token-based (`api_key` + `api_secret`) | Stored in environment variables, never in code |
| **Authorization** | ERPNext role permissions | GGH API user has limited permissions: read Items, write Sales Orders |
| **Transport** | HTTPS (production) | TLS 1.3 between worker and ERPNext |
| **Network** | Internal network only | ERPNext not exposed to internet; only accessible from worker and BFF |
| **Rate limiting** | ERPNext built-in | GGH respects ERPNext rate limits (max 200 req/min) |
| **Audit** | ERPNext Activity Log | All API calls logged in ERPNext's built-in audit log |

### 22.2 GGH API Key Permissions in ERPNext

| ERPNext DocType | Read | Write | Create | Delete | Submit | Cancel |
|---|---|---|---|---|---|---|
| Item | ✓ | — | — | — | — | — |
| Item Price | ✓ | — | — | — | — | — |
| Item Group | ✓ | — | — | — | — | — |
| Stock Ledger Entry | ✓ | — | — | — | — | — |
| Customer | ✓ | ✓ | ✓ | — | — | — |
| Sales Order | ✓ | ✓ | ✓ | — | ✓ | ✓ |
| Delivery Note | ✓ | ✓ | ✓ | — | ✓ | — |
| Sales Invoice | ✓ | — | — | — | — | — |
| Payment Entry | ✓ | — | — | — | — | — |

### 22.3 Webhook Security

```typescript
// Webhook signature verification
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Usage in webhook handler
app.post('/api/webhooks/erpnext', (req, res) => {
  const signature = req.headers['x-erpnext-signature'] as string;
  const payload = JSON.stringify(req.body);

  if (!verifyWebhookSignature(payload, signature, process.env.WEBHOOK_SECRET!)) {
    logger.warn('Invalid webhook signature', { ip: req.ip });
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Process webhook...
  res.status(200).json({ received: true });
});
```

### 22.4 Sensitive Data Handling

| Data Category | Storage | Access | Retention |
|---|---|---|---|
| ERP API credentials | Environment variables (Docker secrets) | Worker process only | Rotated every 90 days |
| Sync logs (`erp_sync_log`) | PostgreSQL `ggh` schema | Admin only | 90 days (then archive) |
| Sync cursors | Redis + PostgreSQL | Worker + Admin | Permanent |
| Customer financial data | ERPNext only | GGH never stores credit card numbers or bank details | Per ERPNext policy |
| Order amounts | Medusa + ERPNext | Standard access controls | Permanent (financial record) |

### 22.5 Network Topology

```
┌──────────────────────────────────────────────────────────────┐
│                    NETWORK SECURITY                          │
│                                                              │
│   Internet                                                   │
│       │                                                      │
│       ▼                                                      │
│   ┌──────────┐                                               │
│   │ Firewall │  (Port 443 only)                              │
│   └────┬─────┘                                               │
│        │                                                     │
│        ▼                                                     │
│   ┌──────────┐                                               │
│   │ Next.js  │  :3000 (public)                               │
│   │ BFF      │                                               │
│   └────┬─────┘                                               │
│        │ Internal network only                               │
│        ├──► Medusa :9000 (private)                           │
│        ├──► Redis :6379 (private)                            │
│        └──► PostgreSQL :5432 (private)                       │
│                                                              │
│   ┌──────────┐                                               │
│   │ Worker   │  (no public port)                             │
│   │ BullMQ   │                                               │
│   └────┬─────┘                                               │
│        │ Internal network only                               │
│        ├──► Medusa :9000 (private)                           │
│        ├──► ERPNext :8000 (private)                          │
│        ├──► Redis :6379 (private)                            │
│        └──► PostgreSQL :5432 (private)                       │
│                                                              │
│   ┌──────────┐                                               │
│   │ ERPNext  │  :8000 (private — no internet access)         │
│   └──────────┘                                               │
│                                                              │
│   Rule: ERPNext is never accessible from the internet.       │
│   Only the worker and BFF can reach it on the internal net.  │
└──────────────────────────────────────────────────────────────┘
```

---

*This document defines the complete ERP integration strategy for GGH. When ERPNext and Medusa disagree, ERPNext wins for inventory and finance. When the customer already saw a price, the customer wins. When ERP is down, the business continues. When in doubt, trust the queue, log everything, and never block Om Ibrahim.*
