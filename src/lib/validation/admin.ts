// GGH — Admin Validation Schemas
// Zod schemas for all admin API endpoints
// Money values are integers (piastres). EGP 14.50 = 1450

import { z } from 'zod';

// ============================================
// SHARED / REUSABLE PIECES
// ============================================

/** Pagination with sort support for admin lists */
const adminPaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

/** Sort direction */
const sortOrderSchema = z.enum(['asc', 'desc']).default('desc');

/** Non-empty string for required text fields */
const requiredText = z.string().min(1);

/** Optional string (can be empty or omitted) */
const optionalText = z.string().optional();

/** Integer money value (piastres) — must be >= 0 */
const moneyInt = z.number().int().min(0);

/** Optional integer money value */
const moneyIntOptional = z.number().int().min(0).optional();

/** Date string (ISO format) */
const dateString = z.string().min(1);

/** Optional date string */
const dateStringOptional = z.string().min(1).optional();

// ============================================
// PRODUCT — ADMIN ENDPOINTS
// ============================================

/** Admin product list with search, filters, and sort */
export const adminProductListSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'all']).default('all'),
  categoryId: z.string().optional(),
  sortBy: z.enum(['name', 'price', 'stock', 'sold', 'createdAt']).default('createdAt'),
  sortOrder: sortOrderSchema,
});

/** Admin product creation — all required fields from Product model */
export const adminProductCreateSchema = z.object({
  handle: requiredText,
  nameEn: requiredText,
  nameAr: requiredText,
  descriptionEn: z.string().default(''),
  descriptionAr: z.string().default(''),
  brandEn: z.string().default(''),
  brandAr: z.string().default(''),
  weight: z.string().default(''),
  unit: z.string().default('piece'),
  barcode: z.string().optional(),
  todayPrice: moneyInt.default(0),
  yesterdayPrice: moneyIntOptional,
  wholesalePrice: moneyIntOptional,
  costPrice: moneyIntOptional,
  compareAtPrice: moneyIntOptional,
  stock: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).default(5),
  icon: z.string().default(''),
  imageUrl: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isDeal: z.boolean().default(false),
  dealEndsAt: dateStringOptional,
  maxPerOrder: z.number().int().positive().default(10),
  minOrderQty: z.number().int().positive().default(1),
  categoryId: requiredText,
});

/** Admin product update — partial, all fields optional */
export const adminProductUpdateSchema = z.object({
  handle: z.string().optional(),
  nameEn: z.string().optional(),
  nameAr: z.string().optional(),
  descriptionEn: z.string().optional(),
  descriptionAr: z.string().optional(),
  brandEn: z.string().optional(),
  brandAr: z.string().optional(),
  weight: z.string().optional(),
  unit: z.string().optional(),
  barcode: z.string().optional(),
  todayPrice: moneyIntOptional,
  yesterdayPrice: moneyIntOptional,
  wholesalePrice: moneyIntOptional,
  costPrice: moneyIntOptional,
  compareAtPrice: moneyIntOptional,
  stock: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  icon: z.string().optional(),
  imageUrl: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isDeal: z.boolean().optional(),
  dealEndsAt: dateStringOptional,
  maxPerOrder: z.number().int().positive().optional(),
  minOrderQty: z.number().int().positive().optional(),
  categoryId: z.string().optional(),
});

// ============================================
// CATEGORY — ADMIN ENDPOINTS
// ============================================

/** Admin category creation */
export const adminCategoryCreateSchema = z.object({
  slug: requiredText,
  nameEn: requiredText,
  nameAr: requiredText,
  descriptionEn: z.string().default(''),
  descriptionAr: z.string().default(''),
  icon: z.string().default(''),
  color: z.string().default('#F5F5F5'),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  parentId: z.string().optional(),
});

/** Admin category update — partial */
export const adminCategoryUpdateSchema = z.object({
  slug: z.string().optional(),
  nameEn: z.string().optional(),
  nameAr: z.string().optional(),
  descriptionEn: z.string().optional(),
  descriptionAr: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  parentId: z.string().optional(),
});

// ============================================
// DEAL — ADMIN ENDPOINTS
// ============================================

/** Admin deal creation */
export const adminDealCreateSchema = z.object({
  productId: requiredText,
  dealPrice: moneyInt,
  originalPrice: moneyInt,
  discountPercent: z.number().int().min(0).max(100),
  startsAt: dateString,
  endsAt: dateString,
  maxQuantity: z.number().int().positive().default(100),
  isActive: z.boolean().default(true),
});

