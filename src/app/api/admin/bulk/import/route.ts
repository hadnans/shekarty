// GGH Admin — Bulk Import
// POST: Bulk import products/categories/inventory/customers from JSON array
// Creates BulkImportJob, processes each row, returns job ID

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler, ValidationError } from '@/lib/errors';
import { requireAdminAuthOrThrow } from '@/lib/ggh/auth/admin-auth';
import { successResponse } from '@/lib/ggh/auth';
import { adminBulkImportSchema } from '@/lib/validation/admin';
import { createLogger } from '@/lib/logger';

const logger = createLogger('admin-bulk-import');

// ============================================
// IMPORT PROCESSORS
// ============================================

interface ImportRow {
  row: number;
  success: boolean;
  error?: string;
  id?: string;
}

async function processProductImport(data: Record<string, unknown>[]): Promise<ImportRow[]> {
  const results: ImportRow[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    try {
      // Validate required fields for product
      if (!row.nameEn || !row.handle || !row.categoryId) {
        results.push({
          row: i + 1,
          success: false,
          error: `Row ${i + 1}: Missing required fields (nameEn, handle, categoryId)`,
        });
        continue;
      }

      // Check for duplicate handle
      const existing = await db.product.findUnique({
        where: { handle: String(row.handle) },
      });

      if (existing) {
        // Update existing product
        const updated = await db.product.update({
          where: { id: existing.id },
          data: {
            nameEn: String(row.nameEn),
            nameAr: String(row.nameAr || ''),
            stock: Number(row.stock ?? existing.stock),
            todayPrice: Number(row.todayPrice ?? existing.todayPrice),
            wholesalePrice: row.wholesalePrice ? Number(row.wholesalePrice) : undefined,
            costPrice: row.costPrice ? Number(row.costPrice) : undefined,
            isActive: row.isActive !== undefined ? Boolean(row.isActive) : existing.isActive,
          },
        });
        results.push({ row: i + 1, success: true, id: updated.id });
      } else {
        // Create new product
        const created = await db.product.create({
          data: {
            handle: String(row.handle),
            nameEn: String(row.nameEn),
            nameAr: String(row.nameAr || ''),
            descriptionEn: String(row.descriptionEn || ''),
            descriptionAr: String(row.descriptionAr || ''),
            brandEn: String(row.brandEn || ''),
            brandAr: String(row.brandAr || ''),
            weight: String(row.weight || ''),
            unit: String(row.unit || 'piece'),
            barcode: row.barcode ? String(row.barcode) : undefined,
            todayPrice: Number(row.todayPrice || 0),
            wholesalePrice: row.wholesalePrice ? Number(row.wholesalePrice) : undefined,
            costPrice: row.costPrice ? Number(row.costPrice) : undefined,
            stock: Number(row.stock || 0),
            lowStockThreshold: Number(row.lowStockThreshold || 5),
            isActive: row.isActive !== undefined ? Boolean(row.isActive) : true,
            categoryId: String(row.categoryId),
            icon: String(row.icon || ''),
            imageUrl: row.imageUrl ? String(row.imageUrl) : undefined,
            thumbnailUrl: row.thumbnailUrl ? String(row.thumbnailUrl) : undefined,
          },
        });
        results.push({ row: i + 1, success: true, id: created.id });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      results.push({ row: i + 1, success: false, error: errorMsg });
    }
  }

  return results;
}

async function processCategoryImport(data: Record<string, unknown>[]): Promise<ImportRow[]> {
  const results: ImportRow[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    try {
      if (!row.nameEn || !row.slug) {
        results.push({
          row: i + 1,
          success: false,
          error: `Row ${i + 1}: Missing required fields (nameEn, slug)`,
        });
        continue;
      }

      const existing = await db.category.findUnique({
        where: { slug: String(row.slug) },
      });

      if (existing) {
        const updated = await db.category.update({
          where: { id: existing.id },
          data: {
            nameEn: String(row.nameEn),
            nameAr: String(row.nameAr || ''),
            isActive: row.isActive !== undefined ? Boolean(row.isActive) : existing.isActive,
          },
        });
        results.push({ row: i + 1, success: true, id: updated.id });
      } else {
        const created = await db.category.create({
          data: {
            slug: String(row.slug),
            nameEn: String(row.nameEn),
            nameAr: String(row.nameAr || ''),
            descriptionEn: String(row.descriptionEn || ''),
            descriptionAr: String(row.descriptionAr || ''),
            icon: String(row.icon || ''),
            color: String(row.color || '#F5F5F5'),
            sortOrder: Number(row.sortOrder || 0),
            isActive: row.isActive !== undefined ? Boolean(row.isActive) : true,
            parentId: row.parentId ? String(row.parentId) : undefined,
          },
        });
        results.push({ row: i + 1, success: true, id: created.id });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      results.push({ row: i + 1, success: false, error: errorMsg });
    }
  }

  return results;
}

async function processInventoryImport(data: Record<string, unknown>[]): Promise<ImportRow[]> {
  const results: ImportRow[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    try {
      const productId = row.productId ? String(row.productId) : undefined;
      const handle = row.handle ? String(row.handle) : undefined;

      if (!productId && !handle) {
        results.push({
          row: i + 1,
          success: false,
          error: `Row ${i + 1}: Missing productId or handle`,
        });
        continue;
      }

      // Find product by ID or handle
      let product;
      if (productId) {
        product = await db.product.findUnique({ where: { id: productId } });
      } else if (handle) {
        product = await db.product.findUnique({ where: { handle: handle! } });
      }

      if (!product) {
        results.push({
          row: i + 1,
          success: false,
          error: `Row ${i + 1}: Product not found`,
        });
        continue;
      }

      const newStock = Number(row.stock ?? product.stock);
      await db.product.update({
        where: { id: product.id },
        data: { stock: newStock },
      });

      results.push({ row: i + 1, success: true, id: product.id });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      results.push({ row: i + 1, success: false, error: errorMsg });
    }
  }

  return results;
}

async function processCustomerImport(data: Record<string, unknown>[]): Promise<ImportRow[]> {
  const results: ImportRow[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    try {
      if (!row.phone) {
        results.push({
          row: i + 1,
          success: false,
          error: `Row ${i + 1}: Missing required field (phone)`,
        });
        continue;
      }

      const existing = await db.customer.findUnique({
        where: { phone: String(row.phone) },
      });

      if (existing) {
        const updated = await db.customer.update({
          where: { id: existing.id },
          data: {
            firstName: String(row.firstName || existing.firstName),
            lastName: String(row.lastName || existing.lastName),
            email: row.email ? String(row.email) : existing.email,
            wholesaleStatus: row.wholesaleStatus ? String(row.wholesaleStatus) : existing.wholesaleStatus,
            isActive: row.isActive !== undefined ? Boolean(row.isActive) : existing.isActive,
          },
        });
        results.push({ row: i + 1, success: true, id: updated.id });
      } else {
        const created = await db.customer.create({
          data: {
            phone: String(row.phone),
            firstName: String(row.firstName || ''),
            lastName: String(row.lastName || ''),
            email: row.email ? String(row.email) : '',
            nameAr: String(row.nameAr || ''),
            wholesaleStatus: String(row.wholesaleStatus || 'retail'),
            isActive: row.isActive !== undefined ? Boolean(row.isActive) : true,
          },
        });
        results.push({ row: i + 1, success: true, id: created.id });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      results.push({ row: i + 1, success: false, error: errorMsg });
    }
  }

  return results;
}

export const POST = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminAuthOrThrow();

  const body = await request.json();
  const validated = adminBulkImportSchema.parse(body);

  const { type, data } = validated;

  logger.info('Admin bulk import started', {
    adminId: admin.id,
    type,
    rowCount: data.length,
  });

  // Create BulkImportJob record
  const job = await db.bulkImportJob.create({
    data: {
      type,
      fileName: `import_${type}_${Date.now()}`,
      fileSize: JSON.stringify(data).length,
      totalRows: data.length,
      processedRows: 0,
      failedRows: 0,
      status: 'processing',
      adminId: admin.id,
    },
  });

  // Process the import based on type
  let results: ImportRow[];
  switch (type) {
    case 'products':
      results = await processProductImport(data);
      break;
    case 'categories':
      results = await processCategoryImport(data);
      break;
    case 'inventory':
      results = await processInventoryImport(data);
      break;
    case 'customers':
      results = await processCustomerImport(data);
      break;
    default:
      throw new ValidationError(`Unsupported import type: ${type}`, 'INVALID_TYPE');
  }

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;
  const errors = results
    .filter((r) => !r.success)
    .map((r) => r.error || `Row ${r.row}: Unknown error`);

  // Update job with results
  await db.bulkImportJob.update({
    where: { id: job.id },
    data: {
      processedRows: successCount,
      failedRows: failCount,
      status: failCount > 0 && successCount > 0 ? 'partial' : (failCount === data.length ? 'failed' : 'completed'),
      errors: JSON.stringify(errors.slice(0, 50)), // Limit stored errors
      result: JSON.stringify({ successCount, failCount, totalRows: data.length }),
    },
  });

  logger.info('Admin bulk import completed', {
    adminId: admin.id,
    jobId: job.id,
    type,
    successCount,
    failCount,
  });

  return successResponse({
    jobId: job.id,
    type,
    totalRows: data.length,
    processedRows: successCount,
    failedRows: failCount,
    status: failCount > 0 && successCount > 0 ? 'partial' : (failCount === data.length ? 'failed' : 'completed'),
    results: results.slice(0, 100), // Return first 100 results for preview
  }, 'Bulk import processed');
});
