// GGH Admin — Seed initial admin user with super_admin role and all permissions
// For development use only

import { db } from '@/lib/db';
import { apiHandler, ValidationError } from '@/lib/errors';
import { successResponse } from '@/lib/ggh/auth';
import { createLogger } from '@/lib/logger';

const logger = createLogger('admin-seed');

// ============================================
// DEFAULT ROLES
// ============================================

const DEFAULT_ROLES = [
  { name: 'super_admin', nameEn: 'Super Admin', nameAr: 'مدير عام', description: 'Full system access with all permissions', isSystem: true },
  { name: 'admin', nameEn: 'Admin', nameAr: 'مدير', description: 'Administrative access with most permissions', isSystem: true },
  { name: 'manager', nameEn: 'Manager', nameAr: 'مدير فرعي', description: 'Manage products, categories, and orders', isSystem: true },
  { name: 'operator', nameEn: 'Operator', nameAr: 'مشغل', description: 'Process orders and manage inventory', isSystem: true },
  { name: 'viewer', nameEn: 'Viewer', nameAr: 'مراقب', description: 'Read-only access to view data', isSystem: true },
];

// ============================================
// PERMISSIONS BY MODULE
// ============================================

const MODULE_PERMISSIONS: { module: string; actions: string[] }[] = [
  { module: 'products', actions: ['create', 'read', 'update', 'delete'] },
  { module: 'categories', actions: ['create', 'read', 'update', 'delete'] },
  { module: 'orders', actions: ['create', 'read', 'update', 'delete'] },
  { module: 'customers', actions: ['create', 'read', 'update', 'delete'] },
  { module: 'deals', actions: ['create', 'read', 'update', 'delete'] },
  { module: 'price_rules', actions: ['create', 'read', 'update', 'delete'] },
  { module: 'inventory', actions: ['read', 'update'] },
  { module: 'delivery', actions: ['create', 'read', 'update', 'delete'] },
  { module: 'reports', actions: ['read'] },
  { module: 'settings', actions: ['read', 'update'] },
  { module: 'admin_users', actions: ['create', 'read', 'update', 'delete'] },
  { module: 'roles', actions: ['create', 'read', 'update', 'delete'] },
];

const MODULE_NAMES: Record<string, { en: string; ar: string }> = {
  products: { en: 'Products', ar: 'المنتجات' },
  categories: { en: 'Categories', ar: 'الفئات' },
  orders: { en: 'Orders', ar: 'الطلبات' },
  customers: { en: 'Customers', ar: 'العملاء' },
  deals: { en: 'Deals', ar: 'العروض' },
  price_rules: { en: 'Price Rules', ar: 'قواعد الأسعار' },
  inventory: { en: 'Inventory', ar: 'المخزون' },
  delivery: { en: 'Delivery', ar: 'التوصيل' },
  reports: { en: 'Reports', ar: 'التقارير' },
  settings: { en: 'Settings', ar: 'الإعدادات' },
  admin_users: { en: 'Admin Users', ar: 'المستخدمين الإداريين' },
  roles: { en: 'Roles', ar: 'الأدوار' },
};

const ACTION_NAMES: Record<string, { en: string; ar: string }> = {
  create: { en: 'Create', ar: 'إنشاء' },
  read: { en: 'Read', ar: 'قراءة' },
  update: { en: 'Update', ar: 'تحديث' },
  delete: { en: 'Delete', ar: 'حذف' },
};

