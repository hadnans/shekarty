// GGH Admin RBAC Permissions — GET list by module
// Uses apiHandler, requireAdminAuthOrThrow

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler } from '@/lib/errors';
import { requireAdminAuthOrThrow } from '@/lib/ggh/auth/admin-auth';
import { successResponse } from '@/lib/ggh/auth';
import { createLogger } from '@/lib/logger';

const logger = createLogger('admin-rbac-permissions');

// ============================================
// GET — List all permissions, grouped by module
// ============================================

export const GET = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminAuthOrThrow();

  // Get module filter from query params
  const { searchParams } = new URL(request.url);
  const moduleFilter = searchParams.get('module');

  const where: Record<string, unknown> = {};
  if (moduleFilter) where.module = moduleFilter;

  const permissions = await db.permission.findMany({
    where,
    orderBy: [{ module: 'asc' }, { action: 'asc' }],
  });

  // Group by module for UI display
  const groupedPermissions: Record<string, Array<{
    id: string;
    name: string;
    nameEn: string;
    nameAr: string;
    module: string;
    action: string;
  }>> = {};

  for (const perm of permissions) {
    if (!groupedPermissions[perm.module]) {
      groupedPermissions[perm.module] = [];
    }
    groupedPermissions[perm.module].push({
      id: perm.id,
      name: perm.name,
      nameEn: perm.nameEn,
      nameAr: perm.nameAr,
      module: perm.module,
      action: perm.action,
    });
  }

  logger.info('Admin RBAC permissions listed', {
    adminId: admin.id,
    totalPermissions: permissions.length,
    modules: Object.keys(groupedPermissions).length,
  });

  return successResponse({
    permissions: permissions.map((p) => ({
      id: p.id,
      name: p.name,
      nameEn: p.nameEn,
      nameAr: p.nameAr,
      module: p.module,
      action: p.action,
    })),
    grouped: groupedPermissions,
    modules: Object.keys(groupedPermissions),
  }, 'Permissions retrieved');
});
