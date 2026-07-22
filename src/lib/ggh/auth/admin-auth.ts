// GGH Admin Auth — Session management, authentication, and RBAC for admin users
// Parallel to customer auth at src/lib/ggh/auth/index.ts
// Uses separate cookie (ggh-admin-session) and AdminSession model

import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { successResponse, errorResponse } from '@/lib/ggh/auth';
import { ForbiddenError, UnauthorizedError } from '@/lib/errors';
import { createLogger } from '@/lib/logger';

const logger = createLogger('admin-auth');

// ============================================
// TYPES
// ============================================

interface AuthenticatedAdmin {
  id: string;
  email: string;
  nameEn: string;
  nameAr: string;
  phone: string;
  isActive: boolean;
  customerId: string | null;
  roleNames: string[];
}

interface PermissionCheck {
  module: string;
  action: string;
}

// ============================================
// CONSTANTS
// ============================================

const ADMIN_SESSION_COOKIE = 'ggh-admin-session';
const ADMIN_SESSION_DURATION_HOURS = 24;

// ============================================
// SESSION MANAGEMENT
// ============================================

/**
 * Create a new admin session and return the session token.
 * Stores the session in the AdminSession Prisma model.
 */
export async function createAdminSession(adminId: string): Promise<string> {
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_DURATION_HOURS * 60 * 60 * 1000);

  await db.adminSession.create({
    data: {
      token,
      adminId,
      expiresAt,
      isActive: true,
    },
  });

  logger.info('Admin session created', { adminId });

  return token;
}

/**
 * Set the admin session cookie on the response.
 * Uses httpOnly, secure in production, sameSite lax, path /.
 */
export async function setAdminSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ADMIN_SESSION_DURATION_HOURS * 60 * 60,
  });
}

/**
 * Clear (delete) the admin session cookie.
 */
export async function clearAdminSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

/**
 * Read the admin session token from the request cookies.
 * Returns null if no cookie is present.
 */
export async function getAdminSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(ADMIN_SESSION_COOKIE);
  return cookie?.value ?? null;
}

/**
 * Destroy an admin session: mark it inactive in the database and clear the cookie.
 * Used during logout or when a session is found to be expired.
 */
export async function destroyAdminSession(token: string): Promise<void> {
  await db.adminSession.updateMany({
    where: { token, isActive: true },
    data: { isActive: false },
  });
  await clearAdminSessionCookie();
  logger.info('Admin session destroyed', { tokenPrefix: token.substring(0, 8) });
}

// ============================================
// AUTHENTICATION
// ============================================

/**
 * Get the currently authenticated admin user from the session cookie.
 * Returns null if:
 * - No session cookie is present
 * - Session token doesn't exist in DB or is inactive/expired
 * - Admin user doesn't exist or is inactive
 *
 * Includes role names for RBAC checks.
 */
export async function getAuthenticatedAdmin(): Promise<AuthenticatedAdmin | null> {
  const token = await getAdminSessionToken();
  if (!token) return null;

  // Query session first
  const session = await db.adminSession.findUnique({
    where: { token },
  });

  if (!session || !session.isActive || session.expiresAt < new Date()) {
    // Session expired or invalid — deactivate if found
    if (session) {
      await db.adminSession.update({
        where: { id: session.id },
        data: { isActive: false },
      });
    }
    logger.warn('Invalid or expired admin session', {
      tokenPrefix: token.substring(0, 8),
    });
    return null;
  }

  // Query admin user
  const admin = await db.adminUser.findUnique({
    where: { id: session.adminId },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
    },
  });

  if (!admin || !admin.isActive) {
    logger.warn('Inactive admin user attempted access', {
      adminId: session.adminId,
    });
    return null;
  }

  const roleNames = admin.roles.map((aur) => aur.role.name);

  return {
    id: admin.id,
    email: admin.email,
    nameEn: admin.nameEn,
    nameAr: admin.nameAr,
    phone: admin.phone,
    isActive: admin.isActive,
    customerId: admin.customerId,
    roleNames,
  };
}

/**
 * Require admin authentication for API route protection.
 * Returns the authenticated admin if valid, or an error NextResponse if not.
 *
 * Usage in API routes:
 * ```ts
 * const admin = await requireAdminAuth();
 * if (admin instanceof NextResponse) return admin; // not authenticated
 * // admin is AuthenticatedAdmin — proceed with route logic
 * ```
 */
export async function requireAdminAuth(): Promise<AuthenticatedAdmin | NextResponse> {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return errorResponse('Admin authentication required', 'UNAUTHORIZED', 401);
  }
  return admin;
}

/**
 * Require admin authentication and throw UnauthorizedError if not authenticated.
 * Use this in apiHandler-wrapped routes where errors are caught centrally.
 *
 * Usage:
 * ```ts
 * export const GET = apiHandler(async (request) => {
 *   const admin = await requireAdminAuthOrThrow();
 *   // admin is AuthenticatedAdmin — guaranteed authenticated
 * });
 * ```
 */
