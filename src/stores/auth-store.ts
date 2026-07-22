// GGH — Gomla Go Home (جملة لحد البيت)
// Auth store — manages customer session state

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type Lang, type CustomerProfile } from '@/types/ggh';

interface AuthState {
  isAuthenticated: boolean;
  customer: CustomerProfile | null;
  token: string | null;
  isLoading: boolean;

  // Actions
  login: (customer: CustomerProfile, token: string) => void;
  logout: () => void;
  updateProfile: (updates: Partial<CustomerProfile>) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      customer: null,
      token: null,
      isLoading: false,

      login: (customer: CustomerProfile, token: string) => {
        set({
          isAuthenticated: true,
          customer,
          token,
          isLoading: false,
        });
      },

      logout: () => {
        set({
          isAuthenticated: false,
          customer: null,
          token: null,
          isLoading: false,
        });
      },

      updateProfile: (updates: Partial<CustomerProfile>) => {
        set((state) => ({
          customer: state.customer
            ? { ...state.customer, ...updates }
            : null,
        }));
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: 'ggh-auth',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        customer: state.customer,
        token: state.token,
      }),
    }
  )
);
