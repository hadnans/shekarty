'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';

// Stores
import { useCartStore } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import { useLangStore } from '@/stores/lang-store';

// i18n
import { t } from '@/lib/ggh/i18n';

// Types
import { type Product, type Category, type Deal, type Order, type Address, type AuthResponse } from '@/types/ggh';

// API
import { api } from '@/services/api';

// Layout Components
import Header from '@/components/ggh/Header';
import Footer from '@/components/ggh/Footer';
import MobileNav from '@/components/ggh/MobileNav';

// Feature Components
import CartSlideOut from '@/features/cart/components/CartSlideOut';
import LoginForm from '@/features/auth/components/LoginForm';
import CheckoutFlow from '@/features/checkout/components/CheckoutFlow';
import ShopView from '@/features/shop/components/ShopView';
import OrdersView from '@/features/order/components/OrdersView';
import AccountView from '@/features/auth/components/AccountView';
import SearchOverlay from '@/features/search/components/SearchOverlay';

// Delivery Feature Components
import TrackingPage from '@/features/delivery/components/TrackingPage';
import DispatcherDashboard from '@/features/delivery/components/DispatcherDashboard';
import WarehouseDashboard from '@/features/delivery/components/WarehouseDashboard';

// Admin Feature Components
import { AdminLayout } from '@/features/admin';

// UI Components
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// ============================================
// VIEWS
// ============================================
type AppView = 'shop' | 'checkout' | 'orders' | 'account' | 'tracking' | 'dispatcher' | 'warehouse' | 'admin';

