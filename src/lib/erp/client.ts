// GGH — ERPNext HTTP Client
// Native fetch with token auth, retry logic, rate limiting, and typed error mapping

import { getErpConfig, isErpEnabled } from './config';

// ============================================
// ERROR TYPES
// ============================================

/** ERPNext-specific error codes */
export type ErpErrorCode =
  | 'ERP_NOT_CONFIGURED'
  | 'ERP_AUTH_FAILED'
  | 'ERP_NOT_FOUND'
  | 'ERP_VALIDATION_ERROR'
  | 'ERP_RATE_LIMITED'
  | 'ERP_SERVER_ERROR'
  | 'ERP_NETWORK_ERROR'
  | 'ERP_TIMEOUT'
  | 'ERP_UNKNOWN_ERROR';

/** Typed ERPNext error with structured information */
export class ErpError extends Error {
  readonly code: ErpErrorCode;
  readonly statusCode: number;
  readonly erpMessage: string;
  readonly details: unknown;

  constructor(code: ErpErrorCode, message: string, statusCode = 0, erpMessage = '', details?: unknown) {
    super(message);
    this.name = 'ErpError';
    this.code = code;
    this.statusCode = statusCode;
    this.erpMessage = erpMessage;
    this.details = details;
  }
}

// ============================================
// RESPONSE TYPES
// ============================================

/** Standard ERPNext API response wrapper */
export interface ErpApiResponse<T = unknown> {
  data: T;
  message?: string;
  exc_type?: string;
  exc?: string;
  _server_messages?: string;
}

/** ERPNext document list response */
export interface ErpListResponse<T = unknown> {
  data: T[];
  message?: string;
}

/** ERPNext count response */
export interface ErpCountResponse {
  count: number;
}

// ============================================
// RATE LIMITER
// ============================================

const MIN_REQUEST_INTERVAL_MS = 100; // 10 requests/sec max
let lastRequestTime = 0;

async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

// ============================================
// REQUEST LOGGING
// ============================================

function logRequest(method: string, url: string, body?: unknown): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[ERP] ${method} ${url}`, body ? JSON.stringify(body).slice(0, 500) : '');
  }
}

function logResponse(method: string, url: string, status: number, data?: unknown): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[ERP] ${method} ${url} → ${status}`, data ? JSON.stringify(data).slice(0, 500) : '');
  }
}

// ============================================
// HTTP CLIENT
// ============================================

/**
 * Map HTTP status codes to typed ErpError codes.
 * @param statusCode - HTTP status code
 * @param erpMessage - Error message from ERPNext response
 * @returns Typed ErpError instance
 */
function mapStatusToError(statusCode: number, erpMessage: string): ErpError {
  switch (statusCode) {
    case 401:
      return new ErpError('ERP_AUTH_FAILED', 'ERPNext authentication failed', statusCode, erpMessage);
    case 404:
      return new ErpError('ERP_NOT_FOUND', 'ERPNext resource not found', statusCode, erpMessage);
    case 417:
      return new ErpError('ERP_VALIDATION_ERROR', 'ERPNext validation error', statusCode, erpMessage);
    case 429:
      return new ErpError('ERP_RATE_LIMITED', 'ERPNext rate limit exceeded', statusCode, erpMessage);
    default:
      if (statusCode >= 500) {
        return new ErpError('ERP_SERVER_ERROR', 'ERPNext server error', statusCode, erpMessage);
      }
      return new ErpError('ERP_UNKNOWN_ERROR', `ERPNext error: ${erpMessage}`, statusCode, erpMessage);
  }
}

/**
 * Sleep for a given number of milliseconds.
 * @param ms - Milliseconds to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Options for ERPNext API requests */
export interface ErpRequestOptions {
  /** HTTP method */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  /** Request body (will be JSON-serialized) */
  body?: unknown;
  /** Query parameters */
  params?: Record<string, string>;
  /** Override number of retry attempts */
  maxRetries?: number;
  /** Override base delay for exponential backoff */
  retryDelayMs?: number;
}

