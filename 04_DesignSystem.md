# 04 — Design System

> **GGH — Gomla Go Home** — Visual language, component specifications, accessibility rules, and RTL conventions. Every pixel serves the user.

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Color System](#2-color-system)
3. [Typography](#3-typography)
4. [Spacing & Layout](#4-spacing--layout)
5. [Buttons](#5-buttons)
6. [Forms](#6-forms)
7. [Cards](#7-cards)
8. [Dialogs & Sheets](#8-dialogs--sheets)
9. [Tables](#9-tables)
10. [Icons](#10-icons)
11. [Badges & Tags](#11-badges--tags)
12. [Loading & Empty States](#12-loading--empty-states)
13. [Toast Notifications](#13-toast-notifications)
14. [Navigation](#14-navigation)
15. [Responsiveness](#15-responsiveness)
16. [RTL Support](#16-rtl-support)
17. [Accessibility Rules](#17-accessibility-rules)
18. [Motion & Animation](#18-motion--animation)
19. [Dark Mode (Future)](#19-dark-mode-future)
20. [Design Tokens Reference](#20-design-tokens-reference)

---

## 1. Design Principles

These principles are non-negotiable. Every design decision must pass through them.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   1. READABLE  — If Om Ibrahim can't read it, it doesn't ship  │
│   2. TAPPABLE  — If Om Ibrahim can't tap it, it doesn't ship   │
│   3. HONEST    — If it misleads, it doesn't ship               │
│   4. CALM      — If it overwhelms, it doesn't ship             │
│   5. BILINGUAL — If it breaks in Arabic, it doesn't ship       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

| Principle | Test | Example |
|---|---|---|
| **Readable** | Can a 65-year-old read this on a phone in direct sunlight? | 16px minimum body text, 7:1 contrast ratio, no light gray on white |
| **Tappable** | Can someone with arthritic hands tap this accurately? | 48px minimum touch target, 12px gap between adjacent targets |
| **Honest** | Does this element show the truth, not a persuasion tactic? | Savings badges show real calculations, not inflated "original prices" |
| **Calm** | Does this screen present one clear path forward? | One primary action per section, no competing CTAs, no auto-advancing carousels |
| **Bilingual** | Does this layout work identically in RTL and LTR? | Logical properties only (`ms-` not `ml-`), no hardcoded direction in components |

---

## 2. Color System

### 2.1 Color Palette

All colors are defined as CSS custom properties and mapped to Tailwind utilities. No raw hex values in component code.

#### Primary — Deep Emerald Green

Represents trust, freshness, and the agricultural heritage of Egyptian staples.

| Token | Hex | Usage |
|---|---|---|
| `--color-primary-50` | `#F1F8F2` | Light backgrounds, hover states |
| `--color-primary-100` | `#E8F5E9` | Subtle highlights, selected states |
| `--color-primary-200` | `#C8E6C9` | Borders on light backgrounds |
| `--color-primary-300` | `#A5D6A7` | Disabled text on white |
| `--color-primary-400` | `#66BB6A` | Secondary icons |
| `--color-primary-500` | `#2EA043` | Links, focus rings |
| `--color-primary-600` | `#228B22` | Interactive elements, active states |
| `--color-primary-700` | `#1B6820` | Primary buttons (default) |
| `--color-primary-800` | `#145216` | Primary buttons (hover) |
| `--color-primary-900` | `#0D3B0F` | Header, footer, dark sections |

#### Accent — Warm Amber

Represents urgency (deals), warmth (home delivery), and savings.

| Token | Hex | Usage |
|---|---|---|
| `--color-accent-50` | `#FFF8F0` | Deal card backgrounds |
| `--color-accent-100` | `#FFF3E0` | Deal section backgrounds |
| `--color-accent-200` | `#FFE0B2` | Deal borders |
| `--color-accent-300` | `#FFCC80` | Light accent elements |
| `--color-accent-400` | `#FFA726` | Icons on light backgrounds |
| `--color-accent-500` | `#FF6D00` | Deal badges, countdown timer |
| `--color-accent-600` | `#E64A19` | Urgent badges, error highlights |
| `--color-accent-700` | `#BF360C` | High-urgency elements (rare use) |

#### Neutral — Cool Gray

| Token | Hex | Usage |
|---|---|---|
| `--color-neutral-50` | `#F6F8FA` | Page backgrounds |
| `--color-neutral-100` | `#E8ECF0` | Card borders, dividers |
| `--color-neutral-200` | `#D0D7DE` | Input borders (default) |
| `--color-neutral-300` | `#B1BAC4` | Placeholder text |
| `--color-neutral-400` | `#8B949E` | Secondary text, helper text |
| `--color-neutral-500` | `#6E7781` | Body text (secondary) |
| `--color-neutral-600` | `#4D576A` | Body text (primary on light bg) |
| `--color-neutral-700` | `#3D444D` | Headings on light backgrounds |
| `--color-neutral-800` | `#2C3239` | Dark surface text |
| `--color-neutral-900` | `#1A1F25` | High-emphasis text |

#### Semantic Colors

| Token | Hex | Usage | Accessible Pairing |
|---|---|---|---|
| `--color-success` | `#1A7F37` | In-stock, confirmed, savings | White text ✓ / Dark bg ✓ |
| `--color-success-light` | `#DAFBE1` | Success background | Dark text ✓ |
| `--color-danger` | `#CF222E` | Out-of-stock, error, remove | White text ✓ |
| `--color-danger-light` | `#FFEBE9` | Error background | Dark text ✓ |
| `--color-warning` | `#9A6700` | Low stock, pending | White text ✓ / Dark bg ✓ |
| `--color-warning-light` | `#FFF8C5` | Warning background | Dark text ✓ |
| `--color-info` | `#0969DA` | Informational, links | White text ✓ |
| `--color-info-light` | `#DDF4FF` | Info background | Dark text ✓ |

#### Surface Colors

| Token | Hex | Usage |
|---|---|---|
| `--color-surface` | `#FFFFFF` | Card backgrounds, modal backgrounds |
| `--color-surface-raised` | `#FFFFFF` | Elevated cards (shadow added) |
| `--color-surface-sunken` | `#F6F8FA` | Page background behind cards |
| `--color-overlay` | `rgba(0,0,0,0.5)` | Dialog/sheet backdrop |

### 2.2 Contrast Rules

| Context | Minimum Ratio | GGH Standard |
|---|---|---|
| Body text on background | 4.5:1 (WCAG AA) | **7:1 (WCAG AAA)** |
| Large text (≥24px) on background | 3:1 (WCAG AA) | **4.5:1** |
| UI component boundaries | 3:1 (WCAG AA) | **4.5:1** |
| Focus indicators | 3:1 (WCAG AA) | **4.5:1** |
| Disabled text | No requirement | 3:1 minimum (visible but de-emphasized) |
| Placeholder text | No requirement | 3:1 minimum |

### 2.3 Color Usage Rules

| Rule | Detail |
|---|---|
| **Never use color alone to convey meaning** | A "savings" badge uses green + a downward arrow icon + "Save X EGP" text. All three channels. |
| **Primary green is for actions** | Buttons, links, active navigation. Never for decorative backgrounds. |
| **Accent amber is for attention** | Deals, countdown timers, savings badges. Use sparingly — if everything is highlighted, nothing is. |
| **Semantic colors are for status** | Success, danger, warning, info. Never as decorative or brand colors. |
| **Neutral gray is for structure** | Text, borders, backgrounds. The workhorse of the palette. |
| **White space is a color** | The space between elements is as important as the elements themselves. Never fill every pixel. |

### 2.4 Tailwind Color Mapping

```typescript
// tailwind.config.ts
{
  theme: {
    extend: {
      colors: {
        primary: {
          50:  'var(--color-primary-50)',
          100: 'var(--color-primary-100)',
          200: 'var(--color-primary-200)',
          300: 'var(--color-primary-300)',
          400: 'var(--color-primary-400)',
          500: 'var(--color-primary-500)',
          600: 'var(--color-primary-600)',
          700: 'var(--color-primary-700)',
          800: 'var(--color-primary-800)',
          900: 'var(--color-primary-900)',
        },
        accent: {
          50:  'var(--color-accent-50)',
          100: 'var(--color-accent-100)',
          200: 'var(--color-accent-200)',
          300: 'var(--color-accent-300)',
          400: 'var(--color-accent-400)',
          500: 'var(--color-accent-500)',
          600: 'var(--color-accent-600)',
          700: 'var(--color-accent-700)',
        },
        neutral: {
          50:  'var(--color-neutral-50)',
          100: 'var(--color-neutral-100)',
          200: 'var(--color-neutral-200)',
          300: 'var(--color-neutral-300)',
          400: 'var(--color-neutral-400)',
          500: 'var(--color-neutral-500)',
          600: 'var(--color-neutral-600)',
          700: 'var(--color-neutral-700)',
          800: 'var(--color-neutral-800)',
          900: 'var(--color-neutral-900)',
        },
      }
    }
  }
}
```

---

## 3. Typography

### 3.1 Font Families

| Language | Font | Fallback | Why |
|---|---|---|---|
| **Arabic** | Cairo | `sans-serif` | Optimized for Arabic legibility at screen sizes. Supports all Egyptian Arabic characters. Free, open-source. |
| **English** | Inter | `sans-serif` | Optimized for UI readability. Excellent at small sizes. Variable font for performance. Free, open-source. |
| **Numbers** | Inter | `tabular-nums` | Numbers in prices and quantities must align vertically. Inter's `tabular-nums` feature ensures this. |

### 3.2 Font Loading

```css
/* Loaded via next/font/google in layout.tsx — no @import in CSS */
/* Arabic font loaded for ar locale, English font for en locale */
/* Variable font loaded (single file, all weights) */
```

```typescript
// app/layout.tsx
import { Cairo } from 'next/font/google';
import { Inter } from 'next/font/google';

const cairo = Cairo({
  subsets: ['arabic'],
  variable: '--font-cairo',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});
```

### 3.3 Type Scale

| Token | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| `--text-hero` | 2rem (32px) | 700 | 1.3 | Homepage hero headline |
| `--text-h1` | 1.5rem (24px) | 600 | 1.35 | Page titles, section headers |
| `--text-h2` | 1.25rem (20px) | 600 | 1.4 | Card titles, subsection headers |
| `--text-h3` | 1.125rem (18px) | 500 | 1.4 | Small section headers |
| `--text-body` | 1rem (16px) | 400 | 1.6 | Body text, descriptions, form labels |
| `--text-body-sm` | 0.875rem (14px) | 400 | 1.5 | Helper text, secondary info |
| `--text-caption` | 0.75rem (12px) | 400 | 1.5 | Timestamps, legal text only |
| `--text-price` | 1.25rem (20px) | 700 | 1.2 | Product prices — must be prominent |
| `--text-price-lg` | 1.5rem (24px) | 700 | 1.2 | Cart totals, order totals |
| `--text-button` | 1rem (16px) | 500 | 1.0 | Button labels |
| `--text-badge` | 0.75rem (12px) | 600 | 1.2 | Savings badges, status badges |

### 3.4 Typography Rules

| Rule | Detail |
|---|---|
| **Minimum body text: 16px** | No text in the UI is smaller than 14px. 12px is reserved for timestamps and legal text only. |
| **Prices are always bold** | The price is the most important piece of information on a product card. It must draw the eye immediately. |
| **Line height 1.6 for body** | Arabic script needs more vertical space between lines than Latin. 1.6 prevents line jumping. |
| **No all-caps** | Arabic has no concept of uppercase. To maintain visual consistency between languages, English text never uses `uppercase` transform. |
| **No letter-spacing adjustment** | Arabic letter-spacing is not equivalent to Latin. Leave both at default. Never apply `tracking-wide` to mixed-language text. |
| **Numbers are always Inter** | Prices, quantities, phone numbers, and countdown timers use Inter regardless of locale. Arabic numerals (٠١٢٣) are not used — Egyptian readers expect Western numerals (0123). |
| **Max line length: 65ch** | Body text columns never exceed 65 characters. Wider lines cause reading fatigue. |

---

## 4. Spacing & Layout

### 4.1 Spacing Scale

All spacing uses the 4px base grid. No arbitrary values.

| Token | Value | Usage |
|---|---|---|
| `--space-0` | 0 | — |
| `--space-1` | 4px | Inline icon gaps, tight element pairs |
| `--space-2` | 8px | Between related elements (label + input) |
| `--space-3` | 12px | Between button groups, compact card padding |
| `--space-4` | 16px | Standard card padding, form field gaps |
| `--space-5` | 20px | Section internal spacing |
| `--space-6` | 24px | Between sections, generous card padding |
| `--space-8` | 32px | Between major page sections |
| `--space-10` | 40px | Hero section padding |
| `--space-12` | 48px | Page-level vertical rhythm |
| `--space-16` | 64px | Maximum section spacing |

### 4.2 Container Widths

| Token | Value | Usage |
|---|---|---|
| `--container-sm` | 640px | Forms, single-column content |
| `--container-md` | 768px | Product detail pages |
| `--container-lg` | 1024px | Category pages with sidebar |
| `--container-xl` | 1280px | Homepage, full-width layouts |
| `--container-page` | 100% | Cart, checkout (edge-to-edge on mobile) |

### 4.3 Border Radius

| Token | Value | Usage |
|---|---|---|
| `--radius-none` | 0 | — |
| `--radius-sm` | 6px | Small elements: badges, tags |
| `--radius-md` | 8px | Inputs, buttons |
| `--radius-lg` | 12px | Cards, dialogs |
| `--radius-xl` | 16px | Large panels, bottom sheets |
| `--radius-2xl` | 20px | Hero sections |
| `--radius-full` | 9999px | Circular elements: category icons, avatars |

### 4.4 Shadows

| Token | Value | Usage |
|---|---|---|
| `--shadow-xs` | `0 1px 2px rgba(0,0,0,0.04)` | Subtle lift for inline elements |
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)` | Cards (default) |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)` | Hovered cards, dropdowns |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.08), 0 4px 6px rgba(0,0,0,0.04)` | Modals, popovers |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.1), 0 8px 10px rgba(0,0,0,0.04)` | Full-screen overlays |

### 4.5 Spacing Rules

| Rule | Detail |
|---|---|
| **4px grid** | All spacing values are multiples of 4. No 3px, 7px, or 13px. |
| **Consistent section gaps** | Every page section uses `--space-8` (32px) vertical separation. No guessing. |
| **Card padding** | All cards use `p-4` (16px) on mobile, `p-6` (24px) on desktop. |
| **Mobile edge margins** | 16px on each side. Content never touches the screen edge. |
| **Desktop max-width** | Content area caps at 1280px and centers. Never stretch a 300px card to 1920px. |

---

## 5. Buttons

### 5.1 Button Variants

#### Primary — Green

The default action button. Used for the main CTA on any screen.

```
┌──────────────────────────────────────┐
│          Add to Cart                 │   bg: primary-700
│                                      │   text: white
│                                      │   hover: primary-800
│                                      │   active: primary-900
│                                      │   border-radius: md (8px)
└──────────────────────────────────────┘
```

| Property | Value |
|---|---|
| Background | `var(--color-primary-700)` (#1B6820) |
| Text color | `#FFFFFF` |
| Hover background | `var(--color-primary-800)` (#145216) |
| Active background | `var(--color-primary-900)` (#0D3B0F) |
| Disabled background | `var(--color-primary-300)` (#A5D6A7) |
| Disabled text | `var(--color-primary-50)` (#F1F8F2) |
| Border radius | `8px` |
| Font weight | `500` |
| Font size | `1rem` (16px) |
| Min height | `48px` |
| Padding | `12px 24px` |
| Focus ring | `2px solid var(--color-primary-500)`, offset `2px` |

#### Secondary — Outlined

Used for alternative actions that should not compete with the primary.

| Property | Value |
|---|---|
| Background | `transparent` |
| Border | `2px solid var(--color-primary-700)` |
| Text color | `var(--color-primary-700)` |
| Hover background | `var(--color-primary-50)` |
| Hover border | `2px solid var(--color-primary-800)` |
| All other properties | Same as Primary |

#### Ghost — Text Only

Used for tertiary actions, navigation, and inline links.

| Property | Value |
|---|---|
| Background | `transparent` |
| Text color | `var(--color-primary-600)` |
| Hover background | `var(--color-primary-50)` |
| No border | — |
| Min height | `44px` |
| Padding | `8px 16px` |

#### Danger — Red

Used for destructive actions: remove item, cancel order, delete address.

| Property | Value |
|---|---|
| Background | `var(--color-danger)` (#CF222E) |
| Text color | `#FFFFFF` |
| Hover background | `#A40E26` |
| All other properties | Same as Primary |

#### Deal — Amber

Used exclusively for deal-related CTAs: "Shop Deal", "Grab Offer".

| Property | Value |
|---|---|
| Background | `var(--color-accent-500)` (#FF6D00) |
| Text color | `#FFFFFF` |
| Hover background | `var(--color-accent-600)` (#E64A19) |
| All other properties | Same as Primary |

### 5.2 Button Sizes

| Size | Height | Padding | Font Size | Usage |
|---|---|---|---|---|
| `lg` | 52px | `14px 32px` | 1.125rem (18px) | Homepage hero CTA, checkout confirm |
| `md` (default) | 48px | `12px 24px` | 1rem (16px) | Standard buttons throughout the app |
| `sm` | 40px | `8px 16px` | 0.875rem (14px) | Inline actions in tight spaces only (never the primary action) |

### 5.3 Button with Icons

```
┌─────────────────────────┐     ┌─────────────────────────┐
│  🛒  Add to Cart        │     │  View Details  →        │
│  icon  label            │     │  label        icon      │
└─────────────────────────┘     └─────────────────────────┘
   Icon before label (LTR)         Icon after label (RTL)
```

| Rule | Detail |
|---|---|
| **Icon + label** | Every button has a visible text label. Icon-only buttons are forbidden except in the header (cart icon, language toggle) where `aria-label` is mandatory. |
| **Icon position** | Icon before label in LTR, icon after label in RTL. Use `rtl:flex-row-reverse` or logical ordering. |
| **Icon size** | 20px within `md` button, 24px within `lg` button. |
| **Icon + label gap** | 8px between icon and label. |

### 5.4 Button States

| State | Visual | Duration |
|---|---|---|
| **Default** | As defined per variant | — |
| **Hover** | Background darkens one shade | 150ms ease |
| **Active (pressed)** | Background darkens two shades, scale 0.98 | Instant |
| **Focus** | 2px ring in primary-500, 2px offset | Instant |
| **Disabled** | 40% opacity, cursor-not-allowed | — |
| **Loading** | Label replaced by spinner + "Loading...", button disabled | — |

### 5.5 Button Rules

| Rule | Detail |
|---|---|
| **One primary button per section** | If two buttons appear together, one is Primary and the other is Secondary or Ghost. Never two Primary buttons side by side. |
| **Full-width on mobile** | On screens < 640px, primary buttons stretch to full container width. Secondary and ghost buttons remain auto-width. |
| **No truncation** | Button labels never truncate. If the text is too long, rephrase it. |
| **Loading state is mandatory** | Every button that triggers an async action shows a loading state. No double-clicks possible. |

---

## 6. Forms

### 6.1 Input Fields

```
  Label (body, 16px, semibold)
  ┌──────────────────────────────────────┐
  │  Placeholder text                    │   height: 48px
  │                                      │   border: 2px solid neutral-200
  └──────────────────────────────────────┘   border-radius: 8px
  Helper text (14px, neutral-400)            padding: 12px 16px
```

| Property | Value |
|---|---|
| Height | `48px` minimum |
| Border (default) | `2px solid var(--color-neutral-200)` |
| Border (focus) | `2px solid var(--color-primary-600)` |
| Border (error) | `2px solid var(--color-danger)` |
| Border (disabled) | `2px solid var(--color-neutral-100)` |
| Background | `var(--color-surface)` (white) |
| Background (disabled) | `var(--color-neutral-50)` |
| Border radius | `8px` |
| Padding | `12px 16px` |
| Font size | `1rem` (16px) — **never smaller** |
| Placeholder color | `var(--color-neutral-300)` |
| Label position | **Above** the input (never beside it — breaks in RTL) |
| Label font | Body, 16px, semibold |
| Helper text | 14px, neutral-400, below the input |
| Error text | 14px, danger, below the input, with ⚠ icon |

### 6.2 Text Area

Same as input, with:
- Min height: 120px
- Vertical resize only
- Character count shown below when maxLength is set

### 6.3 Select / Dropdown

| Property | Value |
|---|---|
| Trigger height | `48px` |
| Same styling as input | Border, radius, padding match input |
| Dropdown panel | White background, `shadow-lg`, `radius-lg` bottom corners |
| Option height | `44px` minimum per option |
| Option padding | `12px 16px` |
| Selected option | `primary-50` background, `primary-700` text |
| Hover option | `neutral-50` background |

### 6.4 Checkbox

| Property | Value |
|---|---|
| Visual size | `20px × 20px` |
| **Tap target** | **`44px × 44px`** (invisible padding around the visual checkbox) |
| Border (default) | `2px solid var(--color-neutral-300)` |
| Border (checked) | `2px solid var(--color-primary-700)` |
| Background (checked) | `var(--color-primary-700)` |
| Check icon | White, 14px |
| Label gap | `12px` between checkbox and label |
| Label font | Body, 16px |

### 6.5 Radio Button

Same dimensions as checkbox, with circular shape and filled dot instead of checkmark.

### 6.6 Quantity Stepper

The quantity stepper is a critical component for a wholesale platform. It must be large, clear, and impossible to mis-tap.

```
  ┌────┐  ┌──────────┐  ┌────┐
  │ −  │  │    5     │  │ +  │
  │    │  │          │  │    │
  │48px│  │  48px    │  │48px│
  └────┘  └──────────┘  └────┘
    16px gap   16px gap
```

| Property | Value |
|---|---|
| Button size | `48px × 48px` |
| Button border | `2px solid var(--color-neutral-200)` |
| Button background | `var(--color-surface)` |
| Button hover | `var(--color-neutral-50)` |
| Active button | `var(--color-primary-700)` bg, white icon |
| Value display | `48px` height, centered, bold, 18px |
| Gap between buttons and value | `16px` |
| Minus disabled at MOQ | Opacity 40%, cursor-not-allowed |
| Plus disabled at max stock | Opacity 40%, cursor-not-allowed |
| Long press | Hold + or − for rapid increment (300ms initial, 100ms repeat) |

### 6.7 Form Validation Rules

| Rule | Detail |
|---|---|
| **Validate on blur** | Show error when the user leaves a field. Not while typing. |
| **Error below the field** | Error messages appear directly below the relevant field, never in a toast or at the top of the form. |
| **Error icon + text + color** | Three channels: ⚠ icon + red text + red border. |
| **Clear error on focus** | When the user returns to a field with an error, clear the error state. Re-validate on next blur. |
| **Arabic error messages** | Error messages are in the user's locale. "هذا الحقل مطلوب" not "This field is required". |
| **No alert dialogs for validation** | Never use `window.alert()` or a modal for form validation. Inline only. |

### 6.8 Form Layout Rules

| Rule | Detail |
|---|---|
| **Labels above inputs** | Never beside. Beside labels break in RTL and on narrow screens. |
| **One column on mobile** | Form fields stack vertically. No side-by-side fields below 640px. |
| **Submit button at the bottom** | The user reads top-to-bottom, fills in order, and submits at the end. The button is always the last element. |
| **Group related fields** | Name fields (first + last) may sit side-by-side on desktop. Address fields are grouped with a subtle border. |

---

## 7. Cards

### 7.1 Product Card

The most important card in the entire application.

```
  ┌───────────────────────────┐
  │                           │
  │    [Product Image]        │   Aspect ratio: 1:1
  │     100% width            │   Object fit: cover
  │                           │   Background: neutral-50 (placeholder)
  │                           │
  ├───────────────────────────┤
  │  Brand (12px, neutral-400)│   Padding: 12px
  │  Product Name             │   16px, semibold, neutral-800
  │  5 kg                     │   14px, neutral-500
  │                           │
  │  110 ج.م    125 ج.م      │   Price: 20px bold primary-700
  │  today       yesterday    │   Yesterday: 14px, line-through, neutral-400
  │                           │
  │  ┌────┐  ┌──────────┐  ┌────┐
  │  │ −  │  │    1     │  │ +  │   Quantity stepper (48px targets)
  │  └────┘  └──────────┘  └────┘
  │                           │
  │  [  Add to Cart       ]   │   Full-width primary button, 48px height
  └───────────────────────────┘

  Card: bg-surface, radius-lg, shadow-sm
  Hover: shadow-md, translateY(-2px), 200ms ease
```

| Property | Mobile | Desktop |
|---|---|---|
| Card width | 50% (2 columns) | 25% (4 columns) |
| Image height | 160px | 200px |
| Padding | 12px | 16px |
| Gap between cards | 12px | 16px |

### 7.2 Deal Card

Similar to product card with additional deal-specific elements:

```
  ┌───────────────────────────┐
  │ ┌──────────┐              │   Savings badge: accent-500 bg,
  │ │وفّر ١٥٪  │              │   white text, radius-sm
  │ └──────────┘              │
  │    [Product Image]        │
  ├───────────────────────────┤
  │  Product Name             │
  │                           │
  │  95 ج.م    110 ج.م       │
  │                           │
  │  ┌─────────────────────┐  │
  │  │  Ends in 02:45:30  │  │   Countdown: accent-100 bg,
  │  │  ⏱ HH:MM:SS       │  │   accent-600 text, monospace
  │  └─────────────────────┘  │
  │                           │
  │  [  Shop Deal         ]   │   Deal variant button (amber)
  └───────────────────────────┘
```

### 7.3 Category Card

```
  ┌───────────────┐
  │               │
  │    🍚        │   64px icon/emoji, centered
  │               │
  │  Rice & Grains│   14px, semibold, neutral-700
  │  أرز وحبوب   │   12px, neutral-500
  │               │
  └───────────────┘

  Card: 96px × 96px on mobile, 120px × 120px on desktop
  Background: surface
  Border: 1px solid neutral-100
  Border-radius: radius-xl (16px)
  Hover: primary-50 bg, primary-200 border
  Active: primary-100 bg
```

### 7.4 Cart Item Card

```
  ┌───────────────────────────────────────────┐
  │ ┌──────┐                                  │
  │ │ img  │  Product Name                   │
  │ │ 64px │  5 kg · Al Doha                 │
  │ └──────┘  110 ج.م × 3 = 330 ج.م         │
  │                                           │
  │           ┌────┐  ┌────┐  ┌────┐          │
  │           │ −  │  │ 3  │  │ +  │          │
  │           └────┘  └────┘  └────┘          │
  │                                           │
  │                            [Remove]       │
  └───────────────────────────────────────────┘

  Card: bg-surface, border-b 1px neutral-100
  No shadow (flat list item, not elevated)
  Remove: ghost button, danger text color
```

### 7.5 Card Rules

| Rule | Detail |
|---|---|
| **Consistent radius** | All cards use `radius-lg` (12px). No mixing radii on the same page. |
| **Shadow on hover only** | Cards are flat by default (`shadow-sm`). Shadow deepens on hover (`shadow-md`). This provides visual feedback without visual noise at rest. |
| **No skeleton borders** | Do not put a border on a card that also has a shadow. Pick one. GGH uses shadows. |
| **Image placeholders** | While loading, show a `neutral-50` rectangle matching the image aspect ratio. Never a blank white space. |

---

## 8. Dialogs & Sheets

### 8.1 Dialog (Modal)

Used for confirmations that require explicit user choice: "Cancel order?", "Remove from cart?"

```
  ┌─────────────────────────────────────┐
  │  (overlay: black/50%)              │
  │    ┌───────────────────────────┐    │
  │    │  Remove Item?             │    │   Title: h3, 18px, semibold
  │    │                           │    │
  │    │  Are you sure you want    │    │   Body: 16px, neutral-600
  │    │  to remove this from      │    │
  │    │  your cart?               │    │
  │    │                           │    │
  │    │  ┌─────────┐ ┌─────────┐ │    │   Buttons: Secondary + Danger
  │    │  │  Cancel  │ │ Remove  │ │    │   side by side on desktop
  │    │  └─────────┘ └─────────┘ │    │   stacked on mobile
  │    └───────────────────────────┘    │
  └─────────────────────────────────────┘
```

| Property | Value |
|---|---|
| Overlay | `rgba(0,0,0,0.5)` |
| Dialog background | `var(--color-surface)` |
| Dialog max width | `480px` |
| Dialog padding | `24px` |
| Border radius | `radius-xl` (16px) |
| Title | `h3`, 18px, semibold |
| Body text | 16px, neutral-600 |
| Button layout | Side-by-side on desktop, stacked on mobile |
| Close method | X button (top-right LTR / top-left RTL) + Escape key + overlay click |
| Focus trap | Tab key cycles within the dialog. Focus never escapes. |
| Entry animation | Fade in overlay (200ms), slide up dialog (200ms ease-out) |
| Exit animation | Fade out (150ms) |

### 8.2 Sheet (Slide-out Panel)

Used for the cart, filters, and quick-view panels that slide in from the edge.

| Property | LTR | RTL |
|---|---|---|
| Slide direction | From right | From left |
| Width | `400px` desktop / `100%` mobile | Same |
| Background | `var(--color-surface)` | Same |
| Overlay | `rgba(0,0,0,0.5)` | Same |
| Border radius | `radius-xl` on leading edge (left in LTR, right in RTL) | Mirrored |
| Close method | X button, Escape key, overlay click, swipe closed | Same |
| Entry animation | Slide in 300ms ease-out | Same (direction mirrored) |

### 8.3 Dialog & Sheet Rules

| Rule | Detail |
|---|---|
| **No nested dialogs** | Never open a dialog on top of another dialog. Use a single dialog with progressive disclosure instead. |
| **Focus the first interactive element** | When a dialog opens, focus moves to the first button or input. |
| **Return focus on close** | When a dialog closes, focus returns to the element that triggered it. |
| **Escape closes** | The Escape key always closes a dialog or sheet. |
| **Scroll lock** | When a dialog or sheet is open, the background page does not scroll. |
| **Announce to screen readers** | Dialog has `role="dialog"` and `aria-modal="true"`. Sheet has `role="dialog"`. |

---

## 9. Tables

Tables are used sparingly in the customer-facing application (order history, invoice details). They are used extensively in the admin dashboard (Medusa Admin), which is outside the scope of this design system.

### 9.1 Responsive Table

On mobile, tables transform into stacked card layouts. No horizontal scroll.

| Screen | Display |
|---|---|
| ≥ 768px | Traditional table with columns |
| < 768px | Each row becomes a card with label-value pairs |

### 9.2 Table Specifications

| Property | Value |
|---|---|
| Header background | `var(--color-neutral-50)` |
| Header text | 14px, semibold, neutral-700 |
| Row height | `56px` minimum |
| Row border | `1px solid var(--color-neutral-100)` bottom |
| Cell padding | `12px 16px` |
| Striped rows | Alternate `neutral-50` and white (optional) |
| Sortable header | Clickable, with arrow icon indicating direction |
| Alignment | Text: start. Numbers (prices, quantities): end. |

### 9.3 Mobile Card Layout (Row → Card Transform)

```
  Desktop table row:
  ┌──────────┬────────────┬──────────┬──────────┐
  │ Order #  │ Date       │ Status   │ Total    │
  ├──────────┼────────────┼──────────┼──────────┤
  │ GGH-1234 │ 19 Jul 26  │ Delivered│ 1,250 EGP│
  └──────────┴────────────┴──────────┴──────────┘

  Mobile card:
  ┌─────────────────────────────────┐
  │  Order #    GGH-1234           │
  │  Date       19 Jul 26          │
  │  Status     ● Delivered        │
  │  Total      1,250 EGP          │
  │                                 │
  │  [View Details →]              │
  └─────────────────────────────────┘
```

---

## 10. Icons

### 10.1 Icon Library

GGH uses **Lucide React** icons. No custom SVG icons unless Lucide does not provide a suitable option.

### 10.2 Icon Sizes

| Size | Pixel | Usage |
|---|---|---|
| `xs` | 16px | Inline with text, breadcrumbs |
| `sm` | 20px | Within buttons, form labels |
| `md` | 24px | Navigation, list items |
| `lg` | 32px | Empty state illustrations, category icons |
| `xl` | 48px | Hero sections, feature highlights |

### 10.3 Icon Rules

| Rule | Detail |
|---|---|
| **Every icon has a text label** | No icon-only buttons except cart count and locale toggle in the header, which have `aria-label`. |
| **Icons are decorative or semantic — never both** | A decorative icon (bulleting a list) uses `aria-hidden="true"`. A semantic icon (showing a downward trend) has `aria-label`. |
| **Directional icons flip in RTL** | Arrow-right becomes Arrow-left. ChevronRight becomes ChevronLeft. Use a `<DirectionalIcon>` wrapper that handles this automatically. |
| **Stroke width: 2px** | Consistent with Lucide's default. Never change stroke width per component. |
| **Color inherits from parent** | Icons use `currentColor`. Never hard-code icon color — let the parent text color determine it. |

### 10.4 Category Icons

Product categories use emoji instead of custom SVG icons. This ensures cross-platform rendering without asset management overhead.

| Category | Emoji | `aria-label` (EN) | `aria-label` (AR) |
|---|---|---|---|
| Rice & Grains | 🍚 | Rice | أرز |
| Pasta & Noodles | 🍝 | Pasta | مكرونة |
| Flour & Baking | 🌾 | Flour | دقيق |
| Sugar & Sweeteners | 🍬 | Sugar | سكر |
| Oils & Fats | 🫒 | Oil | زيت |
| Ghee & Butter | 🧈 | Ghee | سمنة |
| Beans & Lentils | 🫘 | Beans | فول وعدس |
| Tea & Coffee | ☕ | Tea and coffee | شاي وقهوة |
| Spices & Seasonings | 🌶️ | Spices | توابل |
| Tomato Paste & Sauces | 🥫 | Tomato paste | صلصة |
| Canned Foods | 🥫 | Canned food | معلبات |
| Frozen Food | ❄️ | Frozen food | مجمدات |
| Cleaning Products | 🧹 | Cleaning | تنظيف |
| Paper Products | 🧻 | Paper products | مناديل |
| Household Essentials | 🏠 | Household | منزلية |

---

## 11. Badges & Tags

### 11.1 Savings Badge

```
  ┌──────────────────┐
  │ ▼ Save 15 EGP    │   bg: success-light
  │                  │   text: success, 12px, semibold
  └──────────────────┘   border-radius: sm (6px)
                         padding: 4px 8px
```

### 11.2 Status Badge

| Status | Background | Text | Dot Color |
|---|---|---|---|
| Confirmed | `info-light` | `info` | `info` |
| Picked | `warning-light` | `warning` | `warning` |
| Shipped | `primary-50` | `primary-700` | `primary-500` |
| Delivered | `success-light` | `success` | `success` |
| Cancelled | `danger-light` | `danger` | `danger` |

```
  ● Confirmed       ● = 8px dot + 8px gap + text (12px, semibold)
```

### 11.3 Deal Badge

```
  ┌──────────────┐
  │  HOT DEAL    │   bg: accent-500
  │              │   text: white, 12px, bold, uppercase
  └──────────────┘   border-radius: sm (6px)
                     padding: 4px 10px
```

### 11.4 Out of Stock Badge

```
  ┌──────────────────────┐
  │  Available Soon      │   bg: neutral-100
  │                      │   text: neutral-600, 12px, semibold
  └──────────────────────┘
```

### 11.5 Badge Rules

| Rule | Detail |
|---|---|
| **Maximum one badge per card** | A product card shows the most important badge only. Priority: Deal > Out of Stock > Savings. |
| **Badge position** | Top-start corner of the card image (top-left in LTR, top-right in RTL). |
| **No punctuation in badges** | "Save 15 EGP" not "Save 15 EGP!" Exclamation marks are forbidden in badges. |

---

## 12. Loading & Empty States

### 12.1 Skeleton Loading

Skeletons match the shape and spacing of the final content. No generic spinners on content areas.

| Component | Skeleton |
|---|---|
| Product card | Rectangle (image) + 2 lines (name, price) + small rectangle (button) |
| Category grid | Circles with text lines below |
| Cart item | Small rectangle (image) + 3 lines (name, variant, price) |
| Order list | Full-width rectangles with status dot placeholder |

```
  Skeleton product card:
  ┌───────────────────────────┐
  │                           │
  │  ████████████████████████ │   Gray-200, animate-pulse
  │                           │
  ├───────────────────────────┤
  │  ████████████             │   60% width
  │  ████████                 │   40% width
  │  ██████████████           │   50% width
  └───────────────────────────┘
```

### 12.2 Empty States

Every list view has an empty state with:
1. **Illustration** (SVG, brand-colored, simple)
2. **Message** (friendly, Arabic-first)
3. **Action** (one clear next step)

| Context | Message (AR) | Message (EN) | Action |
|---|---|---|---|
| Empty cart | سلتك فاضية — وقت التسوق! | Your cart is empty — time to shop! | "Browse Categories" |
| No orders | ماعندكش طلبات لسه | No orders yet | "Start Shopping" |
| No search results | مفيش نتايج للبحث ده | No results for this search | "Browse Categories" |
| No addresses | مفيش عناوين محفوظة | No saved addresses | "Add Address" |

### 12.3 Loading Rules

| Rule | Detail |
|---|---|
| **No blank screens** | Every loading state shows a skeleton. Never a white page with a centered spinner. |
| **Skeleton matches final layout** | The skeleton has the same dimensions, spacing, and general shape as the loaded content. This prevents layout shift. |
| **8-second toast rule** | If an action takes more than 2 seconds, show a loading indicator on the button. If it takes more than 8 seconds, show a toast: "This is taking longer than expected." |
| **Optimistic updates for cart** | When adding to cart, update the UI immediately (optimistic), then confirm with the server. If the server rejects, revert and show error toast. |

---

## 13. Toast Notifications

### 13.1 Toast Types

| Type | Icon | Background | Border | Duration |
|---|---|---|---|---|
| **Success** | ✓ circle | `success-light` | `success` left border | 5 seconds |
| **Error** | ✗ circle | `danger-light` | `danger` left border | 8 seconds |
| **Warning** | ⚠ triangle | `warning-light` | `warning` left border | 6 seconds |
| **Info** | ℹ circle | `info-light` | `info` left border | 5 seconds |

### 13.2 Toast Position

| Screen | Position |
|---|---|
| Desktop | Bottom-end (bottom-right in LTR, bottom-left in RTL) |
| Mobile | Bottom-center, full-width with 16px margin |

### 13.3 Toast Specifications

| Property | Value |
|---|---|
| Max width | `420px` |
| Padding | `12px 16px` |
| Border radius | `radius-md` (8px) |
| Border left (LTR) / right (RTL) | `4px solid` semantic color |
| Title | 14px, semibold |
| Message | 14px, neutral-600 |
| Action button | Ghost, within toast |
| Dismiss | X button + auto-dismiss + swipe to dismiss |

### 13.4 Toast Rules

| Rule | Detail |
|---|---|
| **Minimum duration: 5 seconds** | Toasts must be readable. Elderly users read slowly. Never auto-dismiss in under 5 seconds. |
| **Maximum 3 toasts at once** | Stack vertically. If a 4th arrives, dismiss the oldest. |
| **No toasts for form validation** | Validation errors are inline. Toasts are for async outcomes (item added, order placed, server error). |
| **Undo action** | "Item removed from cart" toast includes an "Undo" button that restores the item within 30 seconds. |

---

## 14. Navigation

### 14.1 Header

```
  ┌─────────────────────────────────────────────────────────────────┐
  │ ┌──────┐                              ┌────┐ ┌────┐ ┌────┐    │
  │ │ GGH  │  🔍 Search products...       │عربي│ │ 🛒 │ │ ☰  │    │
  │ │ Logo │                              │    │ │ 3  │ │    │    │
  │ └──────┘                              └────┘ └────┘ └────┘    │
  └─────────────────────────────────────────────────────────────────┘
  height: 64px mobile / 72px desktop
  bg: surface, border-b 1px neutral-100
  position: sticky top-0 z-50
```

| Element | Size | Touch Target | Notes |
|---|---|---|---|
| Logo | 40px height | 48px area | Links to homepage |
| Search input | 48px height | — | Expands on focus (mobile) |
| Language toggle | 44px × 44px | 44px | Shows "عربي" or "EN" |
| Cart icon | 44px × 44px | 44px | Badge count overlays top-end |
| Menu hamburger | 44px × 44px | 44px | Mobile only |

### 14.2 Mobile Bottom Navigation

```
  ┌─────────┬─────────┬─────────┬─────────┐
  │  🏠     │  📂     │  🔥     │  👤     │
  │  Home   │Categories│ Deals  │Account  │
  └─────────┴─────────┴─────────┴─────────┘
  height: 64px + safe-area-inset-bottom
  bg: surface, border-t 1px neutral-100
  position: fixed bottom-0 z-50
```

| Rule | Detail |
|---|---|
| **4 items maximum** | Home, Categories, Deals, Account. Cart is in the header, not here — it's too easy to accidentally tap. |
| **Active state** | Primary-700 icon + text. Inactive: neutral-400. |
| **Safe area** | `padding-bottom: env(safe-area-inset-bottom)` for iPhone home indicator. |
| **Always visible** | Fixed to bottom. Does not scroll away. |

### 14.3 Category Navigation (Horizontal Scroll)

```
  ← 🍚 Rice  🍝 Pasta  🌾 Flour  🍬 Sugar  🫒 Oil  🧈 Ghee →
     active: primary-700 underline, bold
```

| Property | Value |
|---|---|
| Height | `48px` per item |
| Scroll direction | Starts from right in RTL, left in LTR |
| Active indicator | `2px solid var(--color-primary-700)` underline |
| Scroll indicators | Fade gradient at edges to hint at more content |
| Snap | `scroll-snap-type: x mandatory` for crisp stopping |

### 14.4 Breadcrumbs

```
  Home > Rice & Grains > Basmati Rice       (LTR)
  الرئيسية < أرز وحبوب < أرز بسمتي         (RTL)
```

| Property | Value |
|---|---|
| Font size | 14px |
| Color | neutral-400 (inactive), primary-600 (current) |
| Separator | `/` with 8px margin on each side |
| Last item | Not linked, current page color |

---

## 15. Responsiveness

### 15.1 Breakpoints

| Name | Width | Target |
|---|---|---|
| `xs` | 0–479px | Small phones (iPhone SE, Galaxy A series) |
| `sm` | 480–639px | Standard phones |
| `md` | 640–767px | Large phones, small tablets |
| `lg` | 768–1023px | Tablets |
| `xl` | 1024–1279px | Small laptops |
| `2xl` | 1280px+ | Desktops and large laptops |

### 15.2 Responsive Behavior Matrix

| Component | Mobile (<640px) | Tablet (640–1023px) | Desktop (≥1024px) |
|---|---|---|---|
| **Product grid** | 2 columns | 3 columns | 4 columns |
| **Category grid** | 3 columns | 4 columns | 6 columns |
| **Cart** | Full page | Slide-out sheet | Slide-out sheet |
| **Checkout** | Single column, full page | Single column, max-width 640px | Two columns (form + summary) |
| **Navigation** | Bottom bar + hamburger | Header + side category | Header + mega-nav |
| **Search** | Full-screen overlay | Inline in header | Inline in header |
| **Deal carousel** | 1 card visible | 2 cards visible | 3 cards visible |
| **Font size (hero)** | 24px | 28px | 32px |
| **Page margins** | 16px | 24px | 32px auto (max-width 1280px) |

### 15.3 Touch vs. Pointer

| Context | Behavior |
|---|---|
| **Hover effects** | Only applied via `@media (hover: hover)`. Touch devices do not show hover states. |
| **Active states** | Applied on `:active` for all devices. This is the primary feedback on touch. |
| **Tooltips** | Never the only way to access information. On touch, tooltips activate on long-press with a visible trigger. |
| **Drag-and-drop** | Not used. Wholesale customers prefer tapping + and − over dragging quantities. |

### 15.4 Responsive Rules

| Rule | Detail |
|---|---|
| **Mobile-first CSS** | Write base styles for mobile, then add `md:` and `lg:` overrides. Never desktop-first with mobile overrides. |
| **No horizontal scroll** | No page or component requires horizontal scrolling (except the intentional category/deal carousels). |
| **Content reflow, not zoom** | When the viewport shrinks, content reflows into fewer columns. Text is never zoomed out. |
| **Images scale, text doesn't shrink** | Product images scale with the grid. Text sizes stay at minimum 14px at every breakpoint. |
| **Touch targets don't shrink** | A 48px button on desktop is a 48px button on mobile. Touch targets are constant across breakpoints. |

---

## 16. RTL Support

### 16.1 RTL Rules (Mandatory)

Every rule in this section is enforced by ESLint plugin and code review. Violations fail CI.

| Rule | Implementation | Rationale |
|---|---|---|
| **Use logical CSS properties** | `ms-*` / `me-*` instead of `ml-*` / `mr-*`. `ps-*` / `pe-*` instead of `pl-*` / `pr-*`. `start-*` / `end-*` instead of `left-*` / `right-*`. | Logical properties automatically flip in RTL. No manual override needed. |
| **Never use `text-left` or `text-right`** | Use `text-start` (default) or `text-end`. | `text-start` maps to `left` in LTR and `right` in RTL. |
| **Flip directional icons** | Arrow icons, chevrons, and directional shapes flip in RTL. Use a `<FlipOnRtl>` wrapper or `rtl:rotate-y-180`. | An arrow pointing "forward" should point left in Arabic. |
| **Borders use logical sides** | `border-s-*` / `border-e-*` instead of `border-l-*` / `border-r-*`. | Toast left-border becomes right-border in RTL. |
| **Round corners use logical sides** | `rounded-s-*` / `rounded-e-*` instead of `rounded-l-*` / `rounded-r-*`. | Sheet slide-in corner rounds on the leading edge. |
| **No `float: left/right`** | Use flexbox or grid with logical alignment. | Float does not respect `dir`. |
| **Translate keys are neutral** | `"cart.title": "سلتك"` not `"cart.titleAr": "سلتك"`. | The key is the same; only the value changes. |
| **Numbers stay LTR** | Prices and quantities are always LTR, even in Arabic text. Wrap in `<bdi>` or `dir="ltr"`. | Arabic readers expect prices in Western numerals, left-to-right. |
| **Scroll direction** | Horizontal scroll containers start from the right in RTL. `dir="rtl"` on the scroll container handles this. | Natural reading direction. |

### 16.2 Layout Mirroring

```
  LTR Layout:                         RTL Layout:

  ┌─────────────────────────┐        ┌─────────────────────────┐
  │ [Logo]          [Cart]  │        │ [Cart]          [Logo]  │
  ├─────────────────────────┤        ├─────────────────────────┤
  │                         │        │                         │
  │  Image    Name          │        │          Name    Image  │
  │           Price         │        │         Price           │
  │           [Add]         │        │         [Add]           │
  │                         │        │                         │
  ├─────────────────────────┤        ├─────────────────────────┤
  │ [Home] [Categories] ...│        │ ... [Categories] [Home] │
  └─────────────────────────┘        └─────────────────────────┘
```

### 16.3 Elements That Do NOT Flip

| Element | Why |
|---|---|
| Brand logo | The GGH logo reads the same in both directions |
| Product images | Photos have no directionality |
| Cart icon | Universal symbol |
| Phone number | Always LTR |
| Email address | Always LTR |
| Social media icons | Fixed position |

---

## 17. Accessibility Rules

### 17.1 WCAG Compliance Target

GGH targets **WCAG 2.1 Level AA** at minimum, with several **Level AAA** enhancements.

| Criterion | Level | GGH Standard |
|---|---|---|
| Text contrast (normal) | AA: 4.5:1 | **AAA: 7:1** |
| Text contrast (large) | AA: 3:1 | **AA: 4.5:1** |
| Non-text contrast | AA: 3:1 | **AA: 4.5:1** |
| Touch target size | — (no WCAG requirement) | **48px minimum** |
| Focus visible | AA | **Custom 2px ring, high contrast** |
| Error identification | AA | **Three channels: color + icon + text** |
| Name, Role, Value | AA | **All interactive elements have accessible name in both languages** |

### 17.2 Keyboard Navigation

| Key | Action |
|---|---|
| `Tab` | Move to next interactive element |
| `Shift+Tab` | Move to previous interactive element |
| `Enter` | Activate buttons, links |
| `Space` | Activate buttons, toggle checkboxes |
| `Escape` | Close dialogs, sheets, dropdowns |
| `Arrow keys` | Navigate within radio groups, tab lists, dropdown options |
| `Home` / `End` | Jump to first / last item in a list (optional) |

### 17.3 Focus Management

| Context | Focus Behavior |
|---|---|
| **Page load** | Focus on `<body>`. No autofocus on inputs. |
| **Dialog open** | Focus moves to first interactive element inside the dialog. |
| **Dialog close** | Focus returns to the element that opened the dialog. |
| **Sheet open** | Focus moves to sheet's close button. |
| **Sheet close** | Focus returns to trigger element. |
| **Route change** | Focus moves to `<main>` or the page's `<h1>`. Announced by screen reader. |
| **Item added to cart** | Focus stays on the "Add to Cart" button (which now shows "Added ✓"). Screen reader announces "Basmati Rice added to cart". |
| **Toast appears** | Focus does NOT move to toast (it would interrupt the user). Toast is announced via `aria-live="polite"`. |

### 17.4 Focus Ring Specification

```
  Default:  outline: none
  Focus:    outline: 2px solid var(--color-primary-500)
            outline-offset: 2px
            border-radius: inherits parent radius

  High contrast mode:
            outline: 3px solid var(--color-primary-500)
            outline-offset: 2px
```

| Rule | Detail |
|---|---|
| **Never remove focus rings** | `outline: none` is only applied when a custom focus style is provided. Never globally. |
| **Visible on all backgrounds** | The green focus ring has 7:1 contrast on white. On dark backgrounds, use a white ring with green border. |
| **Keyboard-only display** | Focus rings show on keyboard navigation only, not on mouse clicks. Use `:focus-visible` selector. |

### 17.5 Screen Reader Announcements

| Event | Announcement (AR) | Announcement (EN) |
|---|---|---|
| Item added to cart | "أرز بسمتي أضيف للسلة" | "Basmati Rice added to cart" |
| Item removed from cart | "أرز بسمتي شيل من السلة" | "Basmati Rice removed from cart" |
| Cart total updated | "إجمالي السلة ألف وميتين وخمسين جنيه" | "Cart total 1,250 EGP" |
| Quantity changed | "الكمية بقت خمسة" | "Quantity changed to 5" |
| Order placed | "طلبك اتحول بنجاح، رقم الطلب جي جي إتش ١٢٣٤" | "Order placed successfully, order number GGH-1234" |
| Form error | "فيه مشكلة في البيانات، لو سمحت صحح الأخطاء" | "There are errors in the form. Please fix them." |

### 17.6 ARIA Patterns

| Component | ARIA Role | Key Attributes |
|---|---|---|
| Product card | `article` | `aria-label="[product name], [price]"` |
| Add to cart button | `button` | `aria-label="Add [product name] to cart"` |
| Quantity stepper | `group` | `role="group"`, `aria-label="Quantity"` |
| Cart slide-out | `dialog` | `aria-label="Shopping cart"`, `aria-modal="true"` |
| Countdown timer | `timer` | `role="timer"`, `aria-live="polite"`, `aria-label="Deal ends in [time]"` |
| Savings badge | `status` | `role="status"`, `aria-label="Save [amount] Egyptian pounds"` |
| Category scroll | `tablist` | `role="tablist"`, items `role="tab"` |
| Search input | `combobox` | `role="combobox"`, `aria-expanded`, `aria-autocomplete="list"` |
| Order status bar | `progressbar` | `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax` |

### 17.7 Accessibility Testing Checklist

Every PR that modifies a user-facing component must pass this checklist:

- [ ] All interactive elements reachable via Tab key
- [ ] Focus ring visible on every interactive element
- [ ] No keyboard traps (Tab always moves forward, Escape closes overlays)
- [ ] Every image has `alt` text (Arabic when `dir="rtl"`)
- [ ] Every form input has a visible label and `aria-label`
- [ ] Error messages are associated with inputs via `aria-describedby`
- [ ] Color is not the only indicator of state (icon + text present)
- [ ] Touch targets meet 48px minimum
- [ ] Text contrast meets 7:1 for body, 4.5:1 for large text
- [ ] Screen reader announces dynamic content changes via `aria-live`
- [ ] Page has a meaningful `<h1>` as the first heading
- [ ] Heading hierarchy is correct (h1 → h2 → h3, no skipping)
- [ ] `lang` attribute matches the current locale on `<html>`
- [ ] `dir` attribute matches the current direction on `<html>`

---

## 18. Motion & Animation

### 18.1 Animation Principles

| Principle | Rule |
|---|---|
| **Purposeful** | Every animation communicates a state change. No decorative animations. |
| **Brief** | Animations last 150–300ms. Nothing exceeds 500ms. |
| **Respectful** | All animations respect `prefers-reduced-motion`. If reduced motion is preferred, disable all non-essential animations. |
| **Smooth** | Use `ease-out` for entries, `ease-in` for exits, `ease-in-out` for transforms. |

### 18.2 Animation Catalog

| Element | Property | Duration | Easing | Reduced Motion |
|---|---|---|---|---|
| Button hover | `background-color` | 150ms | `ease` | Instant |
| Button press | `transform: scale(0.98)` | 100ms | `ease` | Instant |
| Card hover | `transform: translateY(-2px)` + `box-shadow` | 200ms | `ease-out` | Shadow change only |
| Dialog open | `opacity` 0→1 + `translateY(8px→0)` | 200ms | `ease-out` | Opacity only |
| Dialog close | `opacity` 1→0 | 150ms | `ease-in` | Instant |
| Sheet slide in | `translateX(100%→0)` | 300ms | `ease-out` | Instant |
| Sheet slide out | `translateX(0→100%)` | 200ms | `ease-in` | Instant |
| Toast appear | `opacity` 0→1 + `translateY(8px→0)` | 200ms | `ease-out` | Opacity only |
| Toast dismiss | `opacity` 1→0 | 150ms | `ease-in` | Instant |
| Skeleton pulse | `opacity` 0.4→1 | 1.5s | `ease-in-out` | Static gray |
| Page transition | `opacity` 0→1 | 200ms | `ease-out` | Instant |
| Category scroll | `scroll-snap` | 300ms | `ease-out` | No snap |
| Countdown tick | `transform: scale(1.05→1)` | 150ms | `ease-out` | No animation |

### 18.3 Reduced Motion Implementation

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 19. Dark Mode (Future)

Dark mode is **not** in scope for Phase 1. It is documented here to ensure the design system is prepared for it.

### 19.1 Preparation Rules

| Rule | Detail |
|---|---|
| **All colors are CSS variables** | No raw hex values in components. When dark mode ships, only the variable values change. |
| **No white/light assumptions** | Components never assume the background is white. Use `var(--color-surface)` not `#fff`. |
| **Shadows adapt** | In dark mode, shadows use lighter values (less contrast on dark surfaces). |
| **Images get subtle dimming** | In dark mode, product images get a slight opacity reduction (0.95) to reduce brightness. |
| **Dark mode token prefix** | Dark mode tokens will be prefixed `--dm-` and swapped via `[data-theme="dark"]` selector. |

### 19.2 Planned Dark Mode Palette

| Token | Light Value | Dark Value (Planned) |
|---|---|---|
| `--color-surface` | `#FFFFFF` | `#1A1F25` |
| `--color-surface-sunken` | `#F6F8FA` | `#0F1419` |
| `--color-neutral-900` (text) | `#1A1F25` | `#F6F8FA` |
| `--color-neutral-600` (body text) | `#4D576A` | `#B1BAC4` |
| `--shadow-sm` | `rgba(0,0,0,0.08)` | `rgba(0,0,0,0.3)` |

---

## 20. Design Tokens Reference

Complete CSS custom property reference. This is the single source of truth for all design values.

```css
:root {
  /* ── Colors ─────────────────────────────────────── */
  --color-primary-50:  #F1F8F2;
  --color-primary-100: #E8F5E9;
  --color-primary-200: #C8E6C9;
  --color-primary-300: #A5D6A7;
  --color-primary-400: #66BB6A;
  --color-primary-500: #2EA043;
  --color-primary-600: #228B22;
  --color-primary-700: #1B6820;
  --color-primary-800: #145216;
  --color-primary-900: #0D3B0F;

  --color-accent-50:  #FFF8F0;
  --color-accent-100: #FFF3E0;
  --color-accent-200: #FFE0B2;
  --color-accent-300: #FFCC80;
  --color-accent-400: #FFA726;
  --color-accent-500: #FF6D00;
  --color-accent-600: #E64A19;
  --color-accent-700: #BF360C;

  --color-neutral-50:  #F6F8FA;
  --color-neutral-100: #E8ECF0;
  --color-neutral-200: #D0D7DE;
  --color-neutral-300: #B1BAC4;
  --color-neutral-400: #8B949E;
  --color-neutral-500: #6E7781;
  --color-neutral-600: #4D576A;
  --color-neutral-700: #3D444D;
  --color-neutral-800: #2C3239;
  --color-neutral-900: #1A1F25;

  --color-success:       #1A7F37;
  --color-success-light: #DAFBE1;
  --color-danger:        #CF222E;
  --color-danger-light:  #FFEBE9;
  --color-warning:       #9A6700;
  --color-warning-light: #FFF8C5;
  --color-info:          #0969DA;
  --color-info-light:    #DDF4FF;

  --color-surface:        #FFFFFF;
  --color-surface-raised: #FFFFFF;
  --color-surface-sunken: #F6F8FA;
  --color-overlay:        rgba(0,0,0,0.5);

  /* ── Typography ─────────────────────────────────── */
  --font-cairo: var(--font-cairo), 'Cairo', sans-serif;
  --font-inter: var(--font-inter), 'Inter', sans-serif;
  --font-body: var(--font-cairo);           /* switches per locale */
  --font-number: var(--font-inter);

  --text-hero:     2rem;      /* 32px */
  --text-h1:       1.5rem;    /* 24px */
  --text-h2:       1.25rem;   /* 20px */
  --text-h3:       1.125rem;  /* 18px */
  --text-body:     1rem;      /* 16px */
  --text-body-sm:  0.875rem;  /* 14px */
  --text-caption:  0.75rem;   /* 12px */
  --text-price:    1.25rem;   /* 20px */
  --text-price-lg: 1.5rem;   /* 24px */
  --text-button:   1rem;      /* 16px */
  --text-badge:    0.75rem;   /* 12px */

  /* ── Spacing ────────────────────────────────────── */
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  /* ── Border Radius ──────────────────────────────── */
  --radius-none: 0;
  --radius-sm:   6px;
  --radius-md:   8px;
  --radius-lg:   12px;
  --radius-xl:   16px;
  --radius-2xl:  20px;
  --radius-full: 9999px;

  /* ── Shadows ────────────────────────────────────── */
  --shadow-xs: 0 1px 2px rgba(0,0,0,0.04);
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.08), 0 4px 6px rgba(0,0,0,0.04);
  --shadow-xl: 0 20px 25px rgba(0,0,0,0.1), 0 8px 10px rgba(0,0,0,0.04);

  /* ── Touch Targets ──────────────────────────────── */
  --touch-target-min:   48px;
  --touch-target-small: 44px;

  /* ── Animation ──────────────────────────────────── */
  --duration-fast:   150ms;
  --duration-normal: 200ms;
  --duration-slow:   300ms;
  --ease-out:        cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in:         cubic-bezier(0.4, 0, 1, 1);
  --ease-in-out:     cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

*This document is the single source of truth for the visual design of GGH. No ad-hoc colors, sizes, or spacing values in component code. Every visual property traces back to a token defined here.*

*Last updated: July 2026*
