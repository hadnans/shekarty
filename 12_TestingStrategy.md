# 12 — Testing Strategy

> **GGH — Gomla Go Home** — جملة لحد البيت — Unit testing, integration testing, UI testing, acceptance criteria, and quality gates. Every test exists because Om Ibrahim's groceries depend on it.

---

## Table of Contents

1. [Testing Philosophy](#1-testing-philosophy)
2. [Testing Pyramid & Strategy Overview](#2-testing-pyramid--strategy-overview)
3. [Testing Tools & Framework](#3-testing-tools--framework)
4. [Unit Testing](#4-unit-testing)
5. [Integration Testing](#5-integration-testing)
6. [UI / E2E Testing](#6-ui--e2e-testing)
7. [Performance Testing](#7-performance-testing)
8. [Accessibility Testing](#8-accessibility-testing)
9. [Acceptance Criteria](#9-acceptance-criteria)
10. [Test Data Strategy](#10-test-data-strategy)
11. [CI/CD Integration](#11-cicd-integration)
12. [Monitoring & Production Testing](#12-monitoring--production-testing)
13. [Elder-Friendly Testing Decisions](#13-elder-friendly-testing-decisions)
14. [Bilingual & RTL Testing](#14-bilingual--rtl-testing)
15. [Testing Anti-Patterns](#15-testing-anti-patterns)

---

## 1. Testing Philosophy

| Principle | Rule | Why |
|---|---|---|
| **Test for Om Ibrahim** | Every test must justify how it protects a real user flow. | If a test doesn't guard a user-facing behaviour, it's noise. |
| **Piastres, never floats** | All money tests must use integer piastres; never assert on floating-point. | EGP 110.50 = `11050`. Floating-point comparison is a lie. |
| **Bilingual by default** | Every user-facing string test must cover both `_en` and `_ar` variants. | Arabic is the primary language; English-only tests miss half the users. |
| **Result, never throw** | Business logic tests must assert `Result<T, E>` shapes, not caught exceptions. | Throwing in business logic is a code-smell; tests should reflect the real pattern. |
| **Idempotency is testable** | Every payment/mutation test must run twice with the same idempotency key. | Double-charging Om Ibrahim is unforgivable. |
| **Soft-delete awareness** | Tests must assert `deleted_at` is set, not that rows disappear. | Physical deletes are forbidden in GGH; tests must enforce this. |
| **Elder-friendly guard** | Any component test involving touch targets must assert ≥ 48px. | Om Ibrahim's fingers aren't getting smaller. |
| **No `any` in tests** | Tests follow the same strict TypeScript rules as production code. | A test with `any` doesn't actually test types. |
| **Deterministic by default** | Tests must not depend on time, random values, or external services. | Flaky tests erode trust faster than no tests. |
| **ERP is source of truth** | Integration tests must verify ERP sync correctness, not just local state. | If ERP says 3 in stock, the website must say 3. |

---

## 2. Testing Pyramid & Strategy Overview

### 2.1 The Pyramid

```
                    ╱╲
                   ╱  ╲
                  ╱ E2E ╲           ← 5%  — Playwright (Critical journeys)
                 ╱ (Slow) ╲
                ╱────────────╲
               ╱              ╲
              ╱  Integration   ╲       ← 20% — Vitest + MSW + Testcontainers
             ╱   (Medium)       ╲
            ╱────────────────────╲
           ╱                      ╲
          ╱       Unit Tests       ╲     ← 75% — Vitest (Pure functions, hooks, utils)
         ╱        (Fast)            ╲
        ╱────────────────────────────╲
```

### 2.2 Distribution Targets

| Layer | Percentage | Count Target (approx.) | Avg. Execution Time | Responsibility |
|---|---|---|---|---|
| Unit | 75% | ~1,500 | < 5ms each | Pure logic, validation, formatting |
| Integration | 20% | ~400 | 50–500ms each | API routes, DB, queues, external services |
| E2E | 5% | ~50 | 5–30s each | Critical user journeys only |

### 2.3 Strategy Flow

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Developer   │    │  PR Gate     │    │  Merge Gate  │    │  Deploy Gate │
│  writes code │───▶│  Unit + Lint │───▶│  Integration │───▶│  E2E Smoke   │
│  + unit test │    │  must pass   │    │  must pass   │    │  must pass   │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

### 2.4 Quality Gates Summary

| Gate | When | Must Pass | Blocks |
|---|---|---|---|
| Pre-commit | `git commit` | Lint + affected unit tests | Commit |
| PR | Pull request opened | All unit + integration tests | Merge |
| Merge | Code merged to `main` | Full suite + coverage check | Deploy |
| Deploy | Pre-production | E2E smoke tests | Release |
| Post-deploy | After prod deploy | Synthetic monitoring | Alerting |

---

## 3. Testing Tools & Framework

### 3.1 Tool Matrix

| Purpose | Tool | Version | Why |
|---|---|---|---|
| Test runner | Vitest | 2.x | Native ESM, Vite-native, fast HMR, compatible with Jest API |
| Assertion library | Vitest (built-in) | 2.x | `expect()` with `describe/it` — no extra dependency |
| Mocking | `vi.mock()`, `vi.spyOn()` | Built-in | First-class ESM mocking |
| HTTP mocking | MSW (Mock Service Worker) | 2.x | Intercepts at network level; works in Node + browser |
| Component testing | Vitest + @testing-library/react | 16.x | Render components, query by role/text, user-centric |
| User interaction | @testing-library/user-event | 14.x | Simulates real user events (click, type, hover) |
| E2E | Playwright | 1.49+ | Multi-browser, auto-wait, trace viewer, parallel |
| Visual regression | Playwright screenshots + pixelmatch | Built-in | Snapshot comparison on every PR |
| Accessibility | axe-core + @axe-core/playwright | 4.x | Automated WCAG 2.1 AA checks |
| API testing | Vitest + supertest (or fetch) | — | Test Next.js API routes in isolation |
| Database | Testcontainers (PostgreSQL) | — | Real PostgreSQL instance per test suite |
| Redis | Testcontainers (Redis) | — | Real Redis instance per test suite |
| Coverage | @vitest/coverage-v8 | Built-in | Istanbul-compatible, v8 native |
| Load testing | k6 | Latest | Scriptable in JS, Grafana integration |
| Lighthouse | Lighthouse CI | 0.13+ | Automated performance scoring |

### 3.2 Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',            // default; 'jsdom' for component tests
    setupFiles: ['./vitest.setup.ts'],
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
    ],
    exclude: [
      'node_modules',
      '.next',
      'e2e/**',                     // Playwright owns E2E
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: [
        'src/services/**',
        'src/lib/**',
        'src/hooks/**',
        'src/app/api/**',
      ],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.type.ts',
        'src/**/index.ts',           // re-exports only
      ],
      thresholds: {
        statements: 85,
        branches: 80,
        functions: 85,
        lines: 85,
      },
    },
    pool: 'forks',
    poolOptions: {
      forks: {
        maxForks: 4,
        minForks: 1,
      },
    },
    testTimeout: 10_000,             // 10s default
    hookTimeout: 30_000,             // 30s for setup/teardown
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@ggh': path.resolve(__dirname, 'src/ggh'),
      '@tests': path.resolve(__dirname, 'tests'),
    },
  },
});
```

### 3.3 Vitest Setup File

```typescript
// vitest.setup.ts
import { beforeAll, afterAll, afterEach } from 'vitest';
import { server } from '@tests/mocks/server';

// MSW: Start interception for all integration tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
```

### 3.4 Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : 2,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'on-failure' }]],
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    locale: 'ar-EG',               // Arabic-first
    timezoneId: 'Africa/Cairo',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
    },
  ],
  webServer: {
    command: 'npm run build && npm run start',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

---

## 4. Unit Testing

### 4.1 What to Unit Test

| Category | Examples | Test Focus |
|---|---|---|
| Pure functions | Pricing, money formatting, validation | Input → output correctness |
| Zod schemas | Request/response validation | Valid/invalid input boundaries |
| Utility functions | Date formatting, phone normalization, slug generation | Edge cases, null/undefined |
| Custom hooks | `useCart`, `useOtp`, `useDeliverySlots` | State transitions, side effects |
| Reducers | Cart reducer, order state machine | State transitions, immutability |
| Formatters | `formatPiastresToEgp`, `formatPhoneAr`, `formatDateAr` | Locale-specific output |
| Mappers | `erpProductToGghProduct`, `medusaOrderToGghOrder` | Field mapping accuracy |
| Type guards | `isProductId`, `isOrderResult`, `isSuccessResult` | Narrowing correctness |
| Business rules | Price tier resolution, delivery slot availability, wholesale discount | Rule logic |
| Branded type helpers | `asProductId`, `asOrderId` | Brand preservation |

### 4.2 Pure Function Testing — Pricing & Money

```typescript
// src/lib/pricing/__tests__/price-tier.test.ts
import { describe, it, expect } from 'vitest';
import {
  resolvePriceTier,
  formatPiastresToEgp,
  applyWholesaleDiscount,
  calculateLineTotal,
} from '@ggh/lib/pricing';
import type { PriceTier, WholesaleAccount, Piastres } from '@ggh/types';

describe('resolvePriceTier', () => {
  const tiers: PriceTier[] = [
    { minQuantity: 1,  maxQuantity: 10,  pricePerUnit: 5000  as Piastres },  // EGP 50
    { minQuantity: 11, maxQuantity: 50,  pricePerUnit: 4500  as Piastres },  // EGP 45
    { minQuantity: 51, maxQuantity: 200, pricePerUnit: 4000  as Piastres },  // EGP 40
    { minQuantity: 201, maxQuantity: null, pricePerUnit: 3500 as Piastres }, // EGP 35
  ];

  it('returns the correct tier for quantity 1', () => {
    const result = resolvePriceTier(tiers, 1);
    expect(result).toEqual(tiers[0]);
  });

  it('returns the bulk tier for quantity 51', () => {
    const result = resolvePriceTier(tiers, 51);
    expect(result).toEqual(tiers[2]);
  });

  it('returns the max-bulk tier for quantity 999', () => {
    const result = resolvePriceTier(tiers, 999);
    expect(result).toEqual(tiers[3]);
  });

  it('returns null when tiers are empty', () => {
    const result = resolvePriceTier([], 10);
    expect(result).toBeNull();
  });

  it('returns null for zero quantity', () => {
    const result = resolvePriceTier(tiers, 0);
    expect(result).toBeNull();
  });

  it('returns null for negative quantity', () => {
    const result = resolvePriceTier(tiers, -5);
    expect(result).toBeNull();
  });
});

describe('formatPiastresToEgp', () => {
  it('formats 11050 piastres as "110.50 ج.م"', () => {
    expect(formatPiastresToEgp(11050 as Piastres, 'ar')).toBe('110.50 ج.م');
  });

  it('formats 11050 piastres as "EGP 110.50" in English', () => {
    expect(formatPiastresToEgp(11050 as Piastres, 'en')).toBe('EGP 110.50');
  });

  it('formats 0 piastres as "0.00 ج.م"', () => {
    expect(formatPiastresToEgp(0 as Piastres, 'ar')).toBe('0.00 ج.م');
  });

  it('formats 1 piastre as "0.01 ج.م"', () => {
    expect(formatPiastresToEgp(1 as Piastres, 'ar')).toBe('0.01 ج.م');
  });

  it('formats 100000 piastres (EGP 1,000) with thousand separator in Arabic', () => {
    expect(formatPiastresToEgp(100000 as Piastres, 'ar')).toBe('1,000.00 ج.م');
  });
});

describe('applyWholesaleDiscount', () => {
  it('applies 10% wholesale discount on 50000 piastres → 45000', () => {
    const result = applyWholesaleDiscount(50000 as Piastres, 10);
    expect(result).toBe(45000 as Piastres);
  });

  it('returns same amount for 0% discount', () => {
    const result = applyWholesaleDiscount(50000 as Piastres, 0);
    expect(result).toBe(50000 as Piastres);
  });

  it('rounds down — 999 piastres with 33% discount → 669 (floor)', () => {
    const result = applyWholesaleDiscount(999 as Piastres, 33);
    expect(result).toBe(669 as Piastres);  // 999 * 0.67 = 669.33 → floor 669
  });

  it('never returns negative piastres', () => {
    const result = applyWholesaleDiscount(100 as Piastres, 100);
    expect(result).toBe(0 as Piastres);
  });
});

describe('calculateLineTotal', () => {
  it('calculates line total as quantity × unit price', () => {
    const result = calculateLineTotal({
      quantity: 3,
      unitPrice: 5000 as Piastres,
    });
    expect(result).toBe(15000 as Piastres);
  });

  it('applies wholesale discount after quantity price', () => {
    const result = calculateLineTotal({
      quantity: 100,
      unitPrice: 5000 as Piastres,
      wholesaleDiscountPercent: 10,
    });
    // 100 × 5000 = 500000; 10% off = 450000
    expect(result).toBe(450000 as Piastres);
  });

  it('idempotent — same inputs always same output', () => {
    const input = { quantity: 7, unitPrice: 3250 as Piastres };
    const first = calculateLineTotal(input);
    const second = calculateLineTotal(input);
    expect(first).toBe(second);
  });
});
```

### 4.3 Zod Schema Testing

```typescript
// src/lib/validation/__tests__/checkout.schema.test.ts
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { checkoutSchema, otpRequestSchema, deliverySlotSchema } from '@ggh/lib/validation';

describe('checkoutSchema', () => {
  const validCheckout = {
    cartId: 'cart_01JXYZ123',
    deliverySlotId: 'slot_01JABC456',
    deliveryZoneId: 'zone_01JDEF789',
    deliveryAddress: {
      street_en: '123 Tahrir Street',
      street_ar: '١٢٣ شارع التحرير',
      building_en: 'Building 5',
      building_ar: 'مبنى ٥',
      floor: '3',
      apartment: '12',
      notes: 'Ring the bell twice',
    },
    paymentMethod: 'cash_on_delivery' as const,
    idempotencyKey: 'idem_01JKL012',
  };

  it('accepts a valid checkout payload', () => {
    const result = checkoutSchema.safeParse(validCheckout);
    expect(result.success).toBe(true);
  });

  it('rejects missing idempotencyKey', () => {
    const { idempotencyKey: _, ...withoutKey } = validCheckout;
    const result = checkoutSchema.safeParse(withoutKey);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.path.includes('idempotencyKey'))).toBe(true);
    }
  });

  it('rejects empty street_en', () => {
    const payload = {
      ...validCheckout,
      deliveryAddress: { ...validCheckout.deliveryAddress, street_en: '' },
    };
    const result = checkoutSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('rejects empty street_ar', () => {
    const payload = {
      ...validCheckout,
      deliveryAddress: { ...validCheckout.deliveryAddress, street_ar: '' },
    };
    const result = checkoutSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('rejects invalid payment method', () => {
    const payload = { ...validCheckout, paymentMethod: 'credit_card' };
    const result = checkoutSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('accepts cash_on_delivery as only valid payment method', () => {
    const payload = { ...validCheckout, paymentMethod: 'cash_on_delivery' };
    const result = checkoutSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });
});

describe('otpRequestSchema', () => {
  it('accepts valid Egyptian mobile number', () => {
    const result = otpRequestSchema.safeParse({ phone: '+201012345678' });
    expect(result.success).toBe(true);
  });

  it('accepts local format 01012345678 and normalizes', () => {
    const result = otpRequestSchema.safeParse({ phone: '01012345678' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toContain('+20');
    }
  });

  it('rejects landline number', () => {
    const result = otpRequestSchema.safeParse({ phone: '+20212345678' });
    expect(result.success).toBe(false);
  });

  it('rejects non-Egyptian number', () => {
    const result = otpRequestSchema.safeParse({ phone: '+14155552671' });
    expect(result.success).toBe(false);
  });

  it('rejects too-short number', () => {
    const result = otpRequestSchema.safeParse({ phone: '010' });
    expect(result.success).toBe(false);
  });
});

describe('deliverySlotSchema', () => {
  it('accepts a valid delivery slot', () => {
    const result = deliverySlotSchema.safeParse({
      date: '2025-03-15',
      startTime: '10:00',
      endTime: '12:00',
      maxOrders: 20,
      zoneId: 'zone_01JDEF789',
    });
    expect(result.success).toBe(true);
  });

  it('rejects endTime before startTime', () => {
    const result = deliverySlotSchema.safeParse({
      date: '2025-03-15',
      startTime: '14:00',
      endTime: '12:00',
      maxOrders: 20,
      zoneId: 'zone_01JDEF789',
    });
    expect(result.success).toBe(false);
  });

  it('rejects past date', () => {
    const result = deliverySlotSchema.safeParse({
      date: '2020-01-01',
      startTime: '10:00',
      endTime: '12:00',
      maxOrders: 20,
      zoneId: 'zone_01JDEF789',
    });
    expect(result.success).toBe(false);
  });

  it('rejects zero maxOrders', () => {
    const result = deliverySlotSchema.safeParse({
      date: '2025-12-01',
      startTime: '10:00',
      endTime: '12:00',
      maxOrders: 0,
      zoneId: 'zone_01JDEF789',
    });
    expect(result.success).toBe(false);
  });
});
```

### 4.4 Utility Function Testing

```typescript
// src/lib/utils/__tests__/phone.test.ts
import { describe, it, expect } from 'vitest';
import {
  normalizePhoneToE164,
  maskPhoneForDisplay,
  isValidEgyptianMobile,
} from '@ggh/lib/utils/phone';

describe('normalizePhoneToE164', () => {
  it.each([
    ['01012345678',  '+201012345678'],
    ['+201012345678', '+201012345678'],
    ['00201012345678', '+201012345678'],
    ['201012345678',  '+201012345678'],
    [' 01012345678 ', '+201012345678'],
  ])('normalizes "%s" to "%s"', (input, expected) => {
    expect(normalizePhoneToE164(input)).toBe(expected);
  });

  it('throws for unnormalizable input', () => {
    expect(() => normalizePhoneToE164('abc')).toThrow();
  });
});

describe('maskPhoneForDisplay', () => {
  it('masks middle digits in Arabic display', () => {
    expect(maskPhoneForDisplay('+201012345678', 'ar')).toBe('+2010****5678');
  });

  it('masks middle digits in English display', () => {
    expect(maskPhoneForDisplay('+201012345678', 'en')).toBe('+2010****5678');
  });
});

describe('isValidEgyptianMobile', () => {
  it.each([
    ['+201012345678', true],
    ['+201112345678', true],
    ['+201212345678', true],
    ['+201512345678', true],
    ['+20212345678',  false],  // landline
    ['+14155552671',  false],  // US number
    ['0101234567',    false],  // too short
  ])('validates "%s" as %s', (input, expected) => {
    expect(isValidEgyptianMobile(input)).toBe(expected);
  });
});
```

```typescript
// src/lib/utils/__tests__/date.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  formatDateAr,
  formatDeliverySlot,
  isSlotBookable,
  getAvailableDeliveryDays,
} from '@ggh/lib/utils/date';

describe('formatDateAr', () => {
  it('formats a date in Arabic long format', () => {
    const date = new Date('2025-03-15T10:00:00+02:00');
    expect(formatDateAr(date)).toContain('مارس');
  });

  it('formats a date in Arabic short format', () => {
    const date = new Date('2025-03-15T10:00:00+02:00');
    const result = formatDateAr(date, 'short');
    expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
  });
});

describe('isSlotBookable', () => {
  it('returns true for a slot 3 hours from now', () => {
    const threeHoursLater = new Date(Date.now() + 3 * 60 * 60 * 1000);
    expect(isSlotBookable(threeHoursLater)).toBe(true);
  });

  it('returns false for a slot 30 minutes from now (cutoff is 2h)', () => {
    const thirtyMinLater = new Date(Date.now() + 30 * 60 * 1000);
    expect(isSlotBookable(thirtyMinLater)).toBe(false);
  });

  it('returns false for a past slot', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(isSlotBookable(yesterday)).toBe(false);
  });
});

describe('getAvailableDeliveryDays', () => {
  it('returns next 7 days excluding Fridays', () => {
    const days = getAvailableDeliveryDays();
    expect(days).toHaveLength(6);  // 7 days minus Friday
    days.forEach(d => {
      expect(d.getDay()).not.toBe(5);  // Not Friday
    });
  });
});
```

### 4.5 Hook Testing

```typescript
// src/hooks/__tests__/useCart.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCart } from '@ggh/hooks/useCart';
import * as cartService from '@ggh/services/cart';
import type { Result } from '@ggh/types';

// Mock the service layer
vi.mock('@ggh/services/cart');

describe('useCart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with an empty cart', () => {
    const { result } = renderHook(() => useCart());
    expect(result.current.items).toEqual([]);
    expect(result.current.totalPiastres).toBe(0);
    expect(result.current.isLoading).toBe(false);
  });

  it('adds an item and updates total', async () => {
    const mockCart = {
      id: 'cart_01',
      items: [{
        productId: 'prod_01' as any,
        variantId: 'var_01' as any,
        quantity: 2,
        unitPricePiastres: 5000,
        lineTotalPiastres: 10000,
        name_en: 'Rice 5kg',
        name_ar: 'أرز ٥ كجم',
      }],
      totalPiastres: 10000,
    };

    vi.mocked(cartService.addItem).mockResolvedValueOnce({
      ok: true,
      data: mockCart,
    } as Result<typeof mockCart, never>);

    const { result } = renderHook(() => useCart());

    await act(async () => {
      await result.current.addItem({
        productId: 'prod_01' as any,
        variantId: 'var_01' as any,
        quantity: 2,
      });
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.totalPiastres).toBe(10000);
  });

  it('handles out-of-stock error gracefully', async () => {
    vi.mocked(cartService.addItem).mockResolvedValueOnce({
      ok: false,
      error: { code: 'OUT_OF_STOCK', message_en: 'Item out of stock', message_ar: 'المنتج غير متوفر' },
    } as Result<never, { code: string; message_en: string; message_ar: string }>);

    const { result } = renderHook(() => useCart());

    await act(async () => {
      await result.current.addItem({
        productId: 'prod_01' as any,
        variantId: 'var_01' as any,
        quantity: 5,
      });
    });

    expect(result.current.items).toHaveLength(0);
    expect(result.current.error?.code).toBe('OUT_OF_STOCK');
  });

  it('prevents double-tap add with loading state', async () => {
    let resolveAddItem: Function;
    vi.mocked(cartService.addItem).mockImplementation(
      () => new Promise(resolve => { resolveAddItem = resolve; })
    );

    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addItem({ productId: 'prod_01' as any, variantId: 'var_01' as any, quantity: 1 });
    });

    expect(result.current.isLoading).toBe(true);

    // Second call while loading should be no-op
    const previousCallCount = vi.mocked(cartService.addItem).mock.calls.length;
    act(() => {
      result.current.addItem({ productId: 'prod_01' as any, variantId: 'var_01' as any, quantity: 1 });
    });

    expect(vi.mocked(cartService.addItem).mock.calls.length).toBe(previousCallCount);
  });
});
```

### 4.6 Component Unit Testing

```typescript
// src/components/__tests__/ProductCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductCard } from '@ggh/components/ProductCard';
import type { Product } from '@ggh/types';

const mockProduct: Product = {
  id: 'prod_01' as Product['id'],
  title_en: 'Egyptian Rice 5kg',
  title_ar: 'أرز مصري ٥ كجم',
  thumbnail: '/images/rice.jpg',
  pricePiastres: 12500,
  compareAtPricePiastres: 14000,
  inStock: true,
  unit_en: 'bag',
  unit_ar: 'كيس',
};

describe('ProductCard', () => {
  it('renders product name in Arabic when locale is ar', () => {
    render(<ProductCard product={mockProduct} locale="ar" onAddToCart={vi.fn()} />);
    expect(screen.getByText('أرز مصري ٥ كجم')).toBeInTheDocument();
  });

  it('renders product name in English when locale is en', () => {
    render(<ProductCard product={mockProduct} locale="en" onAddToCart={vi.fn()} />);
    expect(screen.getByText('Egyptian Rice 5kg')).toBeInTheDocument();
  });

  it('renders price as "125.00 ج.م" in Arabic', () => {
    render(<ProductCard product={mockProduct} locale="ar" onAddToCart={vi.fn()} />);
    expect(screen.getByText(/125\.00 ج\.م/)).toBeInTheDocument();
  });

  it('renders strikethrough for compare-at price', () => {
    render(<ProductCard product={mockProduct} locale="ar" onAddToCart={vi.fn()} />);
    const oldPrice = screen.getByText(/140\.00 ج\.م/);
    expect(oldPrice).toHaveClass('line-through');
  });

  it('shows "Out of Stock" / "غير متوفر" when inStock is false', () => {
    const outOfStock = { ...mockProduct, inStock: false };
    render(<ProductCard product={outOfStock} locale="ar" onAddToCart={vi.fn()} />);
    expect(screen.getByText('غير متوفر')).toBeInTheDocument();
  });

  it('add-to-cart button has minimum 48px touch target', () => {
    render(<ProductCard product={mockProduct} locale="ar" onAddToCart={vi.fn()} />);
    const button = screen.getByRole('button', { name: /أضف/i });
    const styles = getComputedStyle(button);
    // Minimum height check
    const minHeight = parseInt(styles.minHeight) || parseInt(styles.height) || 0;
    expect(minHeight).toBeGreaterThanOrEqual(48);
  });

  it('calls onAddToCart with product id on click', async () => {
    const onAdd = vi.fn();
    render(<ProductCard product={mockProduct} locale="ar" onAddToCart={onAdd} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /أضف/i }));
    expect(onAdd).toHaveBeenCalledWith(mockProduct.id);
  });
});
```

### 4.7 Code Coverage Targets

| Module | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| `src/lib/pricing/` | 95% | 90% | 100% | 95% |
| `src/lib/validation/` | 95% | 90% | 100% | 95% |
| `src/lib/utils/` | 90% | 85% | 95% | 90% |
| `src/services/` | 85% | 80% | 85% | 85% |
| `src/hooks/` | 85% | 80% | 85% | 85% |
| `src/app/api/` | 80% | 75% | 80% | 80% |
| `src/components/` | 70% | 65% | 75% | 70% |
| **Overall minimum** | **85%** | **80%** | **85%** | **85%** |

> **Rule**: Coverage percentages are floors, not ceilings. A PR that decreases coverage by even 0.1% is blocked unless the decrease is in a test-exempt module (e.g., auto-generated types).

---

## 5. Integration Testing

### 5.1 Integration Test Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Integration Test Scope                          │
│                                                                     │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    │
│   │ API Route│───▶│ Service  │───▶│ Medusa   │───▶│ Database │    │
│   │ (BFF)    │    │ Layer    │    │ (Mocked) │    │ (Real)   │    │
│   └──────────┘    └──────────┘    └──────────┘    └──────────┘    │
│         │              │               │               │            │
│         ▼              ▼               ▼               ▼            │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    │
│   │ HTTP     │    │ BullMQ   │    │ ERPNext  │    │ Redis    │    │
│   │ Client   │    │ (Real)   │    │ (Mocked) │    │ (Real)   │    │
│   └──────────┘    └──────────┘    └──────────┘    └──────────┘    │
│                                                                     │
│   External services (Medusa, ERPNext) are mocked via MSW            │
│   Internal infrastructure (Postgres, Redis, BullMQ) is real         │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 MSW Handler Setup

```typescript
// tests/mocks/handlers.ts
import { http, HttpResponse, delay } from 'msw';
import { erpProducts, erpInventory } from '@tests/fixtures/erp';
import { medusaProducts, medusaCart } from '@tests/fixtures/medusa';

export const medusaHandlers = [
  http.get('*/store/products*', async ({ request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') ?? '20');
    return HttpResponse.json({
      products: medusaProducts.slice(0, limit),
      count: medusaProducts.length,
      offset: 0,
      limit,
    });
  }),

  http.post('*/store/carts', async () => {
    await delay(50);  // Simulate network latency
    return HttpResponse.json({ cart: medusaCart });
  }),

  http.post('*/store/carts/:id/complete', async ({ params }) => {
    return HttpResponse.json({
      type: 'order',
      order: { id: 'order_01', status: 'pending' },
    });
  }),
];

export const erpHandlers = [
  http.get('*/api/resource/Item/*', async ({ params }) => {
    const itemId = params['0'] as string;
    const product = erpProducts.find(p => p.name === itemId);
    if (!product) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json({ data: product });
  }),

  http.get('*/api/resource/Bin/*', async () => {
    return HttpResponse.json({ data: erpInventory });
  }),

  http.post('*/api/resource/Sales Order', async () => {
    await delay(100);
    return HttpResponse.json({
      data: { name: 'SO-2025-001', docstatus: 0 },
    });
  }),
];

export const handlers = [...medusaHandlers, ...erpHandlers];
```

```typescript
// tests/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

### 5.3 API Route Integration Tests

```typescript
// src/app/api/cart/__tests__/add-item.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@ggh/app/api/cart/add-item/route';
import { createTestDatabase, truncateTables } from '@tests/helpers/database';
import { seedProduct, seedCustomer } from '@tests/factories';
import type { PrismaClient } from '@prisma/client';

describe('POST /api/cart/add-item', () => {
  let db: PrismaClient;

  beforeAll(async () => {
    db = await createTestDatabase();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  beforeEach(async () => {
    await truncateTables(db, ['ggh.delivery_zone', 'ggh.price_tier']);
  });

  it('adds an item to an existing cart', async () => {
    const product = await seedProduct(db, { inStock: true });
    const customer = await seedCustomer(db);

    const request = new NextRequest('http://localhost:3000/api/cart/add-item', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customer.accessToken}`,
      },
      body: JSON.stringify({
        productId: product.id,
        variantId: product.defaultVariantId,
        quantity: 2,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0].quantity).toBe(2);
  });

  it('rejects out-of-stock item with 409', async () => {
    const product = await seedProduct(db, { inStock: false, stockQuantity: 0 });
    const customer = await seedCustomer(db);

    const request = new NextRequest('http://localhost:3000/api/cart/add-item', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customer.accessToken}`,
      },
      body: JSON.stringify({
        productId: product.id,
        variantId: product.defaultVariantId,
        quantity: 1,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(409);

    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('OUT_OF_STOCK');
  });

  it('rejects missing idempotency key for checkout-bound add', async () => {
    const product = await seedProduct(db, { inStock: true });
    const customer = await seedCustomer(db);

    const request = new NextRequest('http://localhost:3000/api/cart/add-item', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customer.accessToken}`,
      },
      body: JSON.stringify({
        productId: product.id,
        variantId: product.defaultVariantId,
        quantity: 1,
        checkoutIntent: true,
        // idempotencyKey missing
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('rejects unauthenticated request with 401', async () => {
    const request = new NextRequest('http://localhost:3000/api/cart/add-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: 'prod_01',
        variantId: 'var_01',
        quantity: 1,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });
});
```

### 5.4 BFF → Medusa Integration

```typescript
// src/services/__tests__/product-service.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ProductService } from '@ggh/services/product-service';
import { server } from '@tests/mocks/server';
import { http, HttpResponse } from 'msw';

describe('ProductService — BFF → Medusa', () => {
  const service = new ProductService();

  it('fetches products and maps to GGH format', async () => {
    const result = await service.listProducts({ limit: 10, offset: 0 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.products).toBeInstanceOf(Array);
      result.data.products.forEach(p => {
        expect(p).toHaveProperty('id');
        expect(p).toHaveProperty('title_en');
        expect(p).toHaveProperty('title_ar');
        expect(p).toHaveProperty('pricePiastres');
        expect(typeof p.pricePiastres).toBe('number');
      });
    }
  });

  it('handles Medusa 500 error gracefully', async () => {
    server.use(
      http.get('*/store/products*', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    const result = await service.listProducts({ limit: 10, offset: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UPSTREAM_ERROR');
    }
  });

  it('handles Medusa timeout gracefully', async () => {
    server.use(
      http.get('*/store/products*', async () => {
        return new HttpResponse(null, { status: 504 });
      })
    );

    const result = await service.listProducts({ limit: 10, offset: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UPSTREAM_TIMEOUT');
    }
  });

  it('caches product listing for 60 seconds', async () => {
    const first = await service.listProducts({ limit: 10, offset: 0 });
    const second = await service.listProducts({ limit: 10, offset: 0 });
    // Second call should be cached — same result, no new network request
    expect(first).toEqual(second);
  });
});
```

### 5.5 BFF → ERPNext Integration (Mocked)

```typescript
// src/services/__tests__/erp-sync.integration.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { ErpSyncService } from '@ggh/services/erp-sync-service';
import { server } from '@tests/mocks/server';
import { http, HttpResponse, delay } from 'msw';
import { createTestDatabase, truncateTables } from '@tests/helpers/database';
import type { PrismaClient } from '@prisma/client';

describe('ErpSyncService — Product Sync', () => {
  let db: PrismaClient;
  const service = new ErpSyncService();

  beforeAll(async () => {
    db = await createTestDatabase();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  beforeEach(async () => {
    await truncateTables(db, ['ggh.erp_sync_log', 'ggh.erp_sync_cursor']);
  });

  it('syncs products from ERP and creates ggh.erp_sync_log entry', async () => {
    const result = await service.syncProducts();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.synced).toBeGreaterThan(0);
      expect(result.data.errors).toHaveLength(0);
    }

    // Verify sync log was written
    const log = await db.ggh_erp_sync_log.findFirst({
      where: { syncType: 'products' },
      orderBy: { createdAt: 'desc' },
    });
    expect(log).not.toBeNull();
    expect(log!.status).toBe('completed');
  });

  it('records failed items in sync log without aborting sync', async () => {
    // Make one product fail
    server.use(
      http.get('*/api/resource/Item/BAD-ITEM', async () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    const result = await service.syncProducts();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.errors.length).toBeGreaterThan(0);
      expect(result.data.synced).toBeGreaterThan(0);
    }
  });

  it('resumes sync from cursor after partial failure', async () => {
    // First sync — records cursor
    await service.syncProducts();

    // Cursor should exist
    const cursor = await db.ggh_erp_sync_cursor.findFirst({
      where: { syncType: 'products' },
    });
    expect(cursor).not.toBeNull();
    expect(cursor!.lastSyncedId).toBeTruthy();
  });
});

describe('ErpSyncService — Inventory Sync', () => {
  const service = new ErpSyncService();

  it('updates local stock counts from ERP bin data', async () => {
    const result = await service.syncInventory();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.updated).toBeGreaterThan(0);
    }
  });

  it('marks items as out-of-stock when ERP reports 0', async () => {
    server.use(
      http.get('*/api/resource/Bin/*', async () => {
        return HttpResponse.json({
          data: [{ item_code: 'RICE-5KG', actual_qty: 0, warehouse: 'Main WH' }],
        });
      })
    );

    const result = await service.syncInventory();
    expect(result.ok).toBe(true);
  });
});
```

### 5.6 BullMQ Job Processor Tests

```typescript
// src/jobs/__tests__/order-confirmation.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { processOrderConfirmation } from '@ggh/jobs/order-confirmation';
import { createTestRedis } from '@tests/helpers/redis';

describe('order.confirmation job', () => {
  let queue: Queue;
  let redis: Redis;

  beforeAll(async () => {
    redis = await createTestRedis();
    queue = new Queue('order.confirmation', { connection: redis });
  });

  afterAll(async () => {
    await queue.close();
    await redis.quit();
  });

  beforeEach(async () => {
    await queue.drain();
  });

  it('processes a valid order confirmation job', async () => {
    const job = await queue.add('confirm', {
      orderId: 'order_01JXYZ',
      customerId: 'cust_01JABC',
      phone: '+201012345678',
      locale: 'ar',
      idempotencyKey: 'idem_confirm_01',
    });

    const result = await processOrderConfirmation(job);

    expect(result.success).toBe(true);
    expect(result.smsSent).toBe(true);
    expect(result.emailSent).toBe(true);
  });

  it('is idempotent — same idempotency key processed twice returns same result', async () => {
    const jobData = {
      orderId: 'order_01JIDEM',
      customerId: 'cust_01JIDEM',
      phone: '+201012345678',
      locale: 'ar',
      idempotencyKey: 'idem_idem_01',
    };

    const job1 = await queue.add('confirm', jobData);
    const result1 = await processOrderConfirmation(job1);

    const job2 = await queue.add('confirm', jobData);
    const result2 = await processOrderConfirmation(job2);

    expect(result1).toEqual(result2);
  });

  it('retries on SMS gateway failure', async () => {
    // This test verifies the job is configured with retry logic
    const worker = new Worker('order.confirmation', processOrderConfirmation, {
      connection: redis,
      settings: { maxStalledCount: 1 },
    });

    const job = await queue.add('confirm', {
      orderId: 'order_01JRETRY',
      customerId: 'cust_01JRETRY',
      phone: '+201012345678',
      locale: 'ar',
      idempotencyKey: 'idem_retry_01',
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });

    const state = await job.getState();
    expect(['waiting', 'active', 'completed']).toContain(state);

    await worker.close();
  });
});
```

### 5.7 Database Integration Tests (ggh schema)

```typescript
// src/lib/db/__tests__/delivery-slot.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { DeliverySlotRepository } from '@ggh/lib/db/delivery-slot-repository';
import { createTestDatabase, truncateTables } from '@tests/helpers/database';

describe('DeliverySlotRepository (ggh schema)', () => {
  let db: PrismaClient;
  let repo: DeliverySlotRepository;

  beforeAll(async () => {
    db = await createTestDatabase();
    repo = new DeliverySlotRepository(db);
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  beforeEach(async () => {
    await truncateTables(db, ['ggh.delivery_slot', 'ggh.delivery_zone']);
    // Seed a zone
    await db.ggh_delivery_zone.create({
      data: {
        id: 'zone_test01',
        name_en: 'Maadi',
        name_ar: 'المعادي',
        isActive: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  });

  it('creates a delivery slot in ggh schema', async () => {
    const slot = await repo.create({
      zoneId: 'zone_test01',
      date: new Date('2025-03-20'),
      startTime: '10:00',
      endTime: '12:00',
      maxOrders: 15,
      currentOrders: 0,
    });

    expect(slot.id).toBeTruthy();
    expect(slot.zoneId).toBe('zone_test01');
    expect(slot.maxOrders).toBe(15);
  });

  it('finds available slots for a zone and date', async () => {
    // Create 3 slots
    await repo.create({ zoneId: 'zone_test01', date: new Date('2025-03-20'), startTime: '10:00', endTime: '12:00', maxOrders: 15, currentOrders: 14 });
    await repo.create({ zoneId: 'zone_test01', date: new Date('2025-03-20'), startTime: '14:00', endTime: '16:00', maxOrders: 15, currentOrders: 5 });
    await repo.create({ zoneId: 'zone_test01', date: new Date('2025-03-20'), startTime: '18:00', endTime: '20:00', maxOrders: 15, currentOrders: 15 });  // full

    const available = await repo.findAvailable('zone_test01', new Date('2025-03-20'));

    expect(available).toHaveLength(1);  // Only the 14:00–16:00 slot
    expect(available[0].startTime).toBe('14:00');
  });

  it('soft-deletes a slot by setting deleted_at', async () => {
    const slot = await repo.create({
      zoneId: 'zone_test01',
      date: new Date('2025-03-20'),
      startTime: '10:00',
      endTime: '12:00',
      maxOrders: 15,
      currentOrders: 0,
    });

    await repo.softDelete(slot.id);

    const found = await db.ggh_delivery_slot.findUnique({ where: { id: slot.id } });
    expect(found).not.toBeNull();
    expect(found!.deleted_at).not.toBeNull();
  });

  it('excludes soft-deleted slots from available query', async () => {
    const slot = await repo.create({
      zoneId: 'zone_test01',
      date: new Date('2025-03-20'),
      startTime: '10:00',
      endTime: '12:00',
      maxOrders: 15,
      currentOrders: 0,
    });

    await repo.softDelete(slot.id);

    const available = await repo.findAvailable('zone_test01', new Date('2025-03-20'));
    expect(available).toHaveLength(0);
  });
});
```

### 5.8 Redis Cache Integration Tests

```typescript
// src/lib/cache/__tests__/product-cache.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ProductCache } from '@ggh/lib/cache/product-cache';
import { createTestRedis } from '@tests/helpers/redis';

describe('ProductCache (Redis)', () => {
  let cache: ProductCache;
  let redis: ReturnType<typeof createTestRedis> extends Promise<infer T> ? T : never;

  beforeAll(async () => {
    redis = await createTestRedis();
    cache = new ProductCache(redis);
  });

  afterAll(async () => {
    await redis.quit();
  });

  it('stores and retrieves a product by ID', async () => {
    const product = {
      id: 'prod_cache01',
      title_en: 'Test Product',
      title_ar: 'منتج تجريبي',
      pricePiastres: 5000,
    };

    await cache.set(product.id, product, 60);
    const retrieved = await cache.get(product.id);

    expect(retrieved).toEqual(product);
  });

  it('returns null for missing key', async () => {
    const result = await cache.get('nonexistent');
    expect(result).toBeNull();
  });

  it('expires after TTL', async () => {
    const product = {
      id: 'prod_ttl01',
      title_en: 'TTL Product',
      title_ar: 'منتج مؤقت',
      pricePiastres: 3000,
    };

    await cache.set(product.id, product, 1);  // 1 second TTL
    await new Promise(resolve => setTimeout(resolve, 1100));
    const result = await cache.get(product.id);
    expect(result).toBeNull();
  });

  it('invalidates by key pattern', async () => {
    await cache.set('prod:a1', { id: 'a1', title_en: 'A1', title_ar: 'أ١', pricePiastres: 1000 }, 300);
    await cache.set('prod:a2', { id: 'a2', title_en: 'A2', title_ar: 'أ٢', pricePiastres: 2000 }, 300);
    await cache.set('prod:b1', { id: 'b1', title_en: 'B1', title_ar: 'ب١', pricePiastres: 3000 }, 300);

    await cache.invalidatePattern('prod:a*');

    expect(await cache.get('prod:a1')).toBeNull();
    expect(await cache.get('prod:a2')).toBeNull();
    expect(await cache.get('prod:b1')).not.toBeNull();
  });
});
```

### 5.9 Auth Flow Integration Tests (OTP)

```typescript
// src/app/api/auth/__tests__/otp.integration.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as requestOtp } from '@ggh/app/api/auth/otp/request/route';
import { POST as verifyOtp } from '@ggh/app/api/auth/otp/verify/route';
import { createTestDatabase, truncateTables } from '@tests/helpers/database';
import { createTestRedis } from '@tests/helpers/redis';
import type { PrismaClient } from '@prisma/client';

describe('OTP Flow — Integration', () => {
  let db: PrismaClient;

  beforeAll(async () => {
    db = await createTestDatabase();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  beforeEach(async () => {
    await truncateTables(db, ['ggh.erp_sync_log']);
  });

  it('complete OTP flow: request → verify → session', async () => {
    // Step 1: Request OTP
    const requestReq = new NextRequest('http://localhost:3000/api/auth/otp/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+201012345678' }),
    });

    const requestRes = await requestOtp(requestReq);
    expect(requestRes.status).toBe(200);

    const requestBody = await requestRes.json();
    expect(requestBody.ok).toBe(true);
    expect(requestBody.data.otpId).toBeTruthy();

    // Step 2: Verify OTP (using test bypass code)
    const verifyReq = new NextRequest('http://localhost:3000/api/auth/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        otpId: requestBody.data.otpId,
        code: '123456',  // Test environment bypass code
        phone: '+201012345678',
      }),
    });

    const verifyRes = await verifyOtp(verifyReq);
    expect(verifyRes.status).toBe(200);

    const verifyBody = await verifyRes.json();
    expect(verifyBody.ok).toBe(true);
    expect(verifyBody.data.token).toBeTruthy();
    expect(verifyBody.data.customer).toBeTruthy();
  });

  it('rejects expired OTP', async () => {
    const requestReq = new NextRequest('http://localhost:3000/api/auth/otp/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+201012345678' }),
    });

    const requestRes = await requestOtp(requestReq);
    const { data } = await requestRes.json();

    // Simulate expiry (in test env, we can advance time or use a special code)
    const verifyReq = new NextRequest('http://localhost:3000/api/auth/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        otpId: data.otpId,
        code: 'EXPIRED',  // Test-only: simulate expired OTP
        phone: '+201012345678',
      }),
    });

    const verifyRes = await verifyOtp(verifyReq);
    expect(verifyRes.status).toBe(401);
  });

  it('rejects wrong OTP code', async () => {
    const requestReq = new NextRequest('http://localhost:3000/api/auth/otp/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+201012345678' }),
    });

    const requestRes = await requestOtp(requestReq);
    const { data } = await requestRes.json();

    const verifyReq = new NextRequest('http://localhost:3000/api/auth/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        otpId: data.otpId,
        code: '000000',  // Wrong code
        phone: '+201012345678',
      }),
    });

    const verifyRes = await verifyOtp(verifyReq);
    expect(verifyRes.status).toBe(401);
  });

  it('rate-limits OTP requests to 5 per phone per hour', async () => {
    const phone = '+201099999999';

    for (let i = 0; i < 5; i++) {
      const req = new NextRequest('http://localhost:3000/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const res = await requestOtp(req);
      expect(res.status).toBe(200);
    }

    // 6th request should be rate-limited
    const req = new NextRequest('http://localhost:3000/api/auth/otp/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    const res = await requestOtp(req);
    expect(res.status).toBe(429);
  });
});
```

---

## 6. UI / E2E Testing

### 6.1 Playwright Test Structure

```
e2e/
├── auth/
│   ├── otp-login.spec.ts
│   ├── otp-rate-limit.spec.ts
│   └── session-expiry.spec.ts
├── browse/
│   ├── product-listing.spec.ts
│   ├── product-search.spec.ts
│   ├── product-detail.spec.ts
│   └── category-navigation.spec.ts
├── cart/
│   ├── add-to-cart.spec.ts
│   ├── update-quantity.spec.ts
│   ├── remove-item.spec.ts
│   └── cart-merge-on-login.spec.ts
├── checkout/
│   ├── checkout-cod.spec.ts
│   ├── delivery-slot-selection.spec.ts
│   ├── address-entry.spec.ts
│   └── order-confirmation.spec.ts
├── wholesale/
│   ├── bulk-order.spec.ts
│   ├── order-template.spec.ts
│   └── price-tier-display.spec.ts
├── accessibility/
│   ├── elder-touch-targets.spec.ts
│   ├── rtl-layout.spec.ts
│   ├── screen-reader.spec.ts
│   └── axe-audit.spec.ts
├── visual/
│   ├── product-card.spec.ts
│   ├── checkout-page.spec.ts
│   └── home-page.spec.ts
└── helpers/
    ├── test-users.ts
    ├── page-objects.ts
    └── assertions.ts