/** Admin deal update — partial */
export const adminDealUpdateSchema = z.object({
  productId: z.string().optional(),
  dealPrice: moneyIntOptional,
  originalPrice: moneyIntOptional,
  discountPercent: z.number().int().min(0).max(100).optional(),
  startsAt: dateStringOptional,
  endsAt: dateStringOptional,
  maxQuantity: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

// ============================================
// PRICE RULE — ADMIN ENDPOINTS
// ============================================

/** Admin price rule creation */
export const adminPriceRuleCreateSchema = z.object({
  nameEn: requiredText,
  nameAr: z.string().default(''),
  type: z.enum([
    'percentage_discount',
    'fixed_discount',
    'bulk_tier',
    'wholesale_markup',
    'zone_pricing',
  ]),
  value: z.number().int(), // piastres for fixed, or percentage * 100
  minQuantity: z.number().int().min(0).default(0),
  maxQuantity: z.number().int().min(0).optional(),
  minOrderTotal: moneyInt.default(0),
  customerId: z.string().optional(),
  customerGroup: z.string().default(''),
  categoryId: z.string().optional(),
  productId: z.string().optional(),
  zoneId: z.string().optional(),
  priority: z.number().int().min(0).default(0),
  startsAt: dateStringOptional,
  endsAt: dateStringOptional,
  isActive: z.boolean().default(true),
});

/** Admin price rule update — partial */
export const adminPriceRuleUpdateSchema = z.object({
  nameEn: z.string().optional(),
  nameAr: z.string().optional(),
  type: z.enum([
    'percentage_discount',
    'fixed_discount',
    'bulk_tier',
    'wholesale_markup',
    'zone_pricing',
  ]).optional(),
  value: z.number().int().optional(),
  minQuantity: z.number().int().min(0).optional(),
  maxQuantity: z.number().int().min(0).optional(),
  minOrderTotal: moneyIntOptional,
  customerId: z.string().optional(),
  customerGroup: z.string().optional(),
  categoryId: z.string().optional(),
  productId: z.string().optional(),
  zoneId: z.string().optional(),
  priority: z.number().int().min(0).optional(),
  startsAt: dateStringOptional,
  endsAt: dateStringOptional,
  isActive: z.boolean().optional(),
});

// ============================================
// INVENTORY — ADMIN ENDPOINTS
// ============================================

/** Admin inventory stock adjustment */
export const adminInventoryAdjustSchema = z.object({
  productId: requiredText,
  quantity: z.number().int().min(0), // the new quantity or amount to adjust
  reason: z.string().min(1).max(500),
  type: z.enum(['add', 'subtract', 'set']),
});

// ============================================
// BULK IMPORT — ADMIN ENDPOINTS
// ============================================

/** Admin bulk import */
export const adminBulkImportSchema = z.object({
  type: z.enum(['products', 'categories', 'inventory', 'customers']),
  data: z.array(z.record(z.string(), z.unknown())).min(1).max(10000),
});

// ============================================
// ORDER — ADMIN ENDPOINTS
// ============================================

/** Admin order list with search, filters, and date range */
export const adminOrderListSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  status: z.enum([
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'refunded',
    'all',
  ]).default('all'),
  paymentStatus: z.enum([
    'pending',
    'paid',
    'failed',
    'refunded',
    'all',
  ]).default('all'),
  dateFrom: dateStringOptional,
  dateTo: dateStringOptional,
  sortBy: z.enum(['createdAt', 'totalAmount', 'status']).default('createdAt'),
  sortOrder: sortOrderSchema,
});

// ============================================
// CUSTOMER — ADMIN ENDPOINTS
// ============================================

/** Admin customer list with search and status filter */
export const adminCustomerListSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'all']).default('all'),
  wholesaleStatus: z.enum(['retail', 'wholesale', 'vip', 'all']).default('all'),
  sortBy: z.enum(['createdAt', 'totalSpent', 'orderCount', 'name']).default('createdAt'),
  sortOrder: sortOrderSchema,
});

// ============================================
// DASHBOARD & ANALYTICS — ADMIN ENDPOINTS
// ============================================

/** Admin dashboard — optional period for data aggregation */
export const adminDashboardSchema = z.object({
  period: z.enum(['today', 'week', 'month', 'quarter', 'year']).default('today'),
});

/** Admin analytics — revenue breakdown */
export const adminAnalyticsRevenueSchema = z.object({
  period: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
  dateFrom: dateStringOptional,
  dateTo: dateStringOptional,
});

// ============================================
// RBAC — ADMIN ROLE & USER MANAGEMENT
// ============================================

/** Admin role creation with permission IDs */
export const adminRoleCreateSchema = z.object({
  name: requiredText,
  nameEn: requiredText,
  nameAr: requiredText,
  description: z.string().default(''),
  isSystem: z.boolean().default(false),
  permissionIds: z.array(z.string().min(1)).default([]),
});

/** Admin role update — partial */
export const adminRoleUpdateSchema = z.object({
  name: z.string().optional(),
  nameEn: z.string().optional(),
  nameAr: z.string().optional(),
  description: z.string().optional(),
  isSystem: z.boolean().optional(),
  permissionIds: z.array(z.string().min(1)).optional(),
});

/** Admin user creation with role assignment */
export const adminUserCreateSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  nameEn: requiredText,
  nameAr: z.string().default(''),
  phone: z.string().default(''),
  customerId: z.string().optional(),
  roleIds: z.array(z.string().min(1)).default([]),
  isActive: z.boolean().default(true),
});

/** Admin user update — partial */
export const adminUserUpdateSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128).optional(),
  nameEn: z.string().optional(),
  nameAr: z.string().optional(),
  phone: z.string().optional(),
  customerId: z.string().optional(),
  roleIds: z.array(z.string().min(1)).optional(),
  isActive: z.boolean().optional(),
});