/**
 * Make an authenticated request to the ERPNext REST API.
 * Handles auth, rate limiting, retries with exponential backoff, and error mapping.
 * Returns null when ERPNext is not configured (disabled mode).
 * @param path - API path (e.g., '/api/resource/Sales Order')
 * @param options - Request options
 * @returns Parsed JSON response or null if ERP is disabled
 * @throws ErpError on failure
 */
export async function erpRequest<T = unknown>(
  path: string,
  options: ErpRequestOptions = {},
): Promise<T | null> {
  if (!isErpEnabled()) {
    return null;
  }

  const config = getErpConfig();
  const {
    method = 'GET',
    body,
    params,
    maxRetries = config.maxRetries,
    retryDelayMs = config.retryDelayMs,
  } = options;

  // Build URL with query params
  const url = new URL(path, config.url);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `token ${config.apiKey}:${config.apiSecret}`,
  };

  let lastError: ErpError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Enforce rate limit
      await enforceRateLimit();

      logRequest(method, url.toString(), body);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

      const response = await fetch(url.toString(), {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseText = await response.text();
      let responseData: unknown;

      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      logResponse(method, url.toString(), response.status, responseData);

      // Handle error responses
      if (!response.ok) {
        const erpMessage =
          typeof responseData === 'object' && responseData !== null && 'message' in responseData
            ? String((responseData as { message: unknown }).message)
            : response.statusText;

        const error = mapStatusToError(response.status, erpMessage);

        // Don't retry auth errors or validation errors
        if (response.status === 401 || response.status === 417) {
          throw error;
        }

        // Don't retry 404s
        if (response.status === 404) {
          throw error;
        }

        lastError = error;

        // Rate limited — wait longer
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : retryDelayMs * Math.pow(2, attempt + 2);
          await sleep(waitMs);
          continue;
        }

        // Retry other server errors
        if (attempt < maxRetries) {
          await sleep(retryDelayMs * Math.pow(2, attempt));
          continue;
        }

        throw error;
      }

      return responseData as T;
    } catch (err: unknown) {
      if (err instanceof ErpError) {
        lastError = err;
        if (attempt < maxRetries && err.code !== 'ERP_AUTH_FAILED' && err.code !== 'ERP_VALIDATION_ERROR') {
          await sleep(retryDelayMs * Math.pow(2, attempt));
          continue;
        }
        throw err;
      }

      if (err instanceof DOMException && err.name === 'AbortError') {
        lastError = new ErpError('ERP_TIMEOUT', 'ERPNext request timed out', 0, err.message);
        if (attempt < maxRetries) {
          await sleep(retryDelayMs * Math.pow(2, attempt));
          continue;
        }
        throw lastError;
      }

      lastError = new ErpError(
        'ERP_NETWORK_ERROR',
        `Network error connecting to ERPNext: ${err instanceof Error ? err.message : String(err)}`,
        0,
        err instanceof Error ? err.message : String(err),
      );

      if (attempt < maxRetries) {
        await sleep(retryDelayMs * Math.pow(2, attempt));
        continue;
      }

      throw lastError;
    }
  }

  throw lastError ?? new ErpError('ERP_UNKNOWN_ERROR', 'Unknown ERPNext error after retries');
}

// ============================================
// CONVENIENCE METHODS
// ============================================

/**
 * GET a single ERPNext document by doctype and name.
 * @param doctype - ERPNext DocType (e.g., 'Sales Order')
 * @param name - Document name
 * @returns The document or null if ERP is disabled / not found
 */
export async function erpGetDoc<T = unknown>(doctype: string, name: string): Promise<T | null> {
  const encodedDoctype = encodeURIComponent(doctype);
  const encodedName = encodeURIComponent(name);
  const response = await erpRequest<ErpApiResponse<T>>(
    `/api/resource/${encodedDoctype}/${encodedName}`,
  );
  return response?.data ?? null;
}

