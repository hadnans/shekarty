// GGH — Enhanced Health Check Endpoint
// Checks database connectivity, ERP status, and memory usage

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isErpEnabled } from '@/lib/erp/config';
import { createLogger } from '@/lib/logger';

const logger = createLogger('health');

const VERSION = '1.0.0';
const startTime = Date.now();

interface HealthCheck {
  status: 'up' | 'down' | 'disabled';
  responseTime?: number;
  error?: string;
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: HealthCheck;
    erp: HealthCheck;
  };
  memory: {
    used: number;
    total: number;
    rss: number;
    heapUsed: number;
    heapTotal: number;
  };
}

async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    // Simple query to verify database connectivity
    await db.$queryRaw`SELECT 1`;
    return {
      status: 'up',
      responseTime: Date.now() - start,
    };
  } catch (error) {
    logger.error('Database health check failed', error);
    return {
      status: 'down',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkErp(): Promise<HealthCheck> {
  const start = Date.now();

  if (!isErpEnabled()) {
    return { status: 'disabled' };
  }

  try {
    // Attempt a simple ERP health check
    const erpUrl = process.env.ERP_NEXT_URL;
    if (!erpUrl) {
      return { status: 'disabled' };
    }

    const response = await fetch(`${erpUrl}/api/method/ping`, {
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    if (response.ok) {
      return {
        status: 'up',
        responseTime: Date.now() - start,
      };
    }

    return {
      status: 'down',
      responseTime: Date.now() - start,
      error: `ERP returned ${response.status}`,
    };
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

export async function GET() {
  try {
    const [dbCheck, erpCheck] = await Promise.all([
      checkDatabase(),
      checkErp(),
    ]);

    const mem = process.memoryUsage();

    // Determine overall status
    let status: HealthResponse['status'] = 'healthy';
    if (dbCheck.status === 'down') {
      status = 'unhealthy';
    } else if (erpCheck.status === 'down') {
      status = 'degraded';
    }

    const response: HealthResponse = {
      status,
      timestamp: new Date().toISOString(),
      version: VERSION,
      uptime: Date.now() - startTime,
      checks: {
        database: dbCheck,
        erp: erpCheck,
      },
      memory: {
        used: mem.heapUsed,
        total: mem.heapTotal,
        rss: mem.rss,
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
      },
    };

    const httpStatus = status === 'unhealthy' ? 503 : 200;

    return NextResponse.json(response, { status: httpStatus });
  } catch (error) {
    logger.error('Health check error', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        version: VERSION,
        uptime: Date.now() - startTime,
        error: 'Health check failed',
      },
      { status: 503 }
    );
  }
}
