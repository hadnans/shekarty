'use client';

import { useEffect } from 'react';

import { useLangStore } from '@/stores/lang-store';

import AdminSidebar from './AdminSidebar';
import AdminTopbar from './AdminTopbar';
import AdminContentArea from './AdminContentArea';
import AdminMobileDrawer from './AdminMobileDrawer';

// ============================================
// ADMIN LAYOUT — Root container for admin mode
// ============================================
interface AdminLayoutProps {
  lang: 'en' | 'ar';
  onExitAdmin: () => void;
}

export default function AdminLayout({ lang, onExitAdmin }: AdminLayoutProps) {
  const { isRTL } = useLangStore();

  // Ensure RTL direction is applied when in admin mode
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
    }
  }, [isRTL, lang]);

  return (
    <div
      data-slot="admin-layout"
      className="min-h-screen flex bg-background"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Desktop Sidebar — visible >= 1024px */}
      <div className="hidden lg:block shrink-0">
        <AdminSidebar />
      </div>

      {/* Mobile Drawer — visible < 1024px */}
      <AdminMobileDrawer />

      {/* Main Content Area (topbar + content) */}
      <div className="flex flex-col flex-1 min-w-0">
        <AdminTopbar lang={lang} onExitAdmin={onExitAdmin} />
        <AdminContentArea />
      </div>
    </div>
  );
}
