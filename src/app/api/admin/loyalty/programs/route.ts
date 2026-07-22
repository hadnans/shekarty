// GGH Admin — Loyalty Programs List & Create
// GET: List all loyalty programs (with filters)
// POST: Create a new loyalty program

import { NextRequest } from 'next/server';
import { apiHandler, ValidationError } from '@/lib/errors';
import { requireAdminAuthOrThrow } from '@/lib/ggh/auth/admin-auth';
import { successResponse, paginatedResponse } from '@/lib/ggh/auth';
import { z } from 'zod';
import { listPrograms, createProgram } from '@/lib/loyalty';
import { type ProgramType } from '@/lib/loyalty/config';
import { createLogger } from '@/lib/logger';

const logger = createLogger('admin-loyalty-programs');

// ============================================
// VALIDATION SCHEMAS
// ============================================

const listProgramsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  isActive: z.enum(['true', 'false', 'all']).default('all'),
  type: z.enum(['points', 'cashback', 'tiered', 'all']).default('all'),
});

const createProgramSchema = z.object({
  nameEn: z.string().min(1, 'English name is required'),
  nameAr: z.string().default(''),
  type: z.enum(['points', 'cashback', 'tiered']),
  pointsPerPiastre: z.number().positive().default(0.01),
  pointsValue: z.number().int().min(0).default(100),
  minRedemption: z.number().int().min(0).default(0),
  maxAccumulation: z.number().int().min(0).nullable().optional(),
  isActive: z.boolean().default(true),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
});

// ============================================
// GET — List Programs
// ============================================

export const GET = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminAuthOrThrow();

  const { searchParams } = new URL(request.url);
  const queryParams: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  const validated = listProgramsSchema.parse(queryParams);
  const { page, limit, isActive, type } = validated;

  // Convert string filters to proper types
  const isActiveFilter = isActive === 'all' ? undefined : isActive === 'true';
  const typeFilter = type === 'all' ? undefined : (type as ProgramType);

  const result = await listPrograms(page, limit, isActiveFilter, typeFilter);

  logger.info('Admin listed loyalty programs', {
    adminId: admin.id,
    page,
    limit,
    total: result.total,
  });

  return paginatedResponse(result.programs, page, limit, result.total);
});

// ============================================
// POST — Create Program
// ============================================

export const POST = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminAuthOrThrow();

  const body = await request.json();
  const validated = createProgramSchema.safeParse(body);

  if (!validated.success) {
    throw new ValidationError(
      'Invalid loyalty program data',
      'INVALID_PROGRAM_DATA',
      validated.error.flatten().fieldErrors
    );
  }

  const program = await createProgram(validated.data);

  logger.info('Admin created loyalty program', {
    adminId: admin.id,
    programId: program.id,
    nameEn: program.nameEn,
  });

  return successResponse(program, 'Loyalty program created');
});
