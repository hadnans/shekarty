# 05 — Coding Standards

> **GGH — Gomla Go Home** — Naming conventions, TypeScript rules, React patterns, Git discipline, error handling, and code quality. Every rule exists because a real bug taught us a lesson.

---

## Table of Contents

1. [Guiding Philosophy](#1-guiding-philosophy)
2. [TypeScript Rules](#2-typescript-rules)
3. [Naming Conventions](#3-naming-conventions)
4. [React Patterns](#4-react-patterns)
5. [Component Standards](#5-component-standards)
6. [Hook Standards](#6-hook-standards)
7. [File & Folder Conventions](#7-file--folder-conventions)
8. [Import Rules](#8-import-rules)
9. [Error Handling](#9-error-handling)
10. [Async & Data Fetching](#10-async--data-fetching)
11. [RTL & Internationalization Code](#11-rtl--internationalization-code)
12. [Accessibility Code](#12-accessibility-code)
13. [Git Conventions](#13-git-conventions)
14. [Code Review Checklist](#14-code-review-checklist)
15. [ESLint & Prettier Configuration](#15-eslint--prettier-configuration)
16. [Forbidden Patterns](#16-forbidden-patterns)

---

## 1. Guiding Philosophy

Code is read 10× more often than it is written. Every decision in this document optimizes for the next developer — the one who didn't write the code but needs to understand it, change it, or fix it at 2 AM.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   1. EXPLICIT over CLEVER      — If it needs a comment, rewrite │
│   2. CONSISTENT over CREATIVE  — Follow the pattern, always     │
│   3. SAFE over FAST           — Type safety > shipping speed    │
│   4. SIMPLE over ELEGANT      — A loop beats a recursion        │
│   5. TESTABLE over CLEVER     — Pure functions, no globals      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

| Principle | Code Implication |
|---|---|
| **Explicit over clever** | No ternaries inside ternaries. No bitwise hacks. No `!!+value`. Write what you mean. |
| **Consistent over creative** | All API calls go through `services/`. All hooks start with `use`. All components are `.tsx`. No exceptions for "just this once." |
| **Safe over fast** | `strict: true` in tsconfig. Zod validation at every API boundary. No `any`. No `as unknown as TargetType`. |
| **Simple over elegant** | A `for` loop is fine. A `reduce` that does three things is not. Write code a junior can read. |
| **Testable over clever** | Functions receive arguments and return values. No reading from global state. No side effects in pure functions. |

---

## 2. TypeScript Rules

### 2.1 Compiler Configuration

```json
// tsconfig.json — non-negotiable settings
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "forceConsistentCasingInFileNames": true,
    "exactOptionalPropertyTypes": false
  }
}
```

### 2.2 Type Rules

| Rule | Detail | Example |
|---|---|---|
| **No `any`** | `any` is forbidden. Use `unknown` and narrow with type guards. | ❌ `data: any` → ✅ `data: unknown` |
| **No non-null assertion** | Do not use `!` operator. Use optional chaining and null checks. | ❌ `user!.name` → ✅ `user?.name ?? 'Unknown'` |
| **No type assertions** | Do not use `as` to force a type. Use type guards, Zod parsing, or proper typing. | ❌ `data as Product` → ✅ `parseProduct(data)` |
| **Use `interface` for objects** | Prefer `interface` for object shapes. Use `type` for unions, intersections, and utility types. | `interface Product { ... }` / `type Status = 'active' \| 'inactive'` |
| **Use branded types for IDs** | Entity IDs are branded strings, not bare `string`. | `type ProductId = string & { __brand: 'ProductId' }` |
| **Money is always an integer** | All monetary values stored as piastres (integer). No floating-point arithmetic. | `price: 11000` (not `110.00`) |
| **Enums are forbidden** | Use string literal unions instead. Enums generate runtime code and are not tree-shakeable. | ❌ `enum Status { Active }` → ✅ `type Status = 'active' \| 'inactive'` |
| **Use `const` assertions** | For literal objects and arrays that should be immutable. | `const ROLES = ['retail', 'wholesale'] as const` |
| **Explicit return types on exported functions** | Every exported function has a declared return type. | `export function getPrice(): Piastres` |
| **No implicit returns** | Function branches must all return the same type. No accidental `undefined`. | — |

### 2.3 Type Organization

```
Where types live:

1. Used by one feature only     →  features/[feature]/types/[feature].types.ts
2. Used by two or more features →  types/[domain].ts
3. Shared across entire app     →  types/common.ts
4. Shared with backend/worker   →  backend/shared/src/types/
5. API request/response shapes  →  types/api.ts
```

### 2.4 Type Naming Patterns

| Pattern | Convention | Example |
|---|---|---|
| Data model | PascalCase noun | `Product`, `CartItem`, `Order` |
| Props interface | `ComponentNameProps` | `ProductCardProps`, `HeaderProps` |
| State interface | `FeatureNameState` | `CartState`, `CheckoutState` |
| API response | `EntityNameResponse` | `ProductListResponse`, `OrderDetailResponse` |
| Union type | PascalCase noun | `OrderStatus`, `PaymentMethod`, `CustomerGroup` |
| Branded type | PascalCase noun ending with `Id` | `ProductId`, `OrderId`, `CustomerId` |
| Generic type parameter | Single uppercase letter or descriptive name | `T`, `TResponse`, `TEntity` |
| Utility type | PascalCase verb | `ExtractVariant`, `CalculatePrice` |

### 2.5 Zod Schema Rules

| Rule | Detail |
|---|---|
| **Validate at every boundary** | API route inputs, form submissions, external API responses. Never trust data from outside the function. |
| **Derive types from schemas** | `type LoginForm = z.infer<typeof loginSchema>` — never define the type and schema separately. |
| **Custom error messages in Arabic** | `z.string().min(1, { message: 'هذا الحقل مطلوب' })` — not English defaults. |
| **Schema file location** | Schemas live in `lib/validators.ts` for shared schemas, or co-located in the feature for feature-specific schemas. |

```typescript
// ✅ Good: derive type from schema
const checkoutSchema = z.object({
  cartId: z.string().min(1),
  shippingMethodId: z.string().min(1),
  paymentMethodId: z.string().min(1),
  deliverySlotId: z.string().min(1),
  addressId: z.string().min(1),
});
type CheckoutInput = z.infer<typeof checkoutSchema>;

// ❌ Bad: define type separately from schema
interface CheckoutInput {
  cartId: string;
  shippingMethodId: string;
  // ... can drift from schema
}
```

---

## 3. Naming Conventions

### 3.1 General Rules

| Entity | Convention | Example |
|---|---|---|
| Variables | `camelCase` | `cartTotal`, `selectedCategory`, `deliveryZone` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_CART_ITEMS`, `DEFAULT_LOCALE`, `ERP_SYNC_INTERVAL` |
| Functions | `camelCase`, verb prefix | `getProduct()`, `calculateSavings()`, `validateCheckout()` |
| Classes | `PascalCase` | `MedusaClient`, `ErpSyncProcessor` |
| Types / Interfaces | `PascalCase` | `Product`, `CartItem`, `OrderDetailResponse` |
| Enums (forbidden — use unions) | — | `type Status = 'active' \| 'inactive'` |
| Files (components) | `kebab-case.tsx` | `product-card.tsx`, `cart-slide-out.tsx` |
| Files (utilities) | `kebab-case.ts` | `format-egp.ts`, `calculate-savings.ts` |
| Files (types) | `kebab-case.types.ts` | `product.types.ts`, `cart.types.ts` |
| Files (services) | `kebab-case.service.ts` | `product.service.ts`, `cart.service.ts` |
| Files (hooks) | `use-kebab-case.ts` | `use-cart.ts`, `use-product.ts` |
| Directories | `kebab-case` | `features/order-template/`, `components/navigation/` |
| CSS classes | Tailwind utilities only | Never custom class names except design tokens |
| Environment variables | `UPPER_SNAKE_CASE` with prefix | `MEDUSA_URL`, `ERP_API_KEY`, `NEXT_PUBLIC_MEDUSA_KEY` |
| Database columns | `snake_case` | `created_at`, `customer_group`, `stocked_quantity` |
| API route paths | `kebab-case` | `/api/delivery-zones`, `/api/order-templates` |
| URL slugs | `kebab-case` | `/categories/rice-grains`, `/products/basmati-rice-5kg` |

### 3.2 Function Naming Patterns

| Pattern | Usage | Example |
|---|---|---|
| `get*` | Fetch data (read) | `getProduct()`, `getCart()`, `getDeliverySlots()` |
| `create*` | Create a new entity | `createOrder()`, `createAddress()` |
| `update*` | Modify an existing entity | `updateCartItem()`, `updateCustomerProfile()` |
| `delete*` / `remove*` | Delete an entity | `removeCartItem()`, `deleteAddress()` |
| `calculate*` | Compute a derived value (pure) | `calculateSavings()`, `calculatePriceTier()` |
| `validate*` | Check data validity (returns boolean) | `validateCheckout()`, `isValidPhone()` |
| `format*` | Transform data for display (pure) | `formatEGP()`, `formatDate()`, `formatWeight()` |
| `parse*` | Transform raw data into typed data | `parseProduct()`, `parseErpItem()` |
| `is*` / `has*` | Boolean checks (pure) | `isInStock()`, `hasMinimumOrder()`, `isWholesaleCustomer()` |
| `handle*` | Event handler in components | `handleAddToCart()`, `handleQuantityChange()` |
| `on*` | Prop callback names | `onAddToCart`, `onQuantityChange`, `onRemove` |

### 3.3 Variable Naming Rules

| Rule | Detail | Example |
|---|---|---|
| **No abbreviations** | Write the full word. The 3 seconds you save typing cost the next developer 3 minutes reading. | ❌ `prod` → ✅ `product`; ❌ `cust` → ✅ `customer`; ❌ `qty` → ✅ `quantity` |
| **No single-letter variables** | Except loop counters (`i`, `j`) and generic type parameters (`T`). | ❌ `const p = getProduct()` → ✅ `const product = getProduct()` |
| **Boolean names are questions** | A boolean variable reads like a yes/no question. | `isLoading`, `hasCart`, `isWholesaleCustomer`, `canCheckout` |
| **Collection names are plural** | Arrays and lists use plural nouns. | `products`, `categories`, `items` |
| **Callback props use `on` prefix** | Props that accept functions start with `on`. | `onAddToCart`, `onClose`, `onSubmit` |
| **State uses noun form** | State variables are nouns, not verbs. | `cart` not `cartState`; `locale` not `currentLocale` |

### 3.4 Component Naming

| Pattern | Convention | Example |
|---|---|---|
| Page component | Matches the route | `app/(shop)/products/[handle]/page.tsx` → `ProductDetailPage` |
| Feature component | Describes what it renders | `ProductCard`, `CartSummary`, `DeliverySlotPicker` |
| Layout component | Ends with `Layout` | `ShopLayout`, `AuthLayout`, `AccountLayout` |
| Wrapper component | Ends with `Wrapper` or `Container` | `CartProvider`, `AppProvider` |
| Compound component | Parent + sub-components | `Stepper` + `Stepper.Step` |
| Higher-order component | Ends with `With` prefix | `WithAuth`, `WithLocale` |

---

## 4. React Patterns

### 4.1 Server Components by Default

| Rule | Detail |
|---|---|
| **Every component is a Server Component unless it needs interactivity** | Do not add `'use client'` unless the component uses state, effects, event handlers, or browser APIs. |
| **Push `'use client'` down** | If a page has one interactive element, mark that element as `'use client'`, not the entire page. |

```tsx
// ✅ Good: page is Server Component, interactive part is Client Component
// app/(shop)/page.tsx (Server Component)
import { HotDealsSection } from '@/features/deal/components/hot-deals-section';

export default function HomePage() {
  return (
    <main>
      <HeroBanner />              {/* Server Component — no interactivity */}
      <CategoryGrid />            {/* Server Component — links only */}
      <HotDealsSection />         {/* Client Component — countdown timer */}
    </main>
  );
}

// features/deal/components/hot-deals-section.tsx
'use client';                     ← pushed down to the interactive leaf

export function HotDealsSection() {
  const [deals] = useState([]);
  // ... countdown timer, interactive elements
}
```

### 4.2 Component Structure Order

Every component file follows this exact order:

```tsx
// 1. 'use client' directive (if needed)
'use client';

// 2. Imports — grouped and separated
import { useState } from 'react';                    // React
import { useCart } from '@/features/cart/hooks/use-cart';  // Internal hooks
import { Button } from '@/components/ui/button';      // UI components
import { formatEGP } from '@/utils/currency';         // Utilities
import type { Product } from '@/types/product';        // Types (always last in imports)

// 3. Types (props interface)
interface ProductCardProps {
  product: Product;
  onAddToCart?: (productId: string, quantity: number) => void;
}

// 4. Component definition
export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  // 4a. Hooks (in fixed order: state → context → custom → effects)
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();

  // 4b. Derived state / calculations
  const totalPrice = product.price * quantity;
  const savings = product.yesterdayPrice - product.price;

  // 4c. Event handlers
  function handleAddToCart() {
    addItem(product.id, quantity);
    onAddToCart?.(product.id, quantity);
  }

  function handleQuantityChange(newQuantity: number) {
    setQuantity(newQuantity);
  }

  // 4d. Render
  return (
    <article className="bg-surface rounded-lg shadow-sm">
      {/* ... */}
    </article>
  );
}
```

### 4.3 Hook Order Within Components

Hooks are called in this fixed order. Never reorder. Never conditionally call hooks.

```
1. useState           — local state
2. useReducer         — complex local state (rare)
3. useContext         — context consumption
4. useRef             — DOM refs
5. Custom hooks       — useCart(), useProduct(), etc.
6. useEffect          — side effects (last, because they are the most dangerous)
7. useId              — accessibility IDs
```

### 4.4 State Management Rules

| State Location | When to Use | Example |
|---|---|---|
| `useState` | Component-local UI state | Modal open/closed, form input value, selected tab |
| `useReducer` | Complex local state with many transitions | Multi-step checkout form |
| Zustand store | Cross-component state that persists across navigation | Cart contents, locale preference |
| TanStack Query | Server state (fetched data) | Product lists, order history, customer profile |
| URL params | State that should be bookmarkable | Search query, category filter, page number |
| `localStorage` | Persistent preferences | Language choice, notification preferences |

### 4.5 Zustand Store Rules

| Rule | Detail |
|---|---|
| **One store per domain** | Cart store, UI store. Not one global store. |
| **Store in the feature** | `features/cart/store/cart-store.ts`, not a global `stores/` folder. |
| **Selectors, not subscriptions** | `useCartStore(state => state.items)`, not `useCartStore()`. Prevents unnecessary re-renders. |
| **No derived state in the store** | Calculate totals in selectors or hooks, not in the store itself. |
| **Optimistic updates** | Update the store immediately, then confirm with the server. Roll back on error. |

```typescript
// ✅ Good: selector pattern
const items = useCartStore(state => state.items);
const total = useCartStore(state => 
  state.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
);

// ❌ Bad: subscribe to entire store
const store = useCartStore(); // re-renders on ANY store change
```

### 4.6 TanStack Query Rules

| Rule | Detail |
|---|---|
| **One query per resource** | `useProducts()`, `useProduct(id)`, `useCart()` |
| **Query keys are typed constants** | `queryKeys.products.list()`, `queryKeys.products.detail(id)` |
| **Stale time: 30s for product data** | Products change slowly. 30s stale time prevents hammering the API. |
| **Cache time: 5 minutes** | Old data stays in cache for back navigation. |
| **Refetch on window focus** | Enabled. Users expect fresh data when they return to the tab. |
| **No query in Server Components** | TanStack Query is client-only. Server Components use `fetch()` directly. |
| **Mutations invalidate related queries** | After `addToCart`, invalidate the cart query. |

```typescript
// Query key factory pattern
const queryKeys = {
  products: {
    all: ['products'] as const,
    lists: () => [...queryKeys.products.all, 'list'] as const,
    list: (filters: ProductFilters) => [...queryKeys.products.lists(), filters] as const,
    details: () => [...queryKeys.products.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.products.details(), id] as const,
  },
  cart: {
    all: ['cart'] as const,
    current: () => [...queryKeys.cart.all, 'current'] as const,
  },
} as const;
```

---

## 5. Component Standards

### 5.1 Component Rules

| Rule | Detail |
|---|---|
| **One component per file** | Never export two components from one file. |
| **Named exports only** | No `export default`. Named exports enable IDE search, refactoring, and prevent naming drift. |
| **Props interface is always explicit** | Every component has a `Props` interface defined in the same file. No `React.FC` shorthand. |
| **Destructure props in the function signature** | `function Card({ title, price }: CardProps)`, not `function Card(props: CardProps)`. |
| **Children prop is always explicit** | `interface Props { children: ReactNode }`, not relying on `React.FC` implicit children. |
| **Maximum 150 lines per component** | If a component exceeds 150 lines, extract sub-components. |
| **No business logic in components** | Components render UI and delegate actions. Logic lives in hooks, utils, or services. |
| **No inline styles** | Use Tailwind classes. The only exception is dynamic values (e.g., `width: ${percent}%`). |

### 5.2 Component Composition Patterns

```tsx
// ✅ Good: composition with children and sub-components
<Card>
  <Card.Image src={product.image} alt={product.nameAr} />
  <Card.Body>
    <Card.Title>{product.name}</Card.Title>
    <Card.Price amount={product.price} />
  </Card.Body>
  <Card.Action>
    <AddToCartButton product={product} />
  </Card.Action>
</Card>

// ❌ Bad: prop explosion
<Card
  image={product.image}
  title={product.name}
  price={product.price}
  onAddToCart={handleAdd}
  showBadge={true}
  badgeText="Save 15%"
  badgeColor="green"
  // ... 10 more props
/>
```

### 5.3 Conditional Rendering

| Pattern | Use When | Example |
|---|---|---|
| Early return | Component renders nothing for a condition | `if (!product) return null;` |
| Ternary | Two mutually exclusive outcomes | `{isLoading ? <Skeleton /> : <Content />}` |
| Logical AND | Show/hide without alternative | `{savings > 0 && <SavingsBadge amount={savings} />}` |
| Switch | More than 3 conditions | Order status rendering |

```tsx
// ✅ Good: early return for null state
export function ProductCard({ product }: ProductCardProps) {
  if (!product) return null;
  
  return (
    <article>
      <h3>{product.name}</h3>
      <PriceDisplay amount={product.price} />
    </article>
  );
}

// ❌ Bad: nested ternaries
return isLoading ? (
  isFixed ? <FixedSkeleton /> : <FluidSkeleton />
) : hasError ? (
  <ErrorState />
) : (
  <Content />
);

// ✅ Good: flattened with early returns
if (isLoading) return isFixed ? <FixedSkeleton /> : <FluidSkeleton />;
if (hasError) return <ErrorState />;
return <Content />;
```

### 5.4 List Rendering

| Rule | Detail |
|---|---|
| **Always provide `key`** | Use a stable ID, never the array index. |
| **Key must be unique among siblings** | Product ID, not array position. |
| **Extract list item to a component** | If the list item render exceeds 10 lines, extract a named component. |

```tsx
// ✅ Good: stable ID key, extracted component
{products.map(product => (
  <ProductCard key={product.id} product={product} />
))}

// ❌ Bad: index key
{products.map((product, index) => (
  <ProductCard key={index} product={product} />
))}
```

---

## 6. Hook Standards

### 6.1 Hook Rules

| Rule | Detail |
|---|---|
| **Always start with `use`** | `useCart`, `useProduct`, `useDeliverySlots`. No exceptions. |
| **One responsibility per hook** | `useCart` manages cart state. It does not also manage authentication. |
| **Return an object, not a tuple** | `return { cart, addItem, removeItem }` not `return [cart, addItem, removeItem]`. Object destructuring is self-documenting. |
| **Stable references** | Functions returned from hooks are stable (use `useCallback` or `useMemo` as needed). |
| **No side effects in the hook body** | Side effects go in `useEffect`, not in the hook's top-level code. |
| **Clean up effects** | Every `useEffect` that creates a subscription or timer returns a cleanup function. |

### 6.2 Hook Return Type Pattern

```typescript
// ✅ Good: object return with as const
export function useCart() {
  const cart = useCartStore(state => state.items);
  const addItem = useCartStore(state => state.addItem);

  return { cart, addItem, removeItem, updateQuantity, summary } as const;
}

// Usage is self-documenting:
const { cart, addItem } = useCart();

// ❌ Bad: tuple return
export function useCart() {
  return [cart, addItem, removeItem]; // which index is addItem?
}
```

### 6.3 Custom Hook Template

```typescript
// hooks/use-[feature].ts

import { useState, useEffect, useCallback } from 'react';
import type { /* types */ } from '@/types/feature';

interface UseFeatureOptions {
  enabled?: boolean;
}

interface UseFeatureReturn {
  data: FeatureType | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useFeature(
  id: string,
  options: UseFeatureOptions = {}
): UseFeatureReturn {
  const { enabled = true } = options;
  
  const [data, setData] = useState<FeatureType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!enabled) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await fetchFeature(id);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [id, enabled]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, isLoading, error, refetch } as const;
}
```

---

## 7. File & Folder Conventions

### 7.1 File Rules

| Rule | Detail |
|---|---|
| **One export per file** | A file exports one primary function, component, or type. Utility files may export multiple related functions. |
| **Barrel files are allowed at folder level** | `components/ui/index.ts` re-exports all UI components. Never nest barrel files (no `components/index.ts` that re-exports `components/ui/index.ts`). |
| **Maximum 300 lines per file** | If a file exceeds 300 lines, it's doing too much. Split it. |
| **No `index.ts` for features** | Feature directories do not have barrel `index.ts` files. Import directly: `@/features/cart/hooks/use-cart`. |
| **Test files are co-located** | `product-card.test.tsx` sits next to `product-card.tsx`. Never in a separate `__tests__/` tree. |

### 7.2 File Header

Every file starts with a comment describing its purpose:

```typescript
/**
 * Product card component — displays a single product with image,
 * pricing, and add-to-cart functionality. Used in product grids
 * and search results.
 */
```

### 7.3 Import Order

Imports are grouped and separated by blank lines:

```typescript
// 1. React / Next.js
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// 2. Third-party libraries
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

// 3. Internal — components
import { Button } from '@/components/ui/button';
import { PriceDisplay } from '@/components/feedback/price-display';

// 4. Internal — hooks
import { useCart } from '@/features/cart/hooks/use-cart';
import { useLocale } from '@/hooks/use-locale';

// 5. Internal — lib, services, utils
import { medusa } from '@/lib/medusa';
import { formatEGP } from '@/utils/currency';

// 6. Types (always last)
import type { Product } from '@/types/product';
import type { CartItem } from '@/types/cart';
```

---

## 8. Import Rules

### 8.1 Path Aliases

| Alias | Resolves To |
|---|---|
| `@/*` | `frontend/src/*` |
| `@/features/*` | `frontend/src/features/*` |
| `@/components/*` | `frontend/src/components/*` |
| `@/hooks/*` | `frontend/src/hooks/*` |
| `@/lib/*` | `frontend/src/lib/*` |
| `@/utils/*` | `frontend/src/utils/*` |
| `@/types/*` | `frontend/src/types/*` |
| `@/services/*` | `frontend/src/services/*` |

### 8.2 Import Boundaries

| From | Can Import From | Cannot Import From |
|---|---|---|
| `app/` | `features/`, `components/`, `providers/`, `lib/`, `types/` | `services/`, `hooks/` directly |
| `features/` | `components/`, `hooks/`, `services/`, `lib/`, `utils/`, `types/` | Other `features/` (except cart hooks) |
| `components/` | `lib/`, `utils/`, `types/` | `features/`, `services/`, `hooks/` |
| `hooks/` | `services/`, `lib/`, `utils/`, `types/` | `features/`, `components/` |
| `services/` | `lib/`, `types/`, `utils/` | `features/`, `components/`, `hooks/` |
| `lib/` | `types/`, `utils/` | `features/`, `components/`, `hooks/`, `services/` |
| `utils/` | Nothing internal | Everything internal |
| `types/` | `utils/` | Everything else |
| `locales/` | Nothing (data files) | Everything |

### 8.3 No Relative Path Traversal

```typescript
// ✅ Good: alias imports
import { Button } from '@/components/ui/button';
import { formatEGP } from '@/utils/currency';

// ❌ Bad: relative path traversal
import { Button } from '../../../components/ui/button';
import { formatEGP } from '../../utils/currency';

// ✅ Acceptable: same-directory relative import
import { calculateTier } from './calculate-tier';
```

---

## 9. Error Handling

### 9.1 Error Handling Philosophy

Errors are not exceptional — they are expected. The network will fail. The API will return 500. The user will enter invalid data. Every error path is designed, not bolted on.

### 9.2 Error Categories

| Category | Example | Strategy |
|---|---|---|
| **Validation error** | Missing required field, invalid email | Prevent submission. Show inline error below the field. |
| **Network error** | No internet, timeout | Show "Could not connect" with retry button. Queue offline actions. |
| **Server error (4xx)** | 401 Unauthorized, 404 Not Found, 422 Unprocessable | Handle specifically. 401 → redirect to login. 404 → not-found page. 422 → show server validation errors inline. |
| **Server error (5xx)** | 500 Internal Server Error | Show generic error with retry. Log full error server-side. Never expose stack traces. |
| **Business rule error** | Minimum order not met, item out of stock | Show specific message explaining the rule and how to fix it. |
| **ERP sync error** | Failed to push order to ERP | Invisible to user. Retry automatically. Alert on-call if retries exhausted. |

### 9.3 Error Handling in API Routes

```typescript
// app/api/cart/items/route.ts
export async function POST(request: Request) {
  try {
    // 1. Parse and validate input
    const body = await request.json();
    const result = addItemSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten() },
        { status: 422 }
      );
    }

    // 2. Authenticate
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // 3. Business logic
    const cart = await addToCart(session.cartId, result.data);
    
    return NextResponse.json({ cart });

  } catch (error) {
    // 4. Never expose internal errors
    logger.error('Failed to add item to cart', { error });
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
```

### 9.4 Error Handling in React Components

```typescript
// ✅ Good: error state with user-friendly message
const { data: products, isLoading, error } = useProducts();

if (error) {
  return (
    <ErrorState
      message={t('error.network')}
      onRetry={() => refetch()}
    />
  );
}

// ❌ Bad: silent error swallowing
try {
  const products = await getProducts();
} catch {
  // silently ignored
}
```

### 9.5 Error Handling in BullMQ Workers

```typescript
// workers/processors/erp/push-order.processor.ts
export async function pushOrder(job: Job<OrderPushData>): Promise<void> {
  const { orderId } = job.data;
  
  const logEntry = {
    entityType: 'order',
    entityId: orderId,
    direction: 'medusa_to_erp',
    status: 'success' as const,
    durationMs: 0,
  };

  const start = Date.now();

  try {
    const order = await medusaAdmin.orders.retrieve(orderId);
    const salesOrder = transformToErpSalesOrder(order);
    await erpClient.createSalesOrder(salesOrder);
    
    logEntry.durationMs = Date.now() - start;
    await db.insert('ggh.erp_sync_log', logEntry);

  } catch (error) {
    logEntry.status = 'error';
    logEntry.errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logEntry.durationMs = Date.now() - start;
    
    await db.insert('ggh.erp_sync_log', logEntry);
    
    // Re-throw to trigger BullMQ retry
    throw error;
  }
}
```

### 9.6 Error Message Rules

| Rule | Detail |
|---|---|
| **User-facing messages are in Arabic** | Error messages shown to users match their locale preference. |
| **Never show raw error messages** | Translate API error codes to user-friendly messages. Never display `ECONNREFUSED` or `PrismaClientKnownRequestError`. |
| **Never expose stack traces** | Stack traces are logged server-side only. The user sees "Something went wrong." |
| **Actionable messages** | Every error tells the user what to do next: "Check your internet", "Try again", "Contact support". |
| **No technical jargon** | "Order not found" not "404 GET /admin/orders/xyz". "Payment failed" not "Stripe ChargeError card_declined". |

### 9.7 Error Logging

| Context | Logger | What to Log |
|---|---|---|
| API route | `logger.error()` | Request path, status code, error message, request ID. No PII. |
| React component | Sentry | Component name, error boundary, user locale. No cart contents. |
| BullMQ worker | `logger.error()` | Job ID, queue name, attempt number, error message, full stack trace. |
| ERP sync | `ggh.erp_sync_log` table | Entity type, entity ID, direction, status, error message, duration. |

---

## 10. Async & Data Fetching

### 10.1 Server-Side Data Fetching (RSC)

```typescript
// ✅ Good: fetch in Server Component with revalidation
async function CategoryPage({ params }: { params: { slug: string } }) {
  const products = await getProductsByCategory(params.slug);
  
  return <ProductGrid products={products} />;
}

// In the service:
export async function getProductsByCategory(slug: string): Promise<Product[]> {
  const res = await fetch(`${API_BASE}/categories/${slug}/products`, {
    next: { revalidate: 60, tags: ['products', `category-${slug}`] },
  });
  
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}
```

### 10.2 Client-Side Data Fetching (TanStack Query)

```typescript
// ✅ Good: TanStack Query with typed key and error handling
export function useProducts(filters?: ProductFilters) {
  return useQuery({
    queryKey: queryKeys.products.list(filters),
    queryFn: () => productServices.getProducts(filters),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}
```

### 10.3 Mutation Pattern

```typescript
export function useAddToCart() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (params: AddToCartParams) => cartService.addItem(params),
    
    // Optimistic update
    onMutate: async (params) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cart.current() });
      const previousCart = queryClient.getQueryData(queryKeys.cart.current());
      
      // Optimistically add item to cart
      queryClient.setQueryData(queryKeys.cart.current(), (old: Cart) => ({
        ...old,
        items: [...old.items, { ...params, id: `temp-${Date.now()}` }],
      }));
      
      return { previousCart };
    },
    
    onError: (_err, _params, context) => {
      // Roll back on error
      if (context?.previousCart) {
        queryClient.setQueryData(queryKeys.cart.current(), context.previousCart);
      }
      toast.error(t('cart.addError'));
    },
    
    onSuccess: () => {
      // Invalidate to get server truth
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.current() });
      toast.success(t('cart.added'));
    },
  });
}
```

### 10.4 Async Rules

| Rule | Detail |
|---|---|
| **Always handle loading state** | Every async operation shows a loading indicator. No blank screens during fetch. |
| **Always handle error state** | Every async operation has an error fallback. No unhandled promise rejections. |
| **Timeout all fetch calls** | Server-side: 10 seconds. Client-side: 30 seconds (slower networks). |
| **Retry only safe operations** | GET requests retry 3 times. POST/PUT/DELETE never retry automatically (risk of duplication). |
| **No `await` in render** | Use `await` only in Server Components or `use()` hook. Never in event handlers without proper loading state. |

---

## 11. RTL & Internationalization Code

### 11.1 Logical Properties Only

```tsx
// ✅ Good: logical properties
<div className="ms-4 pe-2 text-start rounded-s-lg border-e-2">
  {content}
</div>

// ❌ Bad: physical properties
<div className="ml-4 pr-2 text-left rounded-l-lg border-r-2">
  {content}
</div>
```

### 11.2 Direction-Aware Components

```tsx
// ✅ Good: conditional rendering based on direction
function DirectionalIcon({ icon: Icon, className }: Props) {
  const { direction } = useLocale();
  
  return (
    <Icon 
      className={cn(
        className,
        direction === 'rtl' && 'rotate-y-180'
      )} 
    />
  );
}

// ❌ Bad: hardcoded direction
<ArrowRight className="mr-2" />
```

### 11.3 Number Formatting

```typescript
// ✅ Good: locale-aware number formatting
export function formatEGP(piastres: number, locale: Locale = 'ar'): string {
  const pounds = piastres / 100;
  return locale === 'ar' 
    ? `${pounds.toFixed(2)} ج.م` 
    : `${pounds.toFixed(2)} EGP`;
}

// ✅ Good: bidirectional isolation for numbers in Arabic text
<span>
  {t('product.perUnit', { unit: product.unit })}{' '}
  <bdi dir="ltr">{formatEGP(product.price)}</bdi>
</span>
```

### 11.4 Translation Key Rules

| Rule | Detail |
|---|---|
| **No concatenated keys** | `t('cart.' + action)` is forbidden. Use `t(\`cart.\${action}\`)` only if `action` is a typed union. |
| **No HTML in translations** | Translation values are plain text. Markup goes in the component, not the JSON. |
| **No string interpolation without ICU** | Use `{count, plural, one{item} other{items}}`, not `${count} item${count > 1 ? 's' : ''}`. |
| **Keys are English camelCase** | `"cart.empty": "سلتك فاضية"`, not `"السلة_فاضية": "سلتك فاضية"`. |
| **Namespace matches feature** | Product strings under `product.*`, cart strings under `cart.*`. |

---

## 12. Accessibility Code

### 12.1 ARIA Implementation Rules

| Rule | Code |
|---|---|
| **Every interactive element has an accessible name** | `<button aria-label={t('cart.add', { name: product.name })}>` |
| **Decorative images are hidden** | `<img src={decorative} alt="" role="presentation" />` |
| **Status changes are announced** | `<div role="status" aria-live="polite">{t('cart.added')}</div>` |
| **Labels are associated with inputs** | `<label htmlFor="phone">{t('auth.phone')}</label>` `<input id="phone" />` |
| **Error messages are linked to inputs** | `<input aria-describedby="phone-error" />` `<span id="phone-error">{error}</span>` |
| **Modals trap focus** | `<dialog>` element or `aria-modal="true"` with focus trap |
| **Page has landmark regions** | `<header>`, `<nav>`, `<main>`, `<footer>`, `<aside>` |

### 12.2 Touch Target Enforcement

```tsx
// Shared wrapper for small interactive elements
function TouchTarget({ children, className }: Props) {
  return (
    <span className={cn('inline-flex items-center justify-center min-w-[48px] min-h-[48px]', className)}>
      {children}
    </span>
  );
}

// Usage for icon buttons
<TouchTarget>
  <button aria-label={t('cart.open')}>
    <ShoppingCart className="h-5 w-5" />
  </button>
</TouchTarget>
```

### 12.3 Focus Management Code

```typescript
// Return focus to trigger after dialog closes
function useFocusReturn(triggerRef: RefObject<HTMLElement>) {
  useEffect(() => {
    return () => {
      // Cleanup runs when dialog unmounts
      triggerRef.current?.focus();
    };
  }, [triggerRef]);
}
```

---

## 13. Git Conventions

### 13.1 Branch Naming

| Pattern | Example | Usage |
|---|---|---|
| `feat/<ticket>-<description>` | `feat/GGH-142-wholesale-pricing` | New feature |
| `fix/<ticket>-<description>` | `fix/GGH-89-cart-quantity-overflow` | Bug fix |
| `docs/<description>` | `docs/api-endpoint-catalog` | Documentation |
| `chore/<description>` | `chore/update-dependencies` | Maintenance |
| `refactor/<description>` | `refactor/extract-price-service` | Code restructuring |

### 13.2 Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/) with a scope:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**

| Type | Usage |
|---|---|
| `feat` | New feature or significant enhancement |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Formatting, whitespace, missing semicolons (no logic change) |
| `refactor` | Code restructuring without behavior change |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `chore` | Build process, dependencies, tooling |
| `ci` | CI/CD configuration |

**Scopes:**

| Scope | Area |
|---|---|
| `frontend` | Next.js application |
| `backend` | Medusa or worker |
| `plugins` | Custom Medusa modules |
| `docker` | Container configuration |
| `erp` | ERPNext integration |
| `api` | API route handlers |
| `db` | Database schema or migrations |
| `i18n` | Translations or locale logic |
| `a11y` | Accessibility |
| `rtl` | RTL layout fixes |

**Examples:**

```
feat(frontend): add wholesale pricing tier display to product cards

Display bulk-break pricing tiers below the product price.
Shows "Buy 5+ save 10%" with visual tier indicators.
Updates price calculation to reflect selected tier.

Closes GGH-142

fix(api): prevent duplicate cart items when rapidly clicking add-to-cart

Debounce add-to-cart clicks on the client and check for
existing line items on the server before creating new ones.

Fixes GGH-89

docs(api): add delivery-zones endpoint documentation

chore(docker): update Medusa image to v2.4.1

refactor(frontend): extract price formatting into shared utility
```

### 13.3 Commit Rules

| Rule | Detail |
|---|---|
| **Subject ≤ 72 characters** | Keep subjects short and descriptive. |
| **Subject uses imperative mood** | "Add feature" not "Added feature" or "Adds feature". |
| **Body explains WHY, not WHAT** | The diff shows what changed. The commit message explains why. |
| **One logical change per commit** | Do not mix a feature addition with a dependency upgrade. |
| **No broken commits on main** | Every commit on `main` should build and pass tests. |
| **Squash before merge** | Feature branch commits are squashed into one clean commit on merge. |

### 13.4 PR Rules

| Rule | Detail |
|---|---|
| **PR title matches commit format** | `feat(frontend): add wholesale pricing display` |
| **PR description includes:** | What changed, why, how to test, screenshots for UI changes |
| **Maximum 400 lines changed** | If larger, split into multiple PRs. Reviewers cannot effectively review 1000-line PRs. |
| **At least 1 approval required** | All PRs need review. No self-merge. |
| **CI must pass** | Lint, type-check, and build must all pass before merge. |
| **No `main` branch pushes** | All changes go through PRs. Direct pushes to `main` are forbidden. |

---

## 14. Code Review Checklist

Every reviewer checks these items before approving a PR:

### Functionality

- [ ] The PR does what the description says
- [ ] Edge cases are handled (empty state, zero quantity, network failure)
- [ ] No console.log or debug code remains
- [ ] Error states are handled with user-friendly messages

### TypeScript

- [ ] No `any` types
- [ ] No non-null assertions (`!`)
- [ ] No type assertions (`as`) without a type guard
- [ ] All exported functions have explicit return types
- [ ] Zod schemas validate all API boundary inputs

### React

- [ ] Components are Server Components by default
- [ ] `'use client'` is pushed to the lowest possible component
- [ ] No business logic in component render functions
- [ ] Hooks follow the fixed call order
- [ ] Keys are stable IDs, not array indices
- [ ] No unnecessary re-renders (proper memoization, selector pattern)

### Accessibility

- [ ] All interactive elements have accessible names (Arabic + English)
- [ ] Touch targets meet 48px minimum
- [ ] Focus management is correct (dialogs return focus)
- [ ] Screen reader announcements for dynamic content
- [ ] Color is not the only indicator of state

### RTL & i18n

- [ ] Only logical CSS properties (`ms-`, `me-`, `ps-`, `pe-`, `text-start`, `text-end`)
- [ ] Directional icons flip in RTL
- [ ] Numbers wrapped in `<bdi>` when embedded in Arabic text
- [ ] No hardcoded strings — all text comes from translation files
- [ ] Translation keys added to both `en.json` and `ar.json`

### Performance

- [ ] No unnecessary client-side JavaScript
- [ ] Images use `next/image` with proper sizing
- [ ] No waterfalls (parallel fetches where possible)
- [ ] Bundle size has not increased significantly

---

## 15. ESLint & Prettier Configuration

### 15.1 ESLint Rules

```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
  ],
  rules: {
    // TypeScript strictness
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-non-null-assertion': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-call': 'error',
    '@typescript-eslint/no-unsafe-return': 'error',
    '@typescript-eslint/explicit-function-return-type': ['warn', {
      allowExpressions: true,
      allowTypedFunctionExpressions: true,
    }],
    
    // React
    'react/no-array-index-key': 'error',
    'react/no-unstable-nested-components': 'warn',
    'react-hooks/exhaustive-deps': 'error',
    
    // Import boundaries
    'no-restricted-imports': ['error', {
      patterns: [
        { group: ['../features/*'], message: 'Use @/features/* alias instead of relative paths' },
      ],
    }],
    
    // RTL enforcement
    'no-restricted-syntax': [
      'error',
      { selector: '[prop=ml]', message: 'Use ms- (margin-inline-start) for RTL support' },
      { selector: '[prop=mr]', message: 'Use me- (margin-inline-end) for RTL support' },
      { selector: '[prop=pl]', message: 'Use ps- (padding-inline-start) for RTL support' },
      { selector: '[prop=pr]', message: 'Use pe- (padding-inline-end) for RTL support' },
      { selector: '[prop="text-left"]', message: 'Use text-start for RTL support' },
      { selector: '[prop="text-right"]', message: 'Use text-end for RTL support' },
    ],
    
    // Code quality
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'error',
    'no-var': 'error',
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
  },
};
```

### 15.2 Prettier Configuration

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

### 15.3 Pre-Commit Hook

```bash
# .husky/pre-commit
bun run lint
bun run typecheck
```

No code reaches `main` without passing lint and type-check.

---

## 16. Forbidden Patterns

These patterns are explicitly banned. If found in code review, they must be fixed before merge.

### 16.1 TypeScript Forbidden Patterns

```typescript
// ❌ NEVER: any type
const data: any = await fetch(url);

// ❌ NEVER: non-null assertion
const user = users.find(u => u.id === id)!;

// ❌ NEVER: double assertion
const product = data as unknown as Product;

// ❌ NEVER: implicit any
function handleEvent(event) { }  // event is implicit any

// ❌ NEVER: @ts-ignore
// @ts-ignore
product.doesNotExist();

// ❌ NEVER: @ts-expect-error without explanation
// @ts-expect-error  — Must add a comment explaining why

// ❌ NEVER: enum
enum Status { Active, Inactive }

// ❌ NEVER: class component
class ProductCard extends React.Component { }

// ❌ NEVER: index signature without proper typing
const products: { [key: string]: any } = {};
```

### 16.2 React Forbidden Patterns

```tsx
// ❌ NEVER: default export
export default function ProductCard() { }

// ❌ NEVER: inline object in JSX props
<Component style={{ marginTop: 16 }} />

// ❌ NEVER: array index as key
{items.map((item, index) => <Card key={index} />)}

// ❌ NEVER: prop drilling more than 2 levels
<Parent prop={value}>
  <Child prop={value}>
    <Grandchild prop={value} />  ← use context or state management
  </Child>
</Parent>

// ❌ NEVER: useEffect for derived state
useEffect(() => {
  setTotal(items.reduce((sum, i) => sum + i.price, 0));
}, [items]);
// ✅ Instead: const total = useMemo(() => items.reduce(...), [items]);

// ❌ NEVER: useState for props mirror
const [productId, setProductId] = useState(props.productId);
// ✅ Instead: use props.productId directly

// ❌ NEVER: unconditional useEffect
useEffect(() => {
  fetchCart();  // runs on every render
}, );
// ✅ Instead: useEffect(() => { fetchCart(); }, [fetchCart]);

// ❌ NEVER: multiple returns of different types
function getData() {
  if (loading) return <Spinner />;   // JSX
  return data;                        // plain object
}
```

### 16.3 CSS Forbidden Patterns

```tsx
// ❌ NEVER: physical direction properties
<div className="ml-4 mr-2 text-left border-l-2 rounded-l-lg pl-4 pr-2" />

// ❌ NEVER: inline styles (except dynamic values)
<div style={{ color: 'red' }} />

// ❌ NEVER: custom CSS classes when Tailwind exists
<div className="product-card-wrapper-custom" />

// ❌ NEVER: !important
<div className="!mt-0" />  // only acceptable as override of third-party styles
```

### 16.4 API Forbidden Patterns

```typescript
// ❌ NEVER: expose internal URLs to the client
fetch('http://medusa:9000/admin/products');

// ❌ NEVER: skip input validation
export async function POST(request: Request) {
  const body = await request.json();
  await createOrder(body);  // no validation!
}

// ❌ NEVER: return raw error objects
return NextResponse.json({ error: err }, { status: 500 });

// ❌ NEVER: log PII
logger.info('Customer logged in', { email, phone, password });

// ❌ NEVER: synchronous file reads in API routes
const data = fs.readFileSync('./data.json');
```

### 16.5 General Forbidden Patterns

```typescript
// ❌ NEVER: console.log in production code
console.log('debug:', data);

// ❌ NEVER: var
var count = 0;

// ❌ NEVER: == instead of ===
if (status == 'active')

// ❌ NEVER: nested ternaries
const label = isA ? 'A' : isB ? 'B' : 'C';

// ❌ NEVER: magic numbers
if (items.length > 10) { }
// ✅ Instead: if (items.length > MAX_CART_ITEMS) { }

// ❌ NEVER: TODO without a ticket
// TODO: fix this later
// ✅ Instead: // TODO(GGH-123): handle zero-quantity edge case

// ❌ NEVER: commented-out code
// const oldWay = doSomething();
// if (oldWay) { ... }
```

---

*This document is enforced by ESLint, Prettier, code review, and CI. When in doubt, follow the existing pattern. Consistency beats creativity.*

*Last updated: July 2026*
