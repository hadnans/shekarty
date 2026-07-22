// GGH Admin RBAC Admin Users — Single admin: GET, PATCH (update roles), DELETE (soft delete)
// Uses apiHandler, requireAdminAuthOrThrow, Zod validation

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler, ValidationError, NotFoundError, ForbiddenError } from '@/lib/errors';
import { requireAdminAuthOrThrow } from '@/lib/ggh/auth/admin-auth';
import { successResponse } from '@/lib/ggh/auth';
import { adminUserUpdateSchema } from '@/lib/validation/admin';
import { createLogger } from '@/lib/logger';

const logger = createLogger('admin-rbac-admins-detail');

// ============================================
// HELPER — Hash password (placeholder for production bcrypt)
// ============================================

function hashPassword(password: string): string {
  // In production, use bcrypt or argon2
  return `hashed_${password}`;
}

// ============================================
// GET — Single admin user with roles
// ============================================

export const GET = apiHandler(async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdminAuthOrThrow();
  const { id } = await context.params;

  const adminUser = await db.adminUser.findUnique({
    where: { id },
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

  if (!adminUser || adminUser.deletedAt) {
    throw new NotFoundError('Admin user not found', 'ADMIN_NOT_FOUND');
  }

  logger.info('Admin user detail fetched', { adminId: admin.id, userId: id });

  return successResponse({
    id: adminUser.id,
    email: adminUser.email,
    nameEn: adminUser.nameEn,
    nameAr: adminUser.nameAr,
    phone: adminUser.phone,
    isActive: adminUser.isActive,
    lastLoginAt: adminUser.lastLoginAt?.toISOString() ?? null,
    customerId: adminUser.customerId,
    roles: adminUser.roles.map((aur) => ({
      id: aur.role.id,
      name: aur.role.name,
      nameEn: aur.role.nameEn,
      nameAr: aur.role.nameAr,
    })),
    createdAt: adminUser.createdAt.toISOString(),
    updatedAt: adminUser.updatedAt.toISOString(),
  }, 'Admin user retrieved');
});

// ============================================
// PATCH — Update admin user (change roles, name, status, password)
// ============================================

export const PATCH = apiHandler(async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdminAuthOrThrow();
  const { id } = await context.params;

  const existing = await db.adminUser.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) {
    throw new NotFoundError('Admin user not found', 'ADMIN_NOT_FOUND');
  }

  // Prevent admin from deactivating themselves
  if (admin.id === id) {
    const body = await request.json();
    if (body.isActive === false) {
      throw new ForbiddenError('You cannot deactivate your own account', 'SELF_DEACTIVATE_FORBIDDEN');
    }
  }

  const body = await request.json();
  const parsed = adminUserUpdateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(
      'Invalid admin user data',
      'VALIDATION_ERROR',
      parsed.error.flatten().fieldErrors
    );
  }

  const data = parsed.data;

  const updateData: Record<string, unknown> = {};
  if (data.email !== undefined) updateData.email = data.email;
  if (data.nameEn !== undefined) updateData.nameEn = data.nameEn;
  if (data.nameAr !== undefined) updateData.nameAr = data.nameAr;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.customerId !== undefined) updateData.customerId = data.customerId;
  if (data.password !== undefined) updateData.passwordHash = hashPassword(data.password);

  // Update roles if provided
  if (data.roleIds !== undefined) {
    const roles = await db.role.findMany({
      where: { id: { in: data.roleIds } },
    });
    if (roles.length !== data.roleIds.length) {
      throw new ValidationError('Some role IDs do not exist', 'INVALID_ROLE_IDS');
    }

    // Delete existing role assignments and recreate
    await db.adminUserRole.deleteMany({ where: { adminId: id } });
    await db.adminUserRole.createMany({
      data: data.roleIds.map((roleId: string) => ({ adminId: id, roleId })),
    });
  }

  const updated = await db.adminUser.update({
    where: { id },
    data: updateData,
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

  logger.info('Admin user updated', { adminId: admin.id, userId: id, updatedFields: Object.keys(updateData) });

  return successResponse({
    id: updated.id,
    email: updated.email,
    nameEn: updated.nameEn,
    nameAr: updated.nameAr,
    phone: updated.phone,
    isActive: updated.isActive,
    lastLoginAt: updated.lastLoginAt?.toISOString() ?? null,
    customerId: updated.customerId,
    roles: updated.roles.map((aur) => ({
      id: aur.role.id,
      name: aur.role.name,
      nameEn: aur.role.nameEn,
      nameAr: aur.role.nameAr,
    })),
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  }, 'Admin user updated');
});

// ============================================
// DELETE — Soft delete admin user
// ============================================

export const DELETE = apiHandler(async (_request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdminAuthOrThrow();
  const { id } = await context.params;

  // Prevent admin from deleting themselves
  if (admin.id === id) {
    throw new ForbiddenError('You cannot delete your own account', 'SELF_DELETE_FORBIDDEN');
  }

  const existing = await db.adminUser.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) {
    throw new NotFoundError('Admin user not found', 'ADMIN_NOT_FOUND');
  }

  // Soft delete
  await db.adminUser.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      isActive: false,
    },
  });

  // Deactivate all sessions for this admin
  await db.adminSession.updateMany({
    where: { adminId: id, isActive: true },
    data: { isActive: false },
  });

  logger.info('Admin user soft-deleted', { adminId: admin.id, userId: id });

  return successResponse({ id }, 'Admin user deleted');
});