export async function requireAdminAuthOrThrow(): Promise<AuthenticatedAdmin> {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    throw new UnauthorizedError('Admin authentication required', 'ADMIN_UNAUTHORIZED');
  }
  return admin;
}

// ============================================
// RBAC — ROLE-BASED ACCESS CONTROL (Phase 2)
// ============================================

/**
 * Check if an authenticated admin has a specific permission.
 * Loads the admin's roles and their associated permissions from the database,
 * then checks whether any permission matches the requested module + action.
 *
 * @param admin - The authenticated admin (from getAuthenticatedAdmin or requireAdminAuth)
 * @param module - The permission module (e.g., 'products', 'orders', 'customers')
 * @param action - The permission action (e.g., 'create', 'read', 'update', 'delete')
 * @returns true if the admin has the permission, false otherwise
 */
export async function adminHasPermission(
  admin: AuthenticatedAdmin,
  module: string,
  action: string
): Promise<boolean> {
  // Load admin's roles with permissions
  const adminRoles = await db.adminUserRole.findMany({
    where: { adminId: admin.id },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  // Check if any role's permissions include the requested module + action
  for (const adminRole of adminRoles) {
    for (const rolePerm of adminRole.role.permissions) {
      if (
        rolePerm.permission.module === module &&
        rolePerm.permission.action === action
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Require a specific admin permission for API route protection.
 * Returns the authenticated admin if both authenticated AND authorized,
 * or an error NextResponse if not.
 *
 * Usage:
 * ```ts
 * const result = await requireAdminPermission('products', 'create');
 * if (result instanceof NextResponse) return result; // not auth/authorized
 * // result is AuthenticatedAdmin — proceed
 * ```
 */
export async function requireAdminPermission(
  module: string,
  action: string
): Promise<AuthenticatedAdmin | NextResponse> {
  // First, require authentication
  const adminResult = await requireAdminAuth();

  if (adminResult instanceof NextResponse) {
    return adminResult; // not authenticated
  }

  const admin = adminResult;

  // Then check permission
  const hasPermission = await adminHasPermission(admin, module, action);

  if (!hasPermission) {
    logger.warn('Admin permission denied', {
      adminId: admin.id,
      module,
      action,
      roleNames: admin.roleNames,
    });
    return errorResponse(
      `Permission denied: ${module}.${action}`,
      'FORBIDDEN',
      403
    );
  }

  return admin;
}

/**
 * Require a specific admin permission and throw ForbiddenError if not authorized.
 * Use this in apiHandler-wrapped routes where errors are caught centrally.
 *
 * Usage:
 * ```ts
 * export const POST = apiHandler(async (request) => {
 *   const admin = await requireAdminPermissionOrThrow('products', 'create');
 *   // admin is AuthenticatedAdmin — guaranteed authenticated + authorized
 * });
 * ```
 */
export async function requireAdminPermissionOrThrow(
  module: string,
  action: string
): Promise<AuthenticatedAdmin> {
  const admin = await requireAdminAuthOrThrow();

  const hasPermission = await adminHasPermission(admin, module, action);

  if (!hasPermission) {
    throw new ForbiddenError(
      `Permission denied: ${module}.${action}`,
      'ADMIN_PERMISSION_DENIED'
    );
  }

  return admin;
}

// ============================================
// ADMIN LOGIN HELPERS
// ============================================

/**
 * Complete admin login flow:
 * 1. Validate email + password
 * 2. Create session
 * 3. Set session cookie
 * 4. Update lastLoginAt
 * 5. Return authenticated admin
 *
 * Returns null if credentials are invalid.
 */
export async function adminLogin(
  email: string,
  passwordHash: string
): Promise<AuthenticatedAdmin | null> {
  const admin = await db.adminUser.findUnique({
    where: { email },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
    },
  });

  if (!admin || !admin.isActive) {
    logger.warn('Admin login failed — user not found or inactive', { email });
    return null;
  }

  // Verify password (passwordHash is stored, compare directly)
  // In production, use bcrypt/argon2 compare — this is a placeholder for the actual hash comparison
  if (admin.passwordHash !== passwordHash) {
    logger.warn('Admin login failed — invalid password', { email });
    return null;
  }

  // Create session
  const token = await createAdminSession(admin.id);
  await setAdminSessionCookie(token);

  // Update last login timestamp
  await db.adminUser.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  const roleNames = admin.roles.map((aur) => aur.role.name);

  logger.info('Admin logged in', { adminId: admin.id, email });

  return {
    id: admin.id,
    email: admin.email,
    nameEn: admin.nameEn,
    nameAr: admin.nameAr,
    phone: admin.phone,
    isActive: admin.isActive,
    customerId: admin.customerId,
    roleNames,
  };
}

/**
 * Complete admin logout flow:
 * 1. Get session token
 * 2. Destroy session in DB + clear cookie
 */
export async function adminLogout(): Promise<void> {
  const token = await getAdminSessionToken();
  if (token) {
    await destroyAdminSession(token);
    logger.info('Admin logged out');
  }
}
