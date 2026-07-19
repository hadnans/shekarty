# 01 — Project Vision

> **GGH — Gomla Go Home**
> جملة لحد البيت
> *Wholesale groceries, delivered to your doorstep.*

---

## Table of Contents

1. [What Is GGH?](#1-what-is-ggh)
2. [The Problem We Solve](#2-the-problem-we-solve)
3. [Target Users](#3-target-users)
4. [Core Features](#4-core-features)
5. [Technology Stack](#5-technology-stack)
6. [Design Philosophy](#6-design-philosophy)
7. [Elder-Friendly & Accessibility Mandate](#7-elder-friendly--accessibility-mandate)
8. [Bilingual & RTL Commitment](#8-bilingual--rtl-commitment)
9. [What GGH Is Not](#9-what-ggh-is-not)
10. [Success Metrics](#10-success-metrics)
11. [Long-Term Vision](#11-long-term-vision)
12. [Guiding Principles](#12-guiding-principles)

---

## 1. What Is GGH?

GGH — **Gomla Go Home** — is a wholesale grocery marketplace built for Egyptian households and small businesses. The name says everything: *جملة لحد البيت* — wholesale, right to your door.

Instead of navigating crowded wholesale markets (الجملة), haggling over bulk prices, loading car trunks with 25 kg rice sacks, and making multiple trips — GGH brings the wholesale experience online. Customers browse household staples at wholesale prices, order in bulk quantities, and receive delivery at home.

GGH is not a supermarket app. It is not a per-unit retail platform. It is a **wholesale-first** marketplace designed around a simple truth: Egyptian families buy rice by the 5-kilo, oil by the litre, and cleaning products by the case. They deserve the wholesale price without the wholesale errand.

---

## 2. The Problem We Solve

| Problem | Reality Today | What GGH Does |
|---|---|---|
| **Wholesale markets are inaccessible** | El-Ataba, El-Zahraa, and other wholesale districts require travel, time, physical effort, and bargaining skills | Browse and order from home — no travel, no haggling |
| **Retail prices erode household budgets** | Small shops mark up staples 15–30% above wholesale | Sell at true wholesale prices with transparent per-unit cost |
| **Bulk buying is logistically hard** | Carrying 25 kg of rice, 5 litres of oil, and a case of soap requires a car or a helper | Deliver to the door — even to upper-floor apartments |
| **Price comparison is impossible** | Wholesale prices change daily; no single source of truth | Display yesterday's price vs. today's price; show savings per item |
| **Elderly and non-tech users are excluded** | Existing grocery apps target young, tech-savvy urbanites | Design for the person who has never used a delivery app |
| **Arabic-only users face broken experiences** | Most platforms are English-first with Arabic bolted on, often with broken RTL layouts | Arabic-first, RTL-native, bilingual from day one |
| **No trust in online grocery** | Customers fear wrong items, missing weight, late delivery, no refunds | Order tracking, weight verification photos, live support, clear return policy |

---

## 3. Target Users

### 3.1 Primary Personas

#### Persona A — Om Ibrahim (أم إبراهيم)

| Attribute | Detail |
|---|---|
| **Age** | 55–70 |
| **Role** | Household manager, mother of grown children |
| **Tech comfort** | Uses WhatsApp, makes phone calls. Apps confuse her. Small text frustrates her. |
| **Shopping habit** | Buys rice, oil, ghee, sugar, tea, cleaning supplies in bulk once a month |
| **Current method** | Sends her son or a neighbor to the wholesale market, or overpays at the corner shop |
| **Pain point** | She cannot carry heavy items. She does not trust online payment. She wants to see the price clearly before buying. |
| **What she needs** | Large buttons, Arabic text, simple navigation, cash on delivery, someone to carry items to her kitchen |

#### Persona B — Abou Ahmed (أبو أحمد)

| Attribute | Detail |
|---|---|
| **Age** | 45–60 |
| **Role** | Small grocery shop owner (بقالة) |
| **Tech comfort** | Comfortable with basic apps. Uses phone for calls and WhatsApp Business. |
| **Shopping habit** | Restocks shop inventory weekly from wholesale market |
| **Current method** | Drives to wholesale district at 5 AM, spends 3 hours, loads car, drives back |
| **Pain point** | Time lost. Inconsistent pricing across suppliers. No credit terms from new suppliers. |
| **What he needs** | Wholesale pricing tiers, order templates for recurring purchases, credit terms, delivery to his shop |

#### Persona C — Mariam (مريم)

| Attribute | Detail |
|---|---|
| **Age** | 28–38 |
| **Role** | Working mother, manages household shopping remotely |
| **Tech comfort** | High. Uses multiple delivery apps daily. |
| **Shopping habit** | Orders groceries online bi-weekly. Compares prices across apps. |
| **Current method** | Uses Talabat, InstaShop, Breadfast — pays retail prices |
| **Pain point** | Retail prices are too high for bulk purchases. Existing apps sell single units, not cases. |
| **What she needs** | Best price per unit, bulk-break discounts, scheduled delivery slots, digital payment |

### 3.2 User Priority Matrix

| Priority | Persona | Reason |
|---|---|---|
| **P0 — Must serve** | Om Ibrahim | If the platform works for her, it works for everyone. She is the hardest user to design for. |
| **P0 — Must serve** | Abou Ahmed | B2B revenue driver. Wholesale accounts generate 3–5× the order value of B2C. |
| **P1 — Should serve** | Mariam | High-frequency, digital-native user. Easy to acquire, easy to retain. |

### 3.3 Accessibility Requirements

All users, regardless of age, disability, or device, must be able to complete a full purchase flow without assistance.

| Requirement | Standard | How We Meet It |
|---|---|---|
| Visual impairment (low vision) | WCAG 2.1 AA | Minimum 16px base font, 4.5:1 contrast ratio, scalable to 200% without layout break |
| Motor impairment (tremor, arthritis) | WCAG 2.1 AA | Minimum 48px touch targets, no swipe-only gestures, generous spacing between interactive elements |
| Cognitive load | Cognitive Accessibility Guide | One action per screen, clear progress indicators, confirmation before payment, undo within 30 seconds |
| Screen reader support | WCAG 2.1 AA | Semantic HTML, ARIA labels in Arabic and English, logical tab order matching visual order |
| Color blindness | WCAG 2.1 AA | Never rely on color alone to convey meaning; use icons + text labels for states |

---

## 4. Core Features

### 4.1 Feature Map

```
┌─────────────────────────────────────────────────────────────┐
│                      GGH FEATURE MAP                        │
├──────────────┬──────────────┬──────────────┬────────────────┤
│   DISCOVER   │    ORDER     │   RECEIVE    │    MANAGE      │
├──────────────┼──────────────┼──────────────┼────────────────┤
│ Category     │ Cart with    │ Delivery     │ Order history  │
│ browsing     │ bulk qty     │ tracking     │ & reorder      │
├──────────────┼──────────────┼──────────────┼────────────────┤
│ Product      │ Wholesale    │ Weight       │ Saved address  │
│ search       │ pricing      │ verification │ book           │
├──────────────┼──────────────┼──────────────┼────────────────┤
│ Hot deals    │ Delivery     │ Driver call  │ Notification   │
│ & countdown  │ slot picker  │ on arrival   │ preferences    │
├──────────────┼──────────────┼──────────────┼────────────────┤
│ Price        │ Cash on      │ Photo proof  │ Customer       │
│ comparison   │ delivery     │ of delivery  │ support chat   │
├──────────────┼──────────────┼──────────────┼────────────────┤
│ Savings      │ Digital      │ Return       │ Wholesale      │
│ calculator   │ payment      │ request      │ account portal │
└──────────────┴──────────────┴──────────────┴────────────────┘
```

### 4.2 Feature Descriptions

#### Discover

| Feature | Description | Why It Matters |
|---|---|---|
| **Category browsing** | Products organized by category: Rice & Grains, Pasta & Noodles, Flour & Baking, Sugar & Sweeteners, Oils & Fats, Ghee & Butter, Beans & Lentils, Tea & Coffee, Spices & Seasonings, Tomato Paste & Sauces, Canned Foods, Frozen Food, Cleaning Products, Paper Products, Household Essentials | Familiar mental model. Om Ibrahim thinks "I need rice" not "I need SKU-1234." |
| **Product search** | Type in Arabic or English, get instant results. Supports brand names (الدوحة, الملكة, كريستال) and generic terms (أرز, زيت, سكر) | Bilingual search removes the language barrier |
| **Hot deals** | Time-limited wholesale deals with countdown timer. Shows original price, deal price, and savings percentage | Creates urgency. Shows concrete savings. |
| **Price comparison** | Every product shows "Today's price" vs. "Yesterday's price" with a savings badge | Builds trust through transparency. Proves wholesale value. |
| **Savings calculator** | On the cart page, shows total savings vs. average retail prices | Reinforces the core value proposition at the moment of commitment |

#### Order

| Feature | Description | Why It Matters |
|---|---|---|
| **Cart with bulk quantities** | Add items in wholesale quantities. Quantity stepper with +/− buttons (large touch targets). Show per-unit price at each quantity tier. | Wholesale means bulk. The cart must make bulk buying easy, not intimidating. |
| **Wholesale pricing tiers** | Automatic bulk-break pricing: buy 1–4 units at price A, 5–9 at price B, 10+ at price C. Tier boundaries shown before crossing. | Rewards larger orders. Transparent — no hidden discounts. |
| **Delivery slot picker** | Choose a date and time window (e.g., Tuesday 10 AM – 2 PM). Show available slots, not sold-out ones. | Delivery is the core promise. Slot visibility builds confidence. |
| **Cash on delivery** | Default payment method. Pay when items arrive at the door. No card required. | Om Ibrahim will not enter her card online. COD removes the trust barrier. |
| **Digital payment** | Optional: Paymob, Fawry, Instapay for users who prefer digital | For Mariam. Not the default, but available. |

#### Receive

| Feature | Description | Why It Matters |
|---|---|---|
| **Delivery tracking** | Real-time order status: Confirmed → Picked → On the way → Delivered. Simple status bar, no map needed. | Reduces anxiety. "Where is my order?" is the #1 support question. |
| **Weight verification** | Driver takes a photo of the items on a scale before leaving the warehouse. Customer sees the photo in the order detail. | Proves correct weight. Addresses the "they shorted me" fear. |
| **Driver call on arrival** | Driver calls the customer when outside. No "your order is at the gate" text message that goes unread. | Om Ibrahim does not check notifications. A phone call reaches her. |
| **Photo proof of delivery** | Driver takes a photo of items at the door (or on the kitchen counter if the customer allows). | Dispute resolution. "I didn't receive it" → show the photo. |

#### Manage

| Feature | Description | Why It Matters |
|---|---|---|
| **Order history & reorder** | See past orders. One-tap reorder of the entire cart. | Monthly bulk buyers want to repeat the same order. |
| **Saved address book** | Home, shop, mother's house. Select from saved addresses. | Abou Ahmed delivers to his shop and his home. |
| **Notification preferences** | Choose SMS, WhatsApp, or push notification. Choose which events to be notified about. | Om Ibrahim prefers SMS. Mariam prefers push. |
| **Customer support chat** | In-app chat with a human agent. Not a chatbot. Arabic-first. | Trust. A human on the other end makes the difference. |
| **Wholesale account portal** | Business document upload, credit terms application, order templates, bulk upload via spreadsheet | For Abou Ahmed. B2B needs different tooling than B2C. |

---

## 5. Technology Stack

### 5.1 Stack Overview

| Layer | Technology | Why This Choice |
|---|---|---|
| **Frontend** | Next.js 15 + React 19 | Server-side rendering for SEO and initial load speed. React Server Components reduce client JS. Mature ecosystem. |
| **Language** | TypeScript (strict mode) | Type safety catches bugs before production. Self-documenting code. Better IDE support for team collaboration. |
| **Styling** | Tailwind CSS + shadcn/ui | Utility-first CSS with consistent design tokens. shadcn/ui provides accessible, composable components. No CSS-in-JS runtime overhead. |
| **Commerce Engine** | Medusa v2 | Headless commerce with modular architecture. Customizable pricing, inventory, and order workflows. Not a black box like Shopify. |
| **Database** | PostgreSQL 16 | ACID compliance for financial data. JSONB for flexible product metadata. Proven at scale. |
| **Cache & Queue** | Redis 7 | In-memory caching for product listings and session storage. BullMQ job queue built on Redis — no additional infrastructure. |
| **Job Processing** | BullMQ | Reliable job queue with retries, delays, priorities, and dead-letter handling. Native TypeScript. |
| **ERP** | ERPNext | Open-source ERP with Arabic localization. Handles accounting, procurement, inventory valuation, and VAT — so we don't have to build those. |
| **Containerization** | Docker + Docker Compose | Reproducible environments. One-command local development. Production-ready container orchestration. |
| **Monorepo** | Turborepo | Shared types and utilities between frontend, worker, and Medusa packages. Single CI pipeline. Atomic commits across services. |

### 5.2 Stack Decision Rationale

#### Why Not Shopify?

Shopify is retail-first. Its pricing model, product structure, and checkout flow assume per-unit sales. Customizing it for wholesale quantities, bulk-break pricing, and ERP integration would require fighting the platform at every step. Medusa gives us a commerce engine we can reshape.

#### Why Not a Custom Backend?

Medusa provides 80% of what we need out of the box: product CRUD, cart lifecycle, order state machine, customer authentication, and an admin dashboard. Building this from scratch would add 3–4 months to the MVP timeline with no competitive advantage.

#### Why ERPNext Instead of Building Accounting?

Financial compliance in Egypt requires proper double-entry accounting, VAT calculation, and audit trails. Building this correctly takes years. ERPNext has been doing it for a decade, with Arabic localization already available.

#### Why Next.js Instead of a SPA?

A single-page application sends zero content to search engines and renders nothing until JavaScript loads. For a grocery marketplace where products need to be discoverable via Google, SSR is non-negotiable. Next.js also gives us API routes, which serve as our BFF layer — eliminating the need for a separate API gateway.

---

## 6. Design Philosophy

### 6.1 Core Tenets

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   SIMPLICITY over FEATURE RICHNESS                          │
│   CLARITY over ELEGANCE                                     │
│   ACCESSIBILITY over AESTHETIC NOVELTY                      │
│   TRUST over CONVERSION OPTIMIZATION                        │
│   WHOLESASE VALUE over RETAIL CONVENIENCE                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Design Tenet Details

#### Simplicity Over Feature Richness

Every screen does one thing. The homepage lets you browse categories. The category page lets you add products to cart. The cart page lets you adjust quantities and checkout. No floating widgets, no gamification, no social feeds.

If a feature cannot be used by someone who has never seen a delivery app, it does not ship.

#### Clarity Over Elegance

A product card shows: product name, weight, today's price, savings badge, and an "Add" button. Nothing more. No hover animations that hide information. No carousels that move too fast. No icons without labels.

If a user has to guess what a button does, the design has failed.

#### Accessibility Over Aesthetic Novelty

We do not use pastel-on-pastel color schemes because they look modern. We use high-contrast colors because Om Ibrahim needs to read the price. We do not use 12px body text because it looks clean. We use 16px minimum because real people read on real phones in real sunlight.

If a design decision prioritizes visual beauty over usability, the usability wins.

#### Trust Over Conversion Optimization

We do not use dark patterns: no countdown timers on non-time-limited items, no "only 2 left!" when stock is fine, no pre-checked add-on offers. We show yesterday's price because it is true. We show the per-kilo price because it is honest.

If a growth tactic relies on deception, even subtle deception, it is rejected.

#### Wholesale Value Over Retail Convenience

This is not a platform where you order one item for immediate delivery. This is a platform where you plan your monthly grocery needs, order in bulk, and save money. The UX reflects this: categories are organized by staple type, pricing rewards quantity, and delivery is scheduled — not instant.

If a feature optimizes for impulse buying over planned purchasing, it is deprioritized.

---

## 7. Elder-Friendly & Accessibility Mandate

This section is non-negotiable. Every feature, every screen, every interaction must pass these tests before shipping.

### 7.1 Typography

| Rule | Value | Rationale |
|---|---|---|
| Minimum body text | 16px (1rem) | Readable without glasses for most users over 50 |
| Product price | 20px (1.25rem), bold | The most important information on the screen |
| Section headings | 24px (1.5rem), semibold | Clear visual hierarchy without shouting |
| Line height | 1.6× font size | Prevents line jumping when reading Arabic |
| Font family | Cairo (Arabic), Inter (English) | Cairo is optimized for Arabic legibility at screen sizes. Inter is optimized for UI clarity. |

### 7.2 Touch Targets

| Element | Minimum Size | Spacing |
|---|---|---|
| Buttons (primary) | 48px × 48px | 12px gap between adjacent buttons |
| Buttons (secondary) | 44px × 44px | 8px gap |
| Quantity stepper (+/−) | 48px × 48px | 16px between + and − |
| Checkbox / radio | 44px × 44px hit area (visual may be smaller) | 8px gap |
| Navigation items | 48px height | 4px gap |
| List item rows | 56px minimum height | 4px gap between rows |
| Links in text | Full line height tap area | — |

### 7.3 Interaction Design

| Rule | Implementation |
|---|---|
| **No swipe-only actions** | Every swipe action has a visible button alternative. Swiping to delete a cart item is a shortcut, not the only way. |
| **No hover-only content** | Information visible on hover must also be visible on tap. Mobile has no hover. |
| **No auto-advancing carousels** | Users control what they see. Auto-play carousels move before elderly users finish reading. |
| **Confirmation before commitment** | Every financial action (place order, remove item, confirm delivery) requires explicit confirmation. |
| **Undo window** | "Remove from cart" can be undone within 30 seconds via a toast notification. |
| **No disappearing notifications** | Toast notifications remain visible for 8 seconds minimum. Critical notifications (order confirmed, payment received) persist until dismissed. |
| **One primary action per screen** | The cart page has one primary button: "Complete Order." All other actions (edit quantity, remove item, apply coupon) are secondary. |
| **Visible progress** | Multi-step flows (checkout) show a progress bar with labeled steps. |

### 7.4 Color & Contrast

| Context | Minimum Contrast | Our Standard |
|---|---|---|
| Body text on background | 4.5:1 (WCAG AA) | 7:1 (WCAG AAA) |
| Large text (24px+) on background | 3:1 (WCAG AA) | 4.5:1 |
| Interactive element boundary | 3:1 (WCAG AA) | 4.5:1 |
| Error states | Must not rely on red alone | Red + icon + text label |
| Savings badge | Must not rely on green alone | Green + arrow icon + "Save X EGP" text |

### 7.5 Loading & Error States

| State | What the User Sees |
|---|---|
| **Loading (initial)** | Skeleton screen matching the final layout shape. No spinner on empty white space. |
| **Loading (action)** | Button shows inline spinner + "Loading..." text. Button is disabled during loading. |
| **Empty state** | Friendly illustration + "No items yet" + suggested action ("Browse rice & grains →") |
| **Error (network)** | "Could not connect. Please check your internet and try again." + Retry button |
| **Error (validation)** | Inline message below the field. Red border + icon + Arabic text. Never an alert dialog. |
| **Error (server)** | "Something went wrong on our end. Please try again." + Retry button. Error logged internally. |

---

## 8. Bilingual & RTL Commitment

### 8.1 Language Principles

| Principle | Implementation |
|---|---|
| **Arabic-first, not Arabic-also** | All designs are composed in RTL first, then mirrored for LTR. Never design LTR and "flip it." |
| **Native translations, not machine translations** | Egyptian Arabic (العامية المصرية) for casual UI, Modern Standard Arabic (الفصحى) for legal/financial text. No Google Translate. |
| **Text expansion budget** | Arabic text is typically 25–30% longer than English. Layouts must accommodate without truncation or overflow. |
| **Number formatting** | Prices in Arabic numerals (١٢٥ ج.م) or Western numerals (125 EGP) based on user preference. Both are valid in Egypt. |
| **Date formatting** | Day/Month/Year in the user's locale. Never ambiguous formats like 03/04/2026. |

### 8.2 RTL Layout Rules

| Rule | Detail |
|---|---|
| **Direction is structural** | `dir="rtl"` on `<html>`. Tailwind's `rtl:` variant for directional overrides. No manual `margin-left` / `margin-right`. |
| **Icons flip contextually** | Arrow icons (→ ←) flip. Brand logos do not. Cart icons do not. Navigation chevrons flip. |
| **Alignment defaults** | Text starts at the right edge in RTL. Product prices align to the left (end side) in both directions. |
| **Scroll direction** | Horizontal category scroll starts from the right in RTL. |
| **Form label position** | Labels sit above inputs, not to the side. This works identically in both directions. |

### 8.3 Language Switching

| Aspect | Behavior |
|---|---|
| **Trigger** | Visible toggle in header. Globe icon + "عربي" / "EN". One tap to switch. |
| **Persistence** | Stored in localStorage and cookie. Remembers across sessions. |
| **URL strategy** | No locale in URL for MVP. Future: `/ar/` and `/en/` prefixes for SEO. |
| **Fallback** | If a translation key is missing, show the English text with a `⚠` indicator in development. Never show a raw key like `cart.empty`. |

---

## 9. What GGH Is Not

| GGH Is Not | Why This Matters |
|---|---|
| **Not a supermarket app** | We sell wholesale quantities at wholesale prices. We do not compete with Carrefour on convenience. We compete on value. |
| **Not a multi-vendor marketplace (yet)** | In Phase 1, GGH is the sole seller. Marketplace features come in Phase 6 when the operational foundation is solid. |
| **Not an instant delivery service** | Orders are scheduled, not instant. Wholesale logistics require consolidation and route planning. 30-minute delivery is a different business. |
| **Not a recipe app** | We sell ingredients. How customers use them is their business. Recipe content may come as a retention feature in Phase 4, not as a core feature. |
| **Not a loyalty points system** | The loyalty program is savings. Customers return because they save money, not because they collect points. Gamification is explicitly out of scope for Phase 1–3. |
| **Not a social platform** | No reviews, no sharing, no feeds. These create moderation overhead without clear revenue impact. May revisit in Phase 5. |

---

## 10. Success Metrics

### 10.1 North Star Metric

**Monthly Wholesale Order Value (MWOV)** — the total EGP value of orders placed per month, measured at wholesale pricing.

Why this metric: It captures both customer acquisition (more orders) and customer retention (larger orders). It directly reflects the core value proposition: people buying more at wholesale prices.

### 10.2 Key Results by Phase

| Phase | Metric | Target | Timeframe |
|---|---|---|---|
| **Phase 1 (MVP)** | First 100 paying customers | 100 unique customers with ≥1 completed order | Month 3 |
| **Phase 1 (MVP)** | Average order value | ≥ EGP 800 (B2C), ≥ EGP 3,000 (B2B) | Month 3 |
| **Phase 1 (MVP)** | Cart completion rate | ≥ 40% of carts created reach checkout | Month 3 |
| **Phase 2 (B2B)** | B2B customer count | 50 verified wholesale accounts | Month 6 |
| **Phase 2 (B2B)** | B2B repeat order rate | ≥ 60% of B2B customers reorder within 30 days | Month 6 |
| **Phase 3 (Payments)** | Digital payment adoption | ≥ 30% of orders use digital payment | Month 8 |
| **Phase 4 (Intelligence)** | Reorder recommendation CTR | ≥ 15% of recommended items are added to cart | Month 11 |

### 10.3 Quality Metrics

| Metric | Target | Measurement |
|---|---|---|
| Page load (LCP) | < 2.0 seconds | Lighthouse CI on every deploy |
| Accessibility score | ≥ 95 | Lighthouse Accessibility audit |
| Mobile usability | Zero errors | Google Search Console |
| Order defect rate | < 2% | Wrong items, missing items, weight discrepancy |
| Delivery on-time rate | ≥ 90% | Delivered within the selected time window |
| Customer support first response | < 5 minutes | In-app chat response time |
| App crash rate | < 0.1% | Error tracking (Sentry) |

---

## 11. Long-Term Vision

### 11.1 The Three-Year Arc

```
Year 1 — PROVE THE MODEL
│  Build the platform. Serve Cairo. Acquire 1,000 customers.
│  Prove that Egyptians will buy wholesale groceries online.
│
Year 2 — SCALE THE OPERATION
│  Expand to Alexandria, Giza, and the Delta.
│  Onboard 50+ B2B accounts. Reach 5,000 customers.
│  Introduce credit terms for verified businesses.
│
Year 3 — BECOME THE INFRASTRUCTURE
│  Open the marketplace to suppliers.
│  Become the wholesale layer that every grocery app builds on.
│  20,000+ customers. 200+ suppliers. Operations in 5+ governorates.
```

### 11.2 Vision Statements by Horizon

| Horizon | Vision |
|---|---|
| **H1 — 6 months** | GGH is the easiest way for a Cairo household to buy a month's groceries at wholesale prices. |
| **H2 — 18 months** | GGH is the platform Egyptian families and shop owners trust for bulk grocery purchasing, with delivery across major cities. |
| **H3 — 36 months** | GGH is the wholesale grocery infrastructure of Egypt — the layer between suppliers and every downstream buyer, from households to supermarkets. |

### 11.3 Future Feature Horizon

| Feature | Phase | Horizon | Prerequisite |
|---|---|---|---|
| Subscription orders (auto-reorder monthly) | 2 | H1 | Stable checkout + delivery operations |
| Mobile app (React Native) | 5 | H2 | Proven product-market fit on web |
| Multi-vendor marketplace | 6 | H3 | B2B operations mature; supplier demand exists |
| AI demand forecasting | 4 | H2 | 6+ months of order data |
| WhatsApp ordering | 3 | H1 | Conversational AI integration |
| Credit scoring for net-30 terms | 2 | H1 | ERPNext financial module + risk model |
| Product freshness tracking (batch/lot) | 3 | H2 | Warehouse management system integration |
| Nutrition information & allergens | 4 | H2 | Supplier data quality improvement |
| Voice search (Arabic) | 5 | H3 | ASR model fine-tuned for Egyptian Arabic |
| Carbon footprint per delivery | 6 | H3 | Route optimization + emissions data |

---

## 12. Guiding Principles

These principles guide every decision — from code architecture to button placement to hiring.

### For the Product

1. **If Om Ibrahim cannot use it, it does not ship.** Design for the least tech-savvy user first. Everyone else will follow.
2. **Show the savings. Always.** The entire reason this platform exists is to save people money. Every screen must communicate this.
3. **Honesty builds retention.** No dark patterns. No fake urgency. Real prices, real savings, real delivery times.
4. **Arabic is not a translation — it is the product.** RTL is not a layout flip — it is a layout. Egyptian Arabic is not a dialect option — it is the voice.
5. **Wholesale is different from retail.** Do not copy retail UX patterns. Quantity tiers, case packs, scheduled delivery, and cash-on-delivery are not edge cases — they are the core flow.

### For the Engineering Team

6. **Type safety is not optional.** TypeScript strict mode, Zod validation at API boundaries, generated types from database schema. If it compiles, it should work.
7. **Every integration point has a fallback.** If ERPNext goes down, the storefront stays up with cached data. If Redis goes down, the app degrades to database reads. If Medusa goes down, the homepage still renders.
8. **The monorepo is one ship.** Shared types, shared utilities, shared constants. If the frontend and the worker disagree on what an `Order` looks like, we have failed.
9. **Deploy on green, rollback on red.** CI passes → auto-deploy to staging. Smoke tests pass → one-click deploy to production. Alert fires → one-click rollback.
10. **Observability from day one.** Structured logging, Prometheus metrics, distributed tracing. If we cannot measure it, we cannot fix it.

### For the Business

11. **Revenue follows trust.** Do not optimize for short-term conversion at the cost of long-term trust. A customer who returns monthly for a year is worth 100× a customer who orders once and leaves.
12. **Operations before features.** A new category is worthless if existing orders are being delivered late. Fix the operational foundation before building the feature skyscraper.
13. **Egypt first.** Every localization, payment method, and logistics decision should serve the Egyptian market first. International expansion is a Phase 7+ conversation.

---

*This document is the source of truth for product decisions. When in doubt, re-read Section 7 (Elder-Friendly Mandate) and Section 12 (Guiding Principles). If a proposed feature contradicts these sections, it is rejected.*

*Last updated: July 2026*