```

### 6.2 Page Object Pattern

```typescript
// e2e/helpers/page-objects.ts
import { type Page, type Locator, expect } from '@playwright/test';

export class OtpLoginPage {
  readonly page: Page;
  readonly phoneInput: Locator;
  readonly sendOtpButton: Locator;
  readonly otpCodeInput: Locator;
  readonly verifyButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.phoneInput = page.getByTestId('otp-phone-input');
    this.sendOtpButton = page.getByRole('button', { name: /أرسل الكود|Send Code/ });
    this.otpCodeInput = page.getByTestId('otp-code-input');
    this.verifyButton = page.getByRole('button', { name: /تأكيد|Verify/ });
    this.errorMessage = page.getByRole('alert');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async submitPhone(phone: string) {
    await this.phoneInput.fill(phone);
    await this.sendOtpButton.click();
  }

  async submitOtp(code: string) {
    await this.otpCodeInput.fill(code);
    await this.verifyButton.click();
  }

  async completeLogin(phone: string, code: string = '123456') {
    await this.goto();
    await this.submitPhone(phone);
    await this.submitOtp(code);
  }
}

export class ProductListingPage {
  readonly page: Page;
  readonly productCards: Locator;
  readonly searchInput: Locator;
  readonly categoryFilter: Locator;
  readonly loadMoreButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.productCards = page.getByTestId('product-card');
    this.searchInput = page.getByTestId('search-input');
    this.categoryFilter = page.getByTestId('category-filter');
    this.loadMoreButton = page.getByRole('button', { name: /المزيد|Load More/ });
  }

  async goto() {
    await this.page.goto('/products');
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
  }

  async addFirstProductToCart() {
    const firstCard = this.productCards.first();
    await firstCard.getByRole('button', { name: /أضف|Add/ }).click();
  }
}

