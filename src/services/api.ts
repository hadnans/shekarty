// GGH — Gomla Go Home (جملة لحد البيت)
// API Service Layer — BFF client for all backend communication

import { type Lang, type Piastres, type Product, type Category, type Order, type Address, type AuthResponse, type ApiResponse, type PaginatedResponse, type DeliveryZone, type DeliverySlot, type CheckoutData, type CartSummary, type CustomerProfile, type SearchResult } from '@/types/ggh';

const API_BASE = '/api';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE) {
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

  // ============================================
  // AUTH
  // ============================================

  async sendOtp(phone: string): Promise<ApiResponse<{ message: string }>> {
    return this.request('/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  async verifyOtp(phone: string, code: string): Promise<AuthResponse> {
    return this.request('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    });
  }

  async getSession(): Promise<ApiResponse<{ authenticated: boolean; customer?: unknown }>> {
    return this.request('/auth/session');
  }

  async logout(): Promise<ApiResponse<{ message: string }>> {
    return this.request('/auth/logout', { method: 'POST' });
  }

  // ============================================
  // PRODUCTS & CATEGORIES
  // ============================================

  async getProducts(params?: {
    categoryId?: string;
    search?: string;
    sort?: string;
    page?: number;
    limit?: number;
    featured?: boolean;
    deals?: boolean;
  }): Promise<PaginatedResponse<Product>> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.set(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return this.request(`/products${query ? `?${query}` : ''}`);
  }

  async getProduct(handle: string): Promise<ApiResponse<Product>> {
    return this.request(`/products/${handle}`);
  }

  async getCategories(): Promise<ApiResponse<Category[]>> {
    return this.request('/categories');
  }

  async getCategory(slug: string): Promise<ApiResponse<Category & { products: Product[] }>> {
    return this.request(`/categories/${slug}`);
  }

  // ============================================
  // DEALS
  // ============================================

  async getDeals(): Promise<ApiResponse<Product[]>> {
    return this.request('/deals');
  }

  // ============================================
  // CART
  // ============================================

  async getCart(): Promise<ApiResponse<CartSummary>> {
    return this.request('/cart');
  }

  async addToCart(productId: string, quantity: number = 1): Promise<ApiResponse<CartSummary>> {
    return this.request('/cart/items', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity }),
    });
  }

  async updateCartItem(itemId: string, quantity: number): Promise<ApiResponse<CartSummary>> {
    return this.request(`/cart/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    });
  }

  async removeCartItem(itemId: string): Promise<ApiResponse<CartSummary>> {
    return this.request(`/cart/items/${itemId}`, { method: 'DELETE' });
  }

  // ============================================
  // CHECKOUT & ORDERS
  // ============================================

  async checkout(data: CheckoutData): Promise<ApiResponse<Order>> {
    return this.request('/checkout', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getOrders(params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Order>> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.set(key, String(value));
      });
    }
    const query = searchParams.toString();
    return this.request(`/orders${query ? `?${query}` : ''}`);
  }

  async getOrder(orderId: string): Promise<ApiResponse<Order>> {
    return this.request(`/orders/${orderId}`);
  }

  async cancelOrder(orderId: string): Promise<ApiResponse<Order>> {
    return this.request(`/orders/${orderId}/cancel`, { method: 'POST' });
  }

  async reorder(orderId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/orders/${orderId}/reorder`, { method: 'POST' });
  }

  // ============================================
  // ADDRESSES
  // ============================================

  async getAddresses(): Promise<ApiResponse<Address[]>> {
    return this.request('/addresses');
  }

  async addAddress(address: Omit<Address, 'id' | 'customerId'>): Promise<ApiResponse<Address>> {
    return this.request('/addresses', {
      method: 'POST',
      body: JSON.stringify(address),
    });
  }

  async updateAddress(id: string, address: Partial<Address>): Promise<ApiResponse<Address>> {
    return this.request(`/addresses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(address),
    });
  }

  async deleteAddress(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/addresses/${id}`, { method: 'DELETE' });
  }

  // ============================================
  // DELIVERY
  // ============================================

  async getDeliveryZones(): Promise<ApiResponse<DeliveryZone[]>> {
    return this.request('/delivery/zones');
  }

  async getDeliverySlots(zoneId: string, date: string): Promise<ApiResponse<DeliverySlot[]>> {
    return this.request(`/delivery/slots?zoneId=${zoneId}&date=${date}`);
  }

  // ============================================
  // SEARCH
  // ============================================

  async search(query: string, lang: Lang = 'en'): Promise<ApiResponse<SearchResult>> {
    return this.request(`/search?q=${encodeURIComponent(query)}&lang=${lang}`);
  }

  // ============================================
  // CUSTOMER PROFILE
  // ============================================

  async getProfile(): Promise<ApiResponse<CustomerProfile>> {
    return this.request('/customer/profile');
  }

  async updateProfile(data: Partial<CustomerProfile>): Promise<ApiResponse<CustomerProfile>> {
    return this.request('/customer/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiClient();
