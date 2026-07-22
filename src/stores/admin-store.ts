// GGH — Admin Portal State Management
// Zustand store for admin sub-view navigation and sidebar state

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AdminSubView =
  | 'dashboard'
  | 'products'
  | 'categories'
  | 'deals'
  | 'inventory'
  | 'price-rules'
  | 'bulk'
  | 'orders'
  | 'customers'
  | 'delivery'
  | 'analytics'
  | 'loyalty'
  | 'settings'
  | 'rbac';

interface AdminState {
  currentSubView: AdminSubView;
  sidebarCollapsed: boolean;
  sidebarMobileOpen: boolean;

  setSubView: (view: AdminSubView) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarMobileOpen: (open: boolean) => void;
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      currentSubView: 'dashboard',
      sidebarCollapsed: false,
      sidebarMobileOpen: false,

      setSubView: (view) => set({ currentSubView: view }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setSidebarMobileOpen: (open) => set({ sidebarMobileOpen: open }),
    }),
    {
      name: 'ggh-admin',
      partialize: (state) => ({
        currentSubView: state.currentSubView,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
