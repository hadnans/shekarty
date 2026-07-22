// GGH — ERPNext Sync Orchestrator
// Coordinates order sync, stock sync, and customer sync between GGH and ERPNext

import { db } from '@/lib/db';
import { isErpEnabled } from './config';
import { ErpError } from './client';
import { createSalesOrder } from './modules/sales-order';
import { createDeliveryNote } from './modules/delivery-note';
import { syncCustomer } from './modules/customer';
import { getStockLevels } from './modules/inventory';
import type { ErpSyncResult, ErpBatchSyncResult, ErpEntityType, ErpSyncAction } from './types';

// ============================================
// SYNC LOG HELPERS
// ============================================

/**
 * Create a sync log entry in the database.
 * @param entityType - Type of entity being synced
 * @param entityId - GGH entity ID
 * @param action - Sync action
 * @param erpDocType - ERPNext DocType
 * @param request - Optional request payload
 * @returns Created sync log ID
 */
async function createSyncLog(
  entityType: ErpEntityType,
  entityId: string,
  action: ErpSyncAction,
  erpDocType: string,
  request?: unknown,
): Promise<string> {
  const log = await db.erpSyncLog.create({
    data: {
      entityType,
      entityId,
      action,
      erpDocType,
      status: 'pending',
      request: request ? JSON.stringify(request) : null,
    },
  });
  return log.id;
}

/**
 * Update a sync log entry with the result.
 * @param logId - Sync log ID
 * @param success - Whether the sync succeeded
 * @param erpDocName - ERPNext document name (if successful)
 * @param response - Optional response data
 * @param error - Optional error message
 */
async function updateSyncLog(
  logId: string,
  success: boolean,
  erpDocName?: string,
  response?: unknown,
  error?: string,
): Promise<void> {
  await db.erpSyncLog.update({
    where: { id: logId },
    data: {
      status: success ? 'success' : 'failed',
      erpDocName: erpDocName ?? null,
      response: response ? JSON.stringify(response) : null,
      error: error ?? null,
      syncedAt: success ? new Date() : null,
      retryCount: { increment: success ? 0 : 1 },
    },
  });
}

// ============================================
// ORDER SYNC
// ============================================

/**
 * Sync a single GGH order to ERPNext.
 * Creates a Sales Order and optionally a Delivery Note.
 * Updates the Order model with sync status.
 * @param orderId - GGH Order ID
 * @returns Sync result with ERP document name and status
 */
