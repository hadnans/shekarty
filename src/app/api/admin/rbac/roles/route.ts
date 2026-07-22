// GGH Admin RBAC Roles — GET list, POST create
// Uses apiHandler, requireAdminAuthOrThrow, Zod validation

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler, ValidationError, ConflictError } from '@/lib/errors';
import { requireAdminAuthOrThrow } from '@/lib/ggh/auth/admin-auth';
import { successResponse } from '@/lib/ggh/auth';
import { adminRoleCreateSchema } from '@/lib/validation/admin';
import { createLogger } from '@/lib/logger';

const logger = createLogger('admin-rbac-roles');

// ============================================
// GET — List all roles with permissions count
// ============================================

export const GET = apiHandler(async (_request: NextRequest) => {
  const admin = await requireAdminAuthOrThrow();

  const roles = await db.role.findMany({
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
      adminUsers: {
        select: { id: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const rolesWithCount = roles.map((role) => ({
    id: role.id,
    name: role.name,
    nameEn: role.nameEn,
    nameAr: role.nameAr,
    description: role.description,
    isSystem: role.isSystem,
    permissionsCount: role.permissions.length,
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
  }));

  logger.info('Admin RBAC roles listed', { adminId: admin.id, count: roles.length });

  return successResponse(rolesWithCount, 'Roles retrieved');
});

// ============================================
// POST — Create new role with permissions
// ============================================

export const POST = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminAuthOrThrow();

  const body = await request.json();
  const parsed = adminRoleCreateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(
      'Invalid role data',
      'VALIDATION_ERROR',
      parsed.error.flatten().fieldErrors
    );
  }

  const data = parsed.data;

  // Check name uniqueness
  const existing = await db.role.findUnique({
    where: { name: data.name },
  });
  if (existing) {
    throw new ConflictError(`Role name "${data.name}" already exists`, 'ROLE_NAME_EXISTS');
  }

  // Verify all permission IDs exist
  if (data.permissionIds.length > 0) {
    const permissions = await db.permission.findMany({
      where: { id: { in: data.permissionIds } },
    });
    if (permissions.length !== data.permissionIds.length) {
      throw new ValidationError(
        'Some permission IDs do not exist',
        'INVALID_PERMISSION_IDS'
      );
    }
  }

  // Create role with permissions
  const role = await db.role.create({
    data: {
      name: data.name,
      nameEn: data.nameEn,
      nameAr: data.nameAr,
      description: data.description,
      isSystem: data.isSystem,
      permissions: {
        create: data.permissionIds.map((permissionId: string) => ({
          permissionId,
        })),
      },
    },
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
    },
  });

  logger.info('Role created', {
    adminId: admin.id,
    roleId: role.id,
    roleName: role.name,
    permissionsCount: role.permissions.length,
  });

  return successResponse(
    {
      id: role.id,
      name: role.name,
      nameEn: role.nameEn,
      nameAr: role.nameAr,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.permissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        module: rp.permission.module,
        action: rp.permission.action,
      })),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    },
    'Role created successfully',
    201
  );
});
