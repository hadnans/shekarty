/**
 * SVG Placeholder Thumbnail Generator
 *
 * Generates inline SVG data URIs for product thumbnails.
 * Used as fallback when actual product images are not available.
 * Follows the GGH design system colors and typography.
 */

import { type BilingualText } from '@/types/ggh';

/** GGH Design System Colors */
const COLORS = {
  primary: '#1B5E20',
  primaryLight: '#2E7D32',
  accent: '#E65100',
  surface: '#F5F5F5',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
  white: '#FFFFFF',
} as const;

/** Category color mappings for visual variety */
const CATEGORY_COLORS: Record<string, { bg: string; fg: string }> = {
  rice: { bg: '#FFF8E1', fg: '#F57F17' },
  pasta: { bg: '#FFF3E0', fg: '#E65100' },
  tomato: { bg: '#FFEBEE', fg: '#C62828' },
  oil: { bg: '#F1F8E9', fg: '#33691E' },
  sugar: { bg: '#FCE4EC', fg: '#AD1457' },
  flour: { bg: '#FFFDE7', fg: '#F9A825' },
  beans: { bg: '#EFEBE9', fg: '#4E342E' },
  tea: { bg: '#E8F5E9', fg: '#1B5E20' },
  coffee: { bg: '#EFEBE9', fg: '#3E2723' },
  cleaning: { bg: '#E3F2FD', fg: '#1565C0' },
};

interface ThumbnailOptions {
  width?: number;
  height?: number;
  emoji?: string;
  name?: BilingualText;
  categoryId?: string;
  lang?: 'en' | 'ar';
}

/**
 * Generate an SVG placeholder thumbnail as a data URI
 * Suitable for use in <img src="..." /> or CSS background-image
 */
export function generatePlaceholderThumbnail(options: ThumbnailOptions): string {
  const {
    width = 200,
    height = 200,
    emoji = '📦',
    name,
    categoryId,
    lang = 'en',
  } = options;

  const colors = (categoryId && CATEGORY_COLORS[categoryId])
    ? CATEGORY_COLORS[categoryId]
    : { bg: COLORS.surface, fg: COLORS.textSecondary };

  const displayName = name
    ? (lang === 'ar' ? name.ar : name.en)
    : '';

  // Truncate long names for SVG rendering
  const truncatedName = displayName.length > 15
    ? displayName.slice(0, 14) + '…'
    : displayName;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${colors.bg}" rx="8" ry="8"/>
  <rect x="1" y="1" width="${width - 2}" height="${height - 2}" fill="none" stroke="${COLORS.border}" stroke-width="1" rx="7" ry="7"/>
  <text x="${width / 2}" y="${height / 2 - 10}" text-anchor="middle" font-size="48" dominant-baseline="middle">${emoji}</text>
  ${truncatedName ? `<text x="${width / 2}" y="${height - 25}" text-anchor="middle" font-size="12" fill="${colors.fg}" font-family="sans-serif" font-weight="600">${escapeXml(truncatedName)}</text>` : ''}
</svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Generate a simple colored placeholder with just a category initial
 */
export function generateCategoryThumbnail(categoryId: string, name: BilingualText, lang: 'en' | 'ar'): string {
  const colors = CATEGORY_COLORS[categoryId] || { bg: COLORS.surface, fg: COLORS.textSecondary };
  const displayName = lang === 'ar' ? name.ar : name.en;
  const initial = displayName.charAt(0);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <rect width="96" height="96" fill="${colors.bg}" rx="48" ry="48"/>
  <text x="48" y="48" text-anchor="middle" dominant-baseline="central" font-size="36" fill="${colors.fg}" font-weight="700" font-family="sans-serif">${escapeXml(initial)}</text>
</svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Generate a placeholder for a deal badge
 */
export function generateDealBadge(discount: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
  <rect width="48" height="48" fill="${COLORS.accent}" rx="24" ry="24"/>
  <text x="24" y="28" text-anchor="middle" font-size="13" fill="${COLORS.white}" font-weight="700" font-family="sans-serif">-${discount}%</text>
</svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Escape special XML characters for safe SVG embedding
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Image optimization configuration for Next.js Image component
 * These values should be used when wrapping product images with next/image
 */
export const IMAGE_CONFIG = {
  /** Product card thumbnail size */
  THUMBNAIL: { width: 200, height: 200 } as const,
  /** Hero banner image size */
  HERO: { width: 1200, height: 600 } as const,
  /** Category icon size */
  CATEGORY_ICON: { width: 96, height: 96 } as const,
  /** Deal card image size */
  DEAL_CARD: { width: 260, height: 200 } as const,
  /** Placeholder quality (1-100) */
  PLACEHOLDER_QUALITY: 75,
} as const;

/**
 * Generate lazy loading attributes for images
 * Following elder-friendly UX: load images eagerly above the fold,
 * lazy-load below the fold
 */
export function getLazyLoadingProps(isAboveFold: boolean): {
  loading: 'eager' | 'lazy';
  fetchPriority: 'high' | 'low';
} {
  return {
    loading: isAboveFold ? 'eager' : 'lazy',
    fetchPriority: isAboveFold ? 'high' : 'low',
  };
}
