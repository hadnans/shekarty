// GGH — Gomla Go Home (جملة لحد البيت)
// Zustand cart store with persist middleware
// All prices in integer piastres

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type Piastres, type Product, multiplyPiastres, sumPiastres } from '@/types/ggh';

export interface CartItem {
  id: string;
  productId: string;
  nameEn: string;
  nameAr: string;
  brandEn: string;
  brandAr: string;
  weight: string;
  icon: string;
  price: Piastres;
  quantity: number;
  maxPerOrder: number;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;

  // Actions
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  incrementQuantity: (productId: string) => void;
  decrementQuantity: (productId: string) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;

  // Computed
  getItemCount: () => number;
  getSubtotal: () => Piastres;
  getDeliveryFee: () => Piastres;
  getTotal: () => Piastres;
}

const FREE_DELIVERY_THRESHOLD = 50000 as Piastres; // EGP 500
const STANDARD_DELIVERY_FEE = 3000 as Piastres; // EGP 30

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (product: Product) => {
        set((state) => {
          const existing = state.items.find((item) => item.productId === product.id);
          if (existing) {
            if (existing.quantity >= existing.maxPerOrder) return state;
            return {
              items: state.items.map((item) =>
                item.productId === product.id
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              ),
            };
          }
          return {
            items: [
              ...state.items,
              {
                id: product.id,
                productId: product.id,
                nameEn: product.nameEn,
                nameAr: product.nameAr,
                brandEn: product.brandEn,
                brandAr: product.brandAr,
                weight: product.weight,
                icon: product.icon,
                price: product.todayPrice,
                quantity: 1,
                maxPerOrder: product.maxPerOrder,
              },
            ],
          };
        });
      },

      removeItem: (productId: string) => {
        set((state) => ({
          items: state.items.filter((item) => item.productId !== productId),
        }));
      },

      updateQuantity: (productId: string, quantity: number) => {
        if (quantity < 1) return;
        set((state) => ({
          items: state.items.map((item) => {
            if (item.productId !== productId) return item;
            const qty = Math.min(quantity, item.maxPerOrder);
            return { ...item, quantity: qty };
          }),
        }));
      },

      incrementQuantity: (productId: string) => {
        set((state) => ({
          items: state.items.map((item) => {
            if (item.productId !== productId) return item;
            if (item.quantity >= item.maxPerOrder) return item;
            return { ...item, quantity: item.quantity + 1 };
          }),
        }));
      },

      decrementQuantity: (productId: string) => {
        set((state) => {
          const item = state.items.find((i) => i.productId === productId);
          if (!item || item.quantity <= 1) {
            return {
              items: state.items.filter((i) => i.productId !== productId),
            };
          }
          return {
            items: state.items.map((i) =>
              i.productId === productId ? { ...i, quantity: i.quantity - 1 } : i
            ),
          };
        });
      },

      clearCart: () => set({ items: [] }),

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      getSubtotal: () => {
        return get().items.reduce(
          (sum, item) => sumPiastres(sum, multiplyPiastres(item.price, item.quantity)),
          0 as Piastres
        );
      },

      getDeliveryFee: () => {
        const subtotal = get().getSubtotal();
        if (subtotal >= FREE_DELIVERY_THRESHOLD) return 0 as Piastres;
        if (get().items.length === 0) return 0 as Piastres;
        return STANDARD_DELIVERY_FEE;
      },

      getTotal: () => {
        return sumPiastres(get().getSubtotal(), get().getDeliveryFee());
      },
    }),
    {
      name: 'ggh-cart',
      partialize: (state) => ({ items: state.items }),
    }
  )
);
