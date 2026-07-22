// GGH Admin — App Settings
// GET: All app settings from AppSetting table
// PATCH: Update app settings (key-value pairs)

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler } from '@/lib/errors';
import { requireAdminAuthOrThrow } from '@/lib/ggh/auth/admin-auth';
import { successResponse } from '@/lib/ggh/auth';
import { createLogger } from '@/lib/logger';
import { z } from 'zod';

const logger = createLogger('admin-settings');

// Schema for updating settings
const settingsUpdateSchema = z.object({
  settings: z.array(
    z.object({
      key: z.string().min(1),
      value: z.string(),
    })
  ).min(1),
});

export const GET = apiHandler(async () => {
  const admin = await requireAdminAuthOrThrow();

  const allSettings = await db.appSetting.findMany({
    orderBy: { key: 'asc' },
  });

  // Convert to key-value map for convenience
  const settingsMap: Record<string, string> = {};
  for (const setting of allSettings) {
    settingsMap[setting.key] = setting.value;
  }

  logger.info('Admin settings retrieved', {
    adminId: admin.id,
    count: allSettings.length,
  });

  return successResponse({
    settings: allSettings,
    map: settingsMap,
  });
});

export const PATCH = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminAuthOrThrow();

  const body = await request.json();
  const validated = settingsUpdateSchema.parse(body);

  // Update each setting — upsert to create if not exists
  const results = [];
  for (const setting of validated.settings) {
    const result = await db.appSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: { key: setting.key, value: setting.value },
    });
    results.push(result);
  }

  logger.info('Admin settings updated', {
    adminId: admin.id,
    keys: validated.settings.map((s) => s.key),
  });

  return successResponse(results, 'Settings updated successfully');
});
