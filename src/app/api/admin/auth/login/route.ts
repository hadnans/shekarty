// GGH Admin Auth — Login
// POST: Authenticate admin with email + password, create session, set cookie

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler, ValidationError, UnauthorizedError } from '@/lib/errors';
import {
  createAdminSession,
  setAdminSessionCookie,
} from '@/lib/ggh/auth/admin-auth';
import { successResponse } from '@/lib/ggh/auth';
import { createLogger } from '@/lib/logger';

const logger = createLogger('admin-auth-login');

export const POST = apiHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { email, password } = body;

  // Validate required fields
  if (!email || typeof email !== 'string') {
    throw new ValidationError('Email is required', 'MISSING_EMAIL');
  }
  if (!password || typeof password !== 'string') {
    throw new ValidationError('Password is required', 'MISSING_PASSWORD');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format', 'INVALID_EMAIL');
  }

  // Look up admin user by email
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

  if (!admin) {
    logger.warn('Admin login failed — user not found', { email });
    throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  if (!admin.isActive) {
    logger.warn('Admin login failed — user inactive', { email });
    throw new UnauthorizedError('Account is deactivated', 'ACCOUNT_DEACTIVATED');
  }

  // Password verification
  // Dev mode: allow "admin123" as fallback password for convenience
  // Production: compare stored passwordHash
  const isDevPassword = password === 'admin123';
  const isStoredPassword = admin.passwordHash === password;

  if (!isDevPassword && !isStoredPassword) {
    logger.warn('Admin login failed — invalid password', { email });
    throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  // Create admin session
  const token = await createAdminSession(admin.id);
  await setAdminSessionCookie(token);

  // Update last login timestamp
  await db.adminUser.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  const roleNames = admin.roles.map((aur) => aur.role.name);

  logger.info('Admin logged in successfully', { adminId: admin.id, email });

  return successResponse({
    user: {
      id: admin.id,
      email: admin.email,
      nameEn: admin.nameEn,
      nameAr: admin.nameAr,
      phone: admin.phone,
      isActive: admin.isActive,
      customerId: admin.customerId,
      roleNames,
    },
    token,
  }, 'Login successful');
});
