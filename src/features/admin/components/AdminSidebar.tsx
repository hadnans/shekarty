'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
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
  Award,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { useAdminStore, type AdminSubView } from '@/stores/admin-store';
import { useLangStore } from '@/stores/lang-store';
import { t } from '@/lib/ggh/i18n';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ============================================
// NAVIGATION ITEMS CONFIG
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
  { id: 'loyalty', labelKey: 'adminLoyalty', icon: Award, group: 'main' },
  { id: 'settings', labelKey: 'adminSettings', icon: Settings, group: 'system' },
  { id: 'rbac', labelKey: 'adminRBAC', icon: Shield, group: 'system' },
];

// ============================================
// SIDEBAR COMPONENT
// ============================================
export default function AdminSidebar() {
  const { lang, isRTL } = useLangStore();
  const { currentSubView, setSubView, sidebarCollapsed, toggleSidebar } = useAdminStore();

  const mainItems = useMemo(() => navItems.filter((item) => item.group === 'main'), []);
  const systemItems = useMemo(() => navItems.filter((item) => item.group === 'system'), []);

  const CollapseIcon = isRTL
    ? sidebarCollapsed ? ChevronRight : ChevronLeft
    : sidebarCollapsed ? ChevronLeft : ChevronRight;

  return (
    <TooltipProvider delayDuration={300}>
    <motion.aside
      data-slot="admin-sidebar"
      className="h-screen sticky top-0 flex flex-col border-border bg-background border-r rtl:border-l rtl:border-r-0 shrink-0"
      initial={false}
      animate={{ width: sidebarCollapsed ? 64 : 260 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-border shrink-0">
        {!sidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-2 overflow-hidden"
          >
            <div className="flex items-center justify-center size-8 rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              G
            </div>
            <span className="font-semibold text-foreground text-sm truncate">
              {t(lang, 'adminPortal')}
            </span>
          </motion.div>
        )}
        {sidebarCollapsed && (
          <div className="flex items-center justify-center size-8 rounded-lg bg-primary text-primary-foreground font-bold text-sm mx-auto">
            G
          </div>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-2">
        <nav className="flex flex-col gap-1" role="navigation" aria-label="Admin navigation">
          {/* Main Navigation */}
          {mainItems.map((item) => (
            <SidebarNavItem
              key={item.id}
              item={item}
              lang={lang}
              isActive={currentSubView === item.id}
              isCollapsed={sidebarCollapsed}
              isRTL={isRTL}
              onClick={() => setSubView(item.id)}
            />
          ))}

          {/* Divider */}
          <Separator className="my-2" />

          {/* System Navigation */}
          {systemItems.map((item) => (
            <SidebarNavItem
              key={item.id}
              item={item}
              lang={lang}
              isActive={currentSubView === item.id}
              isCollapsed={sidebarCollapsed}
              isRTL={isRTL}
              onClick={() => setSubView(item.id)}
            />
          ))}
        </nav>
      </ScrollArea>

      {/* Collapse Toggle */}
      <div className="shrink-0 p-2 border-t border-border">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="w-full h-8 flex items-center justify-center"
              onClick={toggleSidebar}
              aria-label={sidebarCollapsed ? t(lang, 'adminExpandSidebar') : t(lang, 'adminCollapseSidebar')}
            >
              <CollapseIcon className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side={isRTL ? 'left' : 'right'}>
            {sidebarCollapsed ? t(lang, 'adminExpandSidebar') : t(lang, 'adminCollapseSidebar')}
          </TooltipContent>
        </Tooltip>
      </div>
    </motion.aside>
    </TooltipProvider>
  );
}

// ============================================
// SIDEBAR NAV ITEM
// ============================================
interface SidebarNavItemProps {
  item: NavItem;
  lang: 'en' | 'ar';
  isActive: boolean;
  isCollapsed: boolean;
  isRTL: boolean;
  onClick: () => void;
}

function SidebarNavItem({ item, lang, isActive, isCollapsed, isRTL, onClick }: SidebarNavItemProps) {
  const Icon = item.icon;
  const label = t(lang, item.labelKey);

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={`
              relative flex items-center justify-center size-10 rounded-lg mx-auto
              transition-colors duration-200 cursor-pointer
              ${isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }
            `}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon className="size-4" />
            {isActive && (
              <motion.div
                layoutId="sidebar-indicator"
                className={`absolute top-1/2 -translate-y-1/2 size-1.5 rounded-full bg-primary ${
                  isRTL ? 'right-1' : 'left-1'
                }`}
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side={isRTL ? 'left' : 'right'}>
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`
        relative flex items-center gap-3 px-3 py-2.5 rounded-lg w-full
        transition-colors duration-200 cursor-pointer
        ${isActive
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        }
      `}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon className="size-4 shrink-0" />
      <motion.span
        initial={{ opacity: 0, width: 0 }}
        animate={{ opacity: 1, width: 'auto' }}
        transition={{ delay: 0.05 }}
        className="text-sm truncate"
      >
        {label}
      </motion.span>
      {isActive && (
        <motion.div
          layoutId="sidebar-indicator-expanded"
          className={`absolute top-1/2 -translate-y-1/2 size-1.5 rounded-full bg-primary ${
            isRTL ? 'right-2' : 'left-2'
          }`}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        />
      )}
    </button>
  );
}
