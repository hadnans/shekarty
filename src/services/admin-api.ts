// GGH — Gomla Go Home (جملة لحد البيت)
// Admin API Service Layer — BFF client for admin backend communication

import {
  type Lang,
  type Piastres,
  type Product,
  type Category,
  type Deal,
  type Order,
  type CustomerProfile,
  type ApiResponse,
  type PaginatedResponse,
  type AdminUser,
  type AdminSubView,
  type DashboardStats,
  type RevenueDataPoint,
  type PriceRule,
  type BulkImportJob,
  type Role,
  type Permission,
  type AdminSettings,
  type AdminAuthResponse,
  type DeliveryZone,
  type LoyaltyProgram,
} from '@/types/ggh';

const ADMIN_API_BASE = '/api/admin';

class AdminApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = ADMIN_API_BASE) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: 'Network error',
        statusCode: response.status,
      }));
      throw new Error(error.error || `Request failed: ${response.status}`);
    }

    return response.json();
  }

  private buildQuery(params?: Record<string, string | number | boolean | undefined>): string {
    if (!params) return '';
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.set(key, String(value));
      }
    });
    const query = searchParams.toString();
    return query ? `?${query}` : '';
  }

  // ============================================
  // AUTH
  // ============================================

  async adminLogin(email: string, password: string): Promise<AdminAuthResponse> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async adminLogout(): Promise<ApiResponse<{ message: string }>> {
    return this.request('/auth/logout', { method: 'POST' });
  }

  async adminSession(): Promise<ApiResponse<{ authenticated: boolean; admin?: AdminUser }>> {
    return this.request('/auth/session');
  }

  // ============================================
  // DASHBOARD
  // ============================================

  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    return this.request('/dashboard/stats');
  }

  // ============================================
  // PRODUCTS
  // ============================================

  async getProducts(params?: {
    categoryId?: string;
    search?: string;
    sort?: string;
    page?: number;
    limit?: number;
    featured?: boolean;
    deals?: boolean;
    isActive?: boolean;
  }): Promise<PaginatedResponse<Product>> {
    return this.request(`/products${this.buildQuery(params)}`);
  }

  async createProduct(data: Partial<Product> & { nameEn: string; nameAr: string; todayPrice: Piastres; categoryId: string }): Promise<ApiResponse<Product>> {
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProduct(id: string, data: Partial<Product>): Promise<ApiResponse<Product>> {
    return this.request(`/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteProduct(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/products/${id}`, { method: 'DELETE' });
  }

  // ============================================
  // CATEGORIES
  // ============================================

  async getCategories(): Promise<ApiResponse<Category[]>> {
    return this.request('/categories');
  }

  async createCategory(data: Partial<Category> & { nameEn: string; nameAr: string; slug: string }): Promise<ApiResponse<Category>> {
    return this.request('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCategory(id: string, data: Partial<Category>): Promise<ApiResponse<Category>> {
    return this.request(`/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteCategory(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/categories/${id}`, { method: 'DELETE' });
  }

  // ============================================
  // DEALS
  // ============================================

  async getDeals(params?: {
    page?: number;
    limit?: number;
    isActive?: boolean;
  }): Promise<PaginatedResponse<Deal>> {
    return this.request(`/deals${this.buildQuery(params)}`);
  }

  async createDeal(data: Partial<Deal> & { productId: string; dealPrice: Piastres; originalPrice: Piastres; endsAt: string }): Promise<ApiResponse<Deal>> {
    return this.request('/deals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDeal(id: string, data: Partial<Deal>): Promise<ApiResponse<Deal>> {
    return this.request(`/deals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteDeal(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/deals/${id}`, { method: 'DELETE' });
  }

  // ============================================
  // INVENTORY
  // ============================================

  async getInventory(params?: {
    page?: number;
    limit?: number;
    lowStock?: boolean;
    categoryId?: string;
  }): Promise<PaginatedResponse<Product>> {
    return this.request(`/inventory${this.buildQuery(params)}`);
  }

  async adjustStock(data: { productId: string; adjustment: number; reason: string }): Promise<ApiResponse<Product>> {
    return this.request('/inventory/adjust', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ============================================
  // PRICE RULES
  // ============================================

  async getPriceRules(params?: {
    page?: number;
    limit?: number;
    isActive?: boolean;
    type?: string;
  }): Promise<PaginatedResponse<PriceRule>> {
    return this.request(`/price-rules${this.buildQuery(params)}`);
  }

  async createPriceRule(data: Partial<PriceRule> & { nameEn: string; nameAr: string; type: string; value: number }): Promise<ApiResponse<PriceRule>> {
    return this.request('/price-rules', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePriceRule(id: string, data: Partial<PriceRule>): Promise<ApiResponse<PriceRule>> {
    return this.request(`/price-rules/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deletePriceRule(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/price-rules/${id}`, { method: 'DELETE' });
  }

  // ============================================
  // BULK IMPORT / EXPORT
  // ============================================

  async bulkImport(data: { type: string; file: File }): Promise<ApiResponse<BulkImportJob>> {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('type', data.type);

    return this.request(`/bulk/import`, {
      method: 'POST',
      headers: {}, // Let FormData set Content-Type automatically
      body: formData,
    });
  }

  async bulkExport(type: string): Promise<ApiResponse<{ downloadUrl: string }>> {
    return this.request(`/bulk/export?type=${encodeURIComponent(type)}`);
  }

  async getImportJob(jobId: string): Promise<ApiResponse<BulkImportJob>> {
    return this.request(`/bulk/import/${jobId}`);
  }

  // ============================================
  // ORDERS
  // ============================================

  async getOrders(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    sort?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<PaginatedResponse<Order>> {
    return this.request(`/orders${this.buildQuery(params)}`);
  }

  async getOrder(id: string): Promise<ApiResponse<Order>> {
    return this.request(`/orders/${id}`);
  }

  async updateOrderStatus(id: string, data: { status: string; note?: string }): Promise<ApiResponse<Order>> {
    return this.request(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async cancelOrder(id: string): Promise<ApiResponse<Order>> {
    return this.request(`/orders/${id}/cancel`, { method: 'POST' });
  }

  async refundOrder(id: string, data: { amount?: Piastres; reason: string }): Promise<ApiResponse<Order>> {
    return this.request(`/orders/${id}/refund`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ============================================
  // CUSTOMERS
  // ============================================

  async getCustomers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    wholesaleStatus?: string;
    sort?: string;
  }): Promise<PaginatedResponse<CustomerProfile>> {
    return this.request(`/customers${this.buildQuery(params)}`);
  }

  async getCustomer(id: string): Promise<ApiResponse<CustomerProfile>> {
    return this.request(`/customers/${id}`);
  }

  async updateCustomer(id: string, data: Partial<CustomerProfile>): Promise<ApiResponse<CustomerProfile>> {
    return this.request(`/customers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // ============================================
  // DELIVERY
  // ============================================

  async getDeliveryOverview(): Promise<ApiResponse<{ zones: DeliveryZone[]; driversCount: number; activeDeliveries: number }>> {
    return this.request('/delivery/overview');
  }

  async getZones(): Promise<ApiResponse<DeliveryZone[]>> {
    return this.request('/delivery/zones');
  }

  async getDrivers(): Promise<ApiResponse<{ id: string; nameEn: string; nameAr: string; phone: string; isActive: boolean; currentDeliveries: number }[]>> {
    return this.request('/delivery/drivers');
  }

  async createDriver(data: { nameEn: string; nameAr: string; phone: string; zoneId: string }): Promise<ApiResponse<{ id: string; nameEn: string; nameAr: string; phone: string; isActive: boolean }>> {
    return this.request('/delivery/drivers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ============================================
  // ANALYTICS
  // ============================================

  async getRevenue(params?: {
    period?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<ApiResponse<RevenueDataPoint[]>> {
    return this.request(`/analytics/revenue${this.buildQuery(params)}`);
  }

  async getProductAnalytics(params?: {
    period?: string;
    categoryId?: string;
    sort?: string;
    limit?: number;
  }): Promise<ApiResponse<{ products: Product[]; metrics: { totalSold: number; totalRevenue: Piastres } }>> {
    return this.request(`/analytics/products${this.buildQuery(params)}`);
  }

  async getCustomerAnalytics(params?: {
    period?: string;
    segment?: string;
  }): Promise<ApiResponse<{ totalCustomers: number; newCustomers: number; repeatRate: number; avgOrderValue: Piastres }>> {
    return this.request(`/analytics/customers${this.buildQuery(params)}`);
  }

  // ============================================
  // SETTINGS
  // ============================================

  async getSettings(): Promise<ApiResponse<AdminSettings>> {
    return this.request('/settings');
  }

  async updateSettings(data: Partial<AdminSettings>): Promise<ApiResponse<AdminSettings>> {
    return this.request('/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // ============================================
  // RBAC — ROLES & PERMISSIONS
  // ============================================

  async getRoles(): Promise<ApiResponse<Role[]>> {
    return this.request('/rbac/roles');
  }

  async createRole(data: Partial<Role> & { name: string; nameEn: string; nameAr: string }): Promise<ApiResponse<Role>> {
    return this.request('/rbac/roles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPermissions(): Promise<ApiResponse<Permission[]>> {
    return this.request('/rbac/permissions');
  }

  async getAdminUsers(): Promise<ApiResponse<AdminUser[]>> {
    return this.request('/rbac/admins');
  }

  async createAdminUser(data: { email: string; nameEn: string; nameAr: string; phone: string; roleIds: string[] }): Promise<ApiResponse<AdminUser>> {
    return this.request('/rbac/admins', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ============================================
  // LOYALTY PROGRAMS
  // ============================================

  async getLoyaltyPrograms(params?: {
    page?: number;
    limit?: number;
    isActive?: boolean;
    type?: string;
  }): Promise<PaginatedResponse<LoyaltyProgram>> {
    return this.request(`/loyalty/programs${this.buildQuery(params)}`);
  }

  async createLoyaltyProgram(data: Record<string, unknown>): Promise<ApiResponse<LoyaltyProgram>> {
    return this.request('/loyalty/programs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateLoyaltyProgram(id: string, data: Record<string, unknown>): Promise<ApiResponse<LoyaltyProgram>> {
    return this.request(`/loyalty/programs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteLoyaltyProgram(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/loyalty/programs/${id}`, { method: 'DELETE' });
  }

  async getLoyaltyTransactions(params?: {
    customerId?: string;
    programId?: string;
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Record<string, unknown>>> {
    return this.request(`/loyalty/transactions${this.buildQuery(params)}`);
  }

  // ============================================
  // SEED
  // ============================================

  async seedAdmin(): Promise<ApiResponse<{ message: string; admin: AdminUser }>> {
    return this.request('/seed', { method: 'POST' });
  }
}

export const adminApi = new AdminApiClient();