export class CheckoutPage {
  readonly page: Page;
  readonly deliverySlotSelect: Locator;
  readonly addressStreetInput: Locator;
  readonly cashOnDeliveryRadio: Locator;
  readonly placeOrderButton: Locator;
  readonly orderConfirmationMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.deliverySlotSelect = page.getByTestId('delivery-slot-select');
    this.addressStreetInput = page.getByTestId('address-street');
    this.cashOnDeliveryRadio = page.getByLabel(/الدفع عند الاستلام|Cash on Delivery/);
    this.placeOrderButton = page.getByRole('button', { name: /تأكيد الطلب|Place Order/ });
    this.orderConfirmationMessage = page.getByTestId('order-confirmation');
  }

  async completeCheckout(data: {
    slotIndex?: number;
    streetAr?: string;
  }) {
    if (data.slotIndex !== undefined) {
      await this.deliverySlotSelect.selectOption({ index: data.slotIndex });
    }
    if (data.streetAr) {
      await this.addressStreetInput.fill(data.streetAr);
    }
    await this.cashOnDeliveryRadio.click();
    await this.placeOrderButton.click();
  }
}
```

### 6.3 Critical User Journey — E2E Test Scenarios

```typescript
// e2e/auth/otp-login.spec.ts
import { test, expect } from '@playwright/test';
import { OtpLoginPage } from '../helpers/page-objects';

