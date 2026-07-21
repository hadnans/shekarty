// GGH — Structured Logging System
// Pretty-print in development, JSON structured logs in production
// Supports trace IDs, user context, and timing helpers

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  traceId?: string;
  userId?: string;
  duration?: number;
  meta?: Record<string, unknown>;
}

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m', // cyan
  info: '\x1b[32m',  // green
  warn: '\x1b[33m',  // yellow
  error: '\x1b[31m', // red
};

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const RESET = '\x1b[0m';

const isDevelopment = process.env.NODE_ENV !== 'production';

/** Minimum log level based on environment */
const minLevel: LogLevel = isDevelopment ? 'debug' : 'info';

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[minLevel];
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function prettyFormat(entry: LogEntry): string {
  const color = LEVEL_COLORS[entry.level];
  const levelStr = entry.level.toUpperCase().padEnd(5);
  const parts: string[] = [];

  parts.push(`\x1b[90m${entry.timestamp}\x1b[0m`);
  parts.push(`${color}[${levelStr}]\x1b[0m`);
  parts.push(`\x1b[1m${entry.service}\x1b[0m`);

  if (entry.traceId) {
    parts.push(`\x1b[35mtrace:${entry.traceId}\x1b[0m`);
  }
  if (entry.userId) {
    parts.push(`\x1b[34muser:${entry.userId}\x1b[0m`);
  }

  parts.push(entry.message);

  if (entry.duration !== undefined) {
    parts.push(`\x1b[90m(${entry.duration}ms)\x1b[0m`);
  }

  if (entry.meta && Object.keys(entry.meta).length > 0) {
    parts.push(`\x1b[90m${JSON.stringify(entry.meta)}\x1b[0m`);
  }

  return parts.join(' ');
}

class Logger {
  private service: string;
  private contextTraceId?: string;
  private contextUserId?: string;

  constructor(service: string, context?: { userId?: string; traceId?: string }) {
    this.service = service;
    this.contextTraceId = context?.traceId;
    this.contextUserId = context?.userId;
  }

  private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    if (!shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: formatTimestamp(),
      level,
      message,
      service: this.service,
      ...(this.contextTraceId && { traceId: this.contextTraceId }),
      ...(this.contextUserId && { userId: this.contextUserId }),
      ...(meta && Object.keys(meta).length > 0 && { meta }),
    };

    if (isDevelopment) {
      const output = prettyFormat(entry);
      if (level === 'error') {
        console.error(output);
      } else if (level === 'warn') {
        console.warn(output);
      } else {
        console.log(output);
      }
    } else {
      // Production: JSON structured logs
      console.log(JSON.stringify(entry));
    }
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.log('debug', message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log('warn', message, meta);
  }

  error(message: string, error?: Error | unknown, meta?: Record<string, unknown>): void {
    const errorMeta: Record<string, unknown> = { ...meta };
    if (error instanceof Error) {
      errorMeta.errorName = error.name;
      errorMeta.errorMessage = error.message;
      errorMeta.stack = error.stack;
    } else if (error !== undefined) {
      errorMeta.error = String(error);
    }
    this.log('error', message, errorMeta);
  }

  /** Create a child logger with additional context (trace ID, user ID) */
  withContext(ctx: { userId?: string; traceId?: string }): Logger {
    return new Logger(this.service, {
      traceId: ctx.traceId ?? this.contextTraceId,
      userId: ctx.userId ?? this.contextUserId,
    });
  }

  /** Create a timing helper — call end() to log the duration */
  timer(): { end: (label: string) => void } {
    const start = Date.now();
    return {
      end: (label: string) => {
        const duration = Date.now() - start;
        this.log('info', label, { duration });
      },
    };
  }
}

/**
 * Create a logger instance for a named service.
 * @param serviceName - Identifies the service/module in log entries
 * @returns Logger instance
 */
export function createLogger(serviceName: string): Logger {
  return new Logger(serviceName);
}