export default function Home() {
  const { lang, isRTL, toggleLang } = useLangStore();
  const { isAuthenticated, customer, login: authLogin, logout: authLogout } = useAuthStore();
  const { openCart, getItemCount } = useCartStore();

  const [currentView, setCurrentView] = useState<AppView>('shop');
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [seedComplete, setSeedComplete] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState<string>('');

  const queryClient = useQueryClient();
  const seededRef = useRef(false);

  // ============================================
  // SEED DATABASE ON FIRST LOAD
  // ============================================
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    fetch('/api/seed', { method: 'POST' })
      .then((res) => res.json())
      .then(() => setSeedComplete(true))
      .catch(() => setSeedComplete(true));
  }, []);

  // ============================================
  // FETCH DATA
  // ============================================
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch('/api/categories');
      const json = await res.json();
      return json.data as Category[];
    },
    enabled: seedComplete,
  });

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch('/api/products?limit=50');
      const json = await res.json();
      return json.data as Product[];
    },
    enabled: seedComplete,
  });

  const { data: dealsData } = useQuery({
    queryKey: ['deals'],
    queryFn: async () => {
      const res = await fetch('/api/deals');
      const json = await res.json();
      return json.data as (Deal & { product: Product })[];
    },
    enabled: seedComplete,
  });

  const { data: ordersData } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await fetch('/api/orders');
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data || []) as Order[];
    },
    enabled: isAuthenticated && currentView === 'orders',
  });

  const { data: addressesData } = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => {
      const res = await fetch('/api/addresses');
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data || []) as Address[];
    },
    enabled: isAuthenticated,
  });

  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['search', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return { products: [], categories: [] };
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&lang=${lang}`);
      const json = await res.json();
      return json.data as { products: Product[]; categories: Category[] };
    },
    enabled: searchQuery.length >= 2,
  });

  // ============================================
  // DERIVED DATA
  // ============================================
  const categories = categoriesData || [];
  const products = productsData || [];
  const deals = dealsData || [];
  const orders = ordersData || [];
  const addresses = addressesData || [];

  const productsByCategory = categories
    .map((cat) => ({
      category: cat,
      products: products.filter((p) => p.categoryId === cat.id),
    }))
    .filter((group) => group.products.length > 0);

  const featuredProducts = products.filter((p) => p.isFeatured).slice(0, 8);

  // ============================================
  // AUTH HANDLERS
  // ============================================
  const handleLoginSuccess = useCallback((response: AuthResponse) => {
    authLogin(response.customer, response.token);
    setShowLoginDialog(false);
  }, [authLogin]);

  const handleLogout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // ignore
    }
    authLogout();
    setCurrentView('shop');
  }, [authLogout]);

  // ============================================
  // CHECKOUT HANDLERS
  // ============================================
  const handleCheckoutComplete = useCallback((_order: Order) => {
    setCurrentView('shop');
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    useCartStore.getState().clearCart();
  }, [queryClient]);

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--ggh-bg)' }}>
      {/* Skip to content */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md">
        {t(lang, 'skipToContent')}
      </a>

      {/* Admin Mode — full admin layout replaces storefront layout */}
      {currentView === 'admin' ? (
        <AdminLayout lang={lang} onExitAdmin={() => setCurrentView('shop')} />
      ) : (
      <>
      {/* Header */}
      <Header
        lang={lang}
        onToggleLang={toggleLang}
        cartCount={getItemCount()}
        onOpenCart={openCart}
        onSearchClick={() => setShowSearchOverlay(true)}
        onAccountClick={() => {
          if (isAuthenticated) {
            setCurrentView(currentView === 'account' ? 'shop' : 'account');
          } else {
            setShowLoginDialog(true);
          }
        }}
        onOrdersClick={() => {
          if (isAuthenticated) {
            setCurrentView('orders');
          } else {
            setShowLoginDialog(true);
          }
        }}
        isAuthenticated={isAuthenticated}
        customerName={customer?.firstName || ''}
      />

      {/* Main Content */}
      <main id="main-content" className="flex-1">
        <AnimatePresence mode="wait">
          {currentView === 'shop' && (
            <motion.div
              key="shop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ShopView
                lang={lang}
                categories={categories}
                products={products}
                deals={deals}
                productsByCategory={productsByCategory}
                featuredProducts={featuredProducts}
                isLoading={categoriesLoading || productsLoading}
                onCategoryClick={(slug) => {
                  const el = document.getElementById(`section-${slug}`);
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
              />
            </motion.div>
          )}

          {currentView === 'checkout' && (
            <motion.div
              key="checkout"
              initial={{ opacity: 0, x: isRTL ? -30 : 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRTL ? 30 : -30 }}
              transition={{ duration: 0.2 }}
              className="max-w-3xl mx-auto px-4 py-6"
            >
              <CheckoutFlow
                addresses={addresses}
                deliverySlots={[]}
                lang={lang}
                onComplete={handleCheckoutComplete}
              />
            </motion.div>
          )}

          {currentView === 'orders' && (
            <motion.div
              key="orders"
              initial={{ opacity: 0, x: isRTL ? -30 : 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRTL ? 30 : -30 }}
              transition={{ duration: 0.2 }}
              className="max-w-3xl mx-auto px-4 py-6"
            >
              <OrdersView
                lang={lang}
                orders={orders}
                onTrackOrder={(orderId) => {
                  setTrackingOrderId(orderId);
                  setCurrentView('tracking');
                }}
              />
            </motion.div>
          )}

          {currentView === 'account' && (
            <motion.div
              key="account"
              initial={{ opacity: 0, x: isRTL ? -30 : 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRTL ? 30 : -30 }}
              transition={{ duration: 0.2 }}
              className="max-w-3xl mx-auto px-4 py-6"
            >
              <AccountView
                lang={lang}
                customer={customer}
                onLogout={handleLogout}
                onNavigate={(view) => setCurrentView(view as AppView)}
              />
            </motion.div>
          )}

          {currentView === 'tracking' && trackingOrderId && (
            <motion.div
              key="tracking"
              initial={{ opacity: 0, x: isRTL ? -30 : 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRTL ? 30 : -30 }}
              transition={{ duration: 0.2 }}
            >
              <TrackingPage
                orderId={trackingOrderId}
                lang={lang}
                onBack={() => setCurrentView('orders')}
              />
            </motion.div>
          )}

          {currentView === 'dispatcher' && (
            <motion.div
              key="dispatcher"
              initial={{ opacity: 0, x: isRTL ? -30 : 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRTL ? 30 : -30 }}
              transition={{ duration: 0.2 }}
            >
              <DispatcherDashboard
                lang={lang}
                onBack={() => setCurrentView('shop')}
              />
            </motion.div>
          )}

          {currentView === 'warehouse' && (
            <motion.div
              key="warehouse"
              initial={{ opacity: 0, x: isRTL ? -30 : 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRTL ? 30 : -30 }}
              transition={{ duration: 0.2 }}
            >
              <WarehouseDashboard
                lang={lang}
                onBack={() => setCurrentView('shop')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <div className="mt-auto">
        <Footer lang={lang} />
      </div>

      {/* Mobile Bottom Nav */}
      <MobileNav
        lang={lang}
        currentView={currentView}
        onViewChange={(view) => {
          if (view === 'cart') {
            openCart();
          } else if (view === 'account' && !isAuthenticated) {
            setShowLoginDialog(true);
          } else if (view === 'orders' && !isAuthenticated) {
            setShowLoginDialog(true);
          } else {
            setCurrentView(view as AppView);
          }
        }}
        cartCount={getItemCount()}
      />

      {/* Cart Slide Out */}
      <CartSlideOut lang={lang} onCheckout={() => setCurrentView('checkout')} />

      {/* Login Dialog */}
      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center" style={{ color: 'var(--ggh-text)' }}>
              {t(lang, 'welcomeBack')}
            </DialogTitle>
          </DialogHeader>
          <LoginForm
            onSuccess={handleLoginSuccess}
            lang={lang}
          />
        </DialogContent>
      </Dialog>

      {/* Search Overlay */}
      <SearchOverlay
        open={showSearchOverlay}
        onOpenChange={setShowSearchOverlay}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        searchResults={searchResults}
        searchLoading={searchLoading}
        lang={lang}
        onCategoryClick={(slug) => {
          const el = document.getElementById(`section-${slug}`);
          el?.scrollIntoView({ behavior: 'smooth' });
        }}
      />
      </>
      )}
    </div>
  );
}