export async function syncOrderToErp(orderId: string): Promise<ErpSyncResult> {
  if (!isErpEnabled()) {
    return { success: false, error: 'ERPNext not configured', retryCount: 0 };
  }

  // Fetch the order with items
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true, customer: true },
  });

  if (!order) {
    return { success: false, error: 'Order not found', retryCount: 0 };
  }

  if (order.erpSyncStatus === 'synced' && order.erpSalesOrder) {
    return { success: true, erpDocName: order.erpSalesOrder, retryCount: 0 };
  }

  const logId = await createSyncLog('order', orderId, 'sync', 'Sales Order', {
    orderNumber: order.orderNumber,
    totalAmount: order.totalAmount,
  });

  try {
    // First, ensure the customer exists in ERPNext
    if (order.customer) {
      const customerProfile = {
        id: order.customer.id,
        phone: order.customer.phone,
        firstName: order.customer.firstName,
        lastName: order.customer.lastName,
        nameAr: order.customer.nameAr,
        preferredLang: order.customer.preferredLang as 'en' | 'ar',
        wholesaleStatus: order.customer.wholesaleStatus as 'retail' | 'wholesale' | 'vip',
        isVerified: order.customer.isVerified,
      };
      await syncCustomer(customerProfile);
    }

    // Map order to ERPNext format
    const gghOrder = {
      id: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      status: order.status as 'pending',
      paymentMethod: order.paymentMethod as 'cod',
      paymentStatus: order.paymentStatus as 'pending',
      subtotal: order.subtotal as unknown as import('@/types/ggh').Piastres,
      deliveryFee: order.deliveryFee as unknown as import('@/types/ggh').Piastres,
      discountAmount: order.discountAmount as unknown as import('@/types/ggh').Piastres,
      totalAmount: order.totalAmount as unknown as import('@/types/ggh').Piastres,
      notes: order.notes,
      deliveryAddressSnapshot: order.deliveryAddressSnapshot,
      deliverySlot: order.deliverySlot,
      deliveryDate: order.deliveryDate?.toISOString() ?? null,
      deliveredAt: order.deliveredAt?.toISOString() ?? null,
      driverName: order.driverName,
      driverPhone: order.driverPhone,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productNameEn: item.productNameEn,
        productNameAr: item.productNameAr,
        brandEn: item.brandEn,
        brandAr: item.brandAr,
        weight: item.weight,
        icon: item.icon,
        quantity: item.quantity,
        unitPrice: item.unitPrice as unknown as import('@/types/ggh').Piastres,
        totalPrice: item.totalPrice as unknown as import('@/types/ggh').Piastres,
      })),
      statusHistory: [],
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };

    // Create Sales Order in ERPNext
    const erpSoName = await createSalesOrder(gghOrder);

    if (!erpSoName) {
      await updateSyncLog(logId, false, undefined, undefined, 'Failed to create Sales Order in ERPNext');
      await db.order.update({
        where: { id: orderId },
        data: { erpSyncStatus: 'failed' },
      });
      return { success: false, error: 'Failed to create Sales Order', retryCount: 0 };
    }

    // Update the order with sync info
    await db.order.update({
      where: { id: orderId },
      data: {
        erpSalesOrder: erpSoName,
        erpSyncStatus: 'synced',
        erpSyncedAt: new Date(),
      },
    });

    // Create Delivery Note if order is being processed
    if (['confirmed', 'processing', 'packed', 'out_for_delivery'].includes(order.status)) {
      try {
        await createDeliveryNote(erpSoName);
      } catch (dnError) {
        // Delivery note creation failure is non-critical
        console.warn(`[ERP Sync] Failed to create Delivery Note for ${erpSoName}:`, dnError);
      }
    }

    await updateSyncLog(logId, true, erpSoName, { salesOrderName: erpSoName });
    return { success: true, erpDocName: erpSoName, retryCount: 0 };
  } catch (error: unknown) {
    const errorMessage = error instanceof ErpError
      ? `${error.code}: ${error.message}`
      : error instanceof Error
        ? error.message
        : String(error);

    await updateSyncLog(logId, false, undefined, undefined, errorMessage);
    await db.order.update({
      where: { id: orderId },
      data: { erpSyncStatus: 'failed' },
    });

    return { success: false, error: errorMessage, retryCount: 0 };
  }
}

/**
 * Sync all pending orders to ERPNext.
 * Processes orders where erpSyncStatus is 'pending' or 'failed' (with retry limit).
 * @returns Batch sync result with counts and errors
 */
export async function syncAllPendingOrders(): Promise<ErpBatchSyncResult> {
  if (!isErpEnabled()) {
    return { total: 0, succeeded: 0, failed: 0, errors: [] };
  }

  // Find orders that need syncing
  const pendingOrders = await db.order.findMany({
    where: {
      OR: [
        { erpSyncStatus: 'pending' },
        { erpSyncStatus: 'failed', erpSyncedAt: null },
      ],
      status: { notIn: ['cancelled', 'returned'] },
    },
    select: { id: true },
    take: 50, // Process in batches of 50
  });

  const result: ErpBatchSyncResult = {
    total: pendingOrders.length,
    succeeded: 0,
    failed: 0,
    errors: [],
  };

  for (const order of pendingOrders) {
    const syncResult = await syncOrderToErp(order.id);
    if (syncResult.success) {
      result.succeeded++;
    } else {
      result.failed++;
      result.errors.push({ entityId: order.id, error: syncResult.error ?? 'Unknown error' });
    }
  }

  return result;
}

/**
 * Pull latest stock levels from ERPNext and update the GGH database.
 * Updates Product.stock and Product.lowStockThreshold from ERPNext data.
 * @returns Number of products updated or null if ERP is disabled
 */
export async function syncStockFromErp(): Promise<number | null> {
  if (!isErpEnabled()) return null;

  const stockLevels = await getStockLevels();

  if (!stockLevels || stockLevels.length === 0) return 0;

  let updated = 0;

  for (const level of stockLevels) {
    // Try to find the product by handle (item_code)
    const product = await db.product.findFirst({
      where: {
        OR: [
          { handle: level.itemCode },
          { nameEn: level.itemNameEn },
        ],
      },
    });

    if (product) {
      await db.product.update({
        where: { id: product.id },
        data: {
          stock: level.actualQty,
          lowStockThreshold: level.reorderLevel > 0 ? level.reorderLevel : product.lowStockThreshold,
        },
      });
      updated++;
    }
  }

  return updated;
}

