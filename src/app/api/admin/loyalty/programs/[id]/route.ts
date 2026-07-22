// GGH Admin — Loyalty Program Get/Update/Delete
// GET: Get a single loyalty program
// PATCH: Update a loyalty program
// DELETE: Delete a loyalty program (only if no transactions)

import { NextRequest } from 'next/server';
import { apiHandler, ValidationError } from '@/lib/errors';
import { requireAdminAuthOrThrow } from '@/lib/ggh/auth/admin-auth';
import { successResponse } from '@/lib/ggh/auth';
import { z } from 'zod';
import { getProgram, updateProgram, deleteProgram } from '@/lib/loyalty';
import { createLogger } from '@/lib/logger';

const logger = createLogger('admin-loyalty-program-detail');

// ============================================
// VALIDATION SCHEMAS
// ============================================

const updateProgramSchema = z.object({
  nameEn: z.string().min(1).optional(),
  nameAr: z.string().optional(),
  type: z.enum(['points', 'cashback', 'tiered']).optional(),
  pointsPerPiastre: z.number().positive().optional(),
  pointsValue: z.number().int().min(0).optional(),
  minRedemption: z.number().int().min(0).optional(),
  maxAccumulation: z.number().int().min(0).nullable().optional(),
  isActive: z.boolean().optional(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
});

// ============================================
// GET — Single Program
// ============================================

export const GET = apiHandler(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdminAuthOrThrow();
  const { id } = await params;

  const program = await getProgram(id);

  logger.info('Admin retrieved loyalty program', {
    adminId: admin.id,
    programId: id,
  });

  return successResponse(program);
});

// ============================================
// PATCH — Update Program
// ============================================

export const PATCH = apiHandler(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdminAuthOrThrow();
  const { id } = await params;

  const body = await request.json();
  const validated = updateProgramSchema.safeParse(body);

  if (!validated.success) {
    throw new ValidationError(
      'Invalid update data',
      'INVALID_UPDATE_DATA',
      validated.error.flatten().fieldErrors
    );
  }

  const program = await updateProgram(id, validated.data);

  logger.info('Admin updated loyalty program', {
    adminId: admin.id,
    programId: id,
  });

  return successResponse(program, 'Loyalty program updated');
});

// ============================================
// DELETE — Delete Program
// ============================================

export const DELETE = apiHandler(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdminAuthOrThrow();
  const { id } = await params;

  await deleteProgram(id);

  logger.info('Admin deleted loyalty program', {
    adminId: admin.id,
    programId: id,
  });

  return successResponse({ message: 'Loyalty program deleted' });
});
