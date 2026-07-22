// GGH Auth Utilities — Session management, token generation, response helpers

import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// ============================================
// TYPES
// ============================================

interface AuthenticatedCustomer {
  id: string;
  phone: string;
  firstName: string;
  lastName: string;
  nameAr: string;
  preferredLang: string;
  wholesaleStatus: string;
  isVerified: boolean;
  email: string;
}

// ============================================
// RESPONSE HELPERS
// ============================================

export function successResponse<T>(data: T, message?: string, status: number = 200) {
  const response: { success: true; data: T; message?: string } = {
    success: true,
    data,
  };
  if (message) response.message = message;
  return NextResponse.json(response, { status });
}

export function errorResponse(error: string, code: string, status: number = 400) {
  return NextResponse.json(
    { success: false, error, code },
    { status }
  );
}

export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
) {
  return NextResponse.json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

// ============================================
// SESSION HELPERS
// ============================================

const SESSION_COOKIE = 'ggh-session';
const SESSION_DURATION_HOURS = 72;

export async function createSession(customerId: string): Promise<string> {
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000);

  await db.session.create({
    data: {
      token,
      customerId,
      expiresAt,
      isActive: true,
    },
  });

  return token;
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_HOURS * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE);
  return cookie?.value ?? null;
}

export async function getAuthenticatedCustomer(): Promise<AuthenticatedCustomer | null> {
  const token = await getSessionToken();
  if (!token) return null;

  // Query session first
  const session = await db.session.findUnique({
    where: { token },
  });

  if (!session || !session.isActive || session.expiresAt < new Date()) {
    // Session expired or invalid
    if (session) {
      await db.session.update({ where: { id: session.id }, data: { isActive: false } });
    }
    return null;
  }

  // Then query customer separately
  const customer = await db.customer.findUnique({
    where: { id: session.customerId },
  });

  if (!customer || !customer.isActive) {
    return null;
  }

  return {
    id: customer.id,
    phone: customer.phone,
    firstName: customer.firstName,
    lastName: customer.lastName,
    nameAr: customer.nameAr,
    preferredLang: customer.preferredLang,
    wholesaleStatus: customer.wholesaleStatus,
    isVerified: customer.isVerified,
    email: customer.email,
  };
}

export async function requireAuth(): Promise<AuthenticatedCustomer | NextResponse> {
  const customer = await getAuthenticatedCustomer();
  if (!customer) {
    return errorResponse('Authentication required', 'UNAUTHORIZED', 401);
  }
  return customer;
}

// ============================================
// VALIDATION HELPERS
// ============================================

export function isValidEgyptianPhone(phone: string): boolean {
  // Egyptian phone: +201012345678 or 01012345678 or 201012345678
  const cleaned = phone.replace(/[\s\-()]/g, '');
  return /^(\+20|20|0)?1[0-9]{9}$/.test(cleaned);
}

export function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('0')) return '+2' + cleaned;
  if (cleaned.startsWith('20')) return '+' + cleaned;
  return '+20' + cleaned;
}
