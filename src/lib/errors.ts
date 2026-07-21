// GGH — Centralized Error Handling
// Custom error classes, error response helper, and API route handler wrapper

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { createLogger } from './logger';

const logger = createLogger('errors');

// ============================================
// BASE APPLICATION ERROR
// ============================================

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

// ============================================
// SPECIFIC ERROR TYPES
// ============================================

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', code: string = 'NOT_FOUND') {
    super(message, 404, code);
  }
}

export class ValidationError extends AppError {
  public readonly details?: unknown;
  constructor(message: string = 'Validation failed', code: string = 'VALIDATION_ERROR', details?: unknown) {
    super(message, 400, code);
    this.details = details;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required', code: string = 'UNAUTHORIZED') {
    super(message, 401, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access forbidden', code: string = 'FORBIDDEN') {
    super(message, 403, code);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict', code: string = 'CONFLICT') {
    super(message, 409, code);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests', code: string = 'RATE_LIMITED') {
    super(message, 429, code);
  }
}

export class InternalError extends AppError {
  constructor(message: string = 'Internal server error', code: string = 'INTERNAL_ERROR') {
    super(message, 500, code, false);
  }
}

// ============================================
// ERROR RESPONSE HELPER
// ============================================

/**
 * Convert any error into a standardized NextResponse.
 * - AppError → typed response with status, code, message
 * - ZodError → 400 with validation details
 * - Unknown → 500 internal error
 */
export function handleError(error: unknown): NextResponse {
  // AppError (and subclasses)
  if (error instanceof AppError) {
    if (!error.isOperational || error.statusCode >= 500) {
      logger.error('Application error', error);
    } else {
      logger.warn('Client error', {
        statusCode: error.statusCode,
        code: error.code,
        message: error.message,
      });
    }

    const body: Record<string, unknown> = {
      success: false,
      error: error.message,
      code: error.code,
    };

    if (error instanceof ValidationError && error.details) {
      body.details = error.details;
    }

    return NextResponse.json(body, { status: error.statusCode });
  }

  // ZodError → Validation error
  if (error instanceof ZodError) {
    logger.warn('Validation error', {
      errors: error.flatten().fieldErrors,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  // Unknown errors
  logger.error('Unhandled error', error);

  return NextResponse.json(
    {
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
    { status: 500 }
  );
}

// ============================================
// ASYNC ROUTE HANDLER WRAPPER
// ============================================

type HandlerFn = (...args: unknown[]) => Promise<NextResponse>;

/**
 * Wraps an async API route handler with:
 * - Structured error handling (try/catch)
 * - Logging of errors
 * - Standardized error responses
 *
 * Usage:
 * ```ts
 * export const POST = apiHandler(async (request) => { ... });
 * ```
 */
export function apiHandler(handler: HandlerFn): HandlerFn {
  return async (...args: unknown[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleError(error);
    }
  };
}
