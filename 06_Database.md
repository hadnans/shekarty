# 06 — Database

> **GGH — Gomla Go Home** — Entity design, relationships, naming conventions, indexing strategy, and data integrity rules. The structural foundation of the platform.

---

## Table of Contents

1. [Database Philosophy](#1-database-philosophy)
2. [Naming Conventions](#2-naming-conventions)
3. [Schema Organization](#3-schema-organization)
4. [Entity Relationship Overview](#4-entity-relationship-overview)
5. [Core Commerce Entities](#5-core-commerce-entities)
6. [GGH Custom Entities](#6-ggh-custom-entities)
7. [ERP Sync Entities](#7-erp-sync-entities)
8. [Entity Definitions](#8-entity-definitions)
9. [Relationship Map](#9-relationship-map)
10. [Index Strategy](#10-index-strategy)
11. [Data Integrity Rules](#11-data-integrity-rules)
12. [Soft Delete Strategy](#12-soft-delete-strategy)
13. [Money Handling](#13-money-handling)
14. [Localization Storage](#14-localization-storage)
15. [Audit & Timestamps](#15-audit--timestamps)
16. [Migration Strategy](#16-migration-strategy)
17. [Backup & Recovery](#17-backup--recovery)

---

## 1. Database Philosophy

| Principle | Rule | Why |
|---|---|---|
| **Medusa owns its schema** | The `public` schema is managed entirely by Medusa's migration engine. GGH never modifies Medusa tables directly. | Medusa upgrades will break if we alter their tables. Custom data lives in our own schema. |
| **GGH data is separate** | All GGH-specific tables live in the `ggh` schema. Cross-schema references use foreign keys to Medusa's IDs stored as text. | Clean separation. GGH migrations don't conflict with Medusa migrations. |
| **Integers for money** | All monetary values are stored as piastres (1/100 of a pound) in `INTEGER` columns. No `DECIMAL`, no `FLOAT`, no `NUMERIC`. | Floating-point arithmetic causes rounding errors. EGP 110.50 becomes `11050` — exact, always. |
| **UUIDs for primary keys** | Every table uses `UUID` primary keys generated with `gen_random_uuid()`. No auto-incrementing integers. | UUIDs are globally unique, safe to generate client-side, and don't leak record counts. |
| **Soft delete by default** | Records are never physically deleted. A `deleted_at` timestamp marks deletion. | Orders, products, and customers must be recoverable. Physical deletion breaks referential integrity. |
| **Timestamps on everything** | Every table has `created_at` and `updated_at`. Every sync table has a `created_at` only (immutable logs). | Audit trail. Debugging. Replication. No exceptions. |
| **Bilingual fields are paired** | Every user-facing text field has `_en` and `_ar` companions. | Product names, category names, and zone names exist in both languages. Never store "current locale" — store both. |
| **No arrays in columns** | No `ARRAY` column types. Use junction tables for many-to-many relationships. | Arrays in columns are not queryable, not indexable, and not relational. Junction tables are. |

---

## 2. Naming Conventions

### 2.1 Table Naming

| Entity Type | Convention | Example |
|---|---|---|
| Medusa core tables | Managed by Medusa (snake_case) | `product`, `product_variant`, `order`, `customer` |
| GGH custom tables | `snake_case`, prefixed by domain | `delivery_zone`, `delivery_slot`, `price_tier` |
| Junction tables | Both entity names, alphabetically | `product_category`, `customer_group_customer` |
| Audit/log tables | Entity name + `_log` | `erp_sync_log`, `order_status_log` |
| Schema name | `ggh` | `ggh.delivery_zone`, `ggh.erp_sync_log` |

### 2.2 Column Naming

| Pattern | Convention | Example |
|---|---|---|
| Primary key | `id` | `id` (always UUID) |
| Foreign key | Referenced table singular + `_id` | `customer_id`, `product_id`, `zone_id` |
| Timestamp | `_at` suffix | `created_at`, `updated_at`, `deleted_at`, `delivered_at` |
| Boolean | `is_` or `has_` prefix | `is_active`, `is_case_pack`, `has_free_delivery` |
| Money amount | `_amount` suffix, integer (piastres) | `base_rate_amount`, `total_amount`, `savings_amount` |
| Bilingual text | `_en` and `_ar` suffix pair | `name_en` / `name_ar`, `description_en` / `description_ar` |
| JSON data | `_data` suffix | `regions_data`, `items_data`, `metadata_data` |
| Count | `_count` suffix | `max_orders_count`, `current_orders_count` |
| Enumeration | Column name only (string with check constraint) | `status`, `direction`, `entity_type` |

### 2.3 Constraint Naming

| Constraint Type | Convention | Example |
|---|---|---|
| Primary key | `pk_<table>` | `pk_delivery_zone` |
| Foreign key | `fk_<table>_<referenced_table>` | `fk_delivery_slot_zone` |
| Unique | `uq_<table>_<columns>` | `uq_price_tier_variant_min_qty` |
| Check | `ck_<table>_<column>` | `ck_delivery_slot_max_orders` |
| Index | `ix_<table>_<columns>` | `ix_erp_sync_log_entity_status` |

---

## 3. Schema Organization

```
┌─────────────────────────────────────────────────────────┐
│                    PostgreSQL Instance                    │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Schema: public (Medusa)                          │  │
│  │                                                   │  │
│  │  Owned by: Medusa migration engine                │  │
│  │  Modified by: NEVER by GGH directly               │  │
│  │                                                   │  │
│  │  Tables:                                          │  │
│  │    product, product_variant, product_category,    │  │
│  │    product_collection, product_tag,               │  │
│  │    product_image, product_option,                 │  │
│  │    price, price_set, price_list,                  │  │
│  │    cart, cart_line_item, cart_shipping_method,    │  │
│  │    order, order_line_item, order_shipping_method, │  │
│  │    order_address, order_summary,                  │  │
│  │    customer, customer_group, customer_address,    │  │
│  │    payment, payment_session, payment_collection,  │  │
│  │    fulfillment, fulfillment_item,                 │  │
│  │    shipping_option, shipping_profile,             │  │
│  │    inventory_item, inventory_level,               │  │
│  │    stock_location, reservation_item,              │  │
│  │    notification, notification_provider,           │  │
│  │    api_key, store, region, currency,              │  │
│  │    ... (40+ tables managed by Medusa)             │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Schema: ggh (GGH Custom)                        │  │
│  │                                                   │  │
│  │  Owned by: GGH team                               │  │
│  │  Modified by: GGH migration scripts               │  │
│  │                                                   │  │
│  │  Tables:                                          │  │
│  │    delivery_zone, delivery_slot,                  │  │
│  │    price_tier, order_template,                    │  │
│  │    erp_sync_log, erp_sync_cursor,                 │  │
│  │    order_status_log,                              │  │
│  │    wholesale_account,                             │  │
│  │    delivery_proof,                                │  │
│  │    notification_preference                        │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Schema Communication

The `ggh` schema references the `public` schema by storing Medusa entity IDs as text columns. These are not true foreign keys (cross-schema FKs create coupling that prevents independent migration), but application-level references enforced by code.

| GGH Table | References Medusa Entity | Column | Type |
|---|---|---|---|
| `ggh.price_tier` | `public.product_variant` | `variant_id` | `TEXT` |
| `ggh.order_template` | `public.customer` | `customer_id` | `TEXT` |
| `ggh.wholesale_account` | `public.customer` | `customer_id` | `TEXT` |
| `ggh.delivery_proof` | `public.order` | `order_id` | `TEXT` |
| `ggh.notification_preference` | `public.customer` | `customer_id` | `TEXT` |
| `ggh.erp_sync_log` | `public.product` / `public.order` / `public.customer` | `entity_id` | `TEXT` |
| `ggh.order_status_log` | `public.order` | `order_id` | `TEXT` |

---

## 4. Entity Relationship Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ENTITY RELATIONSHIP MAP                       │
│                                                                     │
│  CUSTOMER ──────────────┬── CART ────────── CART_LINE_ITEM          │
│  (Medusa)               │   (Medusa)         references PRODUCT     │
│     │                   │                      VARIANT              │
│     │                   │                                            │
│     ├── CUSTOMER_GROUP  │   ORDER ────────── ORDER_LINE_ITEM        │
│     │   (Medusa)        │   (Medusa)         references PRODUCT     │
│     │                   │                      VARIANT              │
│     ├── WHOLESALE_ACCT  │        │                                   │
│     │   (ggh)           │        ├── DELIVERY_PROOF (ggh)           │
│     │                   │        └── ORDER_STATUS_LOG (ggh)         │
│     ├── ORDER_TEMPLATE  │                                            │
│     │   (ggh)           │   PRODUCT ──────── PRODUCT_VARIANT        │
│     │                   │   (Medusa)         references PRICE_TIER  │
│     └── NOTIF_PREF      │   (Medusa)           (ggh)               │
│         (ggh)           │                                            │
│                         │   PRODUCT_CATEGORY (Medusa)               │
│  DELIVERY_ZONE ─────────┤                                            │
│  (ggh)                  │   INVENTORY_ITEM ── INVENTORY_LEVEL       │
│     │                   │   (Medusa)         (Medusa)               │
│     └── DELIVERY_SLOT   │                                            │
│         (ggh)           │   ERP_SYNC_LOG (ggh)                      │
│                         │   ERP_SYNC_CURSOR (ggh)                   │
│                         │                                            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Core Commerce Entities

These entities are owned by Medusa. GGH reads and writes them through the Medusa API, never through direct database access. The definitions below describe how GGH uses them, not their full Medusa schema.

### 5.1 Product

| Aspect | GGH Usage |
|---|---|
| **Purpose** | Canonical product definition (e.g., "Al Doha Basmati Rice") |
| **Key fields used** | `id`, `title`, `handle`, `description`, `thumbnail`, `status`, `category_id`, `metadata` |
| **GGH metadata** | `metadata.name_ar` — Arabic product name (not natively supported by Medusa) |
| **GGH metadata** | `metadata.brand` — Brand name (e.g., "Al Doha", "El Maleka") |
| **GGH metadata** | `metadata.erp_item_code` — ERPNext Item Code for sync |
| **GGH metadata** | `metadata.moq` — Minimum order quantity for this product |
| **Created by** | ERP sync (primary) or Medusa Admin (manual) |
| **Soft deleted** | Yes — Medusa sets `deleted_at` |

### 5.2 Product Variant

| Aspect | GGH Usage |
|---|---|
| **Purpose** | A specific pack size of a product (e.g., "1kg", "5kg", "25kg") |
| **Key fields used** | `id`, `product_id`, `title`, `sku`, `barcode`, `allow_backorder`, `metadata` |
| **GGH metadata** | `metadata.weight_kg` — Weight in kilograms |
| **GGH metadata** | `metadata.unit` — Unit of measure ("kg", "L", "pack") |
| **GGH metadata** | `metadata.is_case_pack` — Whether this is a case-pack variant |
| **GGH metadata** | `metadata.case_size` — Number of units in a case (if case pack) |
| **GGH metadata** | `metadata.moq` — Variant-level minimum order quantity |
| **Relationship** | Belongs to Product. Has many PriceTiers (ggh). Has one InventoryLevel. |

### 5.3 Product Category

| Aspect | GGH Usage |
|---|---|
| **Purpose** | Product grouping (e.g., "Rice & Grains", "Oils & Fats") |
| **Key fields used** | `id`, `name`, `handle`, `parent_category_id`, `rank`, `metadata` |
| **GGH metadata** | `metadata.name_ar` — Arabic category name |
| **GGH metadata** | `metadata.icon_emoji` — Emoji for category display (🍚, 🫒, ☕) |
| **GGH metadata** | `metadata.erp_item_group` — ERPNext Item Group name for sync |
| **Structure** | Two-level hierarchy only: parent category → child categories. No deeper nesting. |
| **The 15 categories** | Rice & Grains, Pasta & Noodles, Flour & Baking, Sugar & Sweeteners, Oils & Fats, Ghee & Butter, Beans & Lentils, Tea & Coffee, Spices & Seasonings, Tomato Paste & Sauces, Canned Foods, Frozen Food, Cleaning Products, Paper Products, Household Essentials |

### 5.4 Price and Price List

| Aspect | GGH Usage |
|---|---|
| **Purpose** | Product pricing — Medusa natively supports price lists per customer group |
| **How wholesale pricing works** | Three Price Lists in Medusa: "Retail Price", "Wholesale Price", "Bulk Price". Each is assigned to the corresponding Customer Group. |
| **Price amounts** | Stored in piastres (integer). Currency: EGP. |
| **Bulk-break tiers** | GGH supplements Medusa pricing with the `ggh.price_tier` table for quantity-based discounts within a price list. |
| **Created by** | ERP sync (primary). Admin (overrides). |

### 5.5 Customer

| Aspect | GGH Usage |
|---|---|
| **Purpose** | Registered user with authentication credentials |
| **Key fields used** | `id`, `email`, `phone`, `first_name`, `last_name`, `metadata` |
| **GGH metadata** | `metadata.name_ar` — Arabic display name (some customers prefer Arabic) |
| **GGH metadata** | `metadata.preferred_locale` — "en" or "ar" |
| **GGH metadata** | `metadata.wholesale_status` — "pending", "verified", "enterprise" |
| **Groups** | Assigned to Customer Groups: "retail", "wholesale-pending", "wholesale-verified", "wholesale-enterprise" |

### 5.6 Customer Group

| Group | Criteria | Price Access | Delivery |
|---|---|---|---|
| `retail` | Default on registration | Retail price list only | Standard zones |
| `wholesale-pending` | Applied for wholesale but not yet verified | Retail prices until verified | Standard zones |
| `wholesale-verified` | Business documents approved | Wholesale + Bulk price lists | Priority zones + net-30 |
| `wholesale-enterprise` | Manual assignment by sales team | Custom pricing + all tiers | Dedicated slots + net-30 |

### 5.7 Cart

| Aspect | GGH Usage |
|---|---|
| **Purpose** | Shopping cart before checkout. Created on first session, persists across page loads. |
| **Key fields used** | `id`, `customer_id`, `email`, `region_id`, `metadata` |
| **GGH metadata** | `metadata.delivery_slot_id` — Selected delivery time slot |
| **GGH metadata** | `metadata.delivery_zone_id` — Resolved delivery zone |
| **GGH metadata** | `metadata.locale` — Cart's locale at creation time |
| **Guest carts** | Created without `customer_id`. Merged on login. |
| **Cart expiry** | Carts inactive for 30 days are cleaned up by a scheduled job. |

### 5.8 Cart Line Item

| Aspect | GGH Usage |
|---|---|
| **Purpose** | Individual item in a cart |
| **Key fields used** | `id`, `cart_id`, `variant_id`, `quantity`, `unit_price`, `subtotal`, `metadata` |
| **GGH metadata** | `metadata.price_tier_name` — Which pricing tier was active when added |
| **GGH metadata** | `metadata.savings_amount` — Savings vs. retail price at time of add |
| **Quantity validation** | Must meet MOQ. If case pack, must be multiple of case_size. |

### 5.9 Order

| Aspect | GGH Usage |
|---|---|
| **Purpose** | Confirmed purchase after checkout |
| **Key fields used** | `id`, `display_id`, `customer_id`, `status`, `fulfillment_status`, `payment_status`, `total`, `subtotal`, `metadata` |
| **GGH metadata** | `metadata.erp_sales_order_id` — ERPNext Sales Order ID after sync |
| **GGH metadata** | `metadata.delivery_slot_id` — Delivery slot from cart |
| **GGH metadata** | `metadata.delivery_zone_id` — Zone from cart |
| **GGH metadata** | `metadata.savings_total` — Total savings vs. retail |
| **Status flow** | `pending` → `confirmed` → `fulfilling` → `shipped` → `delivered` / `cancelled` / `returned` |

### 5.10 Order Line Item

| Aspect | GGH Usage |
|---|---|
| **Purpose** | Individual item in a confirmed order |
| **Same as cart line item** | Plus: `metadata.erp_item_code` — ERP SKU for reconciliation |
| **Immutable after order** | Line items are never modified after order creation. Quantity changes go through return/exchange. |

### 5.11 Inventory Item and Inventory Level

| Aspect | GGH Usage |
|---|---|
| **Purpose** | Track available stock per variant per location |
| **Key fields used** | `inventory_item.id`, `inventory_item.sku`, `inventory_level.stocked_quantity`, `inventory_level.reserved_quantity`, `inventory_level.stock_location_id` |
| **Available quantity** | `stocked_quantity - reserved_quantity` — calculated at query time |
| **Stock locations** | "Cairo Central", "Giza Hub", "6th October Depot" — created as Stock Locations in Medusa |
| **Synced from** | ERPNext Stock Ledger Entry (every 5 minutes) |

---

## 6. GGH Custom Entities

These entities live in the `ggh` schema and are managed by GGH migration scripts.

### 6.1 Delivery Zone

| Field | Type | Purpose |
|---|---|---|
| `id` | UUID | Primary key |
| `name_en` | TEXT | English zone name (e.g., "Cairo Central") |
| `name_ar` | TEXT | Arabic zone name (e.g., "القاهرة الوسطى") |
| `regions_data` | JSONB | Array of areas/postal codes: `[{"area": "Maadi", "postal_codes": ["11431"]}]` |
| `base_rate_amount` | INTEGER | Base shipping rate in piastres |
| `free_delivery_above_amount` | INTEGER | Free delivery above this order total (piastres). NULL = no free delivery. |
| `estimated_delivery_days` | INTEGER | Business days for delivery |
| `is_active` | BOOLEAN | Whether this zone is currently accepting orders |
| `sort_order` | INTEGER | Display order in zone picker |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last modification timestamp |
| `deleted_at` | TIMESTAMPTZ | Soft delete timestamp |

**Constraints:**
- `name_en` is unique (among non-deleted zones)
- `name_ar` is unique (among non-deleted zones)
- `base_rate_amount` must be ≥ 0
- `free_delivery_above_amount` must be > 0 if not NULL

**Initial Zones:**

| name_en | name_ar | base_rate | free_above |
|---|---|---|---|
| Cairo Central | القاهرة الوسطى | 3500 (EGP 35) | 150000 (EGP 1,500) |
| Cairo Suburbs | ضواحي القاهرة | 5000 (EGP 50) | 200000 (EGP 2,000) |
| Giza | الجيزة | 4500 (EGP 45) | 180000 (EGP 1,800) |
| 6th October | السادس من أكتوبر | 5500 (EGP 55) | 200000 (EGP 2,000) |
| Alexandria | الإسكندرية | 8000 (EGP 80) | 300000 (EGP 3,000) |

### 6.2 Delivery Slot

| Field | Type | Purpose |
|---|---|---|
| `id` | UUID | Primary key |
| `zone_id` | UUID | Foreign key → `ggh.delivery_zone` |
| `day_of_week` | SMALLINT | 0 = Sunday (Egypt work week starts Sunday) |
| `start_time` | TIME | Slot start (e.g., 10:00) |
| `end_time` | TIME | Slot end (e.g., 14:00) |
| `label_en` | TEXT | Display label: "Sunday 10 AM – 2 PM" |
| `label_ar` | TEXT | Display label: "الأحد ١٠ ص – ٢ م" |
| `max_orders_count` | INTEGER | Maximum orders this slot can hold |
| `current_orders_count` | INTEGER | Currently booked orders |
| `is_active` | BOOLEAN | Whether this slot is currently available |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last modification timestamp |
| `deleted_at` | TIMESTAMPTZ | Soft delete timestamp |

**Constraints:**
- Unique combination: `(zone_id, day_of_week, start_time)` among non-deleted slots
- `max_orders_count` must be > 0
- `current_orders_count` must be ≥ 0 and ≤ `max_orders_count`
- `start_time` < `end_time`
- `day_of_week` must be 0–6

**Typical Slots (per zone):**

| Day | Start | End | Max Orders |
|---|---|---|---|
| Sunday | 10:00 | 14:00 | 20 |
| Sunday | 14:00 | 18:00 | 20 |
| Monday | 10:00 | 14:00 | 20 |
| Monday | 14:00 | 18:00 | 20 |
| Tuesday | 10:00 | 14:00 | 20 |
| Wednesday | 10:00 | 14:00 | 20 |
| Wednesday | 14:00 | 18:00 | 20 |
| Thursday | 10:00 | 14:00 | 20 |

### 6.3 Price Tier

| Field | Type | Purpose |
|---|---|---|
| `id` | UUID | Primary key |
| `variant_id` | TEXT | Reference to `public.product_variant.id` |
| `tier_name_en` | TEXT | English tier name (e.g., "Wholesale", "Bulk") |
| `tier_name_ar` | TEXT | Arabic tier name (e.g., "جملة", "كميات كبيرة") |
| `min_quantity` | INTEGER | Minimum quantity to activate this tier |
| `max_quantity` | INTEGER | Maximum quantity for this tier. NULL = no upper limit. |
| `price_amount` | INTEGER | Unit price in piastres at this tier |
| `currency_code` | TEXT | Always "EGP" |
| `customer_groups` | JSONB | Array of group IDs allowed this tier. NULL = all groups. |
| `savings_label_en` | TEXT | "Save 10%" — calculated and stored for display |
| `savings_label_ar` | TEXT | "وفّر ١٠٪" — Arabic savings label |
| `is_active` | BOOLEAN | Whether this tier is currently active |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last modification timestamp |
| `deleted_at` | TIMESTAMPTZ | Soft delete timestamp |

**Constraints:**
- Unique combination: `(variant_id, min_quantity)` among non-deleted tiers
- `min_quantity` must be > 0
- `max_quantity` must be > `min_quantity` if not NULL
- `price_amount` must be > 0

**Example Tiers (Basmati Rice 5kg):**

| tier_name_en | tier_name_ar | min_qty | max_qty | price (piastres) | savings |
|---|---|---|---|---|---|
| Retail | قطاعي | 1 | 4 | 12500 (EGP 125) | — |
| Wholesale | جملة | 5 | 9 | 11000 (EGP 110) | 12% |
| Bulk | كميات كبيرة | 10 | NULL | 10000 (EGP 100) | 20% |

### 6.4 Order Template

| Field | Type | Purpose |
|---|---|---|
| `id` | UUID | Primary key |
| `customer_id` | TEXT | Reference to `public.customer.id` |
| `name` | TEXT | Template name (e.g., "Monthly Basics", "Shop Restock") |
| `items_data` | JSONB | Array: `[{"variant_id": "...", "quantity": 5}]` |
| `last_used_at` | TIMESTAMPTZ | When this template was last used to create an order |
| `use_count` | INTEGER | How many times this template has been used |
| `is_active` | BOOLEAN | Whether the customer has kept this template |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last modification timestamp |
| `deleted_at` | TIMESTAMPTZ | Soft delete timestamp |

**Constraints:**
- `items_data` must not be empty (at least one item)
- `use_count` must be ≥ 0
- Each `variant_id` in `items_data` is validated at application level (exists, is in stock)

### 6.5 Wholesale Account

| Field | Type | Purpose |
|---|---|---|
| `id` | UUID | Primary key |
| `customer_id` | TEXT | Reference to `public.customer.id` (unique) |
| `business_name` | TEXT | Registered business name |
| `business_name_ar` | TEXT | Arabic business name |
| `tax_registration_number` | TEXT | Egyptian tax registration number |
| `verification_status` | TEXT | "pending", "verified", "rejected", "suspended" |
| `credit_limit_amount` | INTEGER | Credit limit in piastres. NULL = no credit (COD only). |
| `credit_used_amount` | INTEGER | Currently used credit in piastres |
| `payment_terms_days` | INTEGER | Net-N payment terms (e.g., 30 for net-30). NULL = no credit. |
| `document_urls` | JSONB | Array of uploaded document URLs (commercial register, tax card) |
| `verified_by` | TEXT | Admin user ID who verified this account |
| `verified_at` | TIMESTAMPTZ | When verification occurred |
| `rejection_reason` | TEXT | Why the application was rejected (if applicable) |
| `created_at` | TIMESTAMPTZ | Application submission timestamp |
| `updated_at` | TIMESTAMPTZ | Last modification timestamp |
| `deleted_at` | TIMESTAMPTZ | Soft delete timestamp |

**Constraints:**
- `customer_id` is unique (one wholesale account per customer)
- `credit_used_amount` must be ≤ `credit_limit_amount` (if both set)
- `payment_terms_days` must be > 0 if not NULL
- `verification_status` must be one of: "pending", "verified", "rejected", "suspended"

### 6.6 Delivery Proof

| Field | Type | Purpose |
|---|---|---|
| `id` | UUID | Primary key |
| `order_id` | TEXT | Reference to `public.order.id` (unique) |
| `weight_photo_url` | TEXT | URL of photo showing items on scale before dispatch |
| `delivery_photo_url` | TEXT | URL of photo showing items at delivery point |
| `actual_weight_kg` | DECIMAL(8,2) | Weight recorded at dispatch |
| `delivered_at` | TIMESTAMPTZ | When delivery was completed |
| `delivered_to` | TEXT | Name of person who received the delivery |
| `driver_notes` | TEXT | Any notes from the driver |
| `created_at` | TIMESTAMPTZ | Record creation timestamp |

**Constraints:**
- `order_id` is unique (one proof per order)
- `actual_weight_kg` must be > 0 if not NULL

### 6.7 Notification Preference

| Field | Type | Purpose |
|---|---|---|
| `id` | UUID | Primary key |
| `customer_id` | TEXT | Reference to `public.customer.id` (unique) |
| `channel` | TEXT | "sms", "whatsapp", "push", "email" |
| `order_confirmed` | BOOLEAN | Notify when order is confirmed |
| `order_shipped` | BOOLEAN | Notify when order is shipped |
| `order_delivered` | BOOLEAN | Notify when order is delivered |
| `deal_alert` | BOOLEAN | Notify when new deals are available |
| `price_drop` | BOOLEAN | Notify when wishlist items drop in price |
| `restock_alert` | BOOLEAN | Notify when out-of-stock items are back |
| `is_active` | BOOLEAN | Whether any notifications are enabled |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last modification timestamp |

**Constraints:**
- Unique combination: `(customer_id, channel)`
- Default values: all order notifications TRUE, marketing notifications FALSE

---

## 7. ERP Sync Entities

### 7.1 ERP Sync Log

| Field | Type | Purpose |
|---|---|---|
| `id` | UUID | Primary key |
| `entity_type` | TEXT | What entity was synced: "product", "inventory", "customer", "order", "invoice" |
| `entity_id` | TEXT | Medusa or ERP entity identifier |
| `direction` | TEXT | "erp_to_medusa" or "medusa_to_erp" |
| `status` | TEXT | "success", "conflict", "error" |
| `medusa_data` | JSONB | Snapshot of Medusa state before sync |
| `erp_data` | JSONB | Snapshot of ERP state |
| `error_message` | TEXT | Error details if status is "error" or "conflict" |
| `job_id` | TEXT | BullMQ job ID for tracing |
| `attempt_number` | INTEGER | Which retry attempt this was |
| `duration_ms` | INTEGER | How long the sync operation took |
| `created_at` | TIMESTAMPTZ | When this log entry was created (immutable) |

**Constraints:**
- `entity_type` must be one of the defined types
- `direction` must be "erp_to_medusa" or "medusa_to_erp"
- `status` must be "success", "conflict", or "error"
- No `updated_at` — this is an append-only log, never modified

### 7.2 ERP Sync Cursor

| Field | Type | Purpose |
|---|---|---|
| `id` | UUID | Primary key |
| `entity_type` | TEXT | What entity this cursor tracks (unique) |
| `last_synced_at` | TIMESTAMPTZ | Timestamp of the last successfully synced record |
| `last_synced_id` | TEXT | ID of the last synced record (for pagination) |
| `total_synced_count` | INTEGER | Running count of all syncs for this entity |
| `last_error_at` | TIMESTAMPTZ | When the last error occurred |
| `last_error_message` | TEXT | What the last error was |
| `updated_at` | TIMESTAMPTZ | When this cursor was last updated |

**Constraints:**
- `entity_type` is unique (one cursor per entity type)
- `total_synced_count` must be ≥ 0

**Initial Cursors:**

| entity_type | last_synced_at |
|---|---|
| product | 2026-01-01T00:00:00Z (start from epoch) |
| inventory | 2026-01-01T00:00:00Z |
| customer | 2026-01-01T00:00:00Z |
| invoice | 2026-01-01T00:00:00Z |

### 7.3 Order Status Log

| Field | Type | Purpose |
|---|---|---|
| `id` | UUID | Primary key |
| `order_id` | TEXT | Reference to `public.order.id` |
| `from_status` | TEXT | Previous status (NULL for initial creation) |
| `to_status` | TEXT | New status |
| `trigger` | TEXT | What caused the transition: "customer", "admin", "system", "erp_webhook" |
| `actor_id` | TEXT | ID of the user or system that triggered the change |
| `notes` | TEXT | Optional notes about why the status changed |
| `created_at` | TIMESTAMPTZ | When this transition occurred (immutable) |

**Constraints:**
- No `updated_at` — append-only
- `to_status` must be a valid order status

---

## 8. Entity Definitions

### 8.1 Complete Field Reference

#### delivery_zone

| # | Field | Type | Nullable | Default | Notes |
|---|---|---|---|---|---|
| 1 | id | UUID | No | gen_random_uuid() | Primary key |
| 2 | name_en | TEXT | No | — | Unique among non-deleted |
| 3 | name_ar | TEXT | No | — | Unique among non-deleted |
| 4 | regions_data | JSONB | No | '[]' | Area/postal code mapping |
| 5 | base_rate_amount | INTEGER | No | 0 | Piastres |
| 6 | free_delivery_above_amount | INTEGER | Yes | NULL | Piastres, NULL = no free delivery |
| 7 | estimated_delivery_days | INTEGER | No | 2 | Business days |
| 8 | is_active | BOOLEAN | No | true | — |
| 9 | sort_order | INTEGER | No | 0 | Display order |
| 10 | created_at | TIMESTAMPTZ | No | now() | — |
| 11 | updated_at | TIMESTAMPTZ | No | now() | — |
| 12 | deleted_at | TIMESTAMPTZ | Yes | NULL | Soft delete |

#### delivery_slot

| # | Field | Type | Nullable | Default | Notes |
|---|---|---|---|---|---|
| 1 | id | UUID | No | gen_random_uuid() | Primary key |
| 2 | zone_id | UUID | No | — | FK → delivery_zone.id |
| 3 | day_of_week | SMALLINT | No | — | 0=Sunday through 6=Saturday |
| 4 | start_time | TIME | No | — | Slot start |
| 5 | end_time | TIME | No | — | Slot end |
| 6 | label_en | TEXT | No | — | "Sunday 10 AM – 2 PM" |
| 7 | label_ar | TEXT | No | — | "الأحد ١٠ ص – ٢ م" |
| 8 | max_orders_count | INTEGER | No | 20 | Maximum capacity |
| 9 | current_orders_count | INTEGER | No | 0 | Currently booked |
| 10 | is_active | BOOLEAN | No | true | — |
| 11 | created_at | TIMESTAMPTZ | No | now() | — |
| 12 | updated_at | TIMESTAMPTZ | No | now() | — |
| 13 | deleted_at | TIMESTAMPTZ | Yes | NULL | Soft delete |

#### price_tier

| # | Field | Type | Nullable | Default | Notes |
|---|---|---|---|---|---|
| 1 | id | UUID | No | gen_random_uuid() | Primary key |
| 2 | variant_id | TEXT | No | — | Ref → product_variant.id |
| 3 | tier_name_en | TEXT | No | — | "Retail", "Wholesale", "Bulk" |
| 4 | tier_name_ar | TEXT | No | — | "قطاعي", "جملة", "كميات كبيرة" |
| 5 | min_quantity | INTEGER | No | — | Minimum quantity |
| 6 | max_quantity | INTEGER | Yes | NULL | NULL = no upper limit |
| 7 | price_amount | INTEGER | No | — | Piastres |
| 8 | currency_code | TEXT | No | 'EGP' | — |
| 9 | customer_groups | JSONB | Yes | NULL | NULL = all groups |
| 10 | savings_label_en | TEXT | Yes | NULL | "Save 10%" |
| 11 | savings_label_ar | TEXT | Yes | NULL | "وفّر ١٠٪" |
| 12 | is_active | BOOLEAN | No | true | — |
| 13 | created_at | TIMESTAMPTZ | No | now() | — |
| 14 | updated_at | TIMESTAMPTZ | No | now() | — |
| 15 | deleted_at | TIMESTAMPTZ | Yes | NULL | Soft delete |

#### order_template

| # | Field | Type | Nullable | Default | Notes |
|---|---|---|---|---|---|
| 1 | id | UUID | No | gen_random_uuid() | Primary key |
| 2 | customer_id | TEXT | No | — | Ref → customer.id |
| 3 | name | TEXT | No | — | User-given template name |
| 4 | items_data | JSONB | No | '[]' | [{variant_id, quantity}] |
| 5 | last_used_at | TIMESTAMPTZ | Yes | NULL | — |
| 6 | use_count | INTEGER | No | 0 | — |
| 7 | is_active | BOOLEAN | No | true | — |
| 8 | created_at | TIMESTAMPTZ | No | now() | — |
| 9 | updated_at | TIMESTAMPTZ | No | now() | — |
| 10 | deleted_at | TIMESTAMPTZ | Yes | NULL | Soft delete |

#### wholesale_account

| # | Field | Type | Nullable | Default | Notes |
|---|---|---|---|---|---|
| 1 | id | UUID | No | gen_random_uuid() | Primary key |
| 2 | customer_id | TEXT | No | — | Ref → customer.id, unique |
| 3 | business_name | TEXT | No | — | — |
| 4 | business_name_ar | TEXT | Yes | NULL | — |
| 5 | tax_registration_number | TEXT | Yes | NULL | — |
| 6 | verification_status | TEXT | No | 'pending' | pending/verified/rejected/suspended |
| 7 | credit_limit_amount | INTEGER | Yes | NULL | Piastres, NULL = COD only |
| 8 | credit_used_amount | INTEGER | No | 0 | Piastres |
| 9 | payment_terms_days | INTEGER | Yes | NULL | net-30, NULL = no credit |
| 10 | document_urls | JSONB | No | '[]' | Uploaded document URLs |
| 11 | verified_by | TEXT | Yes | NULL | Admin user ID |
| 12 | verified_at | TIMESTAMPTZ | Yes | NULL | — |
| 13 | rejection_reason | TEXT | Yes | NULL | — |
| 14 | created_at | TIMESTAMPTZ | No | now() | — |
| 15 | updated_at | TIMESTAMPTZ | No | now() | — |
| 16 | deleted_at | TIMESTAMPTZ | Yes | NULL | Soft delete |

#### delivery_proof

| # | Field | Type | Nullable | Default | Notes |
|---|---|---|---|---|---|
| 1 | id | UUID | No | gen_random_uuid() | Primary key |
| 2 | order_id | TEXT | No | — | Ref → order.id, unique |
| 3 | weight_photo_url | TEXT | Yes | NULL | — |
| 4 | delivery_photo_url | TEXT | Yes | NULL | — |
| 5 | actual_weight_kg | DECIMAL(8,2) | Yes | NULL | — |
| 6 | delivered_at | TIMESTAMPTZ | Yes | NULL | — |
| 7 | delivered_to | TEXT | Yes | NULL | Recipient name |
| 8 | driver_notes | TEXT | Yes | NULL | — |
| 9 | created_at | TIMESTAMPTZ | No | now() | Immutable |

#### notification_preference

| # | Field | Type | Nullable | Default | Notes |
|---|---|---|---|---|---|
| 1 | id | UUID | No | gen_random_uuid() | Primary key |
| 2 | customer_id | TEXT | No | — | Ref → customer.id |
| 3 | channel | TEXT | No | — | sms/whatsapp/push/email |
| 4 | order_confirmed | BOOLEAN | No | true | — |
| 5 | order_shipped | BOOLEAN | No | true | — |
| 6 | order_delivered | BOOLEAN | No | true | — |
| 7 | deal_alert | BOOLEAN | No | false | — |
| 8 | price_drop | BOOLEAN | No | false | — |
| 9 | restock_alert | BOOLEAN | No | false | — |
| 10 | is_active | BOOLEAN | No | true | — |
| 11 | created_at | TIMESTAMPTZ | No | now() | — |
| 12 | updated_at | TIMESTAMPTZ | No | now() | — |

#### erp_sync_log

| # | Field | Type | Nullable | Default | Notes |
|---|---|---|---|---|---|
| 1 | id | UUID | No | gen_random_uuid() | Primary key |
| 2 | entity_type | TEXT | No | — | product/inventory/customer/order/invoice |
| 3 | entity_id | TEXT | No | — | Medusa or ERP identifier |
| 4 | direction | TEXT | No | — | erp_to_medusa / medusa_to_erp |
| 5 | status | TEXT | No | — | success/conflict/error |
| 6 | medusa_data | JSONB | Yes | NULL | Snapshot |
| 7 | erp_data | JSONB | Yes | NULL | Snapshot |
| 8 | error_message | TEXT | Yes | NULL | — |
| 9 | job_id | TEXT | Yes | NULL | BullMQ job ID |
| 10 | attempt_number | INTEGER | No | 1 | — |
| 11 | duration_ms | INTEGER | Yes | NULL | — |
| 12 | created_at | TIMESTAMPTZ | No | now() | Immutable, append-only |

#### erp_sync_cursor

| # | Field | Type | Nullable | Default | Notes |
|---|---|---|---|---|---|
| 1 | id | UUID | No | gen_random_uuid() | Primary key |
| 2 | entity_type | TEXT | No | — | Unique — one cursor per type |
| 3 | last_synced_at | TIMESTAMPTZ | No | — | — |
| 4 | last_synced_id | TEXT | Yes | NULL | — |
| 5 | total_synced_count | INTEGER | No | 0 | Running count |
| 6 | last_error_at | TIMESTAMPTZ | Yes | NULL | — |
| 7 | last_error_message | TEXT | Yes | NULL | — |
| 8 | updated_at | TIMESTAMPTZ | No | now() | — |

#### order_status_log

| # | Field | Type | Nullable | Default | Notes |
|---|---|---|---|---|---|
| 1 | id | UUID | No | gen_random_uuid() | Primary key |
| 2 | order_id | TEXT | No | — | Ref → order.id |
| 3 | from_status | TEXT | Yes | NULL | NULL = initial creation |
| 4 | to_status | TEXT | No | — | New status |
| 5 | trigger | TEXT | No | — | customer/admin/system/erp_webhook |
| 6 | actor_id | TEXT | Yes | NULL | User or system ID |
| 7 | notes | TEXT | Yes | NULL | — |
| 8 | created_at | TIMESTAMPTZ | No | now() | Immutable, append-only |

---

## 9. Relationship Map

### 9.1 One-to-Many Relationships

| Parent | Child | Foreign Key | Cascade |
|---|---|---|---|
| delivery_zone | delivery_slot | zone_id | Soft delete children when parent soft-deleted |
| customer | order_template | customer_id | Soft delete templates when customer soft-deleted |
| customer | wholesale_account | customer_id | Soft delete account when customer soft-deleted |
| customer | notification_preference | customer_id | Delete preferences when customer soft-deleted |
| order | delivery_proof | order_id | Delete proof when order soft-deleted |
| order | order_status_log | order_id | Keep logs even if order is soft-deleted (audit) |
| product_variant | price_tier | variant_id | Soft delete tiers when variant soft-deleted |

### 9.2 One-to-One Relationships

| Entity A | Entity B | Relationship |
|---|---|---|
| customer | wholesale_account | A customer has at most one wholesale account |
| order | delivery_proof | An order has at most one delivery proof |
| customer + channel | notification_preference | A customer has one preference set per channel |

### 9.3 Reference-Only Relationships (No FK Constraint)

These relationships are enforced at the application level, not by database foreign keys, because they cross the `public`/`ggh` schema boundary.

| GGH Table | Medusa Entity | Column | Enforcement |
|---|---|---|---|
| price_tier | product_variant | variant_id | Application validates variant exists before insert |
| order_template | customer | customer_id | Application validates customer exists |
| wholesale_account | customer | customer_id | Application validates customer exists |
| delivery_proof | order | order_id | Application validates order exists |
| erp_sync_log | various | entity_id | Log table — no validation needed |
| order_status_log | order | order_id | Application validates order exists |
| notification_preference | customer | customer_id | Application validates customer exists |

---

## 10. Index Strategy

### 10.1 Index Principles

| Principle | Detail |
|---|---|
| **Index for query patterns, not structure** | Add an index when a query is slow, not because a column "might be searched." |
| **Prefer composite indexes** | A single composite index covering multiple WHERE clauses beats multiple single-column indexes. |
| **Include only what's needed** | Use covering indexes (INCLUDE columns) when the query only needs a few columns. |
| **Monitor and remove unused indexes** | Every index slows writes. Unused indexes are waste. Check `pg_stat_user_indexes` monthly. |
| **No indexes on small tables** | Tables under 1000 rows don't need indexes. Sequential scan is faster. |

### 10.2 GGH Index Definitions

#### erp_sync_log

| Index Name | Columns | Type | Purpose |
|---|---|---|---|
| `ix_erp_sync_log_entity` | `(entity_type, entity_id)` | B-tree | Find sync history for a specific entity |
| `ix_erp_sync_log_status_time` | `(status, created_at DESC)` | B-tree | Find recent failures for alerting |
| `ix_erp_sync_log_created_at` | `(created_at DESC)` | B-tree | Paginate log entries in admin |

#### delivery_slot

| Index Name | Columns | Type | Purpose |
|---|---|---|---|
| `ix_delivery_slot_zone_day` | `(zone_id, day_of_week)` | B-tree | Find available slots for a zone on a day |
| `ix_delivery_slot_active` | `(is_active, zone_id)` | B-tree | Find active slots for a zone |

#### price_tier

| Index Name | Columns | Type | Purpose |
|---|---|---|---|
| `ix_price_tier_variant_min` | `(variant_id, min_quantity)` | B-tree | Resolve price tier for a given quantity |
| `ix_price_tier_variant_active` | `(variant_id, is_active)` | B-tree | Find active tiers for a variant |

#### order_template

| Index Name | Columns | Type | Purpose |
|---|---|---|---|
| `ix_order_template_customer` | `(customer_id)` | B-tree | Load a customer's templates |

#### wholesale_account

| Index Name | Columns | Type | Purpose |
|---|---|---|---|
| `ix_wholesale_account_customer` | `(customer_id)` | B-tree | Find account by customer |
| `ix_wholesale_account_status` | `(verification_status)` | B-tree | Find pending accounts for admin review |

#### delivery_proof

| Index Name | Columns | Type | Purpose |
|---|---|---|---|
| `ix_delivery_proof_order` | `(order_id)` | B-tree | Find proof by order |

#### order_status_log

| Index Name | Columns | Type | Purpose |
|---|---|---|---|
| `ix_order_status_log_order` | `(order_id, created_at DESC)` | B-tree | Get status history for an order |
| `ix_order_status_log_status` | `(to_status, created_at DESC)` | B-tree | Find orders in a specific status |

#### notification_preference

| Index Name | Columns | Type | Purpose |
|---|---|---|---|
| `ix_notif_pref_customer_channel` | `(customer_id, channel)` | B-tree | Find preference by customer and channel |

### 10.3 Medusa Index Considerations

Medusa creates its own indexes. Do not add indexes to Medusa tables. If a Medusa query is slow:

1. Check if Medusa's built-in index covers the query
2. If not, add the index through a Medusa migration (not directly)
3. Document the addition in `infra/migrations/medusa/README.md`

---

## 11. Data Integrity Rules

### 11.1 Application-Level Constraints

These rules are enforced in the application layer (API routes, Medusa workflows), not by database constraints, because they involve cross-service or business logic that SQL cannot express.

| Rule | Table(s) | Enforcement |
|---|---|---|
| Minimum order value (B2C ≥ EGP 500, B2B ≥ EGP 2,000) | cart → order | Validated in checkout API route before completing cart |
| Variant MOQ enforcement | cart_line_item | Validated when adding to cart and at checkout |
| Case-pack quantity must be multiple of case_size | cart_line_item | Validated when setting quantity |
| Delivery slot availability | delivery_slot | Checked and atomically incremented at checkout |
| Customer group → price tier access | price_tier.customer_groups | Validated when calculating price |
| Credit limit not exceeded | wholesale_account | Validated before confirming order for net-30 customers |
| ERP sync idempotency | erp_sync_log | Same entity_type + entity_id + direction within 5 minutes → skip duplicate |

### 11.2 Database-Level Constraints

| Table | Constraint | Type |
|---|---|---|
| delivery_zone | `name_en` unique where `deleted_at IS NULL` | Partial unique index |
| delivery_zone | `name_ar` unique where `deleted_at IS NULL` | Partial unique index |
| delivery_zone | `base_rate_amount ≥ 0` | CHECK |
| delivery_slot | `(zone_id, day_of_week, start_time)` unique where `deleted_at IS NULL` | Partial unique index |
| delivery_slot | `0 ≤ current_orders_count ≤ max_orders_count` | CHECK |
| delivery_slot | `start_time < end_time` | CHECK |
| delivery_slot | `day_of_week BETWEEN 0 AND 6` | CHECK |
| price_tier | `(variant_id, min_quantity)` unique where `deleted_at IS NULL` | Partial unique index |
| price_tier | `min_quantity > 0` | CHECK |
| price_tier | `max_quantity > min_quantity OR max_quantity IS NULL` | CHECK |
| price_tier | `price_amount > 0` | CHECK |
| wholesale_account | `customer_id` unique where `deleted_at IS NULL` | Partial unique index |
| wholesale_account | `credit_used_amount ≤ credit_limit_amount OR credit_limit_amount IS NULL` | CHECK |
| wholesale_account | `verification_status IN ('pending','verified','rejected','suspended')` | CHECK |
| erp_sync_log | `direction IN ('erp_to_medusa','medusa_to_erp')` | CHECK |
| erp_sync_log | `status IN ('success','conflict','error')` | CHECK |
| erp_sync_cursor | `entity_type` unique | UNIQUE |
| order_status_log | `to_status` not empty | CHECK |
| notification_preference | `(customer_id, channel)` unique | UNIQUE |

---

## 12. Soft Delete Strategy

### 12.1 Rules

| Rule | Detail |
|---|---|
| **All GGH tables use soft delete** | Every table has `deleted_at TIMESTAMPTZ NULL`. Deleted records have a timestamp; active records have NULL. |
| **No physical deletion** | Records are never removed with DELETE. Only UPDATE SET deleted_at = now(). |
| **Unique constraints exclude soft-deleted** | All unique constraints use `WHERE deleted_at IS NULL` to allow re-creation after soft delete. |
| **Queries filter by default** | All application queries include `WHERE deleted_at IS NULL`. Use a base scope or middleware. |
| **Hard delete after 90 days** | A scheduled job permanently removes records soft-deleted more than 90 days ago. |
| **Log tables have no soft delete** | `erp_sync_log` and `order_status_log` are append-only. They are never soft- or hard-deleted. |

### 12.2 Soft Delete Cascade

When a parent record is soft-deleted, related records are also soft-deleted:

| Parent | Children Soft-Deleted |
|---|---|
| delivery_zone | All delivery_slots in this zone |
| customer | All order_templates, wholesale_account, notification_preferences |

**Implementation:** Performed in a Medusa workflow or API route, not by a database trigger. Triggers create hidden coupling.

---

## 13. Money Handling

### 13.1 Storage Rules

| Rule | Detail |
|---|---|
| **All money is stored in piastres** | EGP 125.50 → `12550`. EGP 0.00 → `0`. |
| **Column type is INTEGER** | Not DECIMAL, not NUMERIC, not FLOAT. Integer arithmetic is exact. |
| **No negative amounts** | All amount columns have a CHECK constraint ≥ 0. Refunds are tracked separately, not as negative amounts. |
| **Currency is always EGP** | The `currency_code` column exists for future-proofing but is always "EGP" in practice. |
| **Display conversion happens at render time** | `formatEGP(12550)` → "125.50 ج.م". The database never stores formatted strings. |

### 13.2 Money Columns in GGH Tables

| Table | Column | Meaning |
|---|---|---|
| delivery_zone | base_rate_amount | Shipping rate in piastres |
| delivery_zone | free_delivery_above_amount | Order threshold for free delivery |
| price_tier | price_amount | Unit price in piastres |
| wholesale_account | credit_limit_amount | Credit limit in piastres |
| wholesale_account | credit_used_amount | Used credit in piastres |

### 13.3 Money Columns in Medusa Tables (Read-Only)

| Table | Column | Meaning |
|---|---|---|
| price | amount | Unit price in piastres |
| order | total | Order total in piastres |
| order | subtotal | Order subtotal in piastres |
| order | shipping_total | Shipping cost in piastres |
| order | discount_total | Discount amount in piastres |
| order_line_item | unit_price | Line item unit price in piastres |
| order_line_item | subtotal | Line item subtotal in piastres |
| cart_line_item | unit_price | Cart item unit price in piastres |
| refund | amount | Refund amount in piastres |

---

## 14. Localization Storage

### 14.1 Bilingual Field Strategy

Every user-facing text is stored in both languages as paired columns:

| Pattern | Example |
|---|---|
| `name_en` / `name_ar` | delivery_zone: "Cairo Central" / "القاهرة الوسطى" |
| `label_en` / `label_ar` | delivery_slot: "Sunday 10 AM – 2 PM" / "الأحد ١٠ ص – ٢ م" |
| `tier_name_en` / `tier_name_ar` | price_tier: "Wholesale" / "جملة" |
| `savings_label_en` / `savings_label_ar` | price_tier: "Save 10%" / "وفّر ١٠٪" |
| `business_name` / `business_name_ar` | wholesale_account: "Ahmed Trading" / "أحمد للتجارة" |

### 14.2 Medusa Metadata for Localization

Medusa does not natively support bilingual fields. GGH stores Arabic text in the `metadata` JSONB column:

| Medusa Entity | Metadata Key | Example |
|---|---|---|
| product | `metadata.name_ar` | "أرز بسمتي الدوحة" |
| product_category | `metadata.name_ar` | "أرز وحبوب" |
| product_category | `metadata.icon_emoji` | "🍚" |
| product | `metadata.brand` | "Al Doha" |
| customer | `metadata.preferred_locale` | "ar" |

### 14.3 Rules

| Rule | Detail |
|---|---|
| **Both languages are always present** | CI validates that no GGH table has `_en` without `_ar` and vice versa. |
| **Arabic text is Egyptian Arabic** | Category names use common Egyptian terms, not formal MSA. "مكرونة" not "معكرونة". |
| **Numbers in labels use Eastern Arabic numerals** | Delivery slot labels: "١٠ ص" not "10 AM". But prices use Western numerals: "125 ج.م" not "١٢٥ ج.م". |
| **No machine translation in the database** | All `_ar` fields are written by Arabic-speaking team members. |

---

## 15. Audit & Timestamps

### 15.1 Timestamp Rules

| Table Type | Timestamps | Mutable? |
|---|---|---|
| Entity tables (delivery_zone, etc.) | `created_at`, `updated_at`, `deleted_at` | `updated_at` updated on every change. `deleted_at` set on soft delete. |
| Log tables (erp_sync_log, order_status_log) | `created_at` only | Immutable. Never updated or deleted. |
| Cursor table (erp_sync_cursor) | `updated_at` | Updated after every successful sync. |

### 15.2 Audit Trail

| Event | Audit Source |
|---|---|
| Product created/updated/deleted | Medusa's built-in audit log |
| Order status changed | `ggh.order_status_log` |
| ERP sync attempt | `ggh.erp_sync_log` |
| Customer verified | `ggh.wholesale_account.verified_by` + `verified_at` |
| Delivery slot count changed | Application-level logging (slot increment is atomic) |
| Price tier changed | `ggh.price_tier.updated_at` + application-level change log |

### 15.3 No Triggers

GGH does not use database triggers. All audit logging and derived updates happen in the application layer. Reasons:

1. Triggers are invisible — a developer reading the code cannot see the side effect
2. Triggers are hard to test — they require database-level integration tests
3. Triggers are hard to debug — they don't appear in application logs
4. Triggers create coupling — the database knows about business rules

---

## 16. Migration Strategy

### 16.1 Medusa Migrations

| Rule | Detail |
|---|---|
| **Never modify Medusa migrations** | Run `medusa db:migrate` to apply. Never edit existing migration files. |
| **Custom Medusa migrations** | If GGH needs to add a column to a Medusa table, create a new migration file in Medusa's migration directory. |
| **Test on staging first** | Run all migrations on a staging database before production. |
| **Backup before migration** | Take a PostgreSQL dump before running migrations in production. |

### 16.2 GGH Migrations

| Rule | Detail |
|---|---|
| **Numbered migration files** | `001_create_delivery_zone.sql`, `002_create_delivery_slot.sql`, etc. |
| **Each migration is reversible** | Every migration has an `UP` (create) and `DOWN` (revert) section. |
| **Migrations are idempotent** | Check if the table/column already exists before creating. |
| **No data modification in migrations** | Schema changes only. Data seeding uses `scripts/seed/`. |
| **Run in order** | Migration runner executes files in numerical order. Never skip a number. |

### 16.3 Migration File Template

```
-- Migration: 001_create_delivery_zone
-- Created: 2026-07-19
-- Author: GGH Team
-- Description: Create delivery_zone table for shipping zone management

-- UP
CREATE TABLE IF NOT EXISTS ggh.delivery_zone ( ... );
CREATE INDEX IF NOT EXISTS ... ;

-- DOWN
DROP INDEX IF EXISTS ... ;
DROP TABLE IF EXISTS ggh.delivery_zone;
```

---

## 17. Backup & Recovery

### 17.1 Backup Schedule

| Type | Frequency | Retention | Tool |
|---|---|---|---|
| Full dump | Daily at 03:00 UTC | 30 days | `pg_dump` |
| WAL archiving | Continuous | 7 days | PostgreSQL WAL |
| Snapshot (if cloud) | Daily at 04:00 UTC | 14 days | Cloud provider snapshot |

### 17.2 Recovery Time Objectives

| Scenario | RTO | RPO | Method |
|---|---|---|---|
| Single table drop | 15 minutes | 0 (WAL replay) | Point-in-time recovery |
| Full database loss | 1 hour | ≤ 24 hours | Restore from latest dump + WAL replay |
| Data corruption (detected within 1h) | 30 minutes | ≤ 1 hour | Point-in-time recovery to before corruption |
| Data corruption (detected after 24h) | 4 hours | ≤ 24 hours | Restore from dump + manual reconciliation |

### 17.3 Backup Verification

| Check | Frequency | Method |
|---|---|---|
| Backup file exists and is non-empty | Every run | Script checks file size > 0 |
| Backup is restorable | Weekly | Restore to a test database, run integrity checks |
| GGH schema is present | Weekly | Verify `ggh.delivery_zone` exists in restored backup |
| Row counts match | Weekly | Compare row counts on key tables between live and restored |

---

*This document is the single source of truth for the database structure. When adding a new table, follow the naming conventions, add it to the correct schema, include all required timestamp and soft-delete columns, and update this document in the same PR.*

*Last updated: July 2026*
