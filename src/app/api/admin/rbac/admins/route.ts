// GGH Admin RBAC Admin Users — GET list, POST create
// Uses apiHandler, requireAdminAuthOrThrow, Zod validation

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler, ValidationError, ConflictError } from '@/lib/errors';
import { requireAdminAuthOrThrow } from '@/lib/ggh/auth/admin-auth';
import { successResponse } from '@/lib/ggh/auth';
import { adminUserCreateSchema } from '@/lib/validation/admin';
import { createLogger } from '@/lib/logger';

const logger = createLogger('admin-rbac-admins');

// ============================================
// HELPER — Hash password (placeholder for production bcrypt)
// ============================================

function hashPassword(password: string): string {
  // In production, use bcrypt or argon2
  // For now, use a simple placeholder
  return `hashed_${password}`;
}

// ============================================
// GET — List all admin users with roles
// ============================================

export const GET = apiHandler(async (_request: NextRequest) => {
  const admin = await requireAdminAuthOrThrow();

  const adminUsers = await db.adminUser.findMany({
    where: { deletedAt: null },
    include: {
      roles: {
        include: {
          role: {
            select: {
              id: true,
              name: true,
              nameEn: true,
              nameAr: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const usersList = adminUsers.map((user) => ({
    id: user.id,
    email: user.email,
    nameEn: user.nameEn,
    nameAr: user.nameAr,
    phone: user.phone,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    customerId: user.customerId,
    roles: user.roles.map((aur) => ({
      id: aur.role.id,
      name: aur.role.name,
      nameEn: aur.role.nameEn,
      nameAr: aur.role.nameAr,
    })),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }));

  logger.info('Admin RBAC users listed', { adminId: admin.id, count: adminUsers.length });

  return successResponse(usersList, 'Admin users retrieved');
});

// ============================================
// POST — Create new admin user with role assignment
// ============================================

export const POST = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminAuthOrThrow();

  const body = await request.json();
  const parsed = adminUserCreateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(
      'Invalid admin user data',
      'VALIDATION_ERROR',
      parsed.error.flatten().fieldErrors
    );
  }

  const data = parsed.data;

  // Check email uniqueness
  const existingEmail = await db.adminUser.findUnique({
    where: { email: data.email },
  });
  if (existingEmail && !existingEmail.deletedAt) {
    throw new ConflictError(`Admin user with email "${data.email}" already exists`, 'EMAIL_EXISTS');
  }

  // Verify all role IDs exist
  if (data.roleIds.length > 0) {
    const roles = await db.role.findMany({
      where: { id: { in: data.roleIds } },
    });
    if (roles.length !== data.roleIds.length) {
      throw new ValidationError(
        'Some role IDs do not exist',
        'INVALID_ROLE_IDS'
      );
    }
  }

  // Create admin user with roles
  const passwordHash = hashPassword(data.password);

  const newAdmin = await db.adminUser.create({
    data: {
      email: data.email,
      passwordHash,
      nameEn: data.nameEn,
      nameAr: data.nameAr,
      phone: data.phone,
      isActive: data.isActive,
      customerId: data.customerId,
      roles: {
        create: data.roleIds.map((roleId: string) => ({ roleId })),
      },
    },
    include: {
      roles: {
        include: {
          role: {
            select: {
              id: true,
              name: true,
              nameEn: true,
              nameAr: true,
            },
          },
        },
      },
    },
  });

  logger.info('Admin user created', {
    adminId: admin.id,
    newAdminId: newAdmin.id,
    email: data.email,
    rolesCount: newAdmin.roles.length,
  });

  return successResponse(
    {
      id: newAdmin.id,
      email: newAdmin.email,
      nameEn: newAdmin.nameEn,
      nameAr: newAdmin.nameAr,
      phone: newAdmin.phone,
      isActive: newAdmin.isActive,
      lastLoginAt: newAdmin.lastLoginAt?.toISOString() ?? null,
      customerId: newAdmin.customerId,
      roles: newAdmin.roles.map((aur) => ({
        id: aur.role.id,
        name: aur.role.name,
        nameEn: aur.role.nameEn,
        nameAr: aur.role.nameAr,
      })),
      createdAt: newAdmin.createdAt.toISOString(),
      updatedAt: newAdmin.updatedAt.toISOString(),
    },
    'Admin user created successfully',
    201
  );
});
