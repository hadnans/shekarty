// GGH Admin RBAC Roles — Single role: GET, PATCH (update), DELETE (soft delete)
// Uses apiHandler, requireAdminAuthOrThrow, Zod validation

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler, ValidationError, NotFoundError, ConflictError, ForbiddenError } from '@/lib/errors';
import { requireAdminAuthOrThrow } from '@/lib/ggh/auth/admin-auth';
import { successResponse } from '@/lib/ggh/auth';
import { adminRoleUpdateSchema } from '@/lib/validation/admin';
import { createLogger } from '@/lib/logger';

const logger = createLogger('admin-rbac-roles-detail');

// ============================================
// GET — Single role with full details
// ============================================

export const GET = apiHandler(async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdminAuthOrThrow();
  const { id } = await context.params;

  const role = await db.role.findUnique({
    where: { id },
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
      adminUsers: {
        select: { id: true, adminId: true },
      },
    },
  });

  if (!role) {
    throw new NotFoundError('Role not found', 'ROLE_NOT_FOUND');
  }

  logger.info('Admin role detail fetched', { adminId: admin.id, roleId: id });

  return successResponse({
    id: role.id,
    name: role.name,
    nameEn: role.nameEn,
    nameAr: role.nameAr,
    description: role.description,
    isSystem: role.isSystem,
    permissions: role.permissions.map((rp) => ({
      id: rp.permission.id,
      name: rp.permission.name,
      nameEn: rp.permission.nameEn,
      nameAr: rp.permission.nameAr,
      module: rp.permission.module,
      action: rp.permission.action,
    })),
    adminUsersCount: role.adminUsers.length,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  }, 'Role retrieved');
});

// ============================================
// PATCH — Update role (partial), including permissions
// ============================================

export const PATCH = apiHandler(async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdminAuthOrThrow();
  const { id } = await context.params;

  const existing = await db.role.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('Role not found', 'ROLE_NOT_FOUND');
  }

  // Prevent modifying system role name/isSystem flag
  if (existing.isSystem) {
    const body = await request.json();
    // System roles can only have their permissions and description updated
    const parsed = adminRoleUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        'Invalid role data',
        'VALIDATION_ERROR',
        parsed.error.flatten().fieldErrors
      );
    }
    const data = parsed.data;
    if (data.name && data.name !== existing.name) {
      throw new ForbiddenError('Cannot change name of a system role', 'SYSTEM_ROLE_NAMEImmutable');
    }
    if (data.isSystem === false) {
      throw new ForbiddenError('Cannot unset system flag on a system role', 'SYSTEM_ROLE_IMMUTABLE');
    }

    // Only update description and permissions for system roles
    const updateData: Record<string, unknown> = {};
    if (data.description !== undefined) updateData.description = data.description;
    if (data.nameEn !== undefined) updateData.nameEn = data.nameEn;
    if (data.nameAr !== undefined) updateData.nameAr = data.nameAr;

    // Update permissions if provided
    if (data.permissionIds !== undefined) {
      // Verify all permission IDs exist
      const permissions = await db.permission.findMany({
        where: { id: { in: data.permissionIds } },
      });
      if (permissions.length !== data.permissionIds.length) {
        throw new ValidationError('Some permission IDs do not exist', 'INVALID_PERMISSION_IDS');
      }

      // Delete existing permissions and recreate
      await db.rolePermission.deleteMany({ where: { roleId: id } });
      await db.rolePermission.createMany({
        data: data.permissionIds.map((permissionId: string) => ({ roleId: id, permissionId })),
      });
    }

    const updated = await db.role.update({
      where: { id },
      data: updateData,
      include: {
        permissions: { include: { permission: true } },
      },
    });

    logger.info('System role updated (limited)', { adminId: admin.id, roleId: id });

    return successResponse({
      id: updated.id,
      name: updated.name,
      nameEn: updated.nameEn,
      nameAr: updated.nameAr,
      description: updated.description,
      isSystem: updated.isSystem,
      permissions: updated.permissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        module: rp.permission.module,
        action: rp.permission.action,
      })),
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    }, 'Role updated');
  }

  // Non-system role — full update allowed
  const body = await request.json();
  const parsed = adminRoleUpdateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(
      'Invalid role data',
      'VALIDATION_ERROR',
      parsed.error.flatten().fieldErrors
    );
  }

  const data = parsed.data;

  // Check name uniqueness if name is being updated
  if (data.name && data.name !== existing.name) {
    const nameExists = await db.role.findUnique({ where: { name: data.name } });
    if (nameExists) {
      throw new ConflictError(`Role name "${data.name}" already exists`, 'ROLE_NAME_EXISTS');
    }
  }

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.nameEn !== undefined) updateData.nameEn = data.nameEn;
  if (data.nameAr !== undefined) updateData.nameAr = data.nameAr;
  if (data.description !== undefined) updateData.description = data.description;

  // Update permissions if provided
  if (data.permissionIds !== undefined) {
    const permissions = await db.permission.findMany({
      where: { id: { in: data.permissionIds } },
    });
    if (permissions.length !== data.permissionIds.length) {
      throw new ValidationError('Some permission IDs do not exist', 'INVALID_PERMISSION_IDS');
    }

    await db.rolePermission.deleteMany({ where: { roleId: id } });
    await db.rolePermission.createMany({
      data: data.permissionIds.map((permissionId: string) => ({ roleId: id, permissionId })),
    });
  }

  const updated = await db.role.update({
    where: { id },
    data: updateData,
    include: {
      permissions: { include: { permission: true } },
    },
  });

  logger.info('Role updated', { adminId: admin.id, roleId: id });

  return successResponse({
    id: updated.id,
    name: updated.name,
    nameEn: updated.nameEn,
    nameAr: updated.nameAr,
    description: updated.description,
    isSystem: updated.isSystem,
    permissions: updated.permissions.map((rp) => ({
      id: rp.permission.id,
      name: rp.permission.name,
      module: rp.permission.module,
      action: rp.permission.action,
    })),
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  }, 'Role updated');
});

// ============================================
// DELETE — Delete role (system roles cannot be deleted)
// ============================================

export const DELETE = apiHandler(async (_request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdminAuthOrThrow();
  const { id } = await context.params;

  const existing = await db.role.findUnique({
    where: { id },
    include: { adminUsers: true },
  });

  if (!existing) {
    throw new NotFoundError('Role not found', 'ROLE_NOT_FOUND');
  }

  if (existing.isSystem) {
    throw new ForbiddenError('System roles cannot be deleted', 'SYSTEM_ROLE_DELETE_FORBIDDEN');
  }

  // Check if any admin users are assigned to this role
  if (existing.adminUsers.length > 0) {
    throw new ValidationError(
      `Cannot delete role with ${existing.adminUsers.length} assigned admin users. Remove role from users first.`,
      'ROLE_HAS_USERS',
      { adminUsersCount: existing.adminUsers.length }
    );
  }

  // Delete role permissions first, then the role
  await db.rolePermission.deleteMany({ where: { roleId: id } });
  await db.role.delete({ where: { id } });

  logger.info('Role deleted', { adminId: admin.id, roleId: id, roleName: existing.name });

  return successResponse({ id }, 'Role deleted');
});
