# 08 — Authentication

> **GGH — Gomla Go Home** — Login, registration, OTP flow, JWT structure, roles, permissions, session management, and security. The trust layer of the platform.

---

## Table of Contents

1. [Authentication Philosophy](#1-authentication-philosophy)
2. [Architecture Overview](#2-architecture-overview)
3. [Identity Model](#3-identity-model)
4. [Registration Flow](#4-registration-flow)
5. [Login Flow — OTP](#5-login-flow--otp)
6. [OTP Deep Dive](#6-otp-deep-dive)
7. [Admin Authentication](#7-admin-authentication)
8. [JWT Structure & Signing](#8-jwt-structure--signing)
9. [Session Management](#9-session-management)
10. [Role System](#10-role-system)
11. [Permission System](#11-permission-system)
12. [Guest Experience](#12-guest-experience)
13. [Cart Merge on Login](#13-cart-merge-on-login)
14. [Token Lifecycle](#14-token-lifecycle)
15. [Security Measures](#15-security-measures)
16. [Rate Limiting for Auth](#16-rate-limiting-for-auth)
17. [Device & Session Tracking](#17-device--session-tracking)
18. [Passwordless Philosophy — Why No Passwords](#18-passwordless-philosophy--why-no-passwords)
19. [Account Recovery](#19-account-recovery)
20. [Elder-Friendly Auth UX](#20-elder-friendly-auth-ux)
21. [RTL & Bilingual in Auth](#21-rtl--bilingual-in-auth)
22. [Authentication Error Codes](#22-authentication-error-codes)
23. [Medusa Auth Integration](#23-medusa-auth-integration)
24. [Future: Multi-Factor & Biometric](#24-future-multi-factor--biometric)

---

## 1. Authentication Philosophy

| Principle | Rule | Why |
|---|---|---|
| **Phone is identity** | Every user is identified by their Egyptian mobile number. No email required. No username required. | Om Ibrahim has a phone number, not an email address. Phone numbers are universal in Egypt (100M+ mobile subscribers). |
| **OTP, not passwords** | Authentication is via one-time SMS code. No passwords. No "forgot password" flows. | Passwords are forgotten, reused, and phished. OTP removes all three problems. 4 digits are easier than a password for elder users. |
| **Login = Registration** | If a phone number is new, the account is created automatically during OTP verification. No separate signup form. | Reduce friction. Om Ibrahim taps her phone number, receives a code, and she's in — whether it's her first visit or her hundredth. |
| **Session over token-in-header** | JWT is stored in an HttpOnly cookie, not in localStorage or a header. | XSS cannot steal an HttpOnly cookie. No token management code on the frontend. |
| **Separate admin sessions** | Customer auth and admin auth use different cookies, different expiry, different rate limits. | An admin's compromised session must not expose customer data. A customer session can never escalate to admin. |
| **Graceful, not punitive** | Auth errors guide the user forward, never block them in a dead end. | "The code you entered is incorrect. Please try again." ≠ "Authentication failed. Error 401." |

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AUTHENTICATION FLOW                          │
│                                                                     │
│   ┌───────────┐    ┌───────────────┐    ┌──────────┐    ┌───────┐  │
│   │  Browser  │    │   Next.js BFF │    │  Medusa  │    │ SMS   │  │
│   │           │    │   (Auth Layer) │    │  v2      │    │ Gateway│  │
│   └─────┬─────┘    └──────┬────────┘    └────┬─────┘    └───┬───┘  │
│         │                 │                   │              │      │
│         │  1. Enter phone │                   │              │      │
│         │────────────────→│                   │              │      │
│         │                 │  2. Generate OTP  │              │      │
│         │                 │  Store in Redis   │              │      │
│         │                 │──────────────────────────────────→│      │
│         │                 │                   │       3. SMS  │      │
│         │                 │                   │        with   │      │
│         │                 │  4. "Code sent"   │        code   │      │
│         │←────────────────│                   │              │      │
│         │                 │                   │              │      │
│         │  5. Enter code  │                   │              │      │
│         │────────────────→│                   │              │      │
│         │                 │  6. Verify OTP    │              │      │
│         │                 │  against Redis    │              │      │
│         │                 │                   │              │      │
│         │                 │  7. Find/create   │              │      │
│         │                 │  customer in      │              │      │
│         │                 │  Medusa           │              │      │
│         │                 │──────────────────→│              │      │
│         │                 │                   │              │      │
│         │                 │  8. Customer data │              │      │
│         │                 │←──────────────────│              │      │
│         │                 │                   │              │      │
│         │                 │  9. Sign JWT      │              │      │
│         │                 │  Set HttpOnly     │              │      │
│         │                 │  cookie           │              │      │
│         │  10. Session    │                   │              │      │
│         │  cookie set     │                   │              │      │
│         │←────────────────│                   │              │      │
│         │                 │                   │              │      │
│         │  11. Authenticated request          │              │      │
│         │  (cookie sent    │                   │              │      │
│         │   automatically) │                   │              │      │
│         │────────────────→│  12. Validate JWT │              │      │
│         │                 │  Forward to Medusa│              │      │
│         │                 │──────────────────→│              │      │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|---|---|
| **Browser** | Collect phone number and OTP code. Send cookie on every request. No token logic. |
| **Next.js BFF** | Generate OTP. Store in Redis. Verify OTP. Sign JWT. Set cookie. Validate cookie on every request. Forward auth to Medusa. |
| **Redis** | Store OTP codes with TTL. Store session metadata. Rate limit counters. |
| **Medusa v2** | Customer record storage. Customer group assignment. Order and cart association. |
| **SMS Gateway** | Deliver OTP SMS. Provider-agnostic (Twilio, Vonage, or Egyptian provider like Connek). |

---

## 3. Identity Model

### 3.1 The Single Identity: Phone Number

GGH uses a single identifier for every user: their Egyptian mobile number.

```
Accepted formats (auto-corrected to E.164):
  01012345678        →  +201012345678
  201012345678       →  +201012345678
  00201012345678     →  +201012345678
  +201012345678      →  +201012345678  (canonical)
```

### 3.2 Phone Number Rules

| Rule | Constraint | Why |
|---|---|---|
| Egyptian numbers only | Must match `+20(10|11|12|15)\d{8}` | GGH operates in Egypt. International numbers are not supported in v1. |
| One account per phone | Each phone number maps to exactly one customer record. | No ambiguity. Om Ibrahim doesn't need to remember "which account did I use?" |
| Phone cannot be changed | Once registered, the phone number is immutable. | Prevents account hijacking via phone number change. |
| No email required | Email is an optional profile field, never used for auth. | Elder users may not have email. |

### 3.3 Customer Record in Medusa

When a phone number is verified for the first time, the BFF creates a customer record in Medusa:

| Field | Value on Creation | Notes |
|---|---|---|
| `id` | Auto-generated (`cus_01...`) | Medusa ID format |
| `phone` | `+201012345678` | E.164 format |
| `email` | `+201012345678@ggh.local` | Placeholder email (Medusa requires one). Not deliverable. |
| `first_name` | Empty string | User fills in later via profile |
| `last_name` | Empty string | User fills in later via profile |
| `metadata.name_ar` | Empty string | Arabic display name |
| `metadata.preferred_locale` | `"ar"` | Default to Arabic for Egyptian market |
| `metadata.wholesale_status` | `"retail"` | Default customer group |
| `groups` | `["retail"]` | Assigned to retail customer group |

---

## 4. Registration Flow

### 4.1 Registration IS Login

There is no separate registration page. The flow is identical whether the phone number is new or existing:

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│   User enters phone number                                       │
│          │                                                       │
│          ▼                                                       │
│   OTP sent to phone                                              │
│          │                                                       │
│          ▼                                                       │
│   User enters OTP code                                           │
│          │                                                       │
│          ├── Phone exists in Medusa?                             │
│          │       │                                               │
│          │       ├── YES → Create session for existing customer  │
│          │       │                                               │
│          │       └── NO  → Create customer + Create session     │
│          │                    │                                   │
│          │                    └── Return { is_new: true }        │
│          │                                                       │
│          ▼                                                       │
│   User is authenticated                                          │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 4.2 New Customer Onboarding

When `is_new: true` is returned, the frontend shows a brief welcome screen:

| Step | Screen | Action | Elder-Friendly Notes |
|---|---|---|---|
| 1 | Welcome | "Welcome to GGH! / أهلاً بكم في جملة لحد البيت" | Large text, single button: "Let's start / يلا نبدأ" |
| 2 | Name (optional) | "What should we call you? / إيه اسمك؟" | Optional. Can skip. Large input field. |
| 3 | Delivery area | "Where do you want your delivery? / التوصيل فين؟" | Zone picker with large cards. |
| 4 | Done | Redirect to home page | No tutorial, no carousel. Just the shop. |

The onboarding is **3 taps maximum**. Every step is skippable except the phone verification that already happened.

---

## 5. Login Flow — OTP

### 5.1 Step-by-Step

```
Step 1:  User opens GGH → Login screen shown (if not authenticated)
         ┌─────────────────────────────────────┐
         │                                     │
         │     أهلاً بكم في جملة لحد البيت     │
         │     Welcome to GGH                  │
         │                                     │
         │     ┌─────────────────────────────┐ │
         │     │  +20 | 01XXXXXXXXX          │ │   ← Large input (48px+)
         │     └─────────────────────────────┘ │
         │                                     │
         │     ┌─────────────────────────────┐ │
         │     │   أرسل الكود  Send Code     │ │   ← Full-width button (56px)
         │     └─────────────────────────────┘ │
         │                                     │
         └─────────────────────────────────────┘

Step 2:  SMS arrives → OTP entry screen
         ┌─────────────────────────────────────┐
         │                                     │
         │     أدخل الكود  Enter the code      │
         │                                     │
         │     ┌───┐ ┌───┐ ┌───┐ ┌───┐       │   ← 4 large digit boxes
         │     │ 1 │ │ 2 │ │ 3 │ │ 4 │       │      (56px × 56px each)
         │     └───┘ └───┘ └───┘ └───┘       │
         │                                     │
         │     إعادة الإرسال في ٤٥ ثانية       │   ← Countdown timer
         │     Resend in 45s                   │
         │                                     │
         │     ┌─────────────────────────────┐ │
         │     │   تأكيد  Confirm             │ │   ← Full-width button
         │     └─────────────────────────────┘ │
         │                                     │
         └─────────────────────────────────────┘

Step 3:  Code verified → Redirect to home (existing) or onboarding (new)
```

### 5.2 Login Flow — Technical Sequence

```
Browser                     BFF                         Redis              Medusa           SMS
  │                          │                            │                  │               │
  │  POST /auth/otp/request  │                            │                  │               │
  │  { phone: "+20101..." }  │                            │                  │               │
  │─────────────────────────→│                            │                  │               │
  │                          │  Generate 4-digit OTP      │                  │               │
  │                          │  otp = "1234"              │                  │               │
  │                          │                            │                  │               │
  │                          │  SET otp:+20101...         │                  │               │
  │                          │    = "1234"                │                  │               │
  │                          │  EX 300 (5 min)            │                  │               │
  │                          │───────────────────────────→│                  │               │
  │                          │                            │                  │               │
  │                          │  Increment rate limit      │                  │               │
  │                          │  INCR rl:otp:+20101...     │                  │               │
  │                          │───────────────────────────→│                  │               │
  │                          │                            │                  │               │
  │                          │  Send SMS via gateway      │                  │               │
  │                          │──────────────────────────────────────────────────────────────→│
  │                          │                            │                  │               │
  │  { expires_in: 300 }     │                            │                  │               │
  │←─────────────────────────│                            │                  │               │
  │                          │                            │                  │               │
  │  POST /auth/otp/verify   │                            │                  │               │
  │  { phone, code: "1234" } │                            │                  │               │
  │─────────────────────────→│                            │                  │               │
  │                          │  GET otp:+20101...         │                  │               │
  │                          │───────────────────────────→│                  │               │
  │                          │  "1234"                    │                  │               │
  │                          │←───────────────────────────│                  │               │
  │                          │                            │                  │               │
  │                          │  Compare codes             │                  │               │
  │                          │  Match? ✓                  │                  │               │
  │                          │                            │                  │               │
  │                          │  DEL otp:+20101...         │                  │               │
  │                          │───────────────────────────→│                  │               │
  │                          │                            │                  │               │
  │                          │  Find customer by phone    │                  │               │
  │                          │──────────────────────────────────────────────→│               │
  │                          │                            │  { customer }    │               │
  │                          │←─────────────────────────────────────────────│               │
  │                          │                            │                  │               │
  │                          │  (If not found: create)    │                  │               │
  │                          │──────────────────────────────────────────────→│               │
  │                          │                            │                  │               │
  │                          │  Sign JWT                  │                  │               │
  │                          │  Set-Cookie: ggh_session   │                  │               │
  │                          │                            │                  │               │
  │  200 + Cookie + { customer, is_new }                  │                  │               │
  │←─────────────────────────│                            │                  │               │
```

---

## 6. OTP Deep Dive

### 6.1 OTP Generation

| Property | Value | Why |
|---|---|---|
| Length | 4 digits | Elder-friendly. 6 digits is harder to read and type. 4 digits = 10,000 combinations. |
| Character set | `0123456789` | Digits only. No letters (confusing in Arabic/English mix). No l/I/O/0 ambiguity. |
| Generation | Cryptographically secure random (`crypto.randomInt(0, 10000)`) | No predictable sequences. |
| Format | Zero-padded: `0047`, `1234`, `9999` | Consistent 4-digit display. |
| No sequential codes | Reject codes where all digits are the same: `0000`, `1111`, ..., `9999` | Reduce misread risk. Also the most common brute-force attempts. |
| No ascending/descending | Reject `1234`, `4321`, `9876` | Easy to guess. Elder users might type these by accident. |

### 6.2 OTP Storage in Redis

```
Key:     otp:{phone}
Value:   JSON { "code": "4827", "attempts": 0, "created_at": 1700000000 }
TTL:     300 seconds (5 minutes)
```

| Field | Purpose |
|---|---|
| `code` | The OTP to verify against |
| `attempts` | Number of failed verification attempts (max 3) |
| `created_at` | Timestamp for audit logging |

### 6.3 OTP Verification Logic

```
FUNCTION verify_otp(phone, submitted_code):

  record = Redis.GET("otp:{phone}")

  IF record is null:
    return ERROR(AUTH_OTP_EXPIRED)

  IF record.attempts >= 3:
    Redis.DEL("otp:{phone}")
    return ERROR(AUTH_OTP_LOCKED)

  IF record.code ≠ submitted_code:
    record.attempts += 1
    Redis.SET("otp:{phone}", record, keep TTL)
    remaining = 3 - record.attempts
    return ERROR(AUTH_INVALID_OTP, { remaining_attempts: remaining })

  // Code matches
  Redis.DEL("otp:{phone}")          // Consume the OTP
  Redis.DEL("rl:otp-verify:{phone}") // Clear verify rate limit
  return SUCCESS()
```

### 6.4 OTP Rate Limits

| Limit | Window | Max | Redis Key | Purpose |
|---|---|---|---|---|
| OTP request per phone | 60 seconds | 1 request | `rl:otp:{phone}` | Prevent rapid-fire SMS |
| OTP request per phone per day | 24 hours | 5 requests | `rl:otp-daily:{phone}` | Limit SMS cost |
| OTP verify attempts | Per OTP lifetime | 3 attempts | Stored in OTP record | Prevent brute force |
| OTP request per IP | 1 hour | 10 requests | `rl:otp-ip:{ip}` | Prevent scripted abuse |
| Global OTP per IP | 24 hours | 30 requests | `rl:otp-ip-daily:{ip}` | Rate limit SMS gateway |

### 6.5 SMS Message Format

The SMS message is bilingual and concise:

```
GGH code: 4827
كود جملة لحد البيت: ٤٨٢٧

Do not share this code.
ماتشارش الكود ده مع حد.
```

| Rule | Why |
|---|---|
| Code first, in both languages | User sees the code in the notification preview without opening the SMS |
| Arabic-Indic numerals in Arabic line | Consistency with RTL reading |
| Warning against sharing | Phishing prevention |
| No links in SMS | Prevent SMS phishing attacks |

### 6.6 SMS Provider Abstraction

GGH does not depend on a specific SMS provider. The BFF uses an abstraction layer:

```
┌──────────────────────────────────────┐
│         SMS Provider Interface       │
│                                      │
│  sendOtp(phone: string, code: string)│
│    → Promise<{ success: boolean }>   │
│                                      │
└───────────┬──────────────────────────┘
            │
   ┌────────┼────────────┐
   │        │            │
   ▼        ▼            ▼
┌──────┐ ┌──────┐  ┌──────────┐
│Twilio│ │Vonage│  │Connek    │
│      │ │      │  │(Egypt)   │
└──────┘ └──────┘  └──────────┘
```

Provider selection is via environment variable `SMS_PROVIDER`. Fallback chain is configurable: if primary provider fails, try secondary.

---

## 7. Admin Authentication

### 7.1 Admin Login Method

Admins use **email + password**, not OTP. Why?

| Reason | Detail |
|---|---|
| Admins are internal staff | They have company email addresses and are trained |
| Stronger authentication needed | Admin access affects all customers, orders, and pricing |
| Fewer admins | The cost of password management is acceptable for a small team |
| Audit trail | Email-based login provides a clear audit chain |

### 7.2 Admin Login Flow

```
Step 1:  POST /api/admin/v1/auth/login
         { "email": "admin@ggh.eg", "password": "..." }

Step 2:  BFF validates credentials against Medusa Admin API

Step 3:  On success:
         - Sign admin JWT with admin-specific secret
         - Set-Cookie: ggh_admin_session
         - Different cookie name, different secret, different expiry

Step 4:  On failure:
         - Return AUTH_INVALID_CREDENTIALS
         - Increment rate limit counter
         - After 5 failed attempts: lock account for 15 minutes
```

### 7.3 Admin vs. Customer Session Isolation

| Property | Customer Session | Admin Session |
|---|---|---|
| Cookie name | `ggh_session` | `ggh_admin_session` |
| JWT secret | `JWT_CUSTOMER_SECRET` | `JWT_ADMIN_SECRET` |
| Max age | 24 hours | 8 hours |
| Idle timeout | None (absolute expiry only) | 2 hours of inactivity |
| Role in JWT | `"customer"` | `"admin"` |
| Storage | HttpOnly, Secure, SameSite=Strict | HttpOnly, Secure, SameSite=Strict |
| Can coexist? | Yes — a user can be logged in as both customer and admin simultaneously in the same browser | Yes — cookies are independent |
| Medusa API | Store API tokens | Admin API tokens |

### 7.4 Admin Password Requirements

| Rule | Value |
|---|---|
| Minimum length | 12 characters |
| Must contain | Uppercase, lowercase, digit, special character |
| No dictionary words | Checked against common password list |
| Forced rotation | Every 90 days |
| History | Cannot reuse last 6 passwords |
| Breach check | Checked against HaveIBeenPwned API (hashed lookup) |

---

## 8. JWT Structure & Signing

### 8.1 JWT Header

```
{
  "alg": "HS256",
  "typ": "JWT"
}
```

| Decision | Choice | Why |
|---|---|---|
| Algorithm | HMAC-SHA256 (`HS256`) | Symmetric. Fast. No key management complexity. RS256 adds overhead with no benefit for same-origin cookies. |
| Not RS256 | No public/private key pair needed | We sign and verify on the same server. RS256 is for distributed signing. |

### 8.2 Customer JWT Payload

```
{
  "sub": "cus_01ABC123",              // Medusa customer ID
  "phone": "+201012345678",           // Verified phone number
  "role": "customer",                 // Fixed role
  "groups": ["retail"],               // Medusa customer groups
  "zone_id": "zone_01DEF456",         // Default delivery zone (nullable)
  "locale": "ar",                     // Preferred locale
  "is_wholesale": false,              // Convenience flag
  "iat": 1700000000,                  // Issued at
  "exp": 1700086400,                  // Expires at (24h from iat)
  "jti": "sess_a1b2c3d4"             // Session ID for revocation
}
```

### 8.3 Admin JWT Payload

```
{
  "sub": "admin_01XYZ789",            // Internal admin ID
  "email": "admin@ggh.eg",           // Admin email
  "role": "admin",                    // Fixed role
  "permissions": [                    // Granted permissions
    "products:read", "products:write",
    "orders:read", "orders:write",
    "delivery:manage"
  ],
  "iat": 1700000000,
  "exp": 1700028800,                  // 8 hours from iat
  "jti": "sess_admin_e5f6g7h8"
}
```

### 8.4 Driver JWT Payload

```
{
  "sub": "drv_01QRS456",              // Driver ID
  "phone": "+201098765432",           // Driver phone
  "role": "driver",                   // Fixed role
  "zone_ids": ["zone_01DEF456"],      // Assigned delivery zones
  "iat": 1700000000,
  "exp": 1700050800,                  // 14 hours (full shift)
  "jti": "sess_drv_i9j0k1l2"
}
```

### 8.5 JWT Signing Rules

| Rule | Implementation |
|---|---|
| **Separate secrets per role** | `JWT_CUSTOMER_SECRET`, `JWT_ADMIN_SECRET`, `JWT_DRIVER_SECRET` — a compromised customer secret cannot forge admin tokens |
| **Secret length** | 256 bits (32 bytes), base64-encoded | Minimum for HS256 |
| **Secret rotation** | Support multiple active secrets via array. Old secret remains valid for 24h after rotation. | Zero-downtime rotation. |
| **No sensitive data in payload** | Never put addresses, payment info, or full names in JWT | JWT is signed, not encrypted. Anyone with the token can read it. |
| **`jti` for revocation** | Every session has a unique `jti`. Stored in Redis for revocation lookup. | Allows targeted session invalidation without clearing all sessions. |

---

## 9. Session Management

### 9.1 Cookie Configuration

| Property | Customer | Admin | Driver |
|---|---|---|---|
| Name | `ggh_session` | `ggh_admin_session` | `ggh_driver_session` |
| Domain | Current domain | Current domain | Current domain |
| Path | `/` | `/api/admin/` | `/api/driver/` |
| HttpOnly | `true` | `true` | `true` |
| Secure | `true` | `true` | `true` |
| SameSite | `Strict` | `Strict` | `Strict` |
| Max-Age | `86400` (24h) | `28800` (8h) | `50400` (14h) |
| Priority | `High` | `High` | `High` |

### 9.2 Session Lifecycle

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│   CREATE                                                     │
│   │  OTP verified (customer) or login (admin)               │
│   │  → Sign JWT                                              │
│   │  → Store jti in Redis: session:{jti} → { user_id, role, │
│   │    created_at, last_active }                             │
│   │  → Set cookie                                            │
│   │                                                          │
│   VALIDATE (every authenticated request)                     │
│   │  → Read cookie from request                              │
│   │  → Verify JWT signature                                  │
│   │  → Check exp not passed                                  │
│   │  → Check jti not in revocation set: revoked:{jti}       │
│   │  → Extract user info from payload                        │
│   │  → For admin: check idle timeout                         │
│   │                                                          │
│   REFRESH                                                    │
│   │  → Customer: No refresh. 24h absolute expiry.           │
│   │  → Admin: Renew on activity. Reset 2h idle counter.     │
│   │  → New JWT with same jti, updated exp.                  │
│   │  → Set new cookie with updated Max-Age.                 │
│   │                                                          │
│   DESTROY                                                    │
   │  → Add jti to revocation set: SADD revoked:{jti}         │
│   │  → Set TTL on revocation = remaining token lifetime     │
│   │  → Clear cookie: Set Max-Age=0                           │
│   │  → Delete session:{jti} from Redis                      │
│   │                                                          │
└──────────────────────────────────────────────────────────────┘
```

### 9.3 Concurrent Sessions

| Role | Max concurrent sessions | Policy |
|---|---|---|
| Customer | 3 | Oldest session is revoked when a 4th is created. Elder users may have phone + tablet. |
| Admin | 1 | New login invalidates all other sessions. Security-first. |
| Driver | 1 | Same as admin. One active device. |

### 9.4 Session Data in Redis

```
Key:     session:{jti}
Value:   JSON {
           "user_id": "cus_01ABC123",
           "role": "customer",
           "phone": "+201012345678",
           "ip": "192.168.1.100",
           "user_agent": "Mozilla/5.0...",
           "created_at": 1700000000,
           "last_active": 1700050000
         }
TTL:     Same as JWT expiry (86400 for customer, 28800 for admin)
```

### 9.5 Revocation Set in Redis

```
Key:     revoked:{jti}
Value:   "1"  (placeholder)
TTL:     Remaining seconds until the JWT would have naturally expired

On every auth check:
  EXISTS revoked:{jti}
  → If exists: treat as unauthenticated (401)
```

This design means revocation entries auto-expire when the JWT would have expired anyway. No manual cleanup needed.

---

## 10. Role System

### 10.1 Role Definitions

```
┌──────────────────────────────────────────────────────────────┐
│                        ROLE HIERARCHY                         │
│                                                              │
│                     ┌──────────┐                             │
│                     │  ADMIN   │  Full platform access        │
│                     └────┬─────┘                             │
│                          │                                    │
│              ┌───────────┼───────────┐                       │
│              │           │           │                       │
│         ┌────┴────┐ ┌───┴────┐ ┌───┴──────┐                │
│         │ DRIVER  │ │ SUPPLY │ │ ANALYTICS │                │
│         │         │ │ MGR    │ │ VIEWER    │                │
│         └─────────┘ └────────┘ └───────────┘                │
│                                                              │
│         ┌─────────────┐  ┌──────────────────┐               │
│         │  CUSTOMER   │  │ WHOLESALE CUST.  │               │
│         │  (retail)   │  │ (verified/ent.)  │               │
│         └─────────────┘  └──────────────────┘               │
│                                                              │
│         ┌─────────────┐                                     │
│         │   GUEST     │  Unauthenticated browser             │
│         └─────────────┘                                     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 10.2 Role Catalog

| Role | Code | Auth Method | JWT `role` | Description |
|---|---|---|---|---|
| Guest | `guest` | None | N/A | Browsing only. No account. |
| Customer (Retail) | `customer` | Phone OTP | `"customer"` | Standard household buyer |
| Customer (Wholesale Verified) | `customer` | Phone OTP | `"customer"` | Business buyer with wholesale pricing (differentiated by group, not role) |
| Customer (Wholesale Enterprise) | `customer` | Phone OTP | `"customer"` | Large business buyer with custom pricing |
| Driver | `driver` | Phone OTP | `"driver"` | Delivery personnel |
| Supply Manager | `supply_mgr` | Email + password | `"admin"` | Admin subset: manages products and inventory |
| Analytics Viewer | `analytics` | Email + password | `"admin"` | Admin subset: read-only dashboard |
| Admin | `admin` | Email + password | `"admin"` | Full platform access |

### 10.3 Role vs. Customer Group

Roles and customer groups serve different purposes:

| Concept | Scope | Example |
|---|---|---|
| **Role** | Authentication and authorization. What you can *do*. | `customer` can place orders. `admin` can manage products. |
| **Customer Group** | Pricing and business logic. What you can *see* and *pay*. | `wholesale-verified` sees wholesale prices. `retail` sees retail prices. |

A customer with role `customer` can be in any customer group. Their role doesn't change — their group determines their pricing.

---

## 11. Permission System

### 11.1 Permission Model

GGH uses a **role-based access control (RBAC)** model with optional permission-level granularity for admin sub-roles.

```
Permission Format:  resource:action

Examples:
  products:read       → Can view products
  products:write      → Can create/update products
  orders:read         → Can view orders
  orders:write        → Can update order status
  delivery:manage     → Can manage zones and slots
  erp:sync            → Can trigger ERP sync
  analytics:read      → Can view dashboards
  customers:read      → Can view customer data
  customers:write     → Can modify customer data
  settings:manage     → Can change platform settings
```

### 11.2 Permission Matrix

| Permission | Guest | Customer | Driver | Supply Mgr | Analytics | Admin |
|---|---|---|---|---|---|---|
| `products:read` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `products:write` | ✗ | ✗ | ✗ | ✓ | ✗ | ✓ |
| `orders:read` | ✗ | Own only | Assigned | ✓ | ✓ | ✓ |
| `orders:write` | ✗ | ✗ | Status only | ✗ | ✗ | ✓ |
| `cart:manage` | ✓ (guest) | ✓ | ✗ | ✗ | ✗ | ✗ |
| `checkout:complete` | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| `delivery:read` | ✓ | ✓ | Assigned | ✓ | ✗ | ✓ |
| `delivery:manage` | ✗ | ✗ | ✗ | ✓ | ✗ | ✓ |
| `erp:sync` | ✗ | ✗ | ✗ | ✓ | ✗ | ✓ |
| `analytics:read` | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |
| `customers:read` | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| `customers:write` | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| `settings:manage` | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |

### 11.3 Permission Enforcement

Permissions are enforced at three layers:

```
Layer 1: Route Middleware (BFF)
  → withAuth({ requiredRole: "customer" })
  → withPermission("orders:write")
  → Returns 401/403 before business logic runs

Layer 2: Service Layer (BFF)
  → if (user.role === "driver") { filter orders to assigned zone }
  → Data-level filtering, not just route-level

Layer 3: Database (PostgreSQL)
  → Row-level security for sensitive data
  → Admin queries use service role; customer queries use restricted role
```

### 11.4 Permission Helper

```typescript
// Type-safe permission check
type Permission =
  | "products:read"    | "products:write"
  | "orders:read"      | "orders:write"
  | "cart:manage"      | "checkout:complete"
  | "delivery:read"    | "delivery:manage"
  | "erp:sync"
  | "analytics:read"
  | "customers:read"   | "customers:write"
  | "settings:manage";

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  guest:        ["products:read", "cart:manage", "delivery:read"],
  customer:     ["products:read", "cart:manage", "checkout:complete",
                 "orders:read", "delivery:read"],
  driver:       ["products:read", "orders:read", "orders:write",
                 "delivery:read"],
  supply_mgr:   ["products:read", "products:write", "orders:read",
                 "delivery:read", "delivery:manage", "erp:sync"],
  analytics:    ["products:read", "orders:read", "analytics:read"],
  admin:        [/* all permissions */],
};

function hasPermission(role: string, permission: Permission): boolean {
  if (role === "admin") return true;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
```

---

## 12. Guest Experience

### 12.1 Guest Can Browse

A user who has never logged in can still:

| Action | Available | Notes |
|---|---|---|
| Browse products | ✓ | Full product catalog visible |
| View product detail | ✓ | Prices shown at retail tier |
| Search products | ✓ | Full search functionality |
| Create cart | ✓ | Guest cart created in Medusa |
| Add items to cart | ✓ | Cart ID stored in cookie |
| View delivery zones | ✓ | Zone list is public |
| Checkout | ✗ | Must authenticate first |
| View orders | ✗ | Must authenticate |
| Save templates | ✗ | Must authenticate |

### 12.2 Guest Cart

When a guest adds their first item to cart:

```
1. BFF creates a cart in Medusa without customer_id
2. Cart ID is stored in a separate cookie: ggh_cart_id
3. Cart persists for 7 days (cart-level TTL in Medusa)
4. On login, guest cart is merged with customer cart
```

### 12.3 Guest → Customer Conversion

The conversion point is always checkout. The flow:

```
Guest has items in cart
  → Taps "Checkout / إتمام الطلب"
  → Prompt: "Enter your phone to continue / أدخل رقمك للمتابعة"
  → OTP flow (same as login)
  → On success: cart merged, checkout continues
  → No lost items. No starting over.
```

---

## 13. Cart Merge on Login

### 13.1 Merge Logic

When a guest user authenticates, their guest cart must be merged with their existing customer cart (if any).

```
SCENARIO A: New customer (no existing cart)
  Guest cart → becomes customer cart
  cart.customer_id = verified customer ID
  Done.

SCENARIO B: Existing customer with empty cart
  Guest cart items → moved to existing customer cart
  Delete guest cart
  Use existing customer cart going forward

SCENARIO C: Existing customer with non-empty cart
  Guest cart items → added to existing customer cart
  If same variant exists: sum quantities (cap at max stock)
  Delete guest cart
  Use existing customer cart going forward

SCENARIO D: Same variant in both carts
  Guest cart: Rice 5kg × 3
  Customer cart: Rice 5kg × 2
  Merged: Rice 5kg × 5 (if stock allows)
  If stock is 4: Rice 5kg × 4 (cap at stock, notify user)
```

### 13.2 Merge Rules

| Rule | Implementation |
|---|---|
| **Customer cart wins** | The existing customer cart is the base. Guest items are merged into it. |
| **Quantity sum** | Same variant quantities are added together. |
| **Stock cap** | Final quantity cannot exceed available stock. User is notified. |
| **Price at merge time** | Items use current prices, not prices from when they were added to guest cart. |
| **Merge is atomic** | Either all items merge or none do. No partial merges. |
| **One-time operation** | Merge happens once at login. Guest cart cookie is cleared. |

---

## 14. Token Lifecycle

### 14.1 Customer Token Lifecycle

```
Issued                     Used                              Expired
   │                        │                                   │
   ▼                        ▼                                   ▼
┌────────┐           ┌────────────┐                      ┌──────────┐
│ Created│           │   Active   │                      │ Expired  │
│ at OTP │───24h────→│  session   │──── 24h elapsed ───→│ (cookie  │
│ verify │           │            │                      │ removed) │
└────────┘           └─────┬──────┘                      └──────────┘
                           │
                     Manual logout
                           │
                           ▼
                     ┌──────────┐
                     │ Revoked  │
                     │ (jti in  │
                     │  Redis)  │
                     └──────────┘
```

### 14.2 What Happens When a Token Expires

| Scenario | What the user sees | What happens |
|---|---|---|
| Browsing products | Nothing. Products are public. | No auth needed. |
| Viewing cart | Cart still visible (guest cart). | Cart ID in separate cookie. |
| Trying to checkout | "Your session expired. Please re-enter your phone number." / "انتهت الجلسة. أدخل رقمك تاني." | Prompt for OTP. Seamless re-auth. |
| Mid-checkout | Same message. Cart is preserved. | After re-auth, return to checkout step. |
| Viewing orders | Redirected to login. | After re-auth, return to orders page. |

### 14.3 Token Renewal Strategy

| Role | Renewal | Rationale |
|---|---|---|
| Customer | No renewal. Fixed 24h expiry. | Simplicity. Om Ibrahim doesn't understand "session renewal". She just re-enters her phone. |
| Admin | Activity-based renewal. Reset 2h idle timeout on each request. | Admin sessions are long but idle-protected. |
| Driver | No renewal. Fixed 14h expiry (full shift). | Driver shift ends → session ends. Next shift = new login. |

---

## 15. Security Measures

### 15.1 Security Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     SECURITY LAYERS                           │
│                                                              │
│   Layer 1: TRANSPORT                                        │
│   │  HTTPS everywhere (TLS 1.2+)                            │
│   │  HSTS header: max-age=31536000; includeSubDomains       │
│   │  No mixed content                                       │
│   │                                                          │
│   Layer 2: COOKIE PROTECTION                                │
│   │  HttpOnly: JavaScript cannot read cookies                │
│   │  Secure: Only sent over HTTPS                            │
│   │  SameSite=Strict: No cross-site request forgery         │
│   │  Path-scoped: Admin cookie only for /api/admin/         │
│   │                                                          │
│   Layer 3: JWT VALIDATION                                   │
│   │  Signature verified on every request                     │
│   │  Expiry checked on every request                        │
│   │  Revocation set checked on every request                │
│   │  Role-specific secrets prevent cross-role forgery       │
│   │                                                          │
│   Layer 4: RATE LIMITING                                    │
│   │  OTP requests: 1/min, 5/day per phone                   │
│   │  OTP verification: 3 attempts per code                  │
│   │  Login attempts: 5/15min, then 15min lockout            │
│   │  API requests: per-route-group limits                   │
│   │                                                          │
│   Layer 5: INPUT VALIDATION                                 │
│   │  Phone number: strict E.164 validation                   │
│   │  OTP code: exactly 4 digits, no letters                  │
│   │  Admin password: complexity requirements                 │
│   │  All inputs: Zod schema validation                       │
│   │                                                          │
│   Layer 6: LOGGING & AUDIT                                  │
│   │  Every auth event logged with request_id                 │
│   │  Failed attempts tracked and alerted                     │
│   │  Admin actions logged with full context                  │
│   │  Session creation/destruction events emitted            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 15.2 Threat Mitigation

| Threat | Mitigation | Implementation |
|---|---|---|
| **XSS token theft** | HttpOnly cookies | JavaScript cannot read `document.cookie` for session tokens |
| **CSRF** | SameSite=Strict + POST-only mutations | Cookies are not sent on cross-site requests. Mutations require POST/PATCH/DELETE. |
| **OTP brute force** | 3 attempts per code + exponential lockout | After 3 failed attempts, the OTP is consumed and a new one must be requested |
| **OTP interception** | Short TTL (5 min) + single-use | Even if intercepted, the code expires quickly and can only be used once |
| **Session hijacking** | Secure flag + IP binding (optional) | Cookies only sent over HTTPS. Optional: verify IP hasn't changed for admin sessions. |
| **JWT tampering** | HMAC-SHA256 signature | Any modification invalidates the signature |
| **Admin credential stuffing** | Rate limiting + account lockout | 5 failed attempts → 15-minute lockout |
| **SMS pumping fraud** | IP-based rate limits + Egyptian numbers only | Only Egyptian phone numbers accepted. IP-level throttling. |
| **Token replay** | Short expiry + revocation on logout | Tokens expire naturally. Logout adds to revocation set. |

### 15.3 Security Headers

Every response includes these headers:

| Header | Value | Purpose |
|---|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Force HTTPS |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `X-XSS-Protection` | `0` | Disable buggy browser XSS filter (we sanitize server-side) |
| `Content-Security-Policy` | `default-src 'self'; ...` | Prevent inline script injection |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limit referrer leakage |

---

## 16. Rate Limiting for Auth

### 16.1 Auth-Specific Rate Limits

| Endpoint | Window | Limit | Key | Lockout |
|---|---|---|---|---|
| `POST /auth/otp/request` | 60 seconds | 1 per phone | `rl:otp:{phone}` | — |
| `POST /auth/otp/request` | 24 hours | 5 per phone | `rl:otp-daily:{phone}` | — |
| `POST /auth/otp/request` | 1 hour | 10 per IP | `rl:otp-ip:{ip}` | — |
| `POST /auth/otp/verify` | Per OTP | 3 attempts | In OTP record | OTP consumed after 3 fails |
| `POST /admin/auth/login` | 15 minutes | 5 per email | `rl:admin-login:{email}` | 15-min lockout after 5 |
| `POST /admin/auth/login` | 1 hour | 20 per IP | `rl:admin-login-ip:{ip}` | — |

### 16.2 Progressive Lockout for OTP

```
Attempt 1-3:  Normal verification
  → "Code is incorrect. X attempts remaining."
  → "الكود غلط. باقي X محاولات."

After 3 failed attempts (OTP consumed):
  → "Too many incorrect attempts. Please request a new code."
  → "محاولات كتير غلط. اطلب كود جديد."
  → Must request new OTP (subject to request rate limits)

After 5 OTP requests in one day:
  → "You've requested too many codes today. Try again tomorrow."
  → "طلبت أكواد كتير النهاردة. حاول بكرة."
  → Hard block until midnight Cairo time
```

---

## 17. Device & Session Tracking

### 17.1 Session Metadata

Every session records device information for security auditing:

| Field | Source | Purpose |
|---|---|---|
| `ip` | `X-Forwarded-For` or `request.ip` | Geographic anomaly detection |
| `user_agent` | `User-Agent` header | Device identification |
| `created_at` | Server timestamp | Session age tracking |
| `last_active` | Updated on each request | Idle detection (admin) |

### 17.2 Customer Session List

Customers can see their active sessions (accessible from profile settings):

```
GET /api/v1/account/sessions

Response:
{
  "data": [
    {
      "jti": "sess_a1b2c3d4",
      "deviceEn": "Chrome on Android",
      "deviceAr": "كروم على أندرويد",
      "lastActiveAt": "2025-01-15T10:30:00Z",
      "isCurrent": true
    },
    {
      "jti": "sess_x5y6z7w8",
      "deviceEn": "Safari on iPhone",
      "deviceAr": "سافاري على آيفون",
      "lastActiveAt": "2025-01-14T18:00:00Z",
      "isCurrent": false
    }
  ],
  "meta": { ... }
}
```

### 17.3 Revoke Other Sessions

```
DELETE /api/v1/account/sessions/:jti

Response (200):
{
  "data": { "revoked": true },
  "meta": { ... }
}
```

This allows a user to remotely log out from a device they no longer have access to. The `jti` is added to the Redis revocation set.

---

## 18. Passwordless Philosophy — Why No Passwords

### 18.1 The Password Problem

| Password Issue | Impact on Om Ibrahim |
|---|---|
| **Forgotten passwords** | She calls customer support instead of resetting. Support cost ×10. |
| **Password reuse** | She uses the same password everywhere. One breach compromises all. |
| **Complex requirements** | "Must contain uppercase, number, special character" — she writes it on paper. |
| **Phishing** | She can't distinguish a real login screen from a fake one. |
| **Reset flow frustration** | "Check your email" — she doesn't have email, or she can't find the reset link. |

### 18.2 Why OTP Wins for GGH

| Factor | OTP | Password |
|---|---|---|
| Memory burden | None. Code is in the SMS. | Must remember a password. |
| Phishing resistance | Code expires in 5 min. Can't be reused. | Password works forever until changed. |
| Typing difficulty | 4 digits. One-handed. | Complex string. Multiple character types. |
| Reset flow | None needed. Just request a new code. | Email-based reset. Multi-step. Frustrating. |
| Elder-friendly | ✓ Large digit entry. No keyboard switching. | ✗ Symbols, mixed case, keyboard toggling. |
| Security | 10,000 combinations. 3 attempts. 5-minute window. | Often "123456" or "password". |

### 18.3 When Passwords ARE Appropriate

Admin accounts use passwords because:

1. Admins are trained staff, not end users
2. Admin access is high-privilege — needs stronger auth
3. Admin accounts are few — manageable password overhead
4. Future: Admin accounts will get TOTP-based 2FA (not SMS-based)

---

## 19. Account Recovery

### 19.1 Customer Account Recovery

There is no "forgot password" flow because there are no passwords. Recovery scenarios:

| Scenario | Solution |
|---|---|
| Phone number lost | Contact support with ID verification. Manual phone number update. |
| Phone number changed | Contact support with ID verification. Manual phone number update. |
| OTP not received | "Resend code" button (60-second cooldown). Try different SMS provider (automatic fallback). |
| Account locked (rate limit) | Wait until rate limit window expires. Automatic unlock. |
| Suspicious activity | Customer support can revoke all sessions and force re-authentication. |

### 19.2 Admin Account Recovery

| Scenario | Solution |
|---|---|
| Forgot password | Email-based reset link. Link expires in 1 hour. Can only be used once. |
| Account locked | 15-minute automatic unlock. Or another admin can unlock manually. |
| Email compromised | Another admin can reset the password and force 2FA re-enrollment. |
| All admins locked | Emergency backdoor via environment variable `ADMIN_EMERGENCY_TOKEN` (single-use, logged, audited). |

### 19.3 Support Tools

Customer support (admin role with `customers:write`) can:

| Action | API | Effect |
|---|---|---|
| Revoke all sessions | `DELETE /api/admin/v1/customers/:id/sessions` | Forces re-authentication |
| Reset phone number | `PATCH /api/admin/v1/customers/:id` with `{ "phone": "+2010..." }` | Updates identity (requires verification) |
| Change customer group | `PATCH /api/admin/v1/customers/:id/groups` | Upgrades/downgrades pricing tier |
| View auth log | `GET /api/admin/v1/customers/:id/auth-log` | Shows login/OTP/failure history |

---

## 20. Elder-Friendly Auth UX

### 20.1 Design Principles for Auth Screens

| Principle | Implementation |
|---|---|
| **One thing at a time** | Never show phone input and OTP input on the same screen. Two distinct steps. |
| **Large touch targets** | All interactive elements ≥ 48px. OTP digit boxes ≥ 56px. Buttons full-width ≥ 56px height. |
| **Clear progress indication** | "Step 1 of 2" / "الخطوة ١ من ٢" visible at all times. |
| **No jargon** | "Enter the code we sent" not "Enter OTP". "أدخل الكود اللي بعتناه" not "أدخل كلمه المرور لمرة واحدة". |
| **Auto-focus** | Phone input auto-focused on page load. OTP first digit box auto-focused after SMS sent. |
| **Auto-advance** | After typing 4th digit in OTP, auto-submit. No need to tap "Confirm". |
| **Visible countdown** | "Resend code in 45s" / "إعادة الإرسال بعد ٤٥ ثانية" — clear, visible, Arabic-Indic numerals. |
| **Error near the field** | "The code is incorrect" appears directly below the OTP boxes, not at the top of the page. |
| **Never lose data** | If OTP fails, phone number is still filled in. User doesn't re-enter it. |
| **Haptic feedback** | On mobile, trigger light vibration on OTP verification failure. |

### 20.2 Phone Number Input

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  أدخل رقم موبايلك                               │
│  Enter your mobile number                       │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 🇪🇬 +20 │  01XXXXXXXXX                  │   │   ← Large input (56px height)
│  └─────────────────────────────────────────┘   │
│                                                 │
│  هنبعتلك كود على الرقم ده                      │
│  We'll send a code to this number              │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │          أرسل الكود  Send Code           │   │   ← Full-width, 56px height
│  └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Auto-correction applied:**

| User types | Stored as | Why |
|---|---|---|
| `01012345678` | `+201012345678` | Common local format |
| `201012345678` | `+201012345678` | Country code without + |
| `00201012345678` | `+201012345678` | International dial prefix |
| `+201012345678` | `+201012345678` | Already correct |

### 20.3 OTP Input

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  أدخل الكود اللي بعتناه                         │
│  Enter the code we sent                         │
│                                                 │
│      ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      │
│      │  4   │ │  8   │ │  2   │ │  7   │      │   ← 56×56px boxes
│      └──────┘ └──────┘ └──────┘ └──────┘      │
│                                                 │
│  الكود هيوصل لرقم +2010****5678                 │
│  Code sent to +2010****5678                    │
│                                                 │
│  إعادة الإرسال بعد ٤٥ ثانية                     │
│  Resend code in 45 seconds                     │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │            تأكيد  Confirm                │   │   ← Optional (auto-submits)
│  └─────────────────────────────────────────┘   │
│                                                 │
│  الكود غلط. باقي ٢ محاولات                     │   ← Error (appears here)
│  The code is incorrect. 2 attempts remaining.  │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 21. RTL & Bilingual in Auth

### 21.1 Bilingual Auth Messages

Every auth message exists in both Arabic and English. The frontend displays based on locale:

| Context | English | Arabic |
|---|---|---|
| OTP sent | "Code sent to your phone" | "تم إرسال الكود لموبايلك" |
| OTP expired | "The code has expired. Please request a new one." | "الكود انتهى. اطلب كود جديد." |
| Wrong code | "The code you entered is incorrect" | "الكود اللي دخلتوه غلط" |
| Account locked | "Too many attempts. Try again in 15 minutes." | "محاولات كتير. حاول تاني بعد ١٥ دقيقة." |
| Session expired | "Your session has expired. Please log in again." | "الجلسة انتهت. سجل دخولك تاني." |
| Welcome new user | "Welcome to GGH!" | "أهلاً بكم في جملة لحد البيت!" |
| Welcome returning | "Welcome back!" | "أهلاً بيك تاني!" |

### 21.2 RTL Considerations for Auth

| Element | RTL Behavior |
|---|---|
| Phone input | `dir="ltr"` always (phone numbers are LTR globally) |
| OTP digit boxes | `dir="ltr"` always (digits are LTR) |
| Error messages | `dir="rtl"` in Arabic, `dir="ltr"` in English |
| Buttons | Text alignment follows `dir` of the page |
| Countdown timer | Arabic-Indic numerals in RTL: "٤٥ ثانية" not "45 ثانية" |
| Country code flag | 🇪🇬 always on the right side in RTL (start of reading direction) |

---

## 22. Authentication Error Codes

### 22.1 Customer Auth Errors

| Code | HTTP | Message EN | Message AR | Detail |
|---|---|---|---|---|
| `AUTH_INVALID_OTP` | 401 | The code you entered is incorrect | الكود اللي دخلتوه غلط | `{ remaining_attempts: 2 }` |
| `AUTH_OTP_EXPIRED` | 401 | The code has expired. Please request a new one. | الكود انتهى. اطلب كود جديد. | — |
| `AUTH_OTP_LOCKED` | 429 | Too many incorrect attempts. Please request a new code. | محاولات كتير غلط. اطلب كود جديد. | — |
| `AUTH_OTP_RATE_LIMITED` | 429 | Too many code requests. Please wait before trying again. | طلبت أكواد كتير. استنى شوية. | `{ retry_after_seconds: 45 }` |
| `AUTH_OTP_DAILY_LIMIT` | 429 | You've requested too many codes today. Try again tomorrow. | طلبت أكواد كتير النهاردة. حاول بكرة. | `{ retry_after_seconds: 43200 }` |
| `AUTH_INVALID_PHONE` | 400 | Please enter a valid Egyptian phone number | أدخل رقم موبايل مصري صحيح | — |
| `AUTH_SESSION_EXPIRED` | 401 | Your session has expired. Please log in again. | الجلسة انتهت. سجل دخولك تاني. | — |
| `AUTH_UNAUTHORIZED` | 401 | Please log in to continue | سجل دخولك عشان تكمل | — |
| `AUTH_FORBIDDEN` | 403 | You don't have permission to access this | مش معاك صلاحية للصفحة دي | — |

### 22.2 Admin Auth Errors

| Code | HTTP | Message EN | Message AR | Detail |
|---|---|---|---|---|
| `AUTH_INVALID_CREDENTIALS` | 401 | Invalid email or password | الإيميل أو الباسورد غلط | — |
| `AUTH_ACCOUNT_LOCKED` | 423 | Account temporarily locked. Try again in 15 minutes. | الحساب مقفول مؤقتاً. حاول بعد ١٥ دقيقة. | `{ retry_after_seconds: 900 }` |
| `AUTH_PASSWORD_EXPIRED` | 401 | Your password has expired. Please set a new one. | الباسورد انتهى. اعمل واحد جديد. | — |
| `AUTH_2FA_REQUIRED` | 403 | Two-factor authentication is required | لازم تعمل تأكيد بخطوتين | — |

---

## 23. Medusa Auth Integration

### 23.1 How GGH Uses Medusa Auth

Medusa v2 has its own authentication system. GGH does not use it directly for customer login. Instead:

```
GGH BFF handles auth             Medusa handles data
────────────────────             ──────────────────

OTP generation        →          NOT USED
OTP verification      →          NOT USED
JWT signing           →          NOT USED
Session management    →          NOT USED

Customer creation     →          Medusa POST /admin/customers
Customer lookup       →          Medusa GET /admin/customers?phone=...
Customer group assign →          Medusa POST /admin/customers/:id/customer-groups
Cart operations       →          Medusa Store API (with BFF-synthesized token)
Order operations      →          Medusa Store API (with BFF-synthesized token)
```

### 23.2 BFF-to-Medusa Authentication

When the BFF needs to call Medusa on behalf of an authenticated customer:

```
1. Customer JWT is validated by BFF
2. BFF exchanges customer identity for a Medusa Store API token
3. BFF calls Medusa Store API with that token
4. Medusa operations are scoped to that customer
```

For admin operations:

```
1. Admin JWT is validated by BFF
2. BFF uses a server-side Medusa Admin API key
3. BFF calls Medusa Admin API with admin permissions
4. Admin permissions are checked by BFF before calling Medusa
```

### 23.3 Why Not Use Medusa Auth Directly

| Reason | Detail |
|---|---|
| Medusa uses email/password | GGH uses phone/OTP. Fundamental mismatch. |
| Medusa session = Bearer token in header | GGH session = HttpOnly cookie. More secure. |
| Medusa doesn't support Egyptian OTP flow | Would require custom Medusa module. More complexity. |
| BFF needs to add GGH-specific claims | `zone_id`, `is_wholesale`, `locale` — not in Medusa's auth model. |
| Decoupling | If we switch from Medusa later, auth doesn't change. |

---

## 24. Future: Multi-Factor & Biometric

### 24.1 Phase 2: Admin 2FA (TOTP)

For admin accounts, add time-based one-time password (TOTP) as a second factor:

```
Login flow (with 2FA):
  1. Email + password → validated
  2. TOTP code required → validated
  3. Session created

Setup:
  - Admin scans QR code in authenticator app
  - Backup codes generated (one-time use)
  - 2FA enrollment is mandatory for all admins
```

### 24.2 Phase 3: Biometric Login (Mobile)

When GGH launches a mobile app:

```
WebAuthn / Biometric login:
  1. First login: OTP as usual
  2. Prompt: "Use fingerprint to log in next time?"
  3. If yes: register WebAuthn credential
  4. Subsequent logins: fingerprint / face scan
  5. Fallback: OTP still available
```

| Benefit | For Om Ibrahim |
|---|---|
| No typing at all | Touch the fingerprint sensor → logged in |
| No SMS dependency | Works even with poor cellular signal |
| Faster | 1 second vs. 30 seconds for OTP |

### 24.3 Phase 4: WhatsApp OTP

Egyptian users are deeply familiar with WhatsApp:

```
WhatsApp OTP flow:
  1. User enters phone number
  2. OTP sent via WhatsApp (not SMS)
  3. User taps the code in WhatsApp → auto-fills in GGH
  4. No typing needed

Benefits:
  - Cheaper than SMS
  - Higher delivery rate
  - Users trust WhatsApp more than SMS
  - Elder users check WhatsApp more than SMS
```

### 24.4 Migration Path

| Phase | Timeline | Change | Impact on existing sessions |
|---|---|---|---|
| v1 (current) | Launch | Phone OTP only | — |
| v1.1 | +3 months | WhatsApp OTP as alternative | None. Backward compatible. |
| v2 | +6 months | Admin 2FA (TOTP) | Admin sessions require re-enrollment. Customer sessions unchanged. |
| v3 | +12 months | Biometric (mobile app) | New capability. Existing auth still works. |

---

> **Next document:** `09_StateManagement.md` — Client state architecture, server state patterns, caching boundaries, and Zustand + TanStack Query conventions.