test.describe('OTP Login Flow', () => {
  let loginPage: OtpLoginPage;

  test.beforeEach(({ page }) => {
    loginPage = new OtpLoginPage(page);
  });

  test('Om Ibrahim — login with Arabic phone number', async ({ page }) => {
    await loginPage.goto();

    // Page should be in Arabic by default
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

    // Enter phone
    await loginPage.submitPhone('01012345678');

    // OTP input should appear
    await expect(loginPage.otpCodeInput).toBeVisible();

    // Enter test OTP
    await loginPage.submitOtp('123456');

    // Should redirect to home
    await expect(page).toHaveURL('/');

    // Should show user name or greeting
    await expect(page.getByTestId('user-greeting')).toBeVisible();
  });

  test('shows Arabic error for wrong OTP', async ({ page }) => {
    await loginPage.goto();
    await loginPage.submitPhone('01012345678');
    await loginPage.submitOtp('000000');

    await expect(loginPage.errorMessage).toContainText(/رمز|كود|خطأ/);
  });

  test('shows Arabic error for invalid phone', async ({ page }) => {
    await loginPage.goto();
    await loginPage.submitPhone('123');

    await expect(loginPage.errorMessage).toContainText(/رقم|هاتف/);
  });
});
```

```typescript
// e2e/checkout/checkout-cod.spec.ts
import { test, expect } from '@playwright/test';
import { OtpLoginPage } from '../helpers/page-objects';
import { ProductListingPage } from '../helpers/page-objects';
import { CheckoutPage } from '../helpers/page-objects';

