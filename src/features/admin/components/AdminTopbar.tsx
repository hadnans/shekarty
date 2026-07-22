'use client';

import { useState, useCallback } from 'react';
import {
  Menu,
  Search,
  Globe,
  ArrowLeft,
  ArrowRight,
  LogOut,
  Settings,
} from 'lucide-react';

import { useAdminStore, type AdminSubView } from '@/stores/admin-store';
import { useLangStore } from '@/stores/lang-store';
import { t } from '@/lib/ggh/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ============================================
// SUB-VIEW TITLE KEY MAP
// ============================================
const subViewTitleKeys: Record<AdminSubView, string> = {
  dashboard: 'adminDashboard',
  products: 'adminProducts',
  categories: 'adminCategories',
  deals: 'adminDeals',
  inventory: 'adminInventory',
  'price-rules': 'adminPriceRules',
  bulk: 'adminBulk',
  orders: 'adminOrders',
  customers: 'adminCustomers',
  delivery: 'adminDelivery',
  analytics: 'adminAnalytics',
  loyalty: 'adminLoyalty',
  settings: 'adminSettings',
  rbac: 'adminRBAC',
};

// ============================================
// TOPBAR COMPONENT
// ============================================
interface AdminTopbarProps {
  lang: 'en' | 'ar';
  onExitAdmin: () => void;
}

export default function AdminTopbar({ lang, onExitAdmin }: AdminTopbarProps) {
  const { isRTL, toggleLang } = useLangStore();
  const { currentSubView, sidebarCollapsed, toggleSidebar, setSidebarMobileOpen } = useAdminStore();
  const [searchValue, setSearchValue] = useState('');

  const titleKey = subViewTitleKeys[currentSubView] || 'adminDashboard';
  const pageTitle = t(lang, titleKey);

  const handleMobileToggle = useCallback(() => {
    setSidebarMobileOpen(true);
  }, [setSidebarMobileOpen]);

  const ExitIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <header
      data-slot="admin-topbar"
      className="sticky top-0 z-30 h-16 flex items-center gap-4 px-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shrink-0"
    >
      {/* Mobile Menu Toggle (visible < 1024px) */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden shrink-0"
        onClick={handleMobileToggle}
        aria-label={t(lang, 'adminToggleMobile')}
      >
        <Menu className="size-5" />
      </Button>

      {/* Desktop Sidebar Toggle (visible >= 1024px) */}
      <Button
        variant="ghost"
        size="icon"
        className="hidden lg:inline-flex shrink-0"
        onClick={toggleSidebar}
        aria-label={sidebarCollapsed ? t(lang, 'adminExpandSidebar') : t(lang, 'adminCollapseSidebar')}
      >
        <Menu className="size-4" />
      </Button>

      {/* Current Page Title */}
      <h1 className="text-lg font-semibold text-foreground truncate min-w-0">
        {pageTitle}
      </h1>

      {/* Search Bar */}
      <div className="hidden md:flex flex-1 max-w-md items-center mx-4">
        <div className="relative w-full">
          <Search className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t(lang, 'adminSearch')}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-9 rtl:pr-9 rtl:pl-3 h-9 bg-muted/50 border-0 focus-visible:border-ring"
          />
        </div>
      </div>

      {/* Spacer for mobile */}
      <div className="flex-1 md:hidden" />

      {/* Language Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleLang}
        aria-label={t(lang, 'languageSwitch')}
        className="shrink-0"
      >
        <Globe className="size-4" />
      </Button>

      {/* Exit Admin */}
      <Button
        variant="outline"
        size="sm"
        onClick={onExitAdmin}
        className="hidden sm:inline-flex items-center gap-2 shrink-0 text-sm"
      >
        <ExitIcon className="size-4" />
        <span>{t(lang, 'adminExit')}</span>
      </Button>

      {/* Exit Admin (mobile, icon only) */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onExitAdmin}
        className="sm:hidden shrink-0"
        aria-label={t(lang, 'adminExit')}
      >
        <ExitIcon className="size-4" />
      </Button>

      {/* Separator */}
      <Separator orientation="vertical" className="h-6 shrink-0 hidden sm:block" />

      {/* Admin User Avatar */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="hidden sm:flex items-center gap-2 px-2 shrink-0" aria-label={t(lang, 'adminUserMenu')}>
            <Avatar className="size-7">
              <AvatarFallback className="text-xs bg-primary text-primary-foreground font-medium">
                AD
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-foreground truncate max-w-[80px]">
              Admin
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="w-48">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            {t(lang, 'adminPortal')}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => useAdminStore.getState().setSubView('settings')}>
            <Settings className="size-4" />
            {t(lang, 'adminSettings')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onExitAdmin}>
            <LogOut className="size-4" />
            {t(lang, 'adminExit')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