/**
 * GET a list of ERPNext documents with optional filters.
 * @param doctype - ERPNext DocType
 * @param filters - Array of filter conditions
 * @param fields - Fields to return
 * @param limitStart - Pagination offset
 * @param limitPageLength - Page size
 * @returns Array of documents or empty array if ERP is disabled
 */
export async function erpGetList<T = unknown>(
  doctype: string,
  filters?: unknown[][],
  fields?: string[],
  limitStart = 0,
  limitPageLength = 20,
): Promise<T[]> {
  const params: Record<string, string> = {
    limit_start: String(limitStart),
    limit_page_length: String(limitPageLength),
  };

  if (filters) {
    params.filters = JSON.stringify(filters);
  }
  if (fields) {
    params.fields = JSON.stringify(fields);
  }

  const encodedDoctype = encodeURIComponent(doctype);
  const response = await erpRequest<ErpListResponse<T>>(
    `/api/resource/${encodedDoctype}`,
    { params },
  );
  return response?.data ?? [];
}

/**
 * CREATE a new ERPNext document.
 * @param doctype - ERPNext DocType
 * @param doc - Document data to create
 * @returns Created document or null if ERP is disabled
 */
export async function erpCreateDoc<T = unknown>(doctype: string, doc: Record<string, unknown>): Promise<T | null> {
  const encodedDoctype = encodeURIComponent(doctype);
  const response = await erpRequest<ErpApiResponse<T>>(
    `/api/resource/${encodedDoctype}`,
    {
      method: 'POST',
      body: doc,
    },
  );
  return response?.data ?? null;
}

/**
 * UPDATE an existing ERPNext document.
 * @param doctype - ERPNext DocType
 * @param name - Document name
 * @param doc - Fields to update
 * @returns Updated document or null if ERP is disabled
 */
export async function erpUpdateDoc<T = unknown>(
  doctype: string,
  name: string,
  doc: Record<string, unknown>,
): Promise<T | null> {
  const encodedDoctype = encodeURIComponent(doctype);
  const encodedName = encodeURIComponent(name);
  const response = await erpRequest<ErpApiResponse<T>>(
    `/api/resource/${encodedDoctype}/${encodedName}`,
    {
      method: 'PUT',
      body: doc,
    },
  );
  return response?.data ?? null;
}

/**
 * DELETE an ERPNext document.
 * @param doctype - ERPNext DocType
 * @param name - Document name
 * @returns true if deleted, null if ERP is disabled
 */
export async function erpDeleteDoc(doctype: string, name: string): Promise<boolean | null> {
  const encodedDoctype = encodeURIComponent(doctype);
  const encodedName = encodeURIComponent(name);
  const response = await erpRequest<{ message: string }>(
    `/api/resource/${encodedDoctype}/${encodedName}`,
    { method: 'DELETE' },
  );
  return response ? true : null;
}

/**
 * Call an ERPNext whitelisted method (RPC).
 * @param method - Full method path (e.g., 'frappe.client.get_count')
 * @param args - Method arguments
 * @returns Method result or null if ERP is disabled
 */
export async function erpCallMethod<T = unknown>(
  method: string,
  args?: Record<string, unknown>,
): Promise<T | null> {
  const response = await erpRequest<{ message: T }>(
    '/api/method/' + method,
    {
      method: 'POST',
      body: { args: args ?? {} },
    },
  );
  return response?.message ?? null;
}

/**
 * Get the count of documents matching filters.
 * @param doctype - ERPNext DocType
 * @param filters - Array of filter conditions
 * @returns Count or null if ERP is disabled
 */
export async function erpGetCount(doctype: string, filters?: unknown[][]): Promise<number | null> {
  const result = await erpCallMethod<number>('frappe.client.get_count', {
    doctype,
    filters: filters ?? [],
  });
  return result;
}