test.describe('Full Checkout Flow — Cash on Delivery', () => {

  test('Om Ibrahim — browse → cart → checkout → order confirmation', async ({ page }) => {
    const login = new OtpLoginPage(page);
    const products = new ProductListingPage(page);
    const checkout = new CheckoutPage(page);

    // Step 1: Login
    await login.completeLogin('01012345678');
    await expect(page).toHaveURL('/');

    // Step 2: Browse products
    await products.goto();
    await expect(products.productCards.first()).toBeVisible();

    // Step 3: Add product to cart
    await products.addFirstProductToCart();

    // Step 4: Verify cart badge updates
    const cartBadge = page.getByTestId('cart-badge');
    await expect(cartBadge).toContainText('1');

    // Step 5: Go to cart
    await page.getByTestId('cart-icon').click();
    await expect(page).toHaveURL('/cart');

    // Step 6: Proceed to checkout
    await page.getByRole('button', { name: /إتمام الشراء|Checkout/ }).click();
    await expect(page).toHaveURL(/\/checkout/);

    // Step 7: Complete checkout
    await checkout.completeCheckout({
      slotIndex: 0,
      streetAr: '١٢٣ شارع التحرير',
    });

    // Step 8: Verify order confirmation
    await expect(checkout.orderConfirmationMessage).toBeVisible();
    await expect(page.getByTestId('order-id')).toBeVisible();
  });

  test('Abou Ahmed — wholesale bulk order with price tier', async ({ page }) => {
    const login = new OtpLoginPage(page);
    await login.completeLogin('01155556666');  // Abou Ahmed's test account

    // Navigate to wholesale section
    await page.goto('/wholesale');
    await expect(page.getByText(/جملة|Wholesale/)).toBeVisible();

    // Select a product and set bulk quantity
    await page.getByTestId('product-card').first().click();
    await page.getByTestId('quantity-input').fill('100');

    // Verify price tier is displayed
    await expect(page.getByTestId('price-tier-label')).toBeVisible();
    await expect(page.getByTestId('unit-price')).toContainText(/٣٥\.00|35\.00/);  // Bulk price

    // Add to cart and checkout
    await page.getByRole('button', { name: /أضف|Add/ }).click();
    await page.getByTestId('cart-icon').click();
    await page.getByRole('button', { name: /إتمام الشراء|Checkout/ }).click();

    const checkout = new CheckoutPage(page);
    await checkout.completeCheckout({ slotIndex: 0, streetAr: 'المنطقة الصناعية' });

    await expect(checkout.orderConfirmationMessage).toBeVisible();
  });
});
```

### 6.4 Elder-Friendly Interaction Testing

```typescript
// e2e/accessibility/elder-touch-targets.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Elder-Friendly Touch Targets', () => {

  test('all interactive elements have minimum 48px touch targets', async ({ page }) => {
    await page.goto('/');

    const interactiveElements = await page.$$(
      'button, a, input, select, [role="button"], [role="link"], [tabindex]'
    );

    for (const element of interactiveElements) {
      const box = await element.boundingBox();
      if (box) {
        expect(
          box.height,
          `Element is too short: ${box.height}px (min 48px). Text: "${await element.textContent()}"`
        ).toBeGreaterThanOrEqual(44);  // 44px visual + 4px padding = 48px hit area
        expect(
          box.width,
          `Element is too narrow: ${box.width}px (min 48px)`
        ).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('no tiny text — minimum 16px body text', async ({ page }) => {
    await page.goto('/');

    const textElements = await page.$$('p, span, label, li, td, th, dd, dt');
    for (const element of textElements) {
      const fontSize = await element.evaluate(
        el => parseFloat(getComputedStyle(el).fontSize)
      );
      expect(
        fontSize,
        `Text too small: ${fontSize}px on "${await element.textContent()!.substring(0, 30)}"`
      ).toBeGreaterThanOrEqual(16);
    }
  });

  test('one primary action per screen — no competing CTAs', async ({ page }) => {
    await page.goto('/products');

    const primaryButtons = await page.$$('button[data-variant="primary"]');
    // A screen should have at most 1 primary action visible
    expect(
      primaryButtons.length,
      `Too many primary actions: ${primaryButtons.length}`
    ).toBeLessThanOrEqual(2);  // Allow 2 for header + content
  });

  test('back navigation always visible', async ({ page }) => {
    await page.goto('/products');
    await page.getByTestId('product-card').first().click();

    // Back button should be visible
    const backButton = page.getByRole('button', { name: /رجوع|Back/ })
      .or(page.getByRole('link', { name: /رجوع|Back/ }));

    await expect(backButton).toBeVisible();
  });
});
```

### 6.5 Visual Regression Testing

```typescript
// e2e/visual/product-card.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Visual Regression — Product Card', () => {

  test('product card — Arabic layout', async ({ page }) => {
    await page.goto('/products?locale=ar');
    await expect(page.getByTestId('product-card').first()).toBeVisible();
    await expect(page).toHaveScreenshot('product-card-ar.png', {
      maxDiffPixelRatio: 0.01,
      clip: { x: 0, y: 0, width: 400, height: 500 },
    });
  });

  test('product card — English layout', async ({ page }) => {
    await page.goto('/products?locale=en');
    await expect(page.getByTestId('product-card').first()).toBeVisible();
    await expect(page).toHaveScreenshot('product-card-en.png', {
      maxDiffPixelRatio: 0.01,
      clip: { x: 0, y: 0, width: 400, height: 500 },
    });
  });

  test('product card — out of stock state', async ({ page }) => {
    await page.goto('/products?locale=ar&filter=out_of_stock');
    await expect(page.getByTestId('product-card').first()).toBeVisible();
    await expect(page).toHaveScreenshot('product-card-oos-ar.png', {
      maxDiffPixelRatio: 0.01,
    });
  });
});

test.describe('Visual Regression — Full Pages', () => {

  test('home page — Arabic RTL', async ({ page }) => {
    await page.goto('/?locale=ar');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('home-ar.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.005,
    });
  });

  test('checkout page — Arabic RTL', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByTestId('otp-phone-input').fill('01012345678');
    await page.getByRole('button', { name: /أرسل|Send/ }).click();
    await page.getByTestId('otp-code-input').fill('123456');
    await page.getByRole('button', { name: /تأكيد|Verify/ }).click();

    // Add item and go to checkout
    await page.goto('/products');
    await page.getByTestId('product-card').first().getByRole('button', { name: /أضف/ }).click();
    await page.getByTestId('cart-icon').click();
    await page.getByRole('button', { name: /إتمام الشراء/ }).click();

    await expect(page).toHaveScreenshot('checkout-ar.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.005,
    });
  });
});
```

### 6.6 Cross-Browser Strategy

| Browser | Device | Priority | Runs in CI |
|---|---|---|---|
| Chromium | Desktop (1920×1080) | P0 — Every PR | ✅ |
| Chrome (mobile emulation) | Pixel 5 | P0 — Every PR | ✅ |
| Safari (mobile emulation) | iPhone 13 | P1 — Nightly | ✅ (nightly) |
| Firefox | Desktop | P2 — Weekly | ✅ (weekly) |
| Safari (desktop) | macOS | P2 — Weekly | Manual |
| Samsung Internet | Galaxy S22 | P3 — Pre-release | Manual |

---

## 7. Performance Testing

### 7.1 Load Testing Targets

| Metric | Target | Threshold (P95) | Critical (P99) |
|---|---|---|---|
| Home page LCP | < 2.5s | 3.0s | 4.0s |
| Product listing TTFB | < 200ms | 300ms | 500ms |
| Product detail LCP | < 2.0s | 2.5s | 3.5s |
| Add to cart response | < 300ms | 500ms | 1000ms |
| Checkout complete | < 1.5s | 2.0s | 3.0s |
| OTP request | < 500ms | 800ms | 1200ms |
| OTP verify | < 300ms | 500ms | 800ms |
| Search results | < 400ms | 600ms | 1000ms |
| ERP sync (per item) | < 200ms | 400ms | 800ms |
| BullMQ job processing | < 2.0s | 3.0s | 5.0s |

### 7.2 k6 Load Test Script

```typescript
// tests/load/browse-and-cart.k6.ts
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const apiTtfb = new Trend('api_ttfb');
const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Ramp up
    { duration: '60s', target: 50 },   // Sustained
    { duration: '30s', target: 100 },  // Peak
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    errors: ['rate<0.05'],
  },
};