/**
 * Push a single GGH customer's data to ERPNext.
 * @param customerId - GGH Customer ID
 * @returns Sync result with ERP document name
 */
export async function syncCustomerToErp(customerId: string): Promise<ErpSyncResult> {
  if (!isErpEnabled()) {
    return { success: false, error: 'ERPNext not configured', retryCount: 0 };
  }

  const customer = await db.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer) {
    return { success: false, error: 'Customer not found', retryCount: 0 };
  }

  const logId = await createSyncLog('customer', customerId, 'sync', 'Customer', {
    phone: customer.phone,
    name: `${customer.firstName} ${customer.lastName}`,
  });

  try {
    const customerProfile = {
      id: customer.id,
      phone: customer.phone,
      firstName: customer.firstName,
      lastName: customer.lastName,
      nameAr: customer.nameAr,
      preferredLang: customer.preferredLang as 'en' | 'ar',
      wholesaleStatus: customer.wholesaleStatus as 'retail' | 'wholesale' | 'vip',
      isVerified: customer.isVerified,
    };

    const erpName = await syncCustomer(customerProfile);

    await updateSyncLog(logId, true, erpName ?? undefined, { erpName });
    return { success: true, erpDocName: erpName ?? undefined, retryCount: 0 };
  } catch (error: unknown) {
    const errorMessage = error instanceof ErpError
      ? `${error.code}: ${error.message}`
      : error instanceof Error
        ? error.message
        : String(error);

    await updateSyncLog(logId, false, undefined, undefined, errorMessage);
    return { success: false, error: errorMessage, retryCount: 0 };
  }
}

/**
 * Retry failed sync operations.
 * Finds sync logs with status 'failed' and retryCount below threshold.
 * @param maxRetries - Maximum retry attempts per entity
 * @returns Number of retried operations
 */
export async function retryFailedSyncs(maxRetries: number = 3): Promise<number> {
  if (!isErpEnabled()) return 0;

  const failedLogs = await db.erpSyncLog.findMany({
    where: {
      status: 'failed',
      retryCount: { lt: maxRetries },
    },
    take: 20,
    orderBy: { createdAt: 'asc' },
  });

  let retried = 0;

  for (const log of failedLogs) {
    let result: ErpSyncResult;

    switch (log.entityType) {
      case 'order':
        result = await syncOrderToErp(log.entityId);
        break;
      case 'customer':
        result = await syncCustomerToErp(log.entityId);
        break;
      default:
        continue;
    }

    if (result.success) {
      retried++;
    }
  }

  return retried;
}

/**
 * Get the current sync status summary.
 * @returns Sync status information including counts and recent logs
 */
export async function getSyncStatus(): Promise<{
  isEnabled: boolean;
  lastSyncAt: string | null;
  pendingCount: number;
  failedCount: number;
  recentLogs: Array<{
    id: string;
    entityType: ErpEntityType;
    entityId: string;
    action: string;
    erpDocType: string;
    status: string;
    error: string | null;
    createdAt: string;
  }>;
}> {
  const enabled = isErpEnabled();

  const [lastSync, pendingCount, failedCount, recentLogs] = await Promise.all([
    db.erpSyncLog.findFirst({
      where: { status: 'success' },
      orderBy: { syncedAt: 'desc' },
      select: { syncedAt: true },
    }),
    db.erpSyncLog.count({ where: { status: 'pending' } }),
    db.erpSyncLog.count({ where: { status: 'failed' } }),
    db.erpSyncLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        entityType: true,
        entityId: true,
        action: true,
        erpDocType: true,
        status: true,
        error: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    isEnabled: enabled,
    lastSyncAt: lastSync?.syncedAt?.toISOString() ?? null,
    pendingCount,
    failedCount,
    recentLogs: recentLogs.map((log) => ({
      id: log.id,
      entityType: log.entityType as ErpEntityType,
      entityId: log.entityId,
      action: log.action,
      erpDocType: log.erpDocType,
      status: log.status,
      error: log.error,
      createdAt: log.createdAt.toISOString(),
    })),
  };
}
