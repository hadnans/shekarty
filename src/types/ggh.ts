// GGH — Gomla Go Home (جملة لحد البيت)
// Shared TypeScript types — Branded types, domain interfaces, API contracts

// ============================================
// BRANDED TYPES — Prevent accidental ID mixing
// ============================================

type Brand<T, B> = T & { __brand: B };

export type CustomerId = Brand<string, 'CustomerId'>;
export type ProductId = Brand<string, 'ProductId'>;
export type CategoryId = Brand<string, 'CategoryId'>;
export type OrderId = Brand<string, 'OrderId'>;
export type AddressId = Brand<string, 'AddressId'>;

// ============================================
// MONEY — All monetary values in integer piastres
// EGP 14.50 = 1450 piastres
// ============================================

export type Piastres = Brand<number, 'Piastres'>;

export function toPiastres(egp: number): Piastres {
  return Math.round(egp * 100) as Piastres;
}

export function fromPiastres(piastres: Piastres): number {
  return piastres / 100;
}

export function formatPrice(piastres: Piastres): string {
  const egp = fromPiastres(piastres);
  return egp.toLocaleString('en-EG', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function formatPriceWithCurrency(piastres: Piastres, lang: 'en' | 'ar' = 'en'): string {
  const formatted = formatPrice(piastres);
  return lang === 'ar' ? `${formatted} ج.م` : `EGP ${formatted}`;
}

export function calcDiscountPercent(today: Piastres, yesterday: Piastres): number {
  if (yesterday <= 0) return 0;
  return Math.round(((yesterday - today) / yesterday) * 100);
}

export function multiplyPiastres(piastres: Piastres, multiplier: number): Piastres {
  return (piastres * multiplier) as Piastres;
}

export function sumPiastres(...values: Piastres[]): Piastres {
  return values.reduce((sum, v) => (sum + v) as Piastres, 0 as Piastres);
}

/**
 * Calculate savings in piastres
 */
export function calcSavings(today: Piastres, yesterday: Piastres): Piastres {
  return (yesterday - today) as Piastres;
}

/**
 * Check if a price represents free (0 piastres)
 */
export function isFree(piastres: Piastres): boolean {
  return piastres === 0;
}

/**
 * Convert EGP number to piastres (alias for toPiastres)
 */
export function egpToPiastres(egp: number): Piastres {
  return Math.round(egp * 100) as Piastres;
}

/**
 * Convert piastres to EGP number (alias for fromPiastres)
 */
export function piastresToEgp(piastres: Piastres): number {
  return piastres / 100;
}

// ============================================
// BILINGUAL TEXT
// ============================================

export interface BilingualText {
  en: string;
  ar: string;
}

export type Lang = 'en' | 'ar';

export function getBilingualText(text: BilingualText, lang: Lang): string {
  return lang === 'ar' ? text.ar : text.en;
}

// ============================================
// AUTH TYPES
// ============================================

export interface CustomerProfile {
  id: string;
  phone: string;
  firstName: string;
  lastName: string;
  nameAr: string;
  preferredLang: Lang;
  wholesaleStatus: 'retail' | 'wholesale' | 'vip';
  isVerified: boolean;
}

export interface OtpRequest {
  phone: string;
}

export interface OtpVerify {
  phone: string;
  code: string;
}

export interface AuthResponse {
  success: boolean;
  isNew: boolean;
  customer: CustomerProfile;
  token: string;
}

// ============================================
// PRODUCT TYPES
// ============================================

export interface Product {
  id: string;
  handle: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  brandEn: string;
  brandAr: string;
  weight: string;
  unit: string;
  todayPrice: Piastres;
  yesterdayPrice: Piastres | null;
  wholesalePrice: Piastres | null;
  rating: number;
  reviewCount: number;
  totalSold: number;
  stock: number;
  lowStockThreshold: number;
  icon: string;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  isActive: boolean;
  isFeatured: boolean;
  isDeal: boolean;
  dealEndsAt: string | null;
  maxPerOrder: number;
  minOrderQty: number;
  categoryId: string;
}

export interface Category {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  icon: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
  parentId: string | null;
  productCount?: number;
}

export interface Deal {
  id: string;
  productId: string;
  product: Product;
  dealPrice: Piastres;
  originalPrice: Piastres;
  discountPercent: number;
  endsAt: string;
  maxQuantity: number;
  claimedCount: number;
  isActive: boolean;
}

// ============================================
// CART TYPES
// ============================================

export interface CartItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  unitPrice: Piastres;
}

export interface CartSummary {
  items: CartItem[];
  subtotal: Piastres;
  deliveryFee: Piastres;
  discountAmount: Piastres;
  totalAmount: Piastres;
  itemCount: number;
}

// ============================================
// ORDER TYPES
// ============================================

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'packed'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export type PaymentMethod = 'cod' | 'card' | 'wallet';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  subtotal: Piastres;
  deliveryFee: Piastres;
  discountAmount: Piastres;
  totalAmount: Piastres;
  notes: string;
  deliveryAddressSnapshot: string;
  deliverySlot: string;
  deliveryDate: string | null;
  deliveredAt: string | null;
  driverName: string;
  driverPhone: string;
  items: OrderItem[];
  statusHistory: OrderStatusHistory[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productNameEn: string;
  productNameAr: string;
  brandEn: string;
  brandAr: string;
  weight: string;
  icon: string;
  quantity: number;
  unitPrice: Piastres;
  totalPrice: Piastres;
}

export interface OrderStatusHistory {
  id: string;
  status: OrderStatus;
  note: string;
  changedBy: string;
  createdAt: string;
}

// ============================================
// ADDRESS TYPES
// ============================================

export interface Address {
  id: string;
  customerId: string;
  label: 'home' | 'work' | 'other';
  addressLine1: string;
  addressLine2: string;
  city: string;
  area: string;
  buildingNo: string;
  floorNo: string;
  apartmentNo: string;
  landmark: string;
  latitude: number | null;
  longitude: number | null;
  deliveryZone: string;
  isDefault: boolean;
  deliveryInstructions: string;
}

// ============================================
// DELIVERY TYPES
// ============================================

export interface DeliveryZone {
  id: string;
  nameEn: string;
  nameAr: string;
  area: string;
  city: string;
  deliveryFee: Piastres;
  minOrder: Piastres;
  estimatedHours: number;
  isActive: boolean;
}

export interface DeliverySlot {
  id: string;
  labelEn: string;
  labelAr: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

// ============================================
// NOTIFICATION TYPES
// ============================================

export interface GghNotification {
  id: string;
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
  type: 'info' | 'order' | 'deal' | 'system';
  isRead: boolean;
  actionUrl: string | null;
  createdAt: string;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
  code: string;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// CHECKOUT TYPES
// ============================================

export interface CheckoutData {
  addressId: string;
  deliverySlot: string;
  deliveryDate: string;
  paymentMethod: PaymentMethod;
  notes: string;
}

export interface CheckoutResponse {
  success: boolean;
  order: Order;
}

// ============================================
// SEARCH TYPES
// ============================================

export interface SearchResult {
  products: Product[];
  categories: Category[];
  totalProducts: number;
  totalCategories: number;
}
