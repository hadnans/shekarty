# 10 — Product Catalog

> **GGH — Gomla Go Home** — Products, categories, brands, variants, pricing, inventory, images, search, and filtering. The catalog is the heart of the platform. If Om Ibrahim can't find rice in 10 seconds, we've failed.

---

## Table of Contents

1. [Catalog Philosophy](#1-catalog-philosophy)
2. [Catalog Architecture](#2-catalog-architecture)
3. [Categories](#3-categories)
4. [Products](#4-products)
5. [Product Variants](#5-product-variants)
6. [Brands](#6-brands)
7. [Pricing](#7-pricing)
8. [Inventory](#8-inventory)
9. [Product Images](#9-product-images)
10. [Search](#10-search)
11. [Filtering & Sorting](#11-filtering--sorting)
12. [Product Cards](#12-product-cards)
13. [Product Detail Page](#13-product-detail-page)
14. [Category Pages](#14-category-pages)
15. [Deals & Promotions](#15-deals--promotions)
16. [Catalog Management (Admin)](#16-catalog-management-admin)
17. [ERP Sync for Catalog](#17-erp-sync-for-catalog)
18. [Catalog Caching](#18-catalog-caching)
19. [Catalog Performance](#19-catalog-performance)
20. [Elder-Friendly Catalog Decisions](#20-elder-friendly-catalog-decisions)
21. [Bilingual & RTL in Catalog](#21-bilingual--rtl-in-catalog)
22. [Catalog Seeding Data](#22-catalog-seeding-data)

---

## 1. Catalog Philosophy

| Principle | Rule | Why |
|---|---|---|
| **Category-first navigation** | Users browse by category, not by brand or search. The homepage is a category grid. | Om Ibrahim thinks "I need rice" — she taps the rice icon. She doesn't search for "Al Doha Basmati 5kg." |
| **Two-level hierarchy only** | Parent category → child categories → products. No deeper nesting. | Three levels of drill-down is the maximum for elder users. Beyond that, they get lost. |
| **Prices never hidden** | Every product card shows the price. Every variant card shows the price. No "tap to reveal pricing." | Trust. Hidden prices feel like a scam. Wholesale pricing is the value — show it. |
| **Savings always visible** | Every product shows savings vs. retail. Every cart shows total savings. | The entire business model is "buy wholesale, save money." If we hide the savings, we hide our value. |
| **Images are functional** | Product images show the actual pack/bottle/sack the customer will receive. No lifestyle shots. | Om Ibrahim needs to recognize the product she buys at the souq. A lifestyle shot of rice in a bowl doesn't help. |
| **Out-of-stock is not invisible** | Out-of-stock products remain visible but greyed out. They're never removed from the catalog. | Customers need to know the product exists and will be back. Removing it breaks trust and SEO. |
| **No jargon** | "5kg Bag" not "5KG-PACK-STD". "شيكارة ٢٥ كيلو" not "حزمة كبيرة". | Product names and variant titles are written for humans, not for ERP systems. |

---

## 2. Catalog Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      CATALOG DATA FLOW                              │
│                                                                     │
│   ERPNext                     Medusa v2                    BFF/Redis│
│   (Source of Truth)           (Operational Copy)           (Cache) │
│                                                                     │
│   Item Master ──────────────→ Product ──────────────────→ Cache   │
│   Item Group ───────────────→ Product Category ────────→ Cache    │
│   Item Variant ─────────────→ Product Variant ─────────→ Cache    │
│   Item Price ───────────────→ Price + Price Tier ────→ Cache      │
│   Stock Ledger ─────────────→ Inventory Level ─────────→ Cache    │
│   Item Image ───────────────→ Product Image ──────────→ Cache     │
│                                                                     │
│   Sync: every 5 minutes (incremental)                              │
│   Sync: on-demand (admin trigger)                                   │
│   Sync: on product update webhook (real-time)                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Ownership

| Data | Owner | Can GGH Modify? | Notes |
|---|---|---|---|
| Product name (EN) | ERPNext | Yes (override) | ERP provides the base. Admin can adjust for clarity. |
| Product name (AR) | GGH Admin | Yes | ERP doesn't have Arabic names. GGH adds them manually or via translation. |
| Category assignment | ERPNext | Yes (override) | ERP Item Group maps to GGH Category. Admin can reassign. |
| Pricing | ERPNext | Yes (override) | ERP prices are baseline. Admin can add GGH-specific tiers. |
| Stock levels | ERPNext | No | Stock is always synced from ERP. GGH never modifies stock directly. |
| Product images | GGH Admin | Yes | ERP doesn't manage images. GGH uploads them. |
| Variant metadata | GGH Admin | Yes | `is_case_pack`, `case_size`, `moq` — GGH-specific data. |

---

## 3. Categories

### 3.1 Category Structure

GGH uses a **two-level hierarchy**: parent categories and child categories. No deeper nesting.

```
┌──────────────────────────────────────────────────────────────┐
│                     CATEGORY TREE                             │
│                                                              │
│  🍚 Rice & Grains ──────────── أرز وحبوب                    │
│     ├── White Rice            أرز أبيض                      │
│     ├── Basmati Rice          أرز بسمتي                     │
│     ├── Pasta & Noodles       مكرونة                        │
│     └── Flour & Burghul       دقيق وبرغل                    │
│                                                              │
│  🫒 Oils & Fats ────────────── زيوت ودهون                    │
│     ├── Cooking Oil           زيت طبخ                       │
│     ├── Olive Oil             زيت زيتون                     │
│     └── Ghee & Butter         سمنة وزبدة                    │
│                                                              │
│  ☕ Tea & Coffee ───────────── شاي وقهوة                     │
│     ├── Tea                   شاي                           │
│     ├── Coffee                قهوة                          │
│     └── Cocoa & Hot Drinks    كاكو ومشروبات ساخنة          │
│                                                              │
│  🧂 Spices & Seasonings ───── توابل وتوافير                  │
│     ├── Spices                بهارات                        │
│     ├── Salt & Pepper         ملح وفلفل                     │
│     └── Sauces & Pastes       صلصات ومعاجين                 │
│                                                              │
│  🍬 Sugar & Sweeteners ─────── سكر ومحليات                   │
│  🫘 Beans & Lentils ───────── فول وعدس                      │
│  🥫 Canned Foods ──────────── معلبات                        │
│  ❄️ Frozen Food ────────────── مجمدات                        │
│  🧹 Cleaning Products ─────── منتجات تنظيف                   │
│  📄 Paper Products ────────── مناديل وورق                    │
│  🏠 Household Essentials ──── احتياجات المنزل                │
│  🍅 Tomato Paste & Sauces ─── صلصة طماطم                    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 The 15 Parent Categories

| # | English | Arabic | Emoji | ERP Item Group | Typical Product Count |
|---|---|---|---|---|---|
| 1 | Rice & Grains | أرز وحبوب | 🍚 | Rice & Grains | 40–60 |
| 2 | Pasta & Noodles | مكرونة | 🍝 | Pasta & Noodles | 20–30 |
| 3 | Flour & Baking | دقيق ومخبوزات | 🌾 | Flour & Baking | 15–20 |
| 4 | Sugar & Sweeteners | سكر ومحليات | 🍬 | Sugar & Sweeteners | 10–15 |
| 5 | Oils & Fats | زيوت ودهون | 🫒 | Oils & Fats | 20–30 |
| 6 | Ghee & Butter | سمنة وزبدة | 🧈 | Ghee & Butter | 10–15 |
| 7 | Beans & Lentils | فول وعدس | 🫘 | Beans & Lentils | 15–25 |
| 8 | Tea & Coffee | شاي وقهوة | ☕ | Tea & Coffee | 25–35 |
| 9 | Spices & Seasonings | توابل وبهارات | 🧂 | Spices & Seasonings | 30–40 |
| 10 | Tomato Paste & Sauces | صلصة طماطم | 🍅 | Tomato Paste | 10–15 |
| 11 | Canned Foods | معلبات | 🥫 | Canned Foods | 15–20 |
| 12 | Frozen Food | مجمدات | ❄️ | Frozen Food | 10–15 |
| 13 | Cleaning Products | منتجات تنظيف | 🧹 | Cleaning | 20–30 |
| 14 | Paper Products | مناديل وورق | 📄 | Paper Products | 8–12 |
| 15 | Household Essentials | احتياجات المنزل | 🏠 | Household | 15–25 |

### 3.3 Category Data Model

Categories are managed in Medusa's `product_category` table with GGH metadata:

| Field | Source | Notes |
|---|---|---|
| `id` | Medusa auto-generated | `cat_01RICE` format |
| `name` | English name | "Rice & Grains" |
| `handle` | URL slug | `rice-grains` |
| `parent_category_id` | Medusa | `null` for parent, parent ID for child |
| `rank` | GGH Admin | Display order (1 = first) |
| `metadata.name_ar` | GGH Admin | "أرز وحبوب" |
| `metadata.icon_emoji` | GGH Admin | "🍚" |
| `metadata.erp_item_group` | ERPNext sync | "Rice & Grains" |
| `metadata.thumbnail` | GGH Admin | Category image URL |

### 3.4 Category Rules

| Rule | Implementation |
|---|---|
| **Every product must have a category** | No uncategorized products. ERP sync assigns category from Item Group. |
| **One category per product** | A product belongs to one child category only. No multi-category assignment. |
| **Parent categories are not shoppable** | Tapping a parent shows its children. Products live in child categories. |
| **Category order is explicit** | Admin sets `rank` manually. No alphabetical sort. |
| **Category names are bilingual** | Both `name` (EN) and `metadata.name_ar` are required. |
| **Category emojis are not decorative** | They serve as visual identifiers for elder users who may not read the text quickly. |

---

## 4. Products

### 4.1 Product Data Model

Products are managed in Medusa's `product` table with GGH-specific metadata:

| Field | Source | Description |
|---|---|---|
| `id` | Medusa | `prod_01ABC` |
| `title` | ERPNext → GGH Admin | English product name: "Al Doha Basmati Rice" |
| `handle` | Auto-generated | URL slug: `al-doha-basmati-rice` |
| `description` | ERPNext → GGH Admin | English description |
| `thumbnail` | GGH Admin | Main product image URL |
| `status` | GGH Admin | `published` or `draft` |
| `category_id` | ERPNext → GGH Admin | Assigned child category |
| `metadata.name_ar` | GGH Admin | "أرز بسمتي الدوحة" |
| `metadata.description_ar` | GGH Admin | Arabic description |
| `metadata.brand` | GGH Admin | "Al Doha" |
| `metadata.erp_item_code` | ERPNext | "RICE-BSMT-DOHA" |
| `metadata.moq` | GGH Admin | Minimum order quantity (default: 1) |
| `metadata.tags` | GGH Admin | `["staple", "bestseller"]` |
| `metadata.unit_label_en` | GGH Admin | "Bag", "Bottle", "Sack" |
| `metadata.unit_label_ar` | GGH Admin | "كيس", "زجاجة", "شيكارة" |

### 4.2 Product Naming Convention

Product titles follow a consistent pattern so users always know what they're looking at:

```
Format:  {Brand} {Type} {Distinguishing Feature}

Examples:
  ✅ "Al Doha Basmati Rice"           (Brand + Type + Variety)
  ✅ "Crystal White Rice"              (Brand + Type + Variety)
  ✅ "El Maleka Pasta Penne"           (Brand + Type + Shape)
  ✅ "Afia Sunflower Oil"              (Brand + Type)
  ✅ "Beyti Full Cream Milk"           (Brand + Type + Variant)

  ❌ "Rice 5kg Al Doha"               (Size before type — confusing)
  ❌ "أرز الدوحة"                      (Arabic only — need English too)
  ❌ "Product-1234"                    (ERP code — not human-readable)
  ❌ "Premium Quality Long Grain"      (No brand — can't identify)
```

### 4.3 Product Status

| Status | Visible to Customers | Can Be Ordered | Use Case |
|---|---|---|---|
| `published` | ✓ | ✓ | Active product in the catalog |
| `draft` | ✗ | ✗ | New product not yet ready |
| `published` + out-of-stock | ✓ | ✗ | Visible but not orderable |
| `published` + `deleted_at` | ✗ | ✗ | Soft-deleted, preserved for order history |

### 4.4 Product Rules

| Rule | Implementation |
|---|---|
| **Every product has at least 1 variant** | No variant-less products. The variant represents the purchasable unit. |
| **Every product has a category** | No orphan products. |
| **Every product has bilingual names** | `title` (EN) + `metadata.name_ar` (AR). Both required for publish. |
| **Product titles are unique** | No two products with the same `title`. Use brand to disambiguate. |
| **Soft delete only** | Products are never hard-deleted. They lose visibility but retain order history references. |
| **ERP code is immutable** | Once `metadata.erp_item_code` is set, it never changes. It's the sync key. |

---

## 5. Product Variants

### 5.1 What Is a Variant?

A variant represents a purchasable unit of a product. In GGH, variants are almost always **pack sizes**.

```
Product: Al Doha Basmati Rice

Variants:
  ├── 1kg Bag     (retail size)
  ├── 5kg Bag     (household size)
  └── 25kg Sack   (wholesale/case pack)
```

### 5.2 Variant Data Model

| Field | Source | Description |
|---|---|---|
| `id` | Medusa | `var_01ABC` |
| `product_id` | Medusa | Parent product |
| `title` | GGH Admin | "5kg Bag" / "كيس ٥ كيلو" |
| `sku` | ERPNext | "RICE-BSMT-DOHA-5KG" |
| `barcode` | ERPNext | EAN-13 barcode |
| `allow_backorder` | GGH Admin | Can order when out of stock? |
| `metadata.weight_kg` | GGH Admin | 5.0 |
| `metadata.unit` | GGH Admin | "kg" |
| `metadata.is_case_pack` | GGH Admin | `false` (5kg is not a case pack) |
| `metadata.case_size` | GGH Admin | `null` (not applicable) |
| `metadata.moq` | GGH Admin | 1 (minimum 1 bag) |
| `metadata.unit_label_en` | GGH Admin | "Bag" |
| `metadata.unit_label_ar` | GGH Admin | "كيس" |
| `metadata.title_ar` | GGH Admin | "كيس ٥ كيلو" |

### 5.3 Variant Types

| Variant Type | Description | Example | MOQ | Quantity Rules |
|---|---|---|---|---|
| **Retail unit** | Small pack for household use | 1kg bag, 1L bottle | 1 | Any quantity ≥ 1 |
| **Family pack** | Medium pack for weekly use | 5kg bag, 2L bottle | 1 | Any quantity ≥ 1 |
| **Case pack** | Large pack for wholesale | 25kg sack, 5L can, 12-pack | 1 | Quantity in multiples of case_size |

### 5.4 Case Pack Logic

Case packs are the wholesale heart of GGH. They work differently from regular variants:

```
Example: Rice 25kg Sack (Case Pack)
  case_size = 5   (5 × 5kg bags in one sack)
  is_case_pack = true
  moq = 1         (minimum 1 sack)

Quantity stepper behavior:
  [ − ]  1  [ + ]    → User orders 1 sack = 25kg
  [ − ]  2  [ + ]    → User orders 2 sacks = 50kg

NOT: [ − ]  5  [ + ]  (Don't show the internal case_size as the quantity)
```

| Rule | Implementation |
|---|---|
| **Quantity is in case units** | A case pack with `case_size = 5` and quantity = 2 means 2 cases (10 units), not 2 units. |
| **MOQ is per-case** | If MOQ = 1, the minimum is 1 case. Not 1 unit inside the case. |
| **Price is per-case** | The variant price represents the cost of 1 entire case. |
| **Per-unit price shown** | "EGP 5/kg" is always calculated and shown alongside the case price for transparency. |
| **Stock is in case units** | Inventory tracks cases, not individual units inside the case. |

### 5.5 Variant Selection UI

Variants are displayed as selectable cards, never as dropdowns:

```
┌─────────────────────────────────────────────────────────────┐
│  اختار الحجم · Choose size                                   │
│                                                             │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  │
│  │ كيس ١ كيلو    │  │ كيس ٥ كيلو    │  │ شيكارة ٢٥ كجم │  │
│  │ 1kg Bag       │  │ 5kg Bag       │  │ 25kg Sack     │  │
│  │               │  │               │  │               │  │
│  │ EGP 30        │  │ EGP 125       │  │ EGP 550       │  │
│  │ وفّر ١٢٪      │  │ وفّر ١٥٪      │  │ وفّر ٢٠٪      │  │
│  │               │  │               │  │               │  │
│  │  ✓ متاح       │  │  ✓ متاح       │  │  ✓ متاح       │  │
│  └───────────────┘  └───────────────┘  └───────────────┘  │
│                                                             │
│  Each card:                                                 │
│  • 48px+ touch target                                       │
│  • Arabic title (top, bold)                                 │
│  • English title (below)                                    │
│  • Price (large, prominent)                                 │
│  • Savings badge                                            │
│  • Stock indicator                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Brands

### 6.1 Brand Model

GGH does not have a dedicated `Brand` entity. Brands are stored as a metadata field on products:

```
product.metadata.brand = "Al Doha"
```

This is intentional for v1. A full brand entity (with brand pages, brand logos, brand filtering) is planned for v2.

### 6.2 Brand List (Initial)

The most common Egyptian wholesale brands:

| Brand (EN) | Brand (AR) | Category Focus |
|---|---|---|
| Al Doha | الدوحة | Rice, Pasta |
| El Maleka | الملكة | Pasta, Flour |
| Crystal | كريستال | Rice |
| Abou Auf | أبو عوف | Nuts, Coffee, Tea |
| Beyti | بيتي | Dairy, Juice |
| Juhayna | جهينة | Dairy, Juice |
| Afia | أفيا | Oils |
| Mazola | مازولا | Oils |
| Arab Detergent | المنظفات العربية | Cleaning |
| Persil | بيرسيل | Cleaning |
| Fine | فاين | Paper, Tissues |
| Heinz | هاينز | Sauces, Canned |
| Bisco Misr | بسكو مصر | Biscuits, Snacks |
| Edita | إديتا | Snacks, Croissant |
| Twisty | تويستي | Snacks |
| Rashidi El Mizan | رشيدي المصري | Ghee, Butter |
| Corona | كورونا | Chocolate, Biscuits |

### 6.3 Brand Filtering

Even without a brand entity, GGH supports brand-based filtering:

| Method | Implementation |
|---|---|
| **Filter by brand** | `GET /api/v1/products?brand=al-doha` — BFF queries `metadata.brand` |
| **Brand values** | Extracted dynamically from distinct `metadata.brand` values in the database |
| **Brand display** | Shown on product card and product detail page |
| **No brand pages (v1)** | Brand filtering is within category/search only |

---

## 7. Pricing

### 7.1 Pricing Architecture

GGH uses a **three-layer pricing system**:

```
┌──────────────────────────────────────────────────────────────────┐
│                     PRICING LAYERS                                │
│                                                                  │
│  Layer 1: MEDUSA PRICE LISTS                                     │
│  │  Three price lists: Retail, Wholesale, Bulk                  │
│  │  Each assigned to a Customer Group                           │
│  │  Controls base unit price per variant                        │
│  │                                                              │
│  Layer 2: GGH PRICE TIERS (ggh.price_tier)                      │
│  │  Quantity-based discounts within a price list               │
│  │  "Buy 5-9: 12% off. Buy 10+: 20% off."                    │
│  │  Variant-specific, not global                                │
│  │                                                              │
│  Layer 3: DEALS & PROMOTIONS (future)                            │
│     Time-limited overrides on specific variants                 │
│     "This week only: 25% off Al Doha Rice 25kg"                │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 7.2 Price Lists in Medusa

| Price List | Customer Group | Purpose |
|---|---|---|
| Retail Price | `retail`, `wholesale-pending` | Standard per-unit pricing for household buyers |
| Wholesale Price | `wholesale-verified` | Discounted pricing for verified business buyers |
| Bulk Price | `wholesale-enterprise` | Deepest discounts for high-volume enterprise buyers |

### 7.3 Price Tiers (Quantity Discounts)

Price tiers are stored in `ggh.price_tier` and supplement Medusa's price lists:

```
Example: Al Doha Basmati Rice 5kg

Retail customer (retail group):
┌──────────────┬───────────┬───────────┬──────────┬────────────┐
│ Tier         │ Min Qty   │ Max Qty   │ Price    │ Savings    │
├──────────────┼───────────┼───────────┼──────────┼────────────┤
│ Retail       │ 1         │ 4         │ EGP 125  │ —          │
│ Wholesale    │ 5         │ 9         │ EGP 110  │ 12%        │
│ Bulk         │ 10        │ ∞         │ EGP 100  │ 20%        │
└──────────────┴───────────┴───────────┴──────────┴────────────┘

Wholesale customer (wholesale-verified group):
┌──────────────┬───────────┬───────────┬──────────┬────────────┐
│ Tier         │ Min Qty   │ Max Qty   │ Price    │ Savings    │
├──────────────┼───────────┼───────────┼──────────┼────────────┤
│ Wholesale    │ 1         │ 4         │ EGP 110  │ 12%        │
│ Bulk         │ 5         │ 9         │ EGP 100  │ 20%        │
│ Enterprise   │ 10        │ ∞         │ EGP 95   │ 24%        │
└──────────────┴───────────┴───────────┴──────────┴────────────┘
```

### 7.4 Price Calculation Logic

```
Given: customer, variant, quantity

1. Determine customer's price list (based on customer group)
2. Get base price from Medusa price list for this variant
3. Fetch all applicable price tiers for this variant
4. Filter tiers by customer group access (customer_groups field)
5. Find the tier whose quantity range includes the requested quantity
6. If tier found: use tier price
7. If no tier: use base price list price
8. Calculate savings = (retail_price - applied_price) / retail_price × 100
9. Return: { priceAmount, savingsPercent, tierName, nextTierHint }
```

### 7.5 Price Display Rules

| Context | What's Shown | Format |
|---|---|---|
| Product card | Starting price (cheapest variant) | "من EGP ٣٠ · From EGP 30" |
| Product card (1 variant) | Single price | "EGP ١٢٥" |
| Variant card | Variant price + savings | "EGP ١٢٥ وفّر ١٥٪" |
| Quantity stepper | Current tier price per unit | "EGP ١١٠/كيس" |
| Next tier hint | How to unlock next tier | "من ٥ وحدات: EGP ١٠٠ · 5+ units: EGP 100" |
| Cart item | Unit price × quantity | "EGP 125 × 2 = EGP 250" |
| Yesterday's price | Previous day's price (if different) | "كان EGP ١٣٠ أمس · Was EGP 130 yesterday" |

### 7.6 Money Formatting

All prices stored and transmitted as piastres (integer). Display rules:

| Context | Arabic Display | English Display |
|---|---|---|
| 27500 piastres | `٢٧٥ ج.م` or `EGP ٢٧٥` | `EGP 275` |
| 1250 piastres | `١٢٫٥٠ ج.م` | `EGP 12.50` |
| 100000 piastres | `١,٠٠٠ ج.م` | `EGP 1,000` |

Rules:
- Piastres → EGP: divide by 100
- Show decimals only when piastres are not a whole pound
- Arabic-Indic numerals (١٢٥) in Arabic locale, Western numerals (125) in English
- Currency symbol: `ج.م` (Egyptian Pound) in Arabic, `EGP` in English

---

## 8. Inventory

### 8.1 Inventory Architecture

```
┌──────────────┐       every 5 min        ┌──────────────┐
│   ERPNext    │ ─────────────────────→   │   Medusa     │
│  Stock Ledger│     (incremental sync)    │  Inventory   │
│  (Truth)     │                           │  (Operational)│
└──────────────┘                           └──────┬───────┘
                                                  │
                                           ┌──────▼───────┐
                                           │   BFF Cache  │
                                           │   (Redis)    │
                                           │   TTL: 2 min │
                                           └──────────────┘
```

### 8.2 Stock Locations

| Location | Code | Coverage |
|---|---|---|
| Cairo Central Warehouse | `WH-CAIRO` | Cairo, Nasr City, Heliopolis |
| Giza Hub | `WH-GIZA` | Giza, Dokki, Mohandessin |
| 6th October Depot | `WH-OCT` | 6th October, Sheikh Zayed |

### 8.3 Stock Calculation

```
Available quantity = stocked_quantity − reserved_quantity

stocked_quantity:   Physical units in the warehouse (from ERP)
reserved_quantity:  Units in active carts (not yet ordered)
```

### 8.4 Stock States & Display

| State | Condition | Badge | Color | Can Order? |
|---|---|---|---|---|
| In Stock | `available ≥ 10` | "متاح · Available" | Green | ✓ |
| Low Stock | `1 ≤ available < 10` | "آخر قطع · Few left" | Amber | ✓ |
| Out of Stock | `available = 0` | "غير متاح · Unavailable" | Grey | ✗ |
| Backorder | `available = 0` AND `allow_backorder = true` | "طلب مسبق · Pre-order" | Blue | ✓ (with notice) |

### 8.5 Inventory Reservation

Stock is reserved when items enter a cart, not when the order is placed:

| Event | Reservation Action |
|---|---|
| Item added to cart | `reserved_quantity += qty` |
| Quantity increased in cart | `reserved_quantity += delta` |
| Quantity decreased in cart | `reserved_quantity -= delta` |
| Item removed from cart | `reserved_quantity -= qty` |
| Cart abandoned (7 days inactive) | Release all reservations for that cart |
| Order placed (checkout complete) | Reservation converts to fulfillment |
| Order cancelled | Release reservation |

### 8.6 Inventory Rules

| Rule | Implementation |
|---|---|
| **Never oversell** | Cart add checks `available_quantity >= requested_qty`. Reject if not enough. |
| **Reserve on add, not on order** | Prevents stock race conditions. Items in cart are "held" for the customer. |
| **Release abandoned reservations** | BullMQ job runs hourly. Releases reservations for carts inactive > 7 days. |
| **Final check at checkout** | Even with reservations, do a final stock check before creating the order. |
| **Stock is read-only from GGH** | GGH never modifies `stocked_quantity`. Only ERP sync can change it. |
| **Show stock depletion honestly** | "٣ وحدات متاحة · 3 left" — never inflate or hide actual stock. |

---

## 9. Product Images

### 9.1 Image Requirements

| Property | Requirement | Why |
|---|---|---|
| **Product shot only** | Plain background, product clearly visible. No lifestyle. | Elder users match the image to what they buy at the souq. |
| **Pack/bottle/sack visible** | Show the actual packaging with label | Brand recognition. Om Ibrahim knows "Al Doha" by the red bag. |
| **Minimum resolution** | 800×800px | Sharp on mobile retina screens |
| **Maximum file size** | 300KB per image (compressed) | Fast load on 3G connections |
| **Format** | WebP (primary), JPEG (fallback) | 30% smaller than JPEG at same quality |
| **Aspect ratio** | 1:1 (square) | Consistent grid layout. No mixed aspect ratios. |
| **Arabic label visible** | If the product has an Arabic label, show the Arabic side | Egyptian market products often have Arabic on one side, English on the other. Show the side the customer reads. |

### 9.2 Image Types

| Type | Count per Product | Purpose |
|---|---|---|
| Thumbnail | 1 | Product card, search results (300×300px) |
| Main image | 1 | Product detail hero (800×800px) |
| Additional images | 0–4 | Alternate angles, back label, size comparison |
| Weight/size reference | 0–1 | Product next to a standard object (hand, coin) for scale |

### 9.3 Image Storage

| Property | Value |
|---|---|
| Storage | S3-compatible object storage (Wasabi, DigitalOcean Spaces, or MinIO for dev) |
| Path pattern | `/products/{product_id}/{variant_id}_{angle}.{webp,jpg}` |
| CDN | CloudFront or equivalent for edge caching |
| Lazy loading | All images use `loading="lazy"` except the hero image |
| Placeholder | Solid color placeholder matching the product's category color |

### 9.4 Image Processing Pipeline

```
Original upload (any format, up to 10MB)
       │
       ▼
┌──────────────────────────────┐
│  Image Processing (BullMQ)   │
│                              │
│  1. Validate: is it an image?│
│  2. Strip EXIF metadata      │
│  3. Convert to WebP          │
│  4. Resize: 800×800 (main)   │
│  5. Resize: 300×300 (thumb)  │
│  6. Compress: quality 80     │
│  7. Upload to S3             │
│  8. Update Medusa image URLs │
│                              │
└──────────────────────────────┘
```

### 9.5 No-Image Fallback

When a product has no image, show a category-colored placeholder with the category emoji:

```
┌─────────────────┐
│                 │
│       🍚       │    ← Category emoji, large
│                 │
│   أرز وحبوب    │    ← Category name in Arabic
│  Rice & Grains  │    ← Category name in English
│                 │
└─────────────────┘
```

This is better than a broken image icon or a generic "no image" placeholder because it tells the user what category the product belongs to.

---

## 10. Search

### 10.1 Search Architecture

```
User types in search box
       │
       ▼
BFF receives search query
       │
       ▼
┌─────────────────────────────────────────────────────┐
│  SEARCH ENGINE (PostgreSQL pg_trgm + GIN index)     │
│                                                     │
│  1. Normalize query:                                │
│     • Strip Arabic diacritics (tashkeel)            │
│     • Convert Arabic-Indic numerals to Western      │
│     • Trim whitespace                               │
│     • Lowercase                                     │
│                                                     │
│  2. Search columns:                                 │
│     • product.title (EN)                            │
│     • product.metadata.name_ar (AR)                 │
│     • product_variant.sku                           │
│     • product.metadata.brand                        │
│     • product_category.name (EN)                    │
│     • product_category.metadata.name_ar (AR)        │
│                                                     │
│  3. Rank by:                                        │
│     • Similarity score (pg_trgm)                    │
│     • Product popularity (order count)              │
│     • Stock availability (in-stock first)           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 10.2 Search Features

| Feature | Implementation |
|---|---|
| **Bilingual** | Type Arabic or English, get results from both |
| **Brand name search** | Type "الدوحة" or "Al Doha" → same results |
| **SKU search** | Type "RICE-BSMT" → exact variant match |
| **Typo tolerance** | `pg_trgm` with similarity threshold 0.3 |
| **Autocomplete** | Debounced (300ms), min 2 characters, max 10 suggestions |
| **Category suggestions** | Search results include matching categories |
| **Recent searches** | Stored in localStorage (client-side only) |
| **Zero-result handling** | "مفيش نتايج · No results" + category suggestions |

### 10.3 Search Rules

| Rule | Implementation |
|---|---|
| **Minimum 2 characters** | 0–1 character queries return empty. No wasted server calls. |
| **Debounced** | 300ms delay after last keystroke. No search on every character. |
| **Max 50 results** | No infinite results. Show top 50, with pagination if needed. |
| **Published products only** | Draft and deleted products never appear in search. |
| **In-stock first** | Products with available stock rank higher. |
| **Arabic normalization** | Strip tashkeel: "أَرُزّ" → "ارز". Users don't type with diacritics. |
| **No search history on server** | Search queries are never logged to a database. Privacy. |

### 10.4 Search Results UI

```
┌──────────────────────────────────────────────────────────┐
│  🔍 أرز                                                   │
│                                                          │
│  الأقسام · Categories                                    │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 🍚 أرز وحبوب · Rice & Grains                     │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  المنتجات · Products                                     │
│  ┌────────────────────────────────────────────────────┐  │
│  │ [img] أرز بسمتي الدوحة          EGP 125          │  │
│  │       Al Doha Basmati Rice       وفّر ١٥٪         │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │ [img] أرز كريستال أبيض          EGP 115          │  │
│  │       Crystal White Rice         وفّر ١٢٪         │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 11. Filtering & Sorting

### 11.1 Available Filters

| Filter | Type | Values | Implementation |
|---|---|---|---|
| **Category** | Single select | All categories | `?category=rice-grains` |
| **In stock** | Toggle | Yes / All | `?in_stock=true` |
| **Price range** | Dual range | Min–Max (piastres) | `?price_min=5000&price_max=50000` |
| **Brand** | Multi-select | Dynamic from catalog | `?brand=al-doha&brand=crystal` |
| **Case pack only** | Toggle | Yes / All | `?case_pack_only=true` |

### 11.2 Sort Options

| Sort | Code | Default? | Description |
|---|---|---|---|
| Most Popular | `popularity` | ✓ Default | Ordered by total sales count |
| Price: Low to High | `price_asc` | | Cheapest first |
| Price: High to Low | `price_desc` | | Most expensive first |
| Name: A–Z | `name_asc` | | Alphabetical (English) |
| Name: أ–ي | `name_ar_asc` | | Alphabetical (Arabic) |
| Newest | `newest` | | Recently added products |

### 11.3 Filter UI

```
┌──────────────────────────────────────────────────────────┐
│  فلتر · Filter                                    [ ✕ ]  │
│                                                          │
│  القسم · Category                                        │
│  ┌────────────────────────────────────────────────────┐  │
│  │ ● أرز وحبوب · Rice & Grains                      │  │
│  │ ○ زيوت ودهون · Oils & Fats                       │  │
│  │ ○ شاي وقهوة · Tea & Coffee                       │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  الماركة · Brand                                         │
│  ┌────────────────────────────────────────────────────┐  │
│  │ ☑ الدوحة · Al Doha                               │  │
│  │ ☑ كريستال · Crystal                              │  │
│  │ ☐ الملكة · El Maleka                             │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  المتاح بس · In stock only                               │
│  [ ⊙ ] (toggle switch, 48px)                             │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  تطبيق · Apply filters                            │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 11.4 Filter Rules

| Rule | Implementation |
|---|---|
| **Filters are AND logic** | Category=Rice AND Brand=Al Doha = Al Doha rice only |
| **Unknown filters ignored** | If `?color=red` is passed, silently ignore. Don't error. |
| **Invalid values rejected** | `?sort=random` → `400 VALIDATION_INVALID_SORT` |
| **Active filters visible** | Chips above the product grid show active filters with remove (×) button |
| **Filter count shown** | "الماركة: الدوحة (٣) · Brand: Al Doha (3)" — shows result count |

---

## 12. Product Cards

### 12.1 Product Card (List View)

The product card is the most reused component in GGH. It must be perfect.

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  ┌──────────┐  أرز بسمتي الدوحة                         │
│  │          │  Al Doha Basmati Rice                      │
│  │  [img]   │                                            │
│  │          │  من EGP ٣٠  ·  From EGP 30                │
│  │          │  وفّر لحد ٢٠٪  ·  Save up to 20%          │
│  └──────────┘                                            │
│                                                          │
│               ┌──────────────────────────────────────┐   │
│               │  أضف · Add                            │   │
│               └──────────────────────────────────────┘   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 12.2 Product Card Fields

| Field | Always Shown | Notes |
|---|---|---|
| Product image | ✓ | Thumbnail (300×300) |
| Arabic name | ✓ | Bold, larger font |
| English name | ✓ | Below Arabic, smaller |
| Starting price | ✓ | "من EGP ٣٠" — cheapest variant price |
| Savings badge | ✓ | "وفّر لحد ٢٠٪" — maximum savings percentage |
| Stock indicator | If out of stock | "غير متاح · Unavailable" overlay |
| Add button | ✓ | Full-width, 48px height |
| Yesterday's price | If price changed | "كان EGP ١٣٠ أمس" — small text below price |

### 12.3 Product Card Rules

| Rule | Implementation |
|---|---|
| **Image is tappable** | Tapping the image navigates to product detail. |
| **Add button adds default variant** | The "Add" button adds the cheapest in-stock variant with qty = 1. |
| **No hover states on mobile** | Card interactions are tap-only. No hover reveals. |
| **Savings badge uses accent color** | Amber/orange background. Highest contrast. |
| **Out-of-stock overlay** | Semi-transparent grey overlay on image + badge. |
| **Card height is consistent** | All cards same height. Name truncates with ellipsis if too long. |

---

## 13. Product Detail Page

### 13.1 Page Sections

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ← أرز وحبوب · Rice & Grains                                │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                                                        │ │
│  │              [ Hero Image - 400×400 ]                  │ │
│  │                                                        │ │
│  │  [ • ] [ ○ ] [ ○ ]  ← Image dots (max 5 images)      │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  أرز بسمتي الدوحة                                           │
│  Al Doha Basmati Rice                                       │
│                                                              │
│  أرز بسمتي طويل الحبة فاخر، مثالي للمحشي والكشري          │
│  Premium long-grain basmati rice, perfect for stuffing      │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  اختار الحجم · Choose size                             │ │
│  │  [1kg] [5kg ✓] [25kg]                                 │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  الكمية · Quantity                                     │ │
│  │  [ − ]  ٢  [ + ]                                      │ │
│  │  EGP ١١٠/كيس · EGP 110/bag                           │ │
│  │  من ٥ وحدات: EGP ١٠٠ · 5+ units: EGP 100             │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  أضف للسلة · Add to Cart                    EGP 220   │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  منتجات مشابهة · Similar Products                      │ │
│  │  [Card] [Card] [Card] ← Horizontal scroll             │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 13.2 Product Detail Data Loading

| Data | Source | Cache TTL | Notes |
|---|---|---|---|
| Product info | Medusa → BFF | 5 min | Name, description, category, metadata |
| Variants | Medusa → BFF | 5 min | All variant data + prices |
| Price tiers | GGH (`ggh.price_tier`) | 5 min | Quantity discount tiers |
| Stock levels | Medusa → BFF | 2 min | Per-variant availability |
| Related products | Medusa → BFF | 30 min | Same category, top sellers |
| Yesterday's price | Redis | 24h | Computed from price history |

### 13.3 Product Detail Rules

| Rule | Implementation |
|---|---|
| **SSR for SEO** | Product pages are server-side rendered. Search engines index them. |
| **URL includes product handle** | `/products/al-doha-basmati-rice` — human-readable, bilingual-compatible |
| **One variant pre-selected** | Default to the cheapest in-stock variant. Elder users don't need to choose. |
| **Price updates on selection** | When variant or quantity changes, price updates immediately. No page reload. |
| **Related products are same category** | Show top 4 bestsellers from the same child category. |
| **Breadcrumb navigation** | Home → Category → Sub-category → Product — always visible at top. |

---

## 14. Category Pages

### 14.1 Parent Category Page

Shows child categories as large cards:

```
┌──────────────────────────────────────────────────────────┐
│  ← أرز وحبوب · Rice & Grains                            │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ 🍚           │  │ 🍝           │  │ 🌾           │  │
│  │ أرز أبيض    │  │ مكرونة      │  │ دقيق        │  │
│  │ White Rice   │  │ Pasta        │  │ Flour        │  │
│  │ ٤٢ منتج     │  │ ٢٥ منتج     │  │ ١٨ منتج     │  │
│  │ 42 products  │  │ 25 products  │  │ 18 products  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 14.2 Child Category Page

Shows products in a grid with filters:

```
┌──────────────────────────────────────────────────────────┐
│  ← أرز أبيض · White Rice                                │
│                                                          │
│  ٤٢ منتج · 42 products    [فلتر · Filter] [ترتيب · Sort]│
│                                                          │
│  Active: [الدوحة ✕]                         [مسح · Clear]│
│                                                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                 │
│  │ [img]   │  │ [img]   │  │ [img]   │                 │
│  │ أرز     │  │ أرز     │  │ أرز     │                 │
│  │ الدوحة  │  │ كريستال │  │ العمدة  │                 │
│  │ EGP 125 │  │ EGP 115 │  │ EGP 120 │                 │
│  │ [أضف]   │  │ [أضف]   │  │ [أضف]   │                 │
│  └─────────┘  └─────────┘  └─────────┘                 │
│                                                          │
│  صفحة ١ من ٣ · Page 1 of 3         [← السابق] [التالي →]│
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 15. Deals & Promotions

### 15.1 Deal Types

| Type | Description | Display |
|---|---|---|
| **Flash deal** | 24-hour discount on a specific variant | Countdown timer + savings badge |
| **Category deal** | Discount on all products in a category | Banner on category page |
| **Bundle deal** | Buy X + Y, get Z% off | Shown on both product pages |
| **Free delivery** | Free delivery above threshold | Delivery fee crossed out in cart |

### 15.2 Deal Display Rules

| Rule | Implementation |
|---|---|
| **Deals are honest** | "Original price" must be the actual retail price from the last 7 days. No inflated "original" prices. |
| **Countdown is real** | Flash deal countdown is server-synced. No client-side timers that drift. |
| **Savings are calculated** | Savings percentage = (original − deal) / original × 100. Always rounded down. |
| **No dark patterns** | No fake "only 2 left!" urgency. No auto-adding deal items to cart. |

### 15.3 Deal Data Model (Future)

Deals are managed through Medusa Price Lists with date ranges:

| Field | Description |
|---|---|
| `price_list.id` | Medusa price list ID |
| `price_list.name` | "Flash Deal: Al Doha Rice 25kg" |
| `price_list.starts_at` | Deal start timestamp |
| `price_list.ends_at` | Deal end timestamp |
| `price_list.prices` | Override prices per variant |
| `metadata.deal_type` | "flash", "category", "bundle" |
| `metadata.deal_badge_en` | "Flash Deal 🔥" |
| `metadata.deal_badge_ar` | "عرض سريع 🔥" |

---

## 16. Catalog Management (Admin)

### 16.1 Admin Product List

| Capability | Description |
|---|---|
| List all products | Including drafts and out-of-stock |
| Filter by status | Published / Draft / Deleted |
| Filter by category | Any category |
| Search products | By name (AR/EN), SKU, brand |
| Bulk actions | Publish, unpublish, assign category, update pricing |
| Sort by | Name, price, stock level, last updated |

### 16.2 Admin Product Edit

| Field | Editable? | Validation |
|---|---|---|
| English name (`title`) | ✓ | Required, unique, 3–200 chars |
| Arabic name (`metadata.name_ar`) | ✓ | Required, 3–200 chars |
| English description | ✓ | Optional, max 2000 chars |
| Arabic description (`metadata.description_ar`) | ✓ | Optional, max 2000 chars |
| Category | ✓ | Must be a child category |
| Brand (`metadata.brand`) | ✓ | Free text |
| Status (published/draft) | ✓ | — |
| Images | ✓ | Upload, reorder, delete |
| ERP item code | ✗ | Immutable after creation |
| Variants | ✓ | Add, edit, remove |
| Price tiers | ✓ | Add, edit, remove |
| Stock levels | ✗ | Read-only (synced from ERP) |

### 16.3 Bulk Import

For initial catalog seeding and large updates:

| Format | CSV with columns: |
|---|---|
| Product name (EN) | Required |
| Product name (AR) | Required |
| Category handle | Required |
| Brand | Optional |
| Variant title (EN) | Required |
| Variant title (AR) | Required |
| SKU | Required |
| Weight (kg) | Required |
| Unit | Required (kg, L, pack) |
| Is case pack | true/false |
| Case size | Integer (if case pack) |
| Retail price (EGP) | Required |
| Wholesale price (EGP) | Optional |
| Bulk price (EGP) | Optional |

---

## 17. ERP Sync for Catalog

### 17.1 Sync Flow

```
ERPNext                              GGH (BullMQ Worker)
────────                             ───────────────────

1. Worker fetches items modified since last sync cursor
       │
       ▼
2. For each item:
   ├── Map ERP fields → Medusa product fields
   ├── Upsert product in Medusa
   ├── Upsert variants in Medusa
   ├── Upsert prices in Medusa price lists
   ├── Upsert inventory levels
   └── Log sync result in ggh.erp_sync_log
       │
       ▼
3. Update sync cursor (ggh.erp_sync_cursor)
```

### 17.2 Field Mapping

| ERPNext Field | Medusa Field | Transformation |
|---|---|---|
| `item_code` | `metadata.erp_item_code` | Direct copy |
| `item_name` | `title` | Direct copy (English) |
| `item_group` | `product_category` | Map via `metadata.erp_item_group` |
| `stock_uom` | `metadata.unit` | Map: "Kg" → "kg", "Nos" → "pack", "Litre" → "L" |
| `standard_rate` | Price list entry | Convert EGP → piastres (× 100) |
| `image` | `thumbnail` | Download and re-upload to GGH's S3 |
| `is_stock_item` | Inventory tracking | 1 → track inventory, 0 → don't track |
| `has_variants` | Create variants | If true, create child variants |
| `valuation_rate` | `metadata.cost_amount` | Internal cost (not customer-visible) |

### 17.3 Sync Conflict Resolution

| Conflict | Resolution |
|---|---|
| Product exists in Medusa but not in ERP | Keep in Medusa, flag for admin review |
| Product exists in both, different names | ERP name wins (it's the source of truth) |
| Price mismatch | ERP price wins for base prices. GGH price tiers are preserved. |
| Category mismatch | ERP category wins. GGH admin can reassign later. |
| Arabic name missing from ERP | Preserve GGH's Arabic name. Never overwrite with empty. |

---

## 18. Catalog Caching

### 18.1 Cache Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                       CACHE ARCHITECTURE                         │
│                                                                 │
│  Browser Cache                                                  │
│  │  Product images: immutable, 1 year                          │
│  │  ISR pages: s-maxage=300, stale-while-revalidate=60        │
│  │                                                              │
│  Next.js ISR Cache                                              │
│  │  Product detail pages: revalidate every 5 minutes           │
│  │  Category pages: revalidate every 30 minutes                │
│  │                                                              │
│  Redis API Cache                                                │
│  │  Product list: 5 min TTL                                    │
│  │  Product detail: 5 min TTL                                  │
│  │  Category list: 30 min TTL                                  │
│  │  Search results: 1 min TTL                                  │
│  │  Stock levels: 2 min TTL                                    │
│  │                                                              │
│  Medusa / PostgreSQL                                            │
│     Source of truth                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 18.2 Cache Invalidation Triggers

| Event | What's Invalidated |
|---|---|
| Product updated | Product detail cache, product list cache, category page cache |
| Variant updated | Same as product |
| Price changed | Product detail, product list, cart display |
| Stock changed | Product detail (stock indicator), product list (availability) |
| Category changed | Category list cache, affected product caches |
| Deal started/ended | Product detail, product list, category page |
| Manual invalidation | Admin can flush cache by tag: `products`, `categories`, `all` |

---

## 19. Catalog Performance

### 19.1 Performance Targets

| Metric | Target | Why |
|---|---|---|
| Product list page load | < 2s on 3G | Om Ibrahim's phone on a slow connection |
| Product detail page load | < 1.5s on 3G | SSR + cached data |
| Search results | < 500ms | Instant feedback |
| Image load (thumbnail) | < 300ms | CDN-served, WebP |
| Filter apply | < 300ms | Server-side filtering with pagination |
| Add to cart | < 500ms | Perceived instant |

### 19.2 Performance Strategies

| Strategy | Implementation |
|---|---|
| **Pagination, not infinite scroll** | 20 products per page. Predictable. Cacheable. |
| **Lazy-load images** | Only load images entering viewport |
| **WebP images** | 30% smaller than JPEG |
| **Redis caching** | Product data cached at BFF level |
| **ISR for product pages** | Pre-rendered HTML, revalidated every 5 min |
| **Minimal product list payload** | List returns: id, names, thumbnail, price, stock. Not full detail. |
| **Database indexes** | `ix_product_category`, `ix_product_brand`, `ix_variant_sku` |
| **Connection pooling** | PgBouncer for database connections |

---

## 20. Elder-Friendly Catalog Decisions

### 20.1 Decision Table

| Standard E-commerce | GGH Decision | Why |
|---|---|---|
| Infinite scroll | Paginated (20/page) | Elder users understand "Page 3 of 8". Infinite scroll is disorienting. |
| Dropdown for variants | Card selector | Dropdowns hide options. Cards show everything at a glance. |
| Manual quantity input | +/- stepper buttons | Typing numbers is error-prone. Steppers are visual and tactile. |
| "Add to wishlist" | Not in v1 | Wishlist adds complexity. Reorder and templates cover the need. |
| Product reviews | Not in v1 | Grocery staples don't need reviews. Everyone knows what rice is. |
| Comparison feature | Not in v1 | Per-unit price on every card serves the same purpose. |
| Faceted sidebar filters | Bottom sheet filter | Sidebars don't work on mobile. Bottom sheets are native-feeling. |
| Product zoom | Not needed | Product packaging is recognizable without zoom. |
| Color swatches | Not applicable | Grocery products don't have color variants. |
| Size chart | Weight label | "5kg", "1L" — clear size indicators on every variant. |
| "Customers also bought" | "Similar products" | Same category bestsellers, not behavioral recommendations. |
| Product videos | Not in v1 | Heavy on 3G. Images suffice for grocery. |

### 20.2 Accessibility in Catalog

| Element | Requirement |
|---|---|
| Product cards | `role="article"`, `aria-label` with product name in current locale |
| Variant cards | `role="radio"`, `aria-checked` on selected variant |
| Quantity stepper | `aria-label="زيادة الكمية"` / `aria-label="Increase quantity"` |
| Add to cart button | Announces result: "تم إضافة أرز مصري للسلة · Egyptian Rice added to cart" |
| Out of stock badge | `aria-label="غير متاح"` + `role="status"` |
| Savings badge | `aria-label="وفّر ١٢ بالمية"` — percentage announced |
| Filter toggle | `aria-expanded` on filter button |
| Sort dropdown | `aria-label="ترتيب المنتجات"` |
| Pagination | `aria-label="صفحة ٣ من ٨"` on nav, `aria-current="page"` on active page |

---

## 21. Bilingual & RTL in Catalog

### 21.1 Bilingual Field Strategy

| Context | Primary Language | Fallback |
|---|---|---|
| Product name (AR locale) | Arabic name | English name if Arabic is null |
| Product name (EN locale) | English name | Arabic name if English is null |
| Category name | Both always present | No fallback — both are required |
| Price display | Numeric (locale-agnostic) | — |
| Stock badge | Both languages | "متاح · Available" |
| Variant title | Both always present | "كيس ٥ كيلو · 5kg Bag" |

### 21.2 RTL-Specific Catalog Rules

| Element | RTL Behavior |
|---|---|
| Product grid | Same grid (CSS Grid). Items flow right-to-left in RTL. |
| Variant card selector | Cards flow RTL. First card is on the right. |
| Price text | Numbers are LTR within RTL text. "EGP ١٢٥" is readable in both directions. |
| Savings badge | "وفّر ١٢٪" — text is RTL, percentage is LTR. |
| Breadcrumb | "الرئيسية ← أرز وحبوب ← أرز أبيض" — arrows point left in RTL. |
| Filter panel | Opens from the right edge in RTL (bottom sheet on mobile). |
| Pagination | "← السابق · التالي →" — arrow directions flip in RTL. |
| Product image | Always LTR (images don't flip). |
| Quantity stepper | [ − ] ٢ [ + ] — buttons don't swap. Minus is always minus. |

### 21.3 Arabic Text in Product Names

| Rule | Example |
|---|---|
| No tashkeel in product names | "أرز بسمتي" not "أَرُز بَسْمَتِي" |
| Arabic-Indic numerals in Arabic UI | "٥ كيلو" not "5 كيلو" |
| English brand names transliterated | "الدوحة" for "Al Doha" (use the Arabic brand name, not transliteration) |
| Consistent spelling | Always "أرز" not "ارز". Always "سكر" not "سكّر". |

---

## 22. Catalog Seeding Data

### 22.1 Initial Catalog Size

| Metric | Count |
|---|---|
| Parent categories | 15 |
| Child categories | 45–60 |
| Products | 300–500 |
| Variants | 600–1,000 |
| Brands | 50–80 |
| Price tiers | 1,500–2,500 |

### 22.2 Sample Product — Full Data

```
Product: Al Doha Basmati Rice

  id: prod_01DOHA
  title: Al Doha Basmati Rice
  handle: al-doha-basmati-rice
  status: published
  category: White Rice (child of Rice & Grains)

  metadata:
    name_ar: أرز بسمتي الدوحة
    description_ar: أرز بسمتي طويل الحبة فاخر، مثالي للمحشي والكشري
    brand: Al Doha
    erp_item_code: RICE-BSMT-DOHA
    moq: 1
    unit_label_en: Bag
    unit_label_ar: كيس
    tags: ["staple", "bestseller"]

  Variants:
    1kg Bag:   EGP 30  (retail)  ·  EGP 28  (wholesale)  ·  in stock: 500
    5kg Bag:   EGP 125 (retail)  ·  EGP 110 (wholesale)  ·  in stock: 340
    25kg Sack: EGP 550 (retail)  ·  EGP 500 (wholesale)  ·  in stock: 85

  Price Tiers (5kg Bag):
    Retail:    1–4 units   → EGP 125/unit
    Wholesale: 5–9 units   → EGP 110/unit (12% off)
    Bulk:      10+ units   → EGP 100/unit (20% off)

  Images:
    main:   /products/prod_01DOHA/main.webp
    alt1:   /products/prod_01DOHA/back-label.webp
    thumb:  /products/prod_01DOHA/thumb.webp
```

### 22.3 Sample Products by Category

| Category | Products (5 examples) |
|---|---|
| Rice & Grains | Al Doha Basmati, Crystal White, El Maleka Short Grain, Rizk Egyptian Rice, AbuKass White Rice |
| Oils & Fats | Afia Sunflower, Mazola Corn Oil, Crystal Olive Oil, Tora Cooking Oil, Dina Sunflower |
| Ghee & Butter | Rashidi El Mizan Ghee, Betyl Ghee, Farm Frites Butter, Lurpak Butter, Al Doha Ghee |
| Tea & Coffee | Al-Dewar Tea, Lipton Yellow Label, Abou Auf Tea, Nescafé Classic, Hind Coffee |
| Cleaning | Persil Detergent, Ariel Gel, Fairy Dish Soap, Clorox Bleach, Arab Detergent |
| Sugar | El Amir Sugar, Dakahlia Sugar, El Nile Sugar, Sweetex Diet Sugar, Honeyland Honey |

---

> **Next document:** `11_StateManagement.md` — Client state architecture, server state patterns, caching boundaries, and Zustand + TanStack Query conventions.
