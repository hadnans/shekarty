// GGH — Input Validation with Zod
// Reusable schemas for all API inputs

import { z } from 'zod';

// ============================================
// AUTH VALIDATION
// ============================================

/** Egyptian phone number validation */
export const phoneSchema = z.string().regex(
  /^(\+20|20|0)?1[0-9]{9}$/,
  'Invalid Egyptian phone number'
);

/** 4-digit OTP code */
export const otpSchema = z.string().length(4, 'OTP must be 4 digits').regex(/^\d{4}$/, 'OTP must be numeric');

/** Send OTP request */
export const sendOtpSchema = z.object({
  phone: phoneSchema,
});

/** Verify OTP request */
export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  code: otpSchema,
});

// ============================================
// PAGINATION
// ============================================

/** Pagination query parameters */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ============================================
// ADDRESS
// ============================================

/** Address creation/update schema */
export const addressSchema = z.object({
  label: z.enum(['home', 'work', 'other']),
  addressLine1: z.string().min(5, 'Address must be at least 5 characters').max(200),
  addressLine2: z.string().max(200).optional(),
  city: z.string().min(2).max(100),
  area: z.string().min(2).max(100),
  buildingNo: z.string().max(20),
  floorNo: z.string().max(20),
  apartmentNo: z.string().max(20),
  landmark: z.string().max(200).optional(),
  deliveryZone: z.string().optional(),
  deliveryInstructions: z.string().max(500).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isDefault: z.boolean().optional(),
});

// ============================================
// CHECKOUT
// ============================================

/** Checkout request schema */
export const checkoutSchema = z.object({
  addressId: z.string().min(1, 'Address ID is required'),
  deliverySlot: z.string().min(1, 'Delivery slot is required'),
  deliveryDate: z.string().min(1, 'Delivery date is required'),
  paymentMethod: z.enum(['cod', 'card', 'wallet']),
  notes: z.string().max(500).optional(),
});

// ============================================
// CART
// ============================================

/** Cart item schema */
export const cartItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().int().positive().max(99, 'Maximum 99 items per product'),
});

/** Update cart item quantity */
export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(0).max(99, 'Maximum 99 items per product'),
});

// ============================================
// CUSTOMER PROFILE
// ============================================

/** Profile update schema */
export const profileUpdateSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  nameAr: z.string().max(100).optional(),
  preferredLang: z.enum(['en', 'ar']).optional(),
});

// ============================================
// SEARCH
// ============================================

/** Search query parameters */
export const searchSchema = z.object({
  q: z.string().min(2, 'Search query must be at least 2 characters').max(200),
  lang: z.enum(['en', 'ar']).optional(),
});

// ============================================
// PRODUCTS
// ============================================

/** Product list query parameters */
export const productListSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  categoryId: z.string().optional(),
  search: z.string().optional(),
  sort: z.enum(['popular', 'price_asc', 'price_desc', 'newest', 'rating']).default('popular'),
  featured: z.enum(['true', 'false']).optional(),
  deals: z.enum(['true', 'false']).optional(),
});