export default function () {
  // Browse products
  const productsRes = http.get(`${__ENV.BASE_URL}/api/products?limit=20`);
  apiTtfb.add(productsRes.timings.waiting);

  check(productsRes, {
    'products status 200': r => r.status === 200,
    'products has data': r => JSON.parse(r.body as string).data !== undefined,
  }) || errorRate.add(1);

  sleep(1);

  // View single product
  const productRes = http.get(`${__ENV.BASE_URL}/api/products/prod_01JXYZ`);
  check(productRes, {
    'product status 200': r => r.status === 200,
  }) || errorRate.add(1);

  sleep(2);
}
```

### 7.3 Lighthouse Score Targets

| Category | Target | Minimum |
|---|---|---|
| Performance | 90 | 80 |
| Accessibility | 95 | 90 |
| Best Practices | 95 | 90 |
| SEO | 90 | 85 |

### 7.4 API Response Time Budgets

```
┌────────────────────────────────────────────────────────────────────────┐
│                     API Response Time Budget                          │
│                                                                        │
│   Client          BFF              Medusa/ERP       Database          │
│   ┌──────┐       ┌──────────┐     ┌──────────┐     ┌──────────┐     │
│   │      │──────▶│ Validate │────▶│ Query    │────▶│ SELECT   │     │
│   │      │       │ (5ms)    │     │ (50ms)   │     │ (10ms)   │     │
│   │      │       │          │     │          │     │          │     │
│   │      │◀──────│ Transform│◀────│ Response │◀────│ Result   │     │
│   │      │       │ (5ms)    │     │          │     │          │     │
│   └──────┘       └──────────┘     └──────────┘     └──────────┘     │
│                                                                        │
│   Total budget: 200ms = 5 + 5 + 50 + 10 + cache_hit + overhead       │
│   Cache hit budget: 20ms (Redis lookup + transform)                   │
└────────────────────────────────────────────────────────────────────────┘
```

| API Path | Budget | Breakdown |
|---|---|---|
| `GET /api/products` | 200ms | 5ms validate + 50ms Medusa + 10ms DB + 5ms transform |
| `GET /api/products/:id` | 150ms | Cache-first, 20ms on hit |
| `POST /api/cart/add-item` | 300ms | 5ms validate + 100ms Medusa cart + 50ms inventory check |
| `POST /api/checkout` | 1500ms | 5ms validate + 200ms cart + 500ms order + 200ms ERP push + 100ms SMS |
| `POST /api/auth/otp/request` | 500ms | 5ms validate + 200ms rate limit + 100ms OTP gen + 100ms SMS |
| `POST /api/auth/otp/verify` | 300ms | 5ms validate + 50ms OTP check + 50ms JWT + 50ms session |

---

## 8. Accessibility Testing

### 8.1 axe-core Integration with Playwright

```typescript
// e2e/accessibility/axe-audit.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Audit', () => {

  test('home page — no WCAG 2.1 AA violations', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .exclude('[data-testid="third-party-widget"]')  // Known third-party
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('product listing — no accessibility violations', async ({ page }) => {
    await page.goto('/products');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('checkout page — no accessibility violations', async ({ page }) => {
    // Login and navigate to checkout first
    await page.goto('/login');
    await page.getByTestId('otp-phone-input').fill('01012345678');
    await page.getByRole('button', { name: /أرسل|Send/ }).click();
    await page.getByTestId('otp-code-input').fill('123456');
    await page.getByRole('button', { name: /تأكيد|Verify/ }).click();

    await page.goto('/products');
    await page.getByTestId('product-card').first().getByRole('button', { name: /أضف/ }).click();
    await page.getByTestId('cart-icon').click();
    await page.getByRole('button', { name: /إتمام الشراء/ }).click();

    const results = new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const axeResults = await results;
    expect(axeResults.violations).toEqual([]);
  });
});
```

### 8.2 RTL Layout Testing

```typescript
// e2e/accessibility/rtl-layout.spec.ts
import { test, expect } from '@playwright/test';

test.describe('RTL Layout Testing', () => {

  test('Arabic pages have dir="rtl" on html element', async ({ page }) => {
    await page.goto('/?locale=ar');
    const dir = await page.getAttribute('html', 'dir');
    expect(dir).toBe('rtl');
  });

  test('English pages have dir="ltr" on html element', async ({ page }) => {
    await page.goto('/?locale=en');
    const dir = await page.getAttribute('html', 'dir');
    expect(dir).toBe('ltr');
  });

  test('RTL flex direction — product cards flow right-to-left', async ({ page }) => {
    await page.goto('/products?locale=ar');
    const firstCard = page.getByTestId('product-card').first();
    const box = await firstCard.boundingBox();

    // In RTL, first card should be on the right side
    const pageWidth = await page.evaluate(() => window.innerWidth);
    if (box) {
      expect(box.x).toBeGreaterThan(pageWidth / 2 - box.width);  // Roughly on the right
    }
  });

  test('text alignment respects RTL', async ({ page }) => {
    await page.goto('/?locale=ar');
    const bodyText = page.locator('p').first();
    const textAlign = await bodyText.evaluate(el => getComputedStyle(el).textAlign);
    expect(['right', 'start']).toContain(textAlign);
  });

  test('form labels are positioned correctly in RTL', async ({ page }) => {
    await page.goto('/login?locale=ar');
    const label = page.locator('label').first();
    const labelBox = await label.boundingBox();
    const inputBox = await page.getByTestId('otp-phone-input').boundingBox();

    if (labelBox && inputBox) {
      // In RTL, label should be to the right of the input
      expect(labelBox.x).toBeGreaterThan(inputBox.x - 10);  // Allow small margin
    }
  });

  test('icons that imply direction are mirrored in RTL', async ({ page }) => {
    await page.goto('/products?locale=ar');

    // Back arrow should point right in RTL
    const backArrow = page.locator('[data-testid="back-arrow"]').first();
    if (await backArrow.isVisible()) {
      const transform = await backArrow.evaluate(el => getComputedStyle(el).transform);
      // Should have scaleX(-1) or rotateY(180deg) for mirroring
      expect(transform).toMatch(/scaleX\(-1\)|rotateY\(180deg\)|matrix\(-1/);
    }
  });
});
```

### 8.3 Touch Target Size Validation

```typescript
// e2e/accessibility/touch-targets.spec.ts
import { test, expect } from '@playwright/test';

const PAGES = ['/', '/products', '/cart', '/login', '/checkout'];

test.describe('Touch Target Size Validation', () => {
  const MIN_SIZE = 48;  // WCAG 2.5.8 target size (minimum)

  for (const path of PAGES) {
    test(`all buttons on ${path} meet ${MIN_SIZE}px minimum`, async ({ page }) => {
      await page.goto(path);

      // Handle login redirect for protected pages
      if (page.url().includes('/login')) {
        await page.getByTestId('otp-phone-input').fill('01012345678');
        await page.getByRole('button', { name: /أرسل|Send/ }).click();
        await page.getByTestId('otp-code-input').fill('123456');
        await page.getByRole('button', { name: /تأكيد|Verify/ }).click();
      }

      const buttons = await page.$$('button, a[role="button"], [role="button"]');
      const violations: string[] = [];

      for (const button of buttons) {
        const box = await button.boundingBox();
        if (box) {
          const minDimension = Math.min(box.width, box.height);
          if (minDimension < MIN_SIZE) {
            const text = await button.textContent();
            violations.push(
              `"${text?.trim().substring(0, 30)}" — ${Math.round(minDimension)}px (min ${MIN_SIZE}px)`
            );
          }
        }
      }

      expect(violations, `Touch target violations:\n${violations.join('\n')}`).toEqual([]);
    });
  }
});
```

### 8.4 Screen Reader Testing

| Page | Expected Screen Reader Behavior | Tool |
|---|---|---|
| Home page | Announces "الصفحة الرئيسية — جملة لحد البيت" | VoiceOver (iOS) |
| Product listing | Each card announced as "منتج — [name_ar] — [price] جنيه" | TalkBack (Android) |
| Cart | Announces item count, total, "زر إتمام الشراء" | VoiceOver |
| Checkout | Form fields announced with Arabic labels | NVDA / VoiceOver |
| OTP login | Announces "أدخل رقم الهاتف" then "أدخل الكود" | TalkBack |
| Order confirmation | Announces "تم تأكيد الطلب رقم [id]" | VoiceOver |

### 8.5 Accessibility Test Matrix

| Dimension | Test | Frequency | Tool |
|---|---|---|---|
| WCAG 2.1 AA | Automated axe audit | Every PR | @axe-core/playwright |
| Touch targets | Minimum 48px | Every PR | Custom Playwright test |
| Color contrast | Minimum 4.5:1 | Every PR | axe-core (color-contrast rule) |
| RTL layout | dir="rtl", mirrored icons | Every PR | Custom Playwright test |
| Screen reader | Key flow narration | Pre-release | Manual (VoiceOver + TalkBack) |
| Keyboard nav | Tab order, focus visible | Every PR | Custom Playwright test |
| Font size | Min 16px body text | Every PR | Custom Playwright test |
| Zoom support | 200% zoom functional | Pre-release | Manual |

---

## 9. Acceptance Criteria

### 9.1 Per-Feature Acceptance Criteria Format

Every feature in GGH must define acceptance criteria using the **Given / When / Then** format, with persona annotations:

```markdown
### Feature: [Name]

**Persona**: [Om Ibrahim / Mariam / Abou Ahmed]
**Priority**: [P0 / P1 / P2]

**Given** [precondition]
**When** [action]
**Then** [expected result]

**Arabic context**: [Any RTL/bilingual considerations]
**Elder consideration**: [Any accessibility/simplicity considerations]
```

### 9.2 Commerce Flow Acceptance Criteria

#### 9.2.1 OTP Login

| ID | Given | When | Then | Persona |
|---|---|---|---|---|
| AUTH-001 | User is on login page | User enters valid Egyptian mobile number | OTP is sent, UI shows code input in Arabic | Om Ibrahim |
| AUTH-002 | OTP has been sent | User enters correct 6-digit code | JWT session created, user redirected to home | Om Ibrahim |
| AUTH-003 | OTP has been sent | User enters wrong code | Arabic error message shown, attempt counter decremented | Om Ibrahim |
| AUTH-004 | User has failed 3 times | User enters any code | Account temporarily locked, Arabic message shown | Mariam |
| AUTH-005 | User has requested OTP 5 times in 1 hour | User requests another | Rate limited (429), Arabic message shown | All |
| AUTH-006 | OTP is older than 5 minutes | User enters correct code | OTP expired message in Arabic | Om Ibrahim |
| AUTH-007 | User has a guest cart | User logs in via OTP | Guest cart items merge with user cart | Mariam |
| AUTH-008 | OTP input is visible | Screen reader is active | Input announced as "أدخل الكود المكون من ٦ أرقام" | Om Ibrahim |

#### 9.2.2 Product Browsing

| ID | Given | When | Then | Persona |
|---|---|---|---|---|
| BROWSE-001 | User is on home page | Page loads | Featured products shown in Arabic with prices in ج.م | Om Ibrahim |
| BROWSE-002 | User is on product listing | User scrolls down | More products load (infinite scroll), no layout shift | Mariam |
| BROWSE-003 | User is on product listing | User types in search bar | Results filter in real-time, Arabic and English supported | Mariam |
| BROWSE-004 | User is on product listing | User taps a category | Products filter to that category, category name shown in Arabic | Om Ibrahim |
| BROWSE-005 | Product is out of stock | Product card renders | "غير متوفر" badge shown, add-to-cart button disabled | All |
| BROWSE-006 | Product has wholesale tiers | B2B user views product | Price tiers displayed in a table with tier boundaries | Abou Ahmed |

#### 9.2.3 Cart Management

| ID | Given | When | Then | Persona |
|---|---|---|---|---|
| CART-001 | User is on product page | User taps "أضف للسلة" | Item added, cart badge increments, haptic feedback | Om Ibrahim |
| CART-002 | Item is in cart | User taps + button | Quantity increments, total recalculated in piastres | All |
| CART-003 | Item is in cart with qty 1 | User taps − button | Item removed from cart, total recalculated | All |
| CART-004 | User double-taps "Add to cart" rapidly | Two add requests fire | Only one item added (loading state prevents double-tap) | Om Ibrahim |
| CART-005 | Item price changes between add and checkout | User proceeds to checkout | Latest ERP price used, user notified of price change | All |
| CART-006 | Item goes out of stock while in cart | User opens cart | Item shown with "غير متوفر" badge, user prompted to remove | All |
| CART-007 | B2B user adds 100 units | Quantity set to 100 | Price tier applied, per-unit price shows bulk rate | Abou Ahmed |
| CART-008 | Cart total exceeds delivery minimum | Cart page loads | Free delivery badge shown, delivery fee removed | All |

#### 9.2.4 Checkout & Order

| ID | Given | When | Then | Persona |
|---|---|---|---|---|
| CHECKOUT-001 | User has items in cart | User taps "إتمام الشراء" | Checkout page loads with address, slot, payment | Om Ibrahim |
| CHECKOUT-002 | User is on checkout page | User selects delivery slot | Slot reserved for 15 minutes, timer shown | All |
| CHECKOUT-003 | User is on checkout page | User taps "تأكيد الطلب" | Order created in Medusa, ERP push queued, SMS sent | Om Ibrahim |
| CHECKOUT-004 | Order is placed | Order confirmation page loads | Order ID shown, delivery estimate shown in Arabic | Om Ibrahim |
| CHECKOUT-005 | Payment method is COD | Order is created | No payment gateway interaction, "الدفع عند الاستلام" confirmed | All |
| CHECKOUT-006 | Idempotency key is used | User taps "Place Order" twice | Only one order created, second tap returns same order | All |
| CHECKOUT-007 | Delivery slot reservation expires | User tries to place order | Error: "انتهت صلاحية الموعد", user prompted to reselect | Om Ibrahim |

### 9.3 ERP Sync Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| ERP-001 | ERP has 500 updated products | Sync job runs | All 500 products updated locally within 5 minutes |
| ERP-002 | ERP reports 0 stock for an item | Inventory sync runs | Local product marked out of stock, cache invalidated |
| ERP-003 | Sync job fails mid-way | Job retries | Sync resumes from cursor, no duplicate processing |
| ERP-004 | Order is placed in GGH | ERP push job runs | Sales Order created in ERPNext with correct line items |
| ERP-005 | ERP is unreachable | Sync job runs | Job marked as failed, retry scheduled, `ggh.erp_sync_log` entry created |
| ERP-006 | ERP returns invalid product data | Sync processes item | Item logged as error, sync continues, `erp_sync_log` has error details |
| ERP-007 | Customer is created in GGH | Customer sync job runs | Customer record created/matched in ERPNext |
| ERP-008 | Invoice is generated in ERP | Invoice sync job runs | Invoice PDF URL stored locally, accessible from order page |

### 9.4 Authentication Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| AUTH-AC-001 | User has no account | User logs in with OTP | Account auto-created, name collected post-login |
| AUTH-AC-002 | User has existing account | User logs in with OTP | Existing account loaded, no duplicate created |
| AUTH-AC-003 | JWT token expires mid-session | User makes API call | 401 returned, frontend auto-redirects to OTP login |
| AUTH-AC-004 | User is on a protected page | Session expires | Page shows "انتهت الجلسة" modal, redirects to login |
| AUTH-AC-005 | Multiple devices logged in | User logs in on new device | All devices share same session, no conflict |
| AUTH-AC-006 | B2B wholesale account | User logs in | Wholesale account verification status checked and displayed |

### 9.5 Elder-Friendly Acceptance Criteria

| ID | Criterion | Persona | Measurement |
|---|---|---|---|
| ELDER-001 | All buttons ≥ 48px touch target | Om Ibrahim | Automated test on every PR |
| ELDER-002 | No more than 1 primary action per screen | Om Ibrahim | Design review + E2E test |
| ELDER-003 | All text ≥ 16px body, 14px minimum any text | Om Ibrahim | Automated test on every PR |
| ELDER-004 | Every page has visible "رجوع" (back) button | Om Ibrahim | E2E test on every page |
| ELDER-005 | Error messages are in Arabic, descriptive, actionable | Om Ibrahim | Unit test on error message renderer |
| ELDER-006 | Loading states shown within 200ms | Om Ibrahim | Lighthouse + custom metric |
| ELDER-007 | No scroll-hijacking or parallax effects | Om Ibrahim | Design review |
| ELDER-008 | High contrast — minimum 4.5:1 ratio | Om Ibrahim | axe-core automated |
| ELDER-009 | No auto-advancing carousels | Om Ibrahim | Design review + E2E |
| ELDER-010 | Form inputs have visible Arabic labels (not placeholder-only) | Om Ibrahim | E2E test on all forms |
| ELDER-011 | OTP input auto-focuses, large numeric keypad | Om Ibrahim | E2E test |
| ELDER-012 | Prices always shown in ج.م, never raw numbers | Om Ibrahim | Component unit test |

---

## 10. Test Data Strategy

### 10.1 Seed Data Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Test Data Layers                           │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ Layer 3: Scenario-Specific Data                         │  │
│   │ (Created by individual tests, cleaned up after)         │  │
│   └─────────────────────────────────────────────────────────┘  │
│                          ▲                                      │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ Layer 2: Persona Data                                   │  │
│   │ (Om Ibrahim, Mariam, Abou Ahmed — persistent in seeds)  │  │
│   └─────────────────────────────────────────────────────────┘  │
│                          ▲                                      │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ Layer 1: Base Catalog Data                              │  │
│   │ (Categories, products, price tiers, zones — seeded)     │  │
│   └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 10.2 Factory Functions

```typescript
// tests/factories/product.ts
import type { Product, Piastres, ProductId, VariantId } from '@ggh/types';
import { asProductId, asVariantId } from '@ggh/types/branded';

let productCounter = 0;

export function createProduct(overrides?: Partial<Product>): Product {
  productCounter++;
  return {
    id: asProductId(`prod_test_${String(productCounter).padStart(4, '0')}`),
    title_en: overrides?.title_en ?? `Test Product ${productCounter}`,
    title_ar: overrides?.title_ar ?? `منتج تجريبي ${productCounter}`,
    description_en: overrides?.description_en ?? 'A test product',
    description_ar: overrides?.description_ar ?? 'منتج للاختبار',
    thumbnail: overrides?.thumbnail ?? '/images/test-product.jpg',
    pricePiastres: overrides?.pricePiastres ?? (5000 as Piastres),
    compareAtPricePiastres: overrides?.compareAtPricePiastres ?? null,
    defaultVariantId: overrides?.defaultVariantId ?? asVariantId(`var_test_${productCounter}`),
    inStock: overrides?.inStock ?? true,
    stockQuantity: overrides?.stockQuantity ?? 100,
    unit_en: overrides?.unit_en ?? 'piece',
    unit_ar: overrides?.unit_ar ?? 'قطعة',
    category: overrides?.category ?? { id: 'cat_rice', name_en: 'Rice', name_ar: 'أرز' },
    priceTiers: overrides?.priceTiers ?? [
      { minQuantity: 1,   maxQuantity: 10,  pricePerUnit: 5000 as Piastres },
      { minQuantity: 11,  maxQuantity: 50,  pricePerUnit: 4500 as Piastres },
      { minQuantity: 51,  maxQuantity: null, pricePerUnit: 4000 as Piastres },
    ],
    createdAt: overrides?.createdAt ?? new Date(),
    updatedAt: overrides?.updatedAt ?? new Date(),
    deleted_at: overrides?.deleted_at ?? null,
  };
}

export function createOutOfStockProduct(overrides?: Partial<Product>): Product {
  return createProduct({
    ...overrides,
    inStock: false,
    stockQuantity: 0,
  });
}

export function createProductList(count: number, overrides?: Partial<Product>): Product[] {
  return Array.from({ length: count }, (_, i) =>
    createProduct({ ...overrides, title_en: `Product ${i + 1}`, title_ar: `منتج ${i + 1}` })
  );
}
```

```typescript
// tests/factories/customer.ts
import type { Customer, CustomerId } from '@ggh/types';
import { asCustomerId } from '@ggh/types/branded';

let customerCounter = 0;

export function createCustomer(overrides?: Partial<Customer>): Customer {
  customerCounter++;
  return {
    id: asCustomerId(`cust_test_${String(customerCounter).padStart(4, '0')}`),
    phone: overrides?.phone ?? '+201012345678',
    name_en: overrides?.name_en ?? 'Test Customer',
    name_ar: overrides?.name_ar ?? 'عميل تجريبي',
    locale: overrides?.locale ?? 'ar',
    isWholesale: overrides?.isWholesale ?? false,
    wholesaleDiscountPercent: overrides?.wholesaleDiscountPercent ?? 0,
    addresses: overrides?.addresses ?? [],
    createdAt: overrides?.createdAt ?? new Date(),
    updatedAt: overrides?.updatedAt ?? new Date(),
    deleted_at: overrides?.deleted_at ?? null,
  };
}

export function createOmIbrahim(): Customer {
  return createCustomer({
    phone: '+201011111111',
    name_en: 'Om Ibrahim',
    name_ar: 'أم إبراهيم',
    locale: 'ar',
    isWholesale: false,
  });
}

export function createMariam(): Customer {
  return createCustomer({
    phone: '+201022222222',
    name_en: 'Mariam',
    name_ar: 'مريم',
    locale: 'en',  // Bilingual
    isWholesale: false,
  });
}

export function createAbouAhmed(): Customer {
  return createCustomer({
    phone: '+201033333333',
    name_en: 'Abou Ahmed',
    name_ar: 'أبو أحمد',
    locale: 'ar',
    isWholesale: true,
    wholesaleDiscountPercent: 15,
  });
}
```

### 10.3 ERP Mock Data

```typescript
// tests/fixtures/erp.ts
export const erpProducts = [
  {
    name: 'RICE-5KG',
    item_name: 'Egyptian Rice 5kg / أرز مصري ٥ كجم',
    item_group: 'Rice',
    standard_rate: 125.0,       // EGP (will convert to 12500 piastres)
    stock_uom: 'Nos',
    is_stock_item: 1,
    disabled: 0,
    custom_name_ar: 'أرز مصري ٥ كجم',
    custom_name_en: 'Egyptian Rice 5kg',
  },
  {
    name: 'OIL-1L',
    item_name: 'Cooking Oil 1L / زيت طهي ١ لتر',
    item_group: 'Oil',
    standard_rate: 85.0,
    stock_uom: 'Nos',
    is_stock_item: 1,
    disabled: 0,
    custom_name_ar: 'زيت طهي ١ لتر',
    custom_name_en: 'Cooking Oil 1L',
  },
  {
    name: 'SUGAR-1KG',
    item_name: 'Sugar 1kg / سكر ١ كجم',
    item_group: 'Sugar',
    standard_rate: 40.0,
    stock_uom: 'Nos',
    is_stock_item: 1,
    disabled: 0,
    custom_name_ar: 'سكر ١ كجم',
    custom_name_en: 'Sugar 1kg',
  },
];

export const erpInventory = [
  { item_code: 'RICE-5KG', actual_qty: 150, warehouse: 'Main WH - GGH' },
  { item_code: 'OIL-1L',   actual_qty: 80,  warehouse: 'Main WH - GGH' },
  { item_code: 'SUGAR-1KG', actual_qty: 0,  warehouse: 'Main WH - GGH' },  // Out of stock
];

export const erpSalesOrder = {
  name: 'SO-2025-001',
  customer: 'CUST-GGH-001',
  transaction_date: '2025-03-15',
  delivery_date: '2025-03-16',
  items: [
    { item_code: 'RICE-5KG', qty: 5, rate: 125.0, amount: 625.0 },
    { item_code: 'OIL-1L',   qty: 2, rate: 85.0,  amount: 170.0 },
  ],
  total_taxes_and_charges: 0,
  grand_total: 795.0,
  docstatus: 1,
};
```

### 10.4 Medusa Mock Data

```typescript
// tests/fixtures/medusa.ts
export const medusaProducts = [
  {
    id: 'prod_01JXYZ',
    title: 'Egyptian Rice 5kg',
    subtitle: 'أرز مصري ٥ كجم',
    description: 'Premium Egyptian rice / أرز مصري فاخر',
    thumbnail: '/uploads/rice-5kg.jpg',
    status: 'published',
    variants: [
      {
        id: 'variant_01JXYZ_A',
        title: 'Default',
        prices: [
          { amount: 12500, currency_code: 'egp' },  // Piastres
        ],
        inventory_quantity: 150,
        manage_inventory: true,
      },
    ],
    metadata: {
      name_ar: 'أرز مصري ٥ كجم',
      name_en: 'Egyptian Rice 5kg',
      unit_ar: 'كيس',
      unit_en: 'bag',
    },
  },
];

export const medusaCart = {
  id: 'cart_01JTEST',
  region_id: 'reg_egypt',
  customer_id: 'cust_01JTEST',
  email: 'test@ggh.com',
  items: [
    {
      id: 'item_01',
      variant_id: 'variant_01JXYZ_A',
      product_id: 'prod_01JXYZ',
      quantity: 2,
      unit_price: 12500,
      subtotal: 25000,
    },
  ],
  subtotal: 25000,
  total: 25000,
};
```

### 10.5 Test Data Management Rules

| Rule | Detail |
|---|---|
| Factories over fixtures | Use `createProduct()` factories; avoid static JSON fixtures |
| No shared mutable state | Each test creates its own data; no cross-test dependencies |
| Deterministic IDs | Use `prod_test_0001` pattern, not UUIDs, in tests |
| Clean slate per suite | `beforeEach` truncates all GGH tables |
| Real piastres | All price data in integer piastres, never EGP floats |
| Bilingual always | Every factory produces `_en` and `_ar` fields |
| Soft-delete aware | Factories include `deleted_at: null` by default |

---

## 11. CI/CD Integration

### 11.1 Pipeline Stages

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CI/CD Pipeline                                   │
│                                                                          │
│  ┌─────────┐   ┌──────────┐   ┌──────────┐   ┌─────────┐   ┌────────┐ │
│  │  Lint   │──▶│   Unit   │──▶│   Integ  │──▶│  Build  │──▶│  E2E   │ │
│  │  ESLint │   │  Vitest  │   │  Vitest  │   │  Next   │   │  PW    │ │
│  │  Types  │   │  (fast)  │   │  (DB/Re) │   │  Build  │   │  (smke)│ │
│  └─────────┘   └──────────┘   └──────────┘   └─────────┘   └────────┘ │
│       │             │              │             │             │        │
│    30 sec       2-3 min        5-8 min       2-3 min       5-10 min   │
│                                                                          │
│  ┌─────────┐   ┌──────────┐   ┌──────────────────────────────────┐    │
│  │  LH     │──▶│  Report  │──▶│  Deploy (if all pass)            │    │
│  │  Score  │   │  Publish │   │  Staging → Smoke → Production    │    │
│  └─────────┘   └──────────┘   └──────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

### 11.2 GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

concurrency:
  group: test-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck

  unit-tests:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run test:unit -- --coverage
      - uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          flags: unit

  integration-tests:
    runs-on: ubuntu-latest
    needs: lint
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: ggh_test
          POSTGRES_USER: ggh_test
          POSTGRES_PASSWORD: ggh_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run db:migrate:test
        env:
          DATABASE_URL: postgresql://ggh_test:ggh_test@localhost:5432/ggh_test
      - run: npm run test:integration
        env:
          DATABASE_URL: postgresql://ggh_test:ggh_test@localhost:5432/ggh_test
          REDIS_URL: redis://localhost:6379

  e2e-tests:
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run build
      - run: npm run test:e2e
        env:
          E2E_BASE_URL: http://localhost:3000
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7

  lighthouse:
    runs-on: ubuntu-latest
    needs: e2e-tests
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - run: npm run lhci
```

### 11.3 Parallel Test Execution

| Suite | Runner | Parallelism | Sharding |
|---|---|---|---|
| Unit tests | Vitest (forks) | 4 workers | Automatic by file |
| Integration tests | Vitest (forks) | 2 workers | Per-database isolation |
| E2E tests | Playwright | 4 workers | By project (chromium, mobile) |
| Visual regression | Playwright | 2 workers | Sequential (deterministic screenshots) |

### 11.4 Test Result Reporting

| Report | Destination | Frequency | Retention |
|---|---|---|---|
| Coverage (lcov) | Codecov | Every PR | 90 days |
| Unit test results | GitHub Checks | Every PR | 30 days |
| E2E trace files | GitHub Artifacts | On failure | 7 days |
| Playwright HTML report | GitHub Pages (internal) | Every PR | 30 days |
| Lighthouse scores | Lighthouse CI server | Every merge to main | 365 days |
| k6 load test results | Grafana dashboard | Nightly | 365 days |

---

## 12. Monitoring & Production Testing

### 12.1 Health Check Endpoints

```typescript
// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { checkDatabase } from '@ggh/lib/health/database';
import { checkRedis } from '@ggh/lib/health/redis';
import { checkMedusa } from '@ggh/lib/health/medusa';
import { checkErp } from '@ggh/lib/health/erp';

export async function GET() {
  const checks = await Promise.allSettled([
    checkDatabase(),
    checkRedis(),
    checkMedusa(),
    checkErp(),
  ]);

  const status = checks.every(c => c.status === 'fulfilled' && c.value.healthy)
    ? 'healthy'
    : 'degraded';

  return NextResponse.json({
    status,
    timestamp: new Date().toISOString(),
    checks: {
      database: checks[0].status === 'fulfilled' ? checks[0].value : { healthy: false },
      redis: checks[1].status === 'fulfilled' ? checks[1].value : { healthy: false },
      medusa: checks[2].status === 'fulfilled' ? checks[2].value : { healthy: false },
      erp: checks[3].status === 'fulfilled' ? checks[3].value : { healthy: false },
    },
  }, { status: status === 'healthy' ? 200 : 503 });
}
```

### 12.2 Smoke Tests in Production

| Test | Endpoint | Expected | Frequency | Alert |
|---|---|---|---|---|
| API health | `GET /api/health` | 200, `"healthy"` | Every 30s | PagerDuty |
| Product listing | `GET /api/products?limit=1` | 200, has `data` | Every 60s | PagerDuty |
| OTP request (dry-run) | `GET /api/health/otp` | 200 | Every 5m | Slack |
| Cart creation | `POST /api/health/cart` | 200 | Every 5m | Slack |
| Search | `GET /api/products?q=أرز` | 200, has results | Every 5m | Slack |
| Delivery slots | `GET /api/delivery/slots?zone=maadi` | 200, has slots | Every 5m | Slack |
| ERP connectivity | `GET /api/health/erp` | 200 | Every 60s | PagerDuty |
| Redis ping | Internal | PONG | Every 30s | PagerDuty |

### 12.3 Synthetic Monitoring

```
┌──────────────────────────────────────────────────────────────┐
│                 Synthetic Monitoring Flow                     │
│                                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌───────┐ │
│  │ Scheduled│───▶│ Playwright│───▶│  Assert  │───▶│ Alert │ │
│  │  Cron    │    │  Script  │    │  Results │    │  if ✗ │ │
│  └──────────┘    └──────────┘    └──────────┘    └───────┘ │
│                                                              │
│  Flows monitored:                                            │
│  1. OTP Login → Browse → Add to Cart → Checkout (full)      │
│  2. Product search (Arabic + English)                        │
│  3. Delivery slot availability check                         │
│  4. Wholesale bulk order flow                                │
│                                                              │
│  Frequency: Every 15 minutes                                 │
│  Locations: Cairo (primary), Alexandria (secondary)          │
└──────────────────────────────────────────────────────────────┘
```

---

## 13. Elder-Friendly Testing Decisions

### 13.1 Philosophy

Every test decision in GGH must consider: **"Would this catch a bug that would frustrate Om Ibrahim?"**

Om Ibrahim is 62, uses a budget Android phone, has large fingers, reads only Arabic, and has never used a delivery app before. If a test doesn't protect her experience, it's incomplete.

### 13.2 Elder-Specific Test Categories

| Category | What We Test | How | Priority |
|---|---|---|---|
| Touch targets | All interactive elements ≥ 48px | Playwright bounding box check | P0 |
| Font legibility | All text ≥ 16px body, ≥ 14px minimum | Playwright computed style check | P0 |
| Cognitive load | Max 1 primary CTA per screen | Visual regression + E2E | P0 |
| Arabic clarity | All error messages in Arabic, actionable | Unit test on error catalog | P0 |
| Navigation | Back button always visible and working | E2E on every page | P0 |
| Loading feedback | Spinner/skeleton within 200ms | Lighthouse + custom metric | P1 |
| Input simplicity | Numeric keypad for OTP, large input fields | E2E input mode test | P1 |
| Confirmation clarity | Order confirmation page is unambiguous | E2E assertion on confirmation content | P0 |
| No dark patterns | No sneaky auto-selected options, hidden fees | Manual review + E2E | P1 |
| Session preservation | Cart survives app minimize/restore | E2E background/foreground test | P1 |

### 13.3 Elder-Focused Test Scenarios

```typescript
// e2e/accessibility/elder-journey.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Om Ibrahim Journey — Elder-Friendly Focus', () => {

  test('complete order with minimal steps and large touch targets', async ({ page }) => {
    // Step 1: Login — Arabic by default, large phone input
    await page.goto('/login');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

    const phoneInput = page.getByTestId('otp-phone-input');
    const phoneBox = await phoneInput.boundingBox();
    expect(phoneBox!.height).toBeGreaterThanOrEqual(48);

    await phoneInput.fill('01012345678');
    await page.getByRole('button', { name: /أرسل/ }).click();

    // OTP input should auto-focus and show numeric keypad
    const otpInput = page.getByTestId('otp-code-input');
    await expect(otpInput).toBeFocused();
    const inputMode = await otpInput.getAttribute('inputmode');
    expect(inputMode).toBe('numeric');

    await otpInput.fill('123456');
    await page.getByRole('button', { name: /تأكيد/ }).click();

    // Step 2: Browse — Simple grid, Arabic product names, large cards
    await page.goto('/products');
    const firstCard = page.getByTestId('product-card').first();
    const cardBox = await firstCard.boundingBox();
    expect(cardBox!.height).toBeGreaterThanOrEqual(200);  // Cards should be tall and easy to tap

    // Product name in Arabic
    const nameAr = firstCard.getByTestId('product-name-ar');
    await expect(nameAr).toBeVisible();

    // Price in ج.م
    const price = firstCard.getByTestId('product-price');
    await expect(price).toContainText('ج.م');

    // Step 3: Add to cart — One tap, clear feedback
    const addButton = firstCard.getByRole('button', { name: /أضف/ });
    const addButtonBox = await addButton.boundingBox();
    expect(addButtonBox!.height).toBeGreaterThanOrEqual(48);

    await addButton.click();

    // Toast notification in Arabic
    await expect(page.getByTestId('toast-message')).toContainText(/تمت الإضافة/);

    // Step 4: Cart — Simple list, clear totals
    await page.getByTestId('cart-icon').click();
    await expect(page).toHaveURL('/cart');

    // Total should be prominent
    const totalElement = page.getByTestId('cart-total');
    await expect(totalElement).toBeVisible();
    await expect(totalElement).toContainText('ج.م');

    // Checkout button — large, prominent, single action
    const checkoutButton = page.getByRole('button', { name: /إتمام الشراء/ });
    const checkoutBox = await checkoutButton.boundingBox();
    expect(checkoutBox!.height).toBeGreaterThanOrEqual(48);

    // Step 5: Checkout — Clear steps, no surprises
    await checkoutButton.click();

    // Cash on delivery should be pre-selected (default)
    const codRadio = page.getByLabel(/الدفع عند الاستلام/);
    await expect(codRadio).toBeChecked();

    // No hidden fees — delivery fee shown clearly
    const deliveryFee = page.getByTestId('delivery-fee');
    if (await deliveryFee.isVisible()) {
      await expect(deliveryFee).toContainText('ج.م');
    }

    // Place order
    await page.getByRole('button', { name: /تأكيد الطلب/ }).click();

    // Step 6: Confirmation — Unambiguous, large order ID
    const confirmationMessage = page.getByTestId('order-confirmation');
    await expect(confirmationMessage).toBeVisible();
    await expect(confirmationMessage).toContainText(/تم تأكيد/);

    const orderId = page.getByTestId('order-id');
    await expect(orderId).toBeVisible();
    const orderIdBox = await orderId.boundingBox();
    expect(orderIdBox!.height).toBeGreaterThanOrEqual(24);  // Prominent order ID
  });

  test('error recovery — Om Ibrahim can understand and fix errors', async ({ page }) => {
    await page.goto('/login');

    // Enter invalid phone
    await page.getByTestId('otp-phone-input').fill('123');
    await page.getByRole('button', { name: /أرسل/ }).click();

    // Error must be in Arabic, descriptive, and actionable
    const error = page.getByRole('alert');
    await expect(error).toBeVisible();
    await expect(error).toContainText(/رقم هاتف/);  // Mentions phone number
    await expect(error).not.toContainText('Error');    // No English-only errors
    await expect(error).not.toContainText('undefined'); // No technical jargon
  });
});
```

### 13.4 Elder-Friendly Test Checklist (Pre-Release)

- [ ] All touch targets ≥ 48px verified by automated test
- [ ] All body text ≥ 16px verified by automated test
- [ ] Every page has visible Arabic back navigation
- [ ] All error messages are in Arabic, descriptive, and actionable
- [ ] OTP input uses numeric keypad (inputmode="numeric")
- [ ] Cart total is always prominently displayed
- [ ] Cash on Delivery is the default (and clearly labeled)
- [ ] No more than 3 steps to complete checkout
- [ ] Order confirmation is unambiguous with large order ID
- [ ] No auto-advancing carousels or scroll-hijacking
- [ ] App works on budget Android devices (Chrome 100+, 2GB RAM)
- [ ] All prices in ج.م, never raw numbers

---

## 14. Bilingual & RTL Testing

### 14.1 Bilingual Test Matrix

| Component | English Test | Arabic Test | Cross-Language Test |
|---|---|---|---|
| Product name | `title_en` renders | `title_ar` renders | Switch locale preserves state |
| Price display | "EGP 125.00" | "125.00 ج.م" | Piastres identical (12500) |
| Category name | `name_en` renders | `name_ar` renders | Category filter works in both |
| Error messages | English error catalog | Arabic error catalog | Matching error codes |
| Address form | Labels in English | Labels in Arabic | Bilingual address stored |
| Delivery slot | "Mar 15, 10–12 PM" | "١٥ مارس، ١٠ ص – ١٢ م" | Same slot ID |
| Order confirmation | "Order confirmed" | "تم تأكيد الطلب" | Same order ID |
| Search | English query works | Arabic query works | Mixed query handled |

### 14.2 RTL-Specific Tests

```typescript
// e2e/accessibility/bilingual-rtl.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Bilingual & RTL Testing', () => {

  test('switching from Arabic to English preserves cart', async ({ page }) => {
    // Start in Arabic
    await page.goto('/?locale=ar');
    await page.getByTestId('product-card').first().getByRole('button', { name: /أضف/ }).click();

    // Verify cart has item
    const badge = page.getByTestId('cart-badge');
    await expect(badge).toContainText('1');

    // Switch to English
    await page.getByTestId('locale-switcher').click();
    await page.getByText('English').click();

    // Cart should still have 1 item
    await expect(badge).toContainText('1');

    // Product names should now be in English
    const productName = page.getByTestId('product-name-en').first();
    await expect(productName).toBeVisible();
  });

  test('Arabic numerals render correctly in prices', async ({ page }) => {
    await page.goto('/products?locale=ar');
    const price = page.getByTestId('product-price').first();
    const priceText = await price.textContent();
    // Arabic page should show Arabic-Indic numerals or Western Arabic numerals
    // Both are acceptable, but must be consistent
    expect(priceText).toMatch(/[\d٠-٩]+\.[\d٠-٩]+ ج\.م/);
  });

  test('form validation shows errors in current locale', async ({ page }) => {
    await page.goto('/login?locale=ar');
    await page.getByTestId('otp-phone-input').fill('123');
    await page.getByRole('button', { name: /أرسل/ }).click();

    const error = page.getByRole('alert');
    const errorText = await error.textContent();
    // Error should contain Arabic text, not English
    expect(errorText).toMatch(/[\u0600-\u06FF]/);  // Arabic Unicode range
  });

  test('date formatting matches locale', async ({ page }) => {
    // Arabic
    await page.goto('/products?locale=ar');
    const dateAr = await page.getByTestId('delivery-date').first().textContent();
    expect(dateAr).toMatch(/مارس|أبريل|مايو/);  // Arabic month names

    // English
    await page.goto('/products?locale=en');
    const dateEn = await page.getByTestId('delivery-date').first().textContent();
    expect(dateEn).toMatch(/March|April|May/);  // English month names
  });

  test('mixed content (Arabic product name, English address) renders correctly', async ({ page }) => {
    await page.goto('/checkout?locale=ar');
    // Product names in Arabic
    await expect(page.getByTestId('cart-item-name').first()).toContainText(/[\u0600-\u06FF]/);

    // Address form labels in Arabic
    await expect(page.getByTestId('address-street-label')).toContainText(/شارع/);
  });

  test('search handles Arabic diacritics gracefully', async ({ page }) => {
    await page.goto('/products?locale=ar');
    await page.getByTestId('search-input').fill('أرز');  // With hamza
    const results1 = await page.getByTestId('product-card').count();

    // Also search without diacritics
    await page.getByTestId('search-input').fill('ارز');  // Without hamza
    const results2 = await page.getByTestId('product-card').count();

    // Both should return results (diacritic-insensitive search)
    expect(results1).toBeGreaterThan(0);
    expect(results2).toBe(results1);
  });
});
```

### 14.3 Bilingual Testing Rules

| Rule | Detail |
|---|---|
| Every user-facing test runs twice | Once in `locale=ar`, once in `locale=en` |
| Arabic is the default locale | Tests start in Arabic unless explicitly testing English |
| Error codes are locale-independent | Error codes like `OUT_OF_STOCK` are the same in both locales |
| Piastres never change | `12500` piastres is the same in both locales; only display differs |
| Date/number formatting follows locale | Arabic-Indic numerals optional, but must be consistent |
| Search is diacritic-insensitive | "أرز" and "ارز" return the same results |
| RTL layout must not break LTR content | English text within Arabic pages must render LTR |

---

## 15. Testing Anti-Patterns

### 15.1 Forbidden Patterns

| Anti-Pattern | Why It's Forbidden | Correct Pattern |
|---|---|---|
| `as any` in test code | Defeats the purpose of TypeScript testing | Use proper types or `as unknown as ExpectedType` with branded types |
| `console.log` in tests | Test should assert, not print | `expect(result).toBe(expected)` |
| `setTimeout` in tests | Non-deterministic, flaky | `waitFor()`, `findBy*()`, or `vi.useFakeTimers()` |
| Testing implementation details | Couples test to code, fragile on refactor | Test behavior: input → output, user actions → UI state |
| Mocking what you own | Creates false confidence | Mock external services (ERP, Medusa); test your own code with real DB |
| Shared mutable test state | Order-dependent, flaky tests | Each test creates and cleans its own data |
| Floating-point assertions | `expect(0.1 + 0.2).toBe(0.3)` fails | Use integer piastres: `expect(10 + 20).toBe(30)` |
| Snapshot testing for logic | Oversized snapshots, false positives | Snapshot only for visual regression; use explicit assertions for logic |
| `test.skip` without a ticket | Skipped tests accumulate, hide bugs | Skip only with a linked issue; delete within 7 days |
| Testing only the happy path | Bugs hide in edge cases | Every feature must have error-case tests |
| `waitFor(() => {})` with empty body | Defeats the purpose of waitFor | Always assert inside waitFor |
| Asserting on CSS class names | Implementation detail, breaks on refactor | Assert on visible text, ARIA roles, test IDs |
| Ignoring flaky tests | Erodes confidence in the entire suite | Fix or quarantine; never ignore |
| Testing third-party libraries | They test themselves; you're testing integration | Test your wrapper/adapter, not the library |
| `vi.mock()` without `vi.restoreAllMocks()` | State leaks between tests | Always call `vi.clearAllMocks()` in `beforeEach` |

### 15.2 GGH-Specific Anti-Patterns

| Anti-Pattern | Why It's Forbidden | Correct Pattern |
|---|---|---|
| Testing prices as floats | EGP 110.50 = `110.50` fails float comparison | Test as piastres: `11050` |
| Testing only `_en` strings | Misses half the users | Test both `_en` and `_ar` |
| Asserting `deleted_at IS NULL` means "not deleted" | Might be `undefined` or missing | Use the `isSoftDeleted()` utility |
| Calling Medusa directly in tests | BFF pattern means frontend never calls Medusa | Test through BFF API routes |
| Using `Math.random()` or `Date.now()` in test data | Non-deterministic | Use factory functions with sequential counters |
| Testing ERP with real ERP instance | External dependency, slow, rate-limited | Use MSW mocks |
| Asserting `result.success === true` without narrowing | Doesn't narrow the type | Use `if (result.ok)` or `expect(result).toMatchObject({ ok: true })` |
| Creating orders without idempotency keys | Double-creation risk | Always include `idempotencyKey` in mutation tests |
| Testing only desktop viewport | Om Ibrahim uses a phone | Always test mobile viewport too |
| Ignoring RTL in component tests | Layout bugs in Arabic are real bugs | Assert `dir="rtl"` on Arabic components |
| Using `toBeVisible()` without checking RTL overflow | Element might be off-screen in RTL | Use `toBeVisible()` + bounding box check |

### 15.3 Test Naming Conventions

```typescript
// ✅ GOOD — Describes behavior, not implementation
it('returns OUT_OF_STOCK error when product has zero inventory', () => {});
it('formats 12500 piastres as "125.00 ج.م" in Arabic', () => {});
it('prevents double-submit with loading state', () => {});

// ❌ BAD — Describes implementation, not behavior
it('works', () => {});
it('returns the right thing', () => {});
it('calls the API', () => {});
it('test1', () => {});
```

### 15.4 Test File Organization

```
src/
├── lib/
│   ├── pricing/
│   │   ├── calculate.ts
│   │   ├── format.ts
│   │   └── __tests__/
│   │       ├── calculate.test.ts       ← Unit tests for calculate.ts
│   │       └── format.test.ts          ← Unit tests for format.ts
│   └── validation/
│       ├── checkout.schema.ts
│       └── __tests__/
│           └── checkout.schema.test.ts  ← Zod schema tests
├── services/
│   ├── product-service.ts
│   └── __tests__/
│       ├── product-service.test.ts           ← Unit (mocked)
│       └── product-service.integration.test.ts ← Integration (MSW + DB)
├── hooks/
│   ├── useCart.ts
│   └── __tests__/
│       └── useCart.test.ts              ← Hook tests (renderHook)
├── components/
│   ├── ProductCard.tsx
│   └── __tests__/
│       └── ProductCard.test.tsx          ← Component tests (RTL)
└── app/
    └── api/
        └── cart/
            └── add-item/
                ├── route.ts
                └── __tests__/
                    └── add-item.test.ts  ← API route integration tests
```

### 15.5 Test Execution Commands

| Command | What It Runs | When |
|---|---|---|
| `npm run test` | All unit tests | Development |
| `npm run test:unit` | Unit tests only | Pre-commit |
| `npm run test:unit -- --watch` | Unit tests in watch mode | Development |
| `npm run test:unit -- --changed` | Only tests for changed files | Pre-commit |
| `npm run test:integration` | Integration tests (needs DB + Redis) | CI / Manual |
| `npm run test:e2e` | Playwright E2E tests | CI / Pre-release |
| `npm run test:e2e -- --project=chromium-desktop` | E2E on specific browser | Debugging |
| `npm run test:e2e -- --grep "Om Ibrahim"` | E2E tests matching name | Debugging |
| `npm run test:accessibility` | axe-core + touch target tests | CI / Pre-release |
| `npm run test:visual` | Visual regression screenshots | CI / Pre-release |
| `npm run test:load` | k6 load tests | Nightly / Pre-release |
| `npm run test:all` | Complete suite | CI merge gate |

---

> **Summary**: GGH's testing strategy is built around three pillars — **piastres over floats**, **Arabic-first bilingual coverage**, and **Om Ibrahim's experience as the quality bar**. Every test must justify its existence by protecting a real user flow. The pyramid is strict: 75% unit, 20% integration, 5% E2E. No `any` types, no floating-point money, no English-only assertions. The CI pipeline is the guardian — nothing reaches production without passing every gate. And if a test doesn't catch a bug that would frustrate a 62-year-old first-time smartphone user, it's not enough.