export const POST = apiHandler(async () => {
  // Block in production
  if (process.env.NODE_ENV === 'production') {
    throw new ValidationError('Seeding is disabled in production', 'SEED_DISABLED');
  }

  logger.info('Starting admin seed process');

  // ============================================
  // 1. CREATE PERMISSIONS
  // ============================================

  const permissionMap: Record<string, string> = {};
  let permissionsCreated = 0;

  for (const mod of MODULE_PERMISSIONS) {
    for (const action of mod.actions) {
      const permName = `${mod.module}.${action}`;
      const moduleInfo = MODULE_NAMES[mod.module];
      const actionInfo = ACTION_NAMES[action];

      const existing = await db.permission.findUnique({ where: { name: permName } });

      if (existing) {
        permissionMap[permName] = existing.id;
      } else {
        const created = await db.permission.create({
          data: {
            name: permName,
            nameEn: `${moduleInfo.en} - ${actionInfo.en}`,
            nameAr: `${moduleInfo.ar} - ${actionInfo.ar}`,
            module: mod.module,
            action: action,
          },
        });
        permissionMap[permName] = created.id;
        permissionsCreated++;
      }
    }
  }

  logger.info('Permissions seeded', { permissionsCreated });

  // ============================================
  // 2. CREATE ROLES
  // ============================================

  const roleMap: Record<string, string> = {};
  let rolesCreated = 0;

  for (const roleData of DEFAULT_ROLES) {
    const existing = await db.role.findUnique({ where: { name: roleData.name } });

    if (existing) {
      roleMap[roleData.name] = existing.id;
      // Update role info
      await db.role.update({
        where: { id: existing.id },
        data: {
          nameEn: roleData.nameEn,
          nameAr: roleData.nameAr,
          description: roleData.description,
          isSystem: roleData.isSystem,
        },
      });
    } else {
      const created = await db.role.create({
        data: {
          name: roleData.name,
          nameEn: roleData.nameEn,
          nameAr: roleData.nameAr,
          description: roleData.description,
          isSystem: roleData.isSystem,
        },
      });
      roleMap[roleData.name] = created.id;
      rolesCreated++;
    }
  }

  logger.info('Roles seeded', { rolesCreated });

  // ============================================
  // 3. ASSIGN ALL PERMISSIONS TO super_admin
  // ============================================

  const superAdminRoleId = roleMap['super_admin'];
  let rolePermissionsCreated = 0;

  for (const permId of Object.values(permissionMap)) {
    const existing = await db.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId: superAdminRoleId,
          permissionId: permId,
        },
      },
    });

    if (!existing) {
      await db.rolePermission.create({
        data: {
          roleId: superAdminRoleId,
          permissionId: permId,
        },
      });
      rolePermissionsCreated++;
    }
  }

  // Assign read + update permissions to admin role
  const adminRoleId = roleMap['admin'];
  const adminPermissions = Object.entries(permissionMap).filter(([name]) => {
    const action = name.split('.')[1];
    return action === 'read' || action === 'update';
  });

  for (const [, permId] of adminPermissions) {
    const existing = await db.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId: adminRoleId,
          permissionId: permId,
        },
      },
    });

    if (!existing) {
      await db.rolePermission.create({
        data: {
          roleId: adminRoleId,
          permissionId: permId,
        },
      });
      rolePermissionsCreated++;
    }
  }

  // Assign read permissions to viewer role
  const viewerRoleId = roleMap['viewer'];
  const viewerPermissions = Object.entries(permissionMap).filter(([name]) => {
    const action = name.split('.')[1];
    return action === 'read';
  });

  for (const [, permId] of viewerPermissions) {
    const existing = await db.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId: viewerRoleId,
          permissionId: permId,
        },
      },
    });

    if (!existing) {
      await db.rolePermission.create({
        data: {
          roleId: viewerRoleId,
          permissionId: permId,
        },
      });
      rolePermissionsCreated++;
    }
  }

  logger.info('Role permissions seeded', { rolePermissionsCreated });

  // ============================================
  // 4. CREATE DEFAULT ADMIN USER
  // ============================================

  const defaultAdminEmail = 'admin@ggh.com';
  const defaultAdminPassword = 'admin123';

  const existingAdmin = await db.adminUser.findUnique({
    where: { email: defaultAdminEmail },
  });

  let adminCreated = false;

  if (existingAdmin) {
    // Update existing admin — assign super_admin role if not already assigned
    const existingRole = await db.adminUserRole.findUnique({
      where: {
        adminId_roleId: {
          adminId: existingAdmin.id,
          roleId: superAdminRoleId,
        },
      },
    });

    if (!existingRole) {
      await db.adminUserRole.create({
        data: {
          adminId: existingAdmin.id,
          roleId: superAdminRoleId,
        },
      });
    }

    // Update password hash to match default
    await db.adminUser.update({
      where: { id: existingAdmin.id },
      data: {
        passwordHash: defaultAdminPassword,
        isActive: true,
        nameEn: 'Super Admin',
        nameAr: 'مدير عام',
      },
    });

    logger.info('Existing admin updated', { adminId: existingAdmin.id });
  } else {
    const newAdmin = await db.adminUser.create({
      data: {
        email: defaultAdminEmail,
        passwordHash: defaultAdminPassword,
        nameEn: 'Super Admin',
        nameAr: 'مدير عام',
        phone: '',
        isActive: true,
      },
    });

    // Assign super_admin role
    await db.adminUserRole.create({
      data: {
        adminId: newAdmin.id,
        roleId: superAdminRoleId,
      },
    });

    adminCreated = true;
    logger.info('Default admin created', { adminId: newAdmin.id });
  }

  return successResponse({
    permissionsCreated,
    totalPermissions: Object.keys(permissionMap).length,
    rolesCreated,
    totalRoles: DEFAULT_ROLES.length,
    rolePermissionsCreated,
    adminCreated,
    defaultAdmin: {
      email: defaultAdminEmail,
      role: 'super_admin',
    },
  }, 'Admin seed completed successfully');
});
