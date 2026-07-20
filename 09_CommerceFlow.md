# 09 — Commerce Flow

> **GGH — Gomla Go Home** — The complete ecommerce workflow from first visit to delivery and returns. Every step, every decision, every edge case. Because Om Ibrahim must complete this flow without help.

---

## Table of Contents

1. [Commerce Flow Philosophy](#1-commerce-flow-philosophy)
2. [End-to-End Journey Map](#2-end-to-end-journey-map)
3. [Phase 1 — Discovery & Browsing](#3-phase-1--discovery--browsing)
4. [Phase 2 — Product Selection](#4-phase-2--product-selection)
5. [Phase 3 — Cart Management](#5-phase-3--cart-management)
6. [Phase 4 — Checkout](#6-phase-4--checkout)
7. [Phase 5 — Payment](#7-phase-5--payment)
8. [Phase 6 — Order Confirmation](#8-phase-6--order-confirmation)
9. [Phase 7 — Fulfillment](#7-phase-7--fulfillment)
10. [Phase 8 — Delivery](#8-phase-8--delivery)
11. [Phase 9 — Post-Delivery](#9-phase-9--post-delivery)
12. [Phase 10 — Returns & Refunds](#10-phase-10--returns--refunds)
13. [Reorder Flow](#11-reorder-flow)
14. [Wholesale Flow](#12-wholesale-flow)
15. [Pricing Engine](#13-pricing-engine)
16. [Inventory & Stock Flow](#14-inventory--stock-flow)
17. [Delivery Slot Logic](#15-delivery-slot-logic)
18. [Notification Flow](#16-notification-flow)
19. [ERP Sync in Commerce Flow](#17-erp-sync-in-commerce-flow)
20. [Edge Cases & Failure Recovery](#18-edge-cases--failure-recovery)
21. [Elder-Friendly Flow Decisions](#19-elder-friendly-flow-decisions)
22. [Flow Metrics & Monitoring](#20-flow-metrics--monitoring)

---

## 1. Commerce Flow Philosophy

| Principle | Rule | Why |
|---|---|---|
| **Zero-assumption flow** | Every step must be completable by someone who has never used a delivery app. | Om Ibrahim's first experience must be her last frustration. |
| **Cart before login** | Users can browse and build a cart without creating an account. Login is only required at checkout. | Don't create friction before commitment. Let the products sell themselves. |
| **One action per screen** | Each screen has one primary action. No competing CTAs. | Cognitive overload is the #1 reason elder users abandon apps. |
| **Always recoverable** | No dead ends. Every error has a clear next step. Every abandoned cart can be resumed. | Om Ibrahim taps the wrong button. She should be one tap from recovery. |
| **Cash is king** | Cash on delivery is the default payment method. Digital payment is available but never pushed. | Egyptian households trust cash. Forcing digital payment loses 60% of the market. |
| **Trust through transparency** | Show yesterday's price, show per-unit cost, show delivery fees before checkout, show weight photos. | The #1 barrier to online grocery in Egypt is trust. Transparency builds trust. |

---

## 2. End-to-End Journey Map

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           GGH COMMERCE JOURNEY                                  │
│                                                                                 │
│  DISCOVER          SELECT          CART          CHECKOUT         CONFIRM       │
│  ─────────         ───────         ────          ────────         ───────       │
│  Landing ──→ Browse ──→ Product ──→ Add to ──→ Delivery ──→ Payment ──→ Order  │
│  page       Cate-    detail     cart        zone +       method    confirmed    │
│             gories                           slot                               │
│             Search                                                               │
│             Deals                                                                │
│                                                                                 │
│  FULFILL           DELIVER         POST-DELIVERY    RETURN                       │
│  ────────          ────────        ─────────────    ──────                       │
│  Picked ──→ Packed ──→ Driver ──→ Delivered ──→ Rate ──→ Reorder               │
│                      assigned    at door        experience                     │
│                                  Photo proof     Support                       │
│                                  Weight photo                                  │
│                                                                                │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Flow Duration Targets

| From → To | Target Duration | Elder-Friendly Target |
|---|---|---|
| Landing → First item in cart | < 60 seconds | < 90 seconds |
| Cart → Checkout complete | < 3 minutes | < 5 minutes |
| Checkout → Order confirmed | < 10 seconds | < 10 seconds |
| Order confirmed → Delivered | Next-day delivery | 1–2 business days |
| Return request → Refund | 3–5 business days | 3–5 business days |

---

## 3. Phase 1 — Discovery & Browsing

### 3.1 Entry Points

```
┌─────────────────────────────────────────────────────────────────────┐
│                        LANDING PAGE                                  │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  جملة لحد البيت                                             │   │
│   │  Wholesale groceries, delivered to your door                │   │
│   │                                                             │   │
│   │  [ أهلاً بكم · Welcome ]                                   │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│   │ 🍚       │  │ 🫒       │  │ 🧈       │  │ ☕       │          │
│   │ أرز      │  │ زيوت     │  │ سمنة     │  │ شاي      │          │
│   │ Rice     │  │ Oils     │  │ Ghee     │  │ Tea      │          │
│   └──────────┘  └──────────┘  └──────────┘  └──────────┘          │
│   (48px+ touch targets, scrollable category grid)                  │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  🔥 عروض النهاردة · Today's Deals                          │   │
│   │  [Product card] [Product card] [Product card]               │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  🔍 ابحث هنا · Search here                                │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Browsing Methods

| Method | Description | Who Uses It Most |
|---|---|---|
| **Category grid** | 15 categories as large icon cards. Tap to see all products in that category. | Om Ibrahim. She thinks "I need rice", taps the rice icon. |
| **Search** | Type in Arabic or English. Instant results as you type. Brand names and generic terms. | Mariam. She knows what she wants and types fast. |
| **Today's deals** | Time-limited wholesale deals with savings badges. Visible on landing page. | Everyone. Deals drive first purchases. |
| **Reorder** | "Order again" button on past orders. One-tap to add all items to cart. | Abou Ahmed. He orders the same things weekly. |
| **Order templates** | Saved templates of recurring purchases. "Monthly basics", "Shop restock". | Abou Ahmed. B2B repeat ordering. |

### 3.3 Category Page

```
┌──────────────────────────────────────────────────┐
│  ← أرز وحبوب · Rice & Grains                    │
│                                                   │
│  ┌────────────────────────────────────────────┐  │
│  │ أرز مصري ٥ كيلو      EGP 275              │  │
│  │ Egyptian Rice 5kg     وفّر ١٢٪             │  │
│  │ [Image]               ↓ EGP 12 from yesterday│
│  │                        [ أضف · Add ]       │  │
│  └────────────────────────────────────────────┘  │
│                                                   │
│  ┌────────────────────────────────────────────┐  │
│  │ أرز بسمتي ٢٥ كيلو    EGP 1,250            │  │
│  │ Basmati Rice 25kg     وفّر ٢٠٪             │  │
│  │ [Image]               ↓ EGP 50 from yesterday│
│  │                        [ أضف · Add ]       │  │
│  └────────────────────────────────────────────┘  │
│                                                   │
│  Sort: [ الأرخص · Cheapest ▼ ]                   │
│                                                   │
└──────────────────────────────────────────────────┘
```

### 3.4 Browsing Rules

| Rule | Implementation |
|---|---|
| **Products are free to browse** | No login required. No registration wall. |
| **Prices visible without login** | Retail prices shown to guests. Wholesale prices shown after login (based on customer group). |
| **Lazy-load product images** | Images load as the user scrolls. No blank spaces. |
| **Max 20 products per page** | Shorter pages = faster load on 3G. Clear pagination ("صفحة ١ من ٣"). |
| **Sort defaults to popularity** | Most-ordered products first. Elder users trust what others buy. |
| **Out-of-stock shown last** | Still visible (with "غير متاح · Unavailable" badge) but sorted to the bottom. Never hidden. |

---

## 4. Phase 2 — Product Selection

### 4.1 Product Detail Page

```
┌──────────────────────────────────────────────────────────────┐
│  ← أرز مصري · Egyptian Rice                                 │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                                                        │ │
│  │              [ Product Image - large ]                 │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  أرز مصري قصير الحبة فاخر                                   │
│  Premium short-grain Egyptian rice                          │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  اختر الحجم · Choose size                              │ │
│  │                                                        │ │
│  │  ┌─────────────┐  ┌─────────────────┐                 │ │
│  │  │ كيس ٥ كيلو  │  │ شيكارة ٢٥ كيلو  │                 │ │
│  │  │ 5kg Bag     │  │ 25kg Sack       │                 │ │
│  │  │ EGP 275     │  │ EGP 1,250       │                 │ │
│  │  │ وفّر ٢٠٪     │  │ وفّر ٢٠٪         │                 │ │
│  │  └─────────────┘  └─────────────────┘                 │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  الكمية · Quantity                                      │ │
│  │                                                        │ │
│  │  [ − ]   ٢   [ + ]                                    │ │
│  │         ↑↑↑↑                                          │ │
│  │   56px touch targets                                   │ │
│  │                                                        │ │
│  │  سعر الوحدة: EGP ١١٠/كيلو · Unit price: EGP 110/kg   │ │
│  │  من ٥ وحدات: EGP ١٠٠/كيلو · 5+ units: EGP 100/kg     │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                                                        │ │
│  │    أضف للسلة · Add to Cart          EGP 550            │ │
│  │    (Full width, 56px height)                            │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 4.2 Variant Selection

Products in GGH have variants (different sizes/packaging). The variant selector must be dead-simple:

| Rule | Implementation |
|---|---|
| **Show all variants as cards** | Not a dropdown. Dropdowns hide information and require extra taps. |
| **Price on each variant card** | No "select to see price". Price is visible before selection. |
| **Savings badge on each** | "وفّر ٢٠٪" in Arabic. The percentage motivates. |
| **Default to smallest variant** | Elder users start small. They can always upgrade to the case pack. |
| **Out-of-stock variants greyed** | Still visible but not selectable. Shows "غير متاح" badge. |
| **One variant selected at a time** | Clear visual highlight on the selected variant. |

### 4.3 Quantity Input

| Rule | Implementation |
|---|---|
| **+/− stepper buttons** | Large (56px) touch targets. No manual number input required. |
| **Minimum order quantity** | Some products have MOQ > 1 (e.g., case packs). Stepper starts at MOQ, never goes below. |
| **Case pack multiples** | If variant is a case pack, quantity must be a multiple of case size. Stepper jumps by case size. |
| **Stock cap** | If user tries to add more than available, cap at available stock and show a message. |
| **Per-unit price update** | As quantity changes, the per-unit price updates to show the applicable pricing tier. |
| **Total price visible** | "EGP 550" on the Add-to-Cart button updates as quantity changes. |

### 4.4 Add to Cart — Technical Flow

```
User taps "Add to Cart"
       │
       ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Validate        │     │  Get or Create   │     │  Add Item to     │
│  ──────────────  │     │  Cart            │     │  Cart            │
│                  │     │                  │     │                  │
│  • Variant exists│────→│  • Guest: create │────→│  • Check stock   │
│  • In stock      │     │    new cart      │     │  • Calculate     │
│  • Qty >= MOQ    │     │  • Logged in:    │     │    tier price    │
│  • Qty <= stock  │     │    find active   │     │  • Check delivery│
│  • Case multiple │     │    cart or create│     │    zone stock    │
│                  │     │                  │     │  • Reserve stock │
└──────────────────┘     └──────────────────┘     └──────────────────┘
                                                          │
                                                          ▼
                                                  ┌──────────────────┐
                                                  │  Return updated  │
                                                  │  cart summary    │
                                                  │                  │
                                                  │  • Item added    │
                                                  │  • Cart total    │
                                                  │  • Savings vs    │
                                                  │    retail        │
                                                  └──────────────────┘
```

---

## 5. Phase 3 — Cart Management

### 5.1 Cart Page

```
┌──────────────────────────────────────────────────────────────┐
│  سلتك · Your Cart (٣ عناصر · 3 items)                       │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ [Image]  أرز مصري ٥ كيلو                              │ │
│  │          Egyptian Rice 5kg                             │ │
│  │          EGP 275 × 2 = EGP 550                         │ │
│  │                                                        │ │
│  │          [ − ]  ٢  [ + ]    [ 🗑 ]                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ [Image]  زيت عباد ١ لتر                               │ │
│  │          Sunflower Oil 1L                              │ │
│  │          EGP 85 × 3 = EGP 255                          │ │
│  │                                                        │ │
│  │          [ − ]  ٣  [ + ]    [ 🗑 ]                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  وفّرت · You saved                                     │ │
│  │  EGP 120 عن سعر التجزئة · vs. retail price            │ │
│  │  ████████████████████  (green savings bar)             │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  الملخص · Summary                                      │ │
│  │                                                        │ │
│  │  المنتجات · Subtotal              EGP 805             │ │
│  │  التوصيل · Delivery                EGP 35              │ │
│  │  ─────────────────────────────────────                  │ │
│  │  المجموع · Total                   EGP 840             │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                                                        │ │
│  │    إتمام الطلب · Checkout                   EGP 840   │ │
│  │    (Full width, 56px, sticky at bottom)                │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 5.2 Cart Rules

| Rule | Implementation |
|---|---|
| **Cart persists across sessions** | Guest cart: stored in cookie. Customer cart: stored in Medusa. Both persist for 7 days minimum. |
| **Real-time price updates** | When user returns to cart, prices are refreshed. Wholesale prices may have changed since last visit. |
| **Stock validation on view** | If an item went out of stock since last visit, show "غير متاح · Out of stock" badge. Item stays in cart but cannot be checked out. |
| **Minimum order value** | EGP 200 (20000 piastres). Below this, checkout button is disabled with message: "الحد الأدنى للطلب ٢٠٠ جنيه · Minimum order EGP 200". |
| **Maximum order value** | EGP 15,000 for retail customers. EGP 50,000 for wholesale verified. Above this, customer must split into multiple orders. |
| **Savings always visible** | Cart always shows total savings vs. retail price. This reinforces the core value proposition. |
| **Delivery fee estimate** | Show delivery fee based on the customer's default zone. Update when zone changes at checkout. |

### 5.3 Quantity Update Flow

```
User taps [ + ] on a cart item
       │
       ▼
  Current qty = 2, new qty = 3
       │
       ▼
  ┌─────────────────────────────────────────┐
  │  Check:                                  │
  │  • Is variant still in stock?            │
  │  • Is new qty ≤ available stock?         │
  │  • Does new qty cross a pricing tier?    │
  │  • Does new qty meet case-pack rules?    │
  └──────────────┬──────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
     All checks OK    Stock insufficient
        │                 │
        ▼                 ▼
  Update cart item    Cap at max stock
  Recalculate price   Show toast:
  Show new total      "٣٤٠ وحدة متاحة فقط ·
                      Only 340 units available"
```

---

## 6. Phase 4 — Checkout

### 6.1 Checkout Steps

GGH checkout has 3 steps. Not 5. Not 7. Three.

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│   Step 1: التوصيل · Delivery    ──→  Step 2: الدفع · Payment   │
│                                                                  │
│          │                            │                          │
│          │    Step 3: تأكيد · Confirm │                          │
│          │              │             │                          │
│          ▼              ▼             ▼                          │
│       ┌──────┐      ┌──────┐     ┌──────┐                      │
│       │  ①   │─────→│  ②   │────→│  ③   │                      │
│       └──────┘      └──────┘     └──────┘                      │
│                                                                  │
│   No account creation step. No "create a password" step.         │
│   Login happens within checkout if needed.                       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 6.2 Step 1 — Delivery

```
┌──────────────────────────────────────────────────────────────┐
│  ① التوصيل · Delivery                                       │
│                                                              │
│  منطقة التوصيل · Delivery Zone                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ ● القاهرة الوسطى · Cairo Central        EGP 35       │ │
│  │   التوصيل بكرة · Delivery tomorrow                    │ │
│  │                                                        │ │
│  │ ○ ضواحي القاهرة · Cairo Suburbs         EGP 50       │ │
│  │   التوصيل بعد بكرة · Delivery day after tomorrow      │ │
│  │                                                        │ │
│  │ ○ الجيزة · Giza                         EGP 45       │ │
│  │   التوصيل بعد بكرة · Delivery day after tomorrow      │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ميعاد التوصيل · Delivery Time                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ ● الصبح ٨ص - ١٢م · Morning 8AM-12PM                 │ │
│  │   باقي ٥ طلبات · 5 slots left                        │ │
│  │                                                        │ │
│  │ ○ بعد العصر ٤م - ٨م · Evening 4PM-8PM               │ │
│  │   باقي ١٢ طلب · 12 slots left                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  العنوان · Address                                           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ ● البيت · Home                                        │ │
│  │   ٥ شارع عباس العقاد، مدينة نصر                        │ │
│  │   5 Abbas El-Akkad St., Nasr City                     │ │
│  │                                                        │ │
│  │ ○ الشغل · Shop                                        │ │
│  │   ١٢ شارع فيصل، الجيزة                                │ │
│  │   12 Faisal St., Giza                                 │ │
│  │                                                        │ │
│  │ + أضف عنوان جديد · Add new address                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  التالي · Next                                [ ② → ] │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**If not logged in, prompt appears here:**

```
┌──────────────────────────────────────────────────────────────┐
│  سجل دخولك عشان تكمل · Log in to continue                   │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  +20 │ 01XXXXXXXXX                                     │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  أرسل الكود · Send Code                                │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  (OTP flow happens in a sheet/overlay. Cart is preserved.)   │
└──────────────────────────────────────────────────────────────┘
```

### 6.3 Step 2 — Payment

```
┌──────────────────────────────────────────────────────────────┐
│  ② الدفع · Payment                                          │
│                                                              │
│  طريقة الدفع · Payment Method                                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ ● كاش عند الاستلام · Cash on Delivery        DEFAULT  │ │
│  │   ادفع لما يوصلك · Pay when delivered                 │ │
│  │                                                        │ │
│  │ ○ فودافون كاش · Vodafone Cash                         │ │
│  │                                                        │ │
│  │ ○ فوري · Fawry                                         │ │
│  │                                                        │ │
│  │ ○ إنستاباي · InstaPay                                  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ملخص الطلب · Order Summary                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  المنتجات · Subtotal              EGP 805             │ │
│  │  التوصيل · Delivery                EGP 35              │ │
│  │  ─────────────────────────────────────                  │ │
│  │  المجموع · Total                   EGP 840             │ │
│  │                                                        │ │
│  │  وفّرت · You saved                 EGP 120             │ │
│  │  (vs. retail price)                                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  التالي · Next                                [ ③ → ] │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 6.4 Step 3 — Confirm

```
┌──────────────────────────────────────────────────────────────┐
│  ③ تأكيد الطلب · Confirm Order                              │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  التوصيل · Delivery                                    │ │
│  │  القاهرة الوسطى · Cairo Central                       │ │
│  │  بكرة الصبح ٨ص - ١٢م · Tomorrow morning 8AM-12PM    │ │
│  │  ٥ شارع عباس العقاد · 5 Abbas El-Akkad St.          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  الدفع · Payment                                       │ │
│  │  كاش عند الاستلام · Cash on Delivery                  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  الطلبات (٣) · Items (3)                               │ │
│  │  أرز مصري ٥ كيلو × 2                       EGP 550   │ │
│  │  زيت عباد ١ لتر × 3                         EGP 255  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  المجموع · Total                         EGP 840      │ │
│  │  وفّرت · You saved                       EGP 120      │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                                                        │ │
│  │  تأكيد الطلب · Place Order                  EGP 840   │ │
│  │  (Full width, 56px, green, prominent)                  │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 6.5 Checkout Validation Rules

| Check | When | Error Message |
|---|---|---|
| Minimum order value | Step 3 | "الحد الأدنى ٢٠٠ جنيه · Minimum order EGP 200" |
| All items in stock | Step 3 | "منتج غير متاح · An item is unavailable" (highlight which) |
| Delivery zone selected | Step 3 | "اختار منطقة التوصيل · Choose delivery zone" |
| Delivery slot selected | Step 3 | "اختار ميعاد التوصيل · Choose delivery time" |
| Address selected | Step 3 | "اختار العنوان · Choose delivery address" |
| Payment method selected | Step 3 | "اختار طريقة الدفع · Choose payment method" |
| Customer authenticated | Step 2 | "سجل دخولك · Log in to continue" |
| Delivery slot not full | Step 3 | "الميعاد ده مش متاح · This slot is no longer available" |

---

## 7. Phase 5 — Payment

### 7.1 Payment Methods

| Method | Code | Type | Default | Who Uses It |
|---|---|---|---|---|
| Cash on Delivery | `cash_on_delivery` | Offline | ✓ Default | Om Ibrahim. 80% of orders. |
| Vodafone Cash | `vodafone_cash` | Digital wallet | ✗ | Mariam. Common in Egypt. |
| Fawry | `fawry` | Payment gateway | ✗ | Both. Cash payment at Fawry kiosks. |
| InstaPay | `instapay` | Bank transfer | ✗ | Mariam. Instant bank-to-bank. |
| Paymob Card | `paymob_card` | Credit/debit card | ✗ | Mariam. Visa/Mastercard. |

### 7.2 Cash on Delivery Flow

```
Customer selects COD
       │
       ▼
No payment collected at checkout
       │
       ▼
Order created with payment_status = "awaiting"
       │
       ▼
Driver arrives at door
       │
       ▼
Customer pays driver in cash
       │
       ▼
Driver confirms payment received
       │
       ▼
Order payment_status → "captured"
Delivery proof photo taken
```

### 7.3 Digital Payment Flow

```
Customer selects digital payment method
       │
       ▼
BFF creates payment session via Medusa
       │
       ▼
Redirect to payment provider (Paymob, Fawry, etc.)
       │
       ├── Payment succeeds → Webhook received → payment_status = "captured"
       │
       ├── Payment fails → Return to checkout with error message
       │
       └── Payment timeout → Order payment_status = "awaiting" (revert to COD option)
```

### 7.4 Payment Rules

| Rule | Implementation |
|---|---|
| **COD is always available** | Every zone, every order value. No restriction. |
| **Digital payment optional** | Shown as alternatives. Never the only option. |
| **Payment before fulfillment** | Digital payments must be captured before the warehouse picks the order. COD orders proceed without payment capture. |
| **Payment timeout** | If digital payment is not completed within 30 minutes, the order reverts to COD or is cancelled (user's choice). |
| **No partial payments** | Full amount only. No split payments in v1. |
| **Currency** | Egyptian Pound (EGP) only. No multi-currency. |

---

## 8. Phase 6 — Order Confirmation

### 8.1 Confirmation Screen

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│              ✅ تم تأكيد طلبك!                               │
│              Your order is confirmed!                        │
│                                                              │
│              رقم الطلب · Order #1024                         │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  التوصيل · Delivery                                    │ │
│  │  بكرة الصبح ٨ص - ١٢م                                  │ │
│  │  Tomorrow morning, 8 AM - 12 PM                       │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  المجموع · Total                         EGP 840      │ │
│  │  الدفع · Payment: كاش عند الاستلام · Cash on Delivery │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  تابع طلبك · Track your order                          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  تابع التسوق · Continue shopping                       │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 8.2 Post-Confirmation Actions

| Action | Timing | Channel |
|---|---|---|
| SMS confirmation | Immediately | SMS to registered phone |
| WhatsApp confirmation | Immediately (if opted in) | WhatsApp |
| Order pushed to ERP | Within 1 minute | BullMQ job |
| Inventory reservation | Immediately | Medusa reservation API |
| Delivery slot counter increment | Immediately | `ggh.delivery_slot.current_orders_count += 1` |

### 8.3 Order Confirmation Data

The order object created in Medusa:

| Field | Value | Notes |
|---|---|---|
| `id` | `ord_01ABC` | Medusa auto-generated |
| `display_id` | `1024` | Human-readable order number |
| `customer_id` | `cus_01XYZ` | From session |
| `status` | `pending` | Initial status |
| `fulfillment_status` | `not_fulfilled` | No shipping yet |
| `payment_status` | `awaiting` (COD) or `captured` (digital) | Based on payment method |
| `metadata.delivery_slot_id` | `slot_01MORNING` | From checkout |
| `metadata.delivery_zone_id` | `zone_01CAIRO` | From checkout |
| `metadata.savings_total` | `12000` (piastres) | Total savings vs. retail |

---

## 9. Phase 7 — Fulfillment

### 9.1 Order Status Machine

```
                    ┌──────────┐
                    │ pending  │  ← Order just created
                    └────┬─────┘
                         │
                    Admin confirms
                    or ERP validates
                         │
                    ┌────▼─────┐
              ┌────→│confirmed │←───┐
              │     └────┬─────┘    │
              │          │          │
              │    Warehouse picks  │
              │          │          │
              │     ┌────▼─────┐   │
              │     │preparing │   │
              │     └────┬─────┘   │
              │          │          │
              │     Packed & weighed│
              │          │          │
              │     ┌────▼────────┐│
              │     │ready_for_   ││
              │     │pickup       ││
              │     └────┬────────┘│
              │          │         │
              │    Driver assigned │
              │          │         │
              │     ┌────▼──────┐ │
              │     │out_for_   │ │
              │     │delivery   │ │
              │     └────┬──────┘ │
              │          │        │
              │     Delivered     │
              │          │        │
              │     ┌────▼──────┐ │
              │     │delivered  │ │
              │     └───────────┘ │
              │                    │
              │    Cancel at any   │
              │    point before    │
              │    delivery:       │
              │                    │
              │     ┌───────────┐  │
              └─────│cancelled  │  │
                    └───────────┘  │
                                   │
                    After delivery: │
                                   │
                    ┌───────────┐   │
                    │ returned  │───┘
                    └───────────┘
```

### 9.2 Status Descriptions

| Status | Label AR | Label EN | Who Triggers | Description |
|---|---|---|---|---|
| `pending` | تم تأكيد الطلب | Order Placed | System (auto) | Order received, awaiting confirmation |
| `confirmed` | تم التأكيد | Confirmed | Admin or ERP | Stock verified, order will be fulfilled |
| `preparing` | جاري التحضير | Being Prepared | Warehouse | Items being picked from shelves |
| `ready_for_pickup` | جاهز للتوصيل | Ready for Delivery | Warehouse | Packed, weighed, photo taken, awaiting driver |
| `out_for_delivery` | في الطريق | On the Way | Driver app | Driver has picked up the order |
| `delivered` | تم التوصيل | Delivered | Driver app | Items delivered to customer |
| `cancelled` | تم الإلغاء | Cancelled | Customer or Admin | Order cancelled before delivery |
| `returned` | تم الاسترجاع | Returned | Customer or Admin | Items returned after delivery |

### 9.3 Warehouse Fulfillment Flow

```
Order status = "confirmed"
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  WAREHOUSE PICK LIST                                         │
│                                                              │
│  Order #1024                                                 │
│  Zone: Cairo Central · Slot: Morning 8AM-12PM               │
│                                                              │
│  □ أرز مصري ٥ كيلو × 2                                      │
│  □ زيت عباد ١ لتر × 3                                       │
│  □ سكر ١ كيلو × 5                                           │
│                                                              │
│  Total items: 3 lines, 10 units                              │
│  Total weight: ~23 kg                                        │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
  Picker collects items
       │
       ▼
  Packer verifies items against order
       │
       ▼
  Packer weighs the order
       │
       ▼
  Packer takes weight photo (items on scale)
       │
       ▼
  Upload photo to ggh.delivery_proof.weight_photo_url
       │
       ▼
  Update order status → "ready_for_pickup"
       │
       ▼
  Assign to delivery slot's driver roster
```

### 9.4 Stock Reservation Flow

```
User adds item to cart
       │
       ▼
Medusa creates inventory reservation
  reserved_quantity += item quantity
  available_quantity = stocked - reserved
       │
       ▼
If checkout completes:
  Reservation becomes a fulfillment
  reserved_quantity -= item quantity
  stocked_quantity -= item quantity (stock leaves warehouse)

If cart is abandoned (7+ days inactive):
  Reservation is released
  reserved_quantity -= item quantity
  Stock becomes available again
```

---

## 10. Phase 8 — Delivery

### 10.1 Driver Flow

```
Driver logs into driver app (phone OTP)
       │
       ▼
Driver sees today's delivery schedule
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  DRIVER DASHBOARD                                            │
│                                                              │
│  بكرة · Tomorrow, Sunday Jan 16                              │
│  Slot: 8AM - 12PM · الصبح                                   │
│  Zone: Cairo Central · القاهرة الوسطى                       │
│                                                              │
│  Orders: 5                                                   │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  1. Order #1024 · إبراهيم محمد                         │ │
│  │     5 Abbas El-Akkad, Nasr City                        │ │
│  │     3 items · ~23 kg · EGP 840 (COD)                   │ │
│  │     ☎️ Call  📸 Photo  ✓ Delivered                     │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  2. Order #1025 · أحمد علي                             │ │
│  │     12 Tahrir St., Zamalek                             │ │
│  │     2 items · ~8 kg · EGP 320 (COD)                    │ │
│  │     ☎️ Call  📸 Photo  ✓ Delivered                     │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 10.2 Delivery Steps

| Step | Driver Action | System Action | Customer Sees |
|---|---|---|---|
| 1 | Accept delivery roster | Update order → `out_for_delivery` | "في الطريق · On the way" + SMS |
| 2 | Drive to location | — | — |
| 3 | Call customer on arrival | — | Phone rings (Om Ibrahim needs a call, not a notification) |
| 4 | Hand items to customer | — | — |
| 5 | Collect cash (if COD) | — | — |
| 6 | Take delivery photo | Upload to `ggh.delivery_proof` | Photo available in order detail |
| 7 | Mark as delivered | Update order → `delivered` | "تم التوصيل · Delivered" + SMS |

### 10.3 Delivery Proof

Every delivery must have photographic proof:

| Proof Type | When | Stored In | Visible To |
|---|---|---|---|
| Weight photo | Before leaving warehouse | `ggh.delivery_proof.weight_photo_url` | Customer (order detail page) |
| Delivery photo | At customer's door | `ggh.delivery_proof.delivery_photo_url` | Customer (order detail page) |
| Actual weight | During packing | `ggh.delivery_proof.actual_weight_kg` | Customer (order detail page) |
| Received by | At delivery | `ggh.delivery_proof.delivered_to` | Admin (dispute resolution) |

### 10.4 Delivery Call Rule

**The driver MUST call the customer upon arrival.** This is non-negotiable.

| Scenario | Action |
|---|---|
| Customer answers | Confirm identity. Hand over items. Take photo. |
| Customer doesn't answer (1st call) | Wait 3 minutes. Call again. |
| Customer doesn't answer (2nd call) | Wait 3 minutes. Call a 3rd time. |
| Customer doesn't answer (3rd call) | Mark as "customer unavailable". Items return to warehouse. Customer notified via SMS. |
| Customer asks to leave at door | Take photo of items at door. Note in `driver_notes`. |

---

## 11. Phase 9 — Post-Delivery

### 11.1 Post-Delivery Customer Experience

```
┌──────────────────────────────────────────────────────────────┐
│  Order #1024 · تم التوصيل · Delivered                       │
│                                                              │
│  بكرة ١٠:٣٠ ص · Delivered at 10:30 AM                      │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  📸 صورة التوصيل · Delivery Photo                     │ │
│  │  [ Photo thumbnail - tap to expand ]                   │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  ⚖️ الوزن · Weight                                    │ │
│  │  المطلوب: ٢٣ كجم · Ordered: 23 kg                     │ │
│  │  الفعلي: ٢٣٫٢ كجم · Actual: 23.2 kg  ✓               │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  إعادة الطلب · Reorder                    [ تاني · Again ]│
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  عندك مشكلة؟ · Have an issue?                          │ │
│  │  [ كلمنا · Contact Support ]                           │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 11.2 Post-Delivery Notifications

| Event | Channel | Message AR | Message EN |
|---|---|---|---|
| Order delivered | SMS + WhatsApp | "تم توصيل طلبك #١٠٢٤ · شكراً ليك!" | "Order #1024 delivered. Thank you!" |
| Delivery photo available | Push (if enabled) | "صورة التوصيل متاحة" | "Delivery photo available" |
| Review prompt | Push (24h later) | "إيه رأيك في الطلب؟" | "How was your order?" |

---

## 12. Phase 10 — Returns & Refunds

### 12.1 Return Policy

| Condition | Return Window | Refund Method |
|---|---|---|
| Wrong item delivered | 48 hours | Full refund + free re-delivery |
| Damaged item | 48 hours | Full refund or replacement |
| Short weight (verified by photo) | 48 hours | Partial refund for missing weight |
| Quality issue (taste, expiry) | 24 hours | Full refund or replacement |
| Changed mind | Not accepted for grocery items | — |
| Non-grocery items (cleaning, paper) | 7 days | Full refund if unopened |

### 12.2 Return Request Flow

```
Customer taps "Have an issue?"
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│  بلّغ عن مشكلة · Report an Issue                             │
│                                                              │
│  الطلب · Order #1024                                        │
│                                                              │
│  اختار المشكلة · What's wrong?                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ ● صنف غلط · Wrong item                                │ │
│  │ ○ صنف تالف · Damaged item                             │ │
│  │ ○ وزن أقل · Short weight                              │ │
│  │ ○ مشكلة تانية · Other issue                           │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  أصنف الغلط · Which item?                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ □ أرز مصري ٥ كيلو × 2                                 │ │
│  │ ■ زيت عباد ١ لتر × 3  ← checked                      │ │
│  │ □ سكر ١ كيلو × 5                                      │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  صوّر المشكلة · Take a photo (optional)                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  [ 📸 Take Photo ]                                     │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  إرسال البلاغ · Submit Report                          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 12.3 Return Processing Flow

```
Customer submits return request
       │
       ▼
Create return record (status = "requested")
       │
       ▼
Send confirmation to customer (SMS)
       │
       ▼
┌────────────────────────────────────────────────────────────┐
│  ADMIN REVIEW                                               │
│                                                             │
│  Return #RET-001 for Order #1024                           │
│  Customer: Ibrahim Mohamed                                  │
│  Issue: Wrong item - Sunflower Oil 1L × 3                  │
│  Photo: [attached]                                          │
│                                                             │
│  [ Approve ]  [ Reject ]  [ Contact Customer ]             │
│                                                             │
└────────────────────────────────────────────────────────────┘
       │
       ├── Admin Approves
       │       │
       │       ▼
       │  Return status → "approved"
       │       │
       │       ├── Option A: Refund
       │       │     Initiate refund via payment provider
       │       │     For COD: arrange cash refund via driver
       │       │     Refund status → "processing"
       │       │     Refund completed → "refunded"
       │       │
       │       └── Option B: Replacement
       │             Create new order with replacement items
       │             Schedule delivery in next available slot
       │             Return status → "replacement_scheduled"
       │
       └── Admin Rejects
               │
               ▼
          Return status → "rejected"
          Customer notified with reason
          Customer can escalate via support chat
```

### 12.4 Refund Methods

| Original Payment | Refund Method | Timeline |
|---|---|---|
| Cash on Delivery | Driver delivers cash at next delivery | 2–3 business days |
| Vodafone Cash | Refund to same wallet | 1–2 business days |
| Fawry | Refund to Fawry account | 1–2 business days |
| InstaPay | Refund to same bank account | 1–2 business days |
| Paymob Card | Refund to same card | 3–5 business days |

### 12.5 Return Status Machine

```
requested ──→ approved ──→ processing ──→ refunded
    │             │
    │             └──→ replacement_scheduled ──→ replacement_delivered
    │
    └──→ rejected ──→ (escalation via support)
```

---

## 13. Reorder Flow

### 13.1 One-Tap Reorder

The reorder flow is critical for GGH. Wholesale customers buy the same items repeatedly.

```
Customer views order history
       │
       ▼
Customer taps "إعادة الطلب · Reorder" on a past order
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  إعادة الطلب · Reorder Order #1024                          │
│                                                              │
│  هنضيف الأصنف دي لسلتك · We'll add these to your cart      │
│                                                              │
│  □ أرز مصري ٥ كيلو × 2              ✓ متاح · In stock     │
│  □ زيت عباد ١ لتر × 3               ✓ متاح · In stock     │
│  ☒ سكر ١ كيلو × 5                   ✗ غير متاح · Out of stock│
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  أضف للسلة · Add to Cart (2 items)                     │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 13.2 Reorder Rules

| Rule | Implementation |
|---|---|
| **Check current stock** | Out-of-stock items are pre-unchecked. User can still see them but they're not added. |
| **Use current prices** | Prices are not preserved from the original order. Current pricing tiers apply. |
| **Quantity from original** | Default quantities match the original order. User can adjust. |
| **Merge with existing cart** | If cart has items, reorder items are added. If same variant exists, quantities are summed. |
| **Wholesale tier applied** | If user now has wholesale status, they get wholesale pricing on the reorder. |

### 13.3 Order Templates

For recurring purchases (Abou Ahmed's weekly shop restock):

```
┌──────────────────────────────────────────────────────────────┐
│  قوالب الطلبات · Order Templates                             │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  📦 احتياجات الأسبوع · Weekly Essentials               │ │
│  │  ٥ أصناف · 5 items                                   │ │
│  │  آخر طلب: ٨ يناير · Last ordered: Jan 8              │ │
│  │  [ اطلب تاني · Reorder ]  [ عدّل · Edit ]            │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  🏪 تعبئة البقالة · Shop Restock                       │ │
│  │  ١٢ صنف · 12 items                                   │ │
│  │  آخر طلب: ٥ يناير · Last ordered: Jan 5              │ │
│  │  [ اطلب تاني · Reorder ]  [ عدّل · Edit ]            │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  + قالب جديد · New Template                                  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 14. Wholesale Flow

### 14.1 Wholesale Account Application

```
Customer taps "حساب جملة · Wholesale Account"
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│  申请 حساب جملة · Apply for Wholesale                         │
│                                                              │
│  اسم المحل/الشركة · Business Name                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  بقالة أبو أحمد                                       │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  السجل التجاري · Commercial Register (photo)                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  [ 📸 Upload Photo ]                                   │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  البطاقة الضريبية · Tax Card (photo)                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  [ 📸 Upload Photo ]                                   │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  إرسال الطلب · Submit Application                     │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 14.2 Wholesale Verification Flow

```
Customer submits application
       │
       ▼
Create ggh.wholesale_account (verification_status = "pending")
Move customer to "wholesale-pending" group
       │
       ▼
Admin reviews documents
       │
       ├── Approved
       │     verification_status → "verified"
       │     Move customer to "wholesale-verified" group
       │     Customer now sees wholesale prices
       │     SMS: "تم تفعيل حساب الجملة · Wholesale account activated"
       │
       └── Rejected
             verification_status → "rejected"
             Customer stays in "retail" group
             SMS: "للأسف مرفوض · Application not approved" + reason

Later (manual upgrade):
  Admin can upgrade to "wholesale-enterprise"
  Set credit_limit_amount and payment_terms_days
  Customer gets custom pricing and net-30 terms
```

### 14.3 Wholesale-Specific Features

| Feature | Retail | Wholesale |
|---|---|---|
| Pricing | Retail price list only | Wholesale + Bulk price lists |
| Minimum order | EGP 200 | EGP 500 |
| Maximum order | EGP 15,000 | EGP 50,000 |
| Delivery fee | Standard zone rates | Free delivery above EGP 1,500 |
| Payment terms | COD only | Net-30 credit (if approved) |
| Order templates | Up to 3 | Unlimited |
| Delivery slots | Standard slots | Priority slots (first available) |
| Support | Chat | Dedicated WhatsApp number |

---

## 15. Pricing Engine

### 15.1 Price Calculation Flow

```
Customer views a product variant
       │
       ▼
BFF fetches variant price from Medusa
       │
       ▼
BFF fetches price tiers from ggh.price_tier
       │
       ▼
BFF checks customer group (retail, wholesale-verified, etc.)
       │
       ▼
Filter tiers by customer group access
       │
       ▼
Calculate applicable tier based on quantity
       │
       ▼
Return price with tier breakdown
```

### 15.2 Tier Price Example

Basmati Rice 5kg, for a wholesale-verified customer buying 7 units:

| Tier | Min Qty | Max Qty | Unit Price | Total | Savings vs. Retail |
|---|---|---|---|---|---|
| Retail | 1 | 4 | EGP 125 | — | — |
| **Wholesale ← applies** | **5** | **9** | **EGP 110** | **EGP 770** | **12% (EGP 105 saved)** |
| Bulk | 10 | ∞ | EGP 100 | — | 20% |

The customer sees:

```
  سعر الوحدة: EGP 110/كيس · Unit price: EGP 110/bag
  وفّرت ١٢٪ عن سعر التجزئة · Save 12% vs. retail
  من ١٠ وحدات: EGP 100/كيس · 10+ units: EGP 100/bag
```

### 15.3 Price Display Rules

| Rule | Implementation |
|---|---|
| **Always show per-unit price** | "EGP 110/كيس" not just "EGP 110". Unit context matters. |
| **Show next tier hint** | "من ١٠ وحدات: EGP 100 · 10+ units: EGP 100" — motivates larger orders. |
| **Show savings percentage** | "وفّرت ١٢٪ · Save 12%" — the core value proposition. |
| **Show yesterday's price** | If price changed, show: "كان EGP 115 أمس · Was EGP 115 yesterday" |
| **Never hide delivery fees** | Delivery fee shown on product card if zone is known. |
| **All amounts in EGP** | Piastres for internal calculations only. Display in EGP. |

---

## 16. Inventory & Stock Flow

### 16.1 Stock Data Sources

```
┌──────────────┐                    ┌──────────────┐
│   ERPNext    │ ── Sync every ──→  │   Medusa     │
│   (Source of │    5 minutes       │   (Operational│
│    Truth)    │                    │    Copy)      │
└──────────────┘                    └──────┬───────┘
                                           │
                                           ▼
                                    ┌──────────────┐
                                    │   BFF Cache  │
                                    │   (Redis,    │
                                    │    2 min TTL)│
                                    └──────────────┘
```

### 16.2 Stock States

| State | Condition | Display |
|---|---|---|
| **In stock** | `available_quantity >= min_order_qty` | "متاح · Available" with green badge |
| **Low stock** | `available_quantity < 10` | "آخر قطع · Few left" with amber badge |
| **Out of stock** | `available_quantity = 0` | "غير متاح · Unavailable" with grey badge |
| **Backorder** | `allow_backorder = true` and `available_quantity = 0` | "طلب مسبق · Pre-order" with blue badge |

### 16.3 Reservation Lifecycle

```
Cart created → No reservation yet
       │
       ▼
Item added to cart → Reserve stock (reserved_quantity += qty)
       │
       ▼
Quantity updated in cart → Adjust reservation
       │
       ├── Increase: Reserve more (if available)
       └── Decrease: Release some reserved stock
       │
       ▼
Cart abandoned 7+ days → Release all reservations
       │
       ▼
Checkout complete → Reservation converts to fulfillment
       │
       ▼
Order cancelled → Release reservation
```

### 16.4 Stock Validation Checkpoints

| Checkpoint | What's Checked | If Fails |
|---|---|---|
| Add to cart | Stock available ≥ requested quantity | Cap at available. Show toast. |
| Cart view | All items still in stock | Mark out-of-stock items. Prevent checkout. |
| Checkout step 3 | All items in stock, quantities valid | Block checkout. Show which item failed. |
| Order creation | Final stock check before order | Cancel order. Notify customer. Refund if paid. |

---

## 17. Delivery Slot Logic

### 17.1 Slot Availability Calculation

```
Available slots for a zone on a date:
  1. Fetch all active slots for zone (from ggh.delivery_slot)
  2. For each slot: check current_orders_count < max_orders_count
  3. Filter: slot date must be ≥ tomorrow (no same-day delivery in v1)
  4. Filter: slot must not be in the past
  5. Sort by date, then start_time
  6. Return available slots with remaining capacity
```

### 17.2 Slot Booking Rules

| Rule | Implementation |
|---|---|
| **No same-day delivery** | Earliest delivery is tomorrow. Gives warehouse time to pick and pack. |
| **Max 20 orders per slot** | Default capacity. Configurable per slot. |
| **Slot booking is atomic** | `current_orders_count` incremented inside a transaction. Rollback if order fails. |
| **Slot released on cancel** | If order is cancelled, slot counter is decremented. |
| **Slots visible for next 7 days** | Customer can book up to 7 days ahead. Not further (pricing uncertainty). |
| **Friday delivery limited** | Friday is a rest day in Egypt. Limited morning slots only. |
| **No delivery on national holidays** | Configurable holiday calendar. Slots hidden on holidays. |

### 17.3 Delivery Fee Calculation

```
base_fee = delivery_zone.base_rate_amount

if cart.total >= delivery_zone.free_delivery_above_amount:
    delivery_fee = 0
    label = "مجاناً · Free"
else:
    delivery_fee = base_fee
    label = format_egp(base_fee)

    # Show how much more for free delivery
    remaining = delivery_zone.free_delivery_above_amount - cart.total
    if remaining > 0:
        hint = "لو طلبت {remaining} أكتر التوصيل مجاناً"
              "Add {remaining} more for free delivery"
```

---

## 18. Notification Flow

### 18.1 Notification Events

| Event | SMS | WhatsApp | Push | When |
|---|---|---|---|---|
| OTP code | ✓ | ✓ | — | Auth flow |
| Order confirmed | ✓ | ✓ | ✓ | Status → confirmed |
| Order preparing | — | ✓ | ✓ | Status → preparing |
| Out for delivery | ✓ | ✓ | ✓ | Status → out_for_delivery |
| Delivered | ✓ | ✓ | ✓ | Status → delivered |
| Delivery photo ready | — | — | ✓ | Photo uploaded |
| Return approved | ✓ | — | ✓ | Return → approved |
| Refund processed | ✓ | — | ✓ | Refund → completed |
| Price drop on wishlist | — | — | ✓ | Price decreased |
| Deal of the day | — | ✓ | ✓ | Marketing (opt-in) |

### 18.2 Notification Preferences

Default notification preferences (from `ggh.notification_preference`):

| Channel | Order Updates | Marketing |
|---|---|---|
| SMS | ON by default | OFF by default |
| WhatsApp | ON by default | OFF by default |
| Push | ON by default | OFF by default |

Customers can change these in profile settings.

### 18.3 SMS Template — Order Status

```
Order confirmed:
  "GGH: طلبك #١٠٢٤ اتأكد. التوصيل بكرة الصبح. · Order #1024 confirmed. Delivery tomorrow morning."

Out for delivery:
  "GGH: طلبك #١٠٢٤ في الطريق! السواق هيكلمك. · Order #1024 on the way! Driver will call you."

Delivered:
  "GGH: طلبك #١٠٢٤ وصل. شكراً ليك! · Order #1024 delivered. Thank you!"
```

---

## 19. ERP Sync in Commerce Flow

### 19.1 When ERP Sync Happens

| Commerce Event | Sync Direction | What Syncs | When |
|---|---|---|---|
| Order placed | GGH → ERP | Order header + line items → Sales Order | Within 1 minute (BullMQ) |
| Order status changed | GGH → ERP | Status update → Sales Order status | Within 1 minute |
| Delivery completed | GGH → ERP | Delivery proof → Delivery Note | Within 5 minutes |
| Return requested | GGH → ERP | Return data → Sales Return | Within 5 minutes |
| Product data refresh | ERP → GGH | Item Master → Product catalog | Every 5 minutes |
| Stock level refresh | ERP → GGH | Stock Ledger → Inventory Level | Every 5 minutes |
| Price update | ERP → GGH | Item Price → Price List + Price Tier | Every 5 minutes |

### 19.2 Order Push to ERP

```
Order created in Medusa
       │
       ▼
BullMQ job: erp-push-order
       │
       ▼
BFF calls ERPNext API: POST /api/resource/Sales Order
  {
    "customer": "GGH-{customer_id}",
    "delivery_date": "2025-01-16",
    "items": [
      { "item_code": "RICE-EG-5KG", "qty": 2, "rate": 275.00 },
      { "item_code": "OIL-SF-1L", "qty": 3, "rate": 85.00 }
    ],
    "custom_delivery_zone": "Cairo Central",
    "custom_delivery_slot": "Morning 8AM-12PM"
  }
       │
       ├── Success → Store ERP SO ID in order metadata
       │             Log success in ggh.erp_sync_log
       │
       └── Failure → Retry (3 attempts, exponential backoff)
                     Log error in ggh.erp_sync_log
                     Alert admin if all retries fail
```

### 19.3 Fallback When ERP Is Down

| Scenario | Behavior |
|---|---|
| ERP is down when order placed | Order still created in Medusa. ERP push queued. Retried when ERP recovers. |
| Stock data stale (ERP sync delayed) | Show last-known stock with "Prices may vary" notice. Accept order. Reconcile later. |
| Price mismatch between ERP and Medusa | Medusa price wins (customer-facing). Difference flagged for manual review. |
| ERP completely unavailable for 1+ hour | Admin dashboard shows warning. Products still orderable. Fulfillment uses Medusa stock data. |

---

## 20. Edge Cases & Failure Recovery

### 20.1 Cart Edge Cases

| Case | Solution |
|---|---|
| Item goes out of stock while in cart | Mark as unavailable. Prevent checkout. Suggest alternatives. |
| Price changes between add-to-cart and checkout | Use current price. Show "Price updated" notice. Never charge old price silently. |
| Cart cookie lost (browser cleared) | For guests: cart is gone. For logged-in users: cart persists server-side. |
| Multiple tabs, same cart | Last write wins. Optimistic concurrency. No locking. |
| Negative quantity after stock cap | Hard floor at 0. Remove item from cart if quantity reaches 0. |

### 20.2 Checkout Edge Cases

| Case | Solution |
|---|---|
| Delivery slot fills during checkout | "This slot is no longer available. Choose another." Return to Step 1. |
| Payment fails after order creation | Order status → `pending`. Payment status → `awaiting`. Customer can retry or switch to COD. |
| Double-tap on "Place Order" | Idempotency key prevents duplicate orders. Second tap returns existing order. |
| Session expires mid-checkout | Re-auth prompt. Cart preserved. Resume from same step. |
| Minimum order value not met at checkout | "Add EGP {remaining} more to place your order." Block checkout. |

### 20.3 Delivery Edge Cases

| Case | Solution |
|---|---|
| Customer not home after 3 calls | Items return to warehouse. Customer notified. Order status → `delivery_failed`. |
| Wrong address provided | Driver contacts support. Support contacts customer. Address corrected if possible. |
| Items damaged in transit | Customer refuses delivery. Return initiated automatically. Full refund. |
| Payment dispute (COD) | Driver reports. Admin reviews delivery photo. Resolves based on evidence. |
| Driver gets lost | Driver app has GPS navigation. Customer can share live location. |

### 20.4 Recovery Principles

| Principle | Rule |
|---|---|
| **Never lose a cart** | Cart data is persisted server-side. Cookie loss doesn't mean cart loss. |
| **Never charge twice** | Idempotency keys on all payment operations. |
| **Never silent-fail** | Every error shows a clear message in Arabic and English. |
| **Always offer a fallback** | If digital payment fails, offer COD. If delivery slot full, show next available. |
| **Always log the state** | Every state transition logged in `ggh.order_status_log`. Every error logged with `request_id`. |

---

## 21. Elder-Friendly Flow Decisions

### 21.1 Decision Table

| Standard E-commerce | GGH Decision | Why |
|---|---|---|
| Account creation before browsing | Browse freely. Login at checkout. | Om Ibrahim won't create an account just to look. |
| 5-step checkout | 3-step checkout (Delivery → Payment → Confirm) | Fewer steps = less abandonment. |
| Dropdown for variants | Large card selector | Dropdowns are hard on mobile and hide information. |
| Manual quantity input | +/- stepper buttons (56px) | Typing numbers is error-prone. Steppers are tactile. |
| Default to digital payment | Default to Cash on Delivery | 80% of Egyptian e-commerce is COD. |
| Map-based delivery tracking | Simple status bar (4 steps) | Maps confuse elder users. Status bar is universal. |
| Email order confirmation | SMS + WhatsApp confirmation | Elder users don't check email. |
| "Your cart will expire in 30 min" | Cart persists for 7 days | No pressure tactics. Trust > urgency. |
| Infinite scroll | Pagination with page numbers | Elder users understand "Page 3 of 8". Infinite scroll is disorienting. |
| Swipe-to-delete in cart | Delete button (tap target) | Swipe gestures are hard for users with motor impairments. |
| Auto-apply promo codes | No promo codes in v1 | Promo codes create confusion. Wholesale pricing IS the promotion. |

### 21.2 Accessibility in Flows

| Flow Step | Accessibility Requirement |
|---|---|
| Category browsing | All category icons have Arabic + English text labels (not just emoji) |
| Product selection | Price always visible. Never hidden behind a tap. |
| Quantity input | Stepper buttons have `aria-label`: "زيادة الكمية · Increase quantity" |
| Checkout steps | Step indicator announces current step to screen readers |
| Delivery zone selection | Radio buttons with clear visual + text feedback |
| Payment selection | COD pre-selected. Alternative methods clearly labeled. |
| Order confirmation | Read-back of all details before final commit |
| Delivery tracking | Status bar with text labels, not just colors |

---

## 22. Flow Metrics & Monitoring

### 22.1 Key Commerce Metrics

| Metric | Target | How Measured |
|---|---|---|
| Browse → Add to cart rate | > 15% | Cart creation events / product detail views |
| Cart → Checkout start rate | > 40% | Checkout initiations / active carts |
| Checkout → Order complete rate | > 60% | Orders created / checkouts started |
| Cart abandonment rate | < 50% | 1 − (orders / carts with items) |
| Average order value (retail) | > EGP 500 | Revenue / order count |
| Average order value (wholesale) | > EGP 2,000 | Revenue / wholesale order count |
| Order-to-delivery time | < 24 hours | Delivery timestamp − order timestamp |
| Return rate | < 5% | Returned orders / total orders |
| Reorder rate | > 30% | Orders from reorder / total orders |
| COD ratio | Track (expected ~80%) | COD orders / total orders |

### 22.2 Funnel Tracking

```
Landing Page Views
       │
       ▼ 15%+
Product Detail Views
       │
       ▼ 40%+
Carts Created
       │
       ▼ 60%+
Checkouts Started
       │
       ▼ 80%+
Orders Completed
       │
       ▼ 95%+
Orders Delivered
```

Each transition is tracked with:
- `request_id` for tracing
- `customer_id` (or guest identifier)
- Timestamp
- Device type (mobile/desktop)
- Locale (ar/en)
- Time from previous step

### 22.3 Alert Thresholds

| Metric | Warning | Critical | Action |
|---|---|---|---|
| Checkout → Order rate | < 50% | < 30% | Check for broken payment flow |
| Delivery failure rate | > 5% | > 10% | Check driver assignment, zone issues |
| Return rate | > 5% | > 10% | Check product quality, packing |
| ERP sync failure | > 1% | > 5% | Check ERP connectivity |
| Cart abandonment (logged-in) | > 60% | > 75% | Check for UX friction, pricing issues |

---

> **Next document:** `10_Deployment.md` — Docker configuration, environment management, CI/CD pipeline, and production deployment strategy.
