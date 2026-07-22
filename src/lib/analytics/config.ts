// GGH Analytics — Configuration
// Default settings and constants for the analytics system

/** Default period for analytics queries */
export const DEFAULT_ANALYTICS_PERIOD = 'month';

/** Valid analytics periods */
export const ANALYTICS_PERIODS = [
  'today',
  'week',
  'month',
  'quarter',
  'year',
] as const;

export type AnalyticsPeriod = (typeof ANALYTICS_PERIODS)[number];

/** Valid granularity for revenue over-time queries */
export const REVENUE_GRANULARITIES = [
  'daily',
  'weekly',
  'monthly',
] as const;

export type RevenueGranularity = (typeof REVENUE_GRANULARITIES)[number];

/** Top products limit */
export const DEFAULT_TOP_PRODUCTS_LIMIT = 10;

/** Low stock threshold override for analytics display */
export const LOW_STOCK_ANALYTICS_THRESHOLD = 10;

/** Delivery SLA in minutes (target delivery time) */
export const DELIVERY_SLA_MINUTES = 120;

/** Failed delivery rate threshold (percentage) for SLA warning */
export const FAILED_DELIVERY_THRESHOLD_PERCENT = 5;
