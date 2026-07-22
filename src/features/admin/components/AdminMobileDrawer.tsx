'use client';

import { useMemo } from 'react';
import {
  LayoutDashboard,
  Package,
  Grid3X3,
  Flame,
  Warehouse,
  DollarSign,
  Upload,
  ShoppingCart,
  Users,
  Truck,
  BarChart3,
  Settings,
  Shield,
} from 'lucide-react';

import { useAdminStore, type AdminSubView } from '@/stores/admin-store';
import { useLangStore } from '@/stores/lang-store';
import { t } from '@/lib/ggh/i18n';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

// ============================================
// NAVIGATION ITEMS CONFIG (same as sidebar)
// ============================================
interface NavItem {
  id: AdminSubView;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  group: 'main' | 'system';
}

const navItems: NavItem[] = [
  { id: 'dashboard', labelKey: 'adminDashboard', icon: LayoutDashboard, group: 'main' },
  { id: 'products', labelKey: 'adminProducts', icon: Package, group: 'main' },
  { id: 'categories', labelKey: 'adminCategories', icon: Grid3X3, group: 'main' },
  { id: 'deals', labelKey: 'adminDeals', icon: Flame, group: 'main' },
  { id: 'inventory', labelKey: 'adminInventory', icon: Warehouse, group: 'main' },
  { id: 'price-rules', labelKey: 'adminPriceRules', icon: DollarSign, group: 'main' },
  { id: 'bulk', labelKey: 'adminBulk', icon: Upload, group: 'main' },
  { id: 'orders', labelKey: 'adminOrders', icon: ShoppingCart, group: 'main' },
  { id: 'customers', labelKey: 'adminCustomers', icon: Users, group: 'main' },
  { id: 'delivery', labelKey: 'adminDelivery', icon: Truck, group: 'main' },
  { id: 'analytics', labelKey: 'adminAnalytics', icon: BarChart3, group: 'main' },
  { id: 'settings', labelKey: 'adminSettings', icon: Settings, group: 'system' },
  { id: 'rbac', labelKey: 'adminRBAC', icon: Shield, group: 'system' },
];

// ============================================
// MOBILE DRAWER COMPONENT
// ============================================
export default function AdminMobileDrawer() {
  const { lang, isRTL } = useLangStore();
  const { currentSubView, setSubView, sidebarMobileOpen, setSidebarMobileOpen } = useAdminStore();

  const mainItems = useMemo(() => navItems.filter((item) => item.group === 'main'), []);
  const systemItems = useMemo(() => navItems.filter((item) => item.group === 'system'), []);

  // RTL: sheet slides from right; LTR: slides from left
  const sheetSide = isRTL ? 'right' : 'left';

  const handleNavClick = (view: AdminSubView) => {
    setSubView(view);
    setSidebarMobileOpen(false);
  };

  return (
    <Sheet open={sidebarMobileOpen} onOpenChange={setSidebarMobileOpen}>
      <SheetContent side={sheetSide} className="w-[280px] sm:w-[300px] p-0">
        {/* Header with brand */}
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <div className="flex items-center justify-center size-8 rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              G
            </div>
            <span className="font-semibold text-sm">
              {t(lang, 'adminPortal')}
            </span>
          </SheetTitle>
        </SheetHeader>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-2 px-2">
          <nav className="flex flex-col gap-1" role="navigation" aria-label="Admin mobile navigation">
            {mainItems.map((item) => (
              <MobileNavItem
                key={item.id}
                item={item}
                lang={lang}
                isActive={currentSubView === item.id}
                onClick={() => handleNavClick(item.id)}
              />
            ))}

            <Separator className="my-2" />

            {systemItems.map((item) => (
              <MobileNavItem
                key={item.id}
                item={item}
                lang={lang}
                isActive={currentSubView === item.id}
                onClick={() => handleNavClick(item.id)}
              />
            ))}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ============================================
// MOBILE NAV ITEM
// ============================================
interface MobileNavItemProps {
  item: NavItem;
  lang: 'en' | 'ar';
  isActive: boolean;
  onClick: () => void;
}

function MobileNavItem({ item, lang, isActive, onClick }: MobileNavItemProps) {
  const Icon = item.icon;
  const label = t(lang, item.labelKey);

  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-3 px-3 py-3 rounded-lg w-full
        transition-colors duration-200 cursor-pointer
        ${isActive
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        }
      `}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon className="size-5 shrink-0" />
      <span className="text-sm truncate">{label}</span>
      {isActive && (
        <div className="ml-auto rtl:mr-auto rtl:ml-0 size-1.5 rounded-full bg-primary" />
      )}
    </button>
  );
}
