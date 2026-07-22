// GGH Admin — Inventory Adjust
// POST: Adjust product stock (add/subtract/set), log the adjustment

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler, ValidationError, NotFoundError } from '@/lib/errors';
import { requireAdminAuthOrThrow } from '@/lib/ggh/auth/admin-auth';
import { successResponse } from '@/lib/ggh/auth';
import { adminInventoryAdjustSchema } from '@/lib/validation/admin';
import { createLogger } from '@/lib/logger';

const logger = createLogger('admin-inventory-adjust');

export const POST = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminAuthOrThrow();

  const body = await request.json();
  const validated = adminInventoryAdjustSchema.parse(body);

  // Look up product
  const product = await db.product.findUnique({
    where: { id: validated.productId },
  });

  if (!product || product.deletedAt) {
    throw new NotFoundError('Product not found');
  }

  const previousStock = product.stock;
  let newStock: number;

  switch (validated.type) {
    case 'add':
      newStock = previousStock + validated.quantity;
      break;
    case 'subtract':
      newStock = previousStock - validated.quantity;
      if (newStock < 0) {
        throw new ValidationError(
          `Cannot subtract ${validated.quantity} from current stock of ${previousStock}. Result would be negative.`,
          'NEGATIVE_STOCK'
        );
      }
      break;
    case 'set':
      newStock = validated.quantity;
      break;
    default:
      throw new ValidationError('Invalid adjustment type', 'INVALID_TYPE');
  }

  // Update product stock
  await db.product.update({
    where: { id: validated.productId },
    data: { stock: newStock },
  });

  // Log the adjustment as an AppSetting for audit trail
  // (We don't have a StockAdjustmentLog model, so we store a JSON record in AppSetting)
  const adjustmentLog = JSON.stringify({
    productId: validated.productId,
    productName: product.nameEn,
    type: validated.type,
    quantity: validated.quantity,
    previousStock,
    newStock,
    reason: validated.reason,
    adminId: admin.id,
    adminEmail: admin.email,
    timestamp: new Date().toISOString(),
  });

  await db.appSetting.create({
    data: {
      key: `stock_adjustment_${Date.now()}_${validated.productId}`,
      value: adjustmentLog,
    },
  });

  logger.info('Stock adjustment', {
    adminId: admin.id,
    productId: validated.productId,
    type: validated.type,
    quantity: validated.quantity,
    previousStock,
    newStock,
    reason: validated.reason,
  });

  return successResponse({
    productId: validated.productId,
    productName: product.nameEn,
    previousStock,
    newStock,
    adjustment: validated.type === 'set'
      ? `Set to ${validated.quantity}`
      : `${validated.type === 'add' ? '+' : '-'}${validated.quantity}`,
    reason: validated.reason,
  }, 'Stock adjusted successfully');
});
