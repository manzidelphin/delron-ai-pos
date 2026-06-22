"use client";

import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useAIStore } from "@/store/ai-store";
import {
  LayoutDashboard,
  Store,
  ChefHat,
  Beer,
  UtensilsCrossed,
  CreditCard,
  Users,
  BarChart3,
  Settings,
  Zap,
  ChevronLeft,
  Package,
  ShoppingCart,
  Layers,
  Bell,
  Building2,
  AlertTriangle,
  TrendingUp,
  Lock,
  RefreshCw,
  ClipboardList,
  Monitor,
  Clock,
  FileText,
  ShoppingBag,
  Shield,
} from "lucide-react";
import { EndShiftButton } from "@/components/shift/end-shift-button";
import type { BusinessModule, UserRole } from "@/types";

interface NavItem {
  label: string;
  labelFn?: (hasModule: (m: BusinessModule) => boolean) => string; // dynamic label
  href: string;
  icon: React.ReactNode;
  module?: BusinessModule;
  anyModule?: BusinessModule[]; // show if business has ANY of these modules
  hideIfModule?: BusinessModule; // hide if business ALSO has this module
  roles?: UserRole[];
  sectionLabel?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: "POS", href: "/supermarket/pos", icon: <ShoppingCart className="w-4 h-4" />, module: "supermarket", roles: ["owner", "manager", "cashier"] },
  { label: "Products", href: "/supermarket/products", icon: <Package className="w-4 h-4" />, module: "supermarket", roles: ["owner", "manager"] },
  { label: "Import", href: "/supermarket/import", icon: <Store className="w-4 h-4" />, module: "supermarket", roles: ["owner", "manager"] },
  { label: "Inventory", href: "/supermarket/inventory", icon: <Layers className="w-4 h-4" />, module: "supermarket", roles: ["owner", "manager"] },
  { label: "Stock", href: "/supermarket/stock", icon: <Package className="w-4 h-4" />, module: "supermarket", roles: ["owner", "manager"] },
  { label: "Restock", href: "/supermarket/stock/restock", icon: <RefreshCw className="w-4 h-4" />, module: "supermarket", roles: ["owner", "manager"] },
  { label: "Closing Count", href: "/supermarket/stock/closing", icon: <ClipboardList className="w-4 h-4" />, module: "supermarket", roles: ["owner", "manager"] },
  { label: "Suppliers", href: "/supermarket/suppliers", icon: <Building2 className="w-4 h-4" />, module: "supermarket", roles: ["owner", "manager"] },
  { label: "Bakery", href: "/bakery", icon: <ChefHat className="w-4 h-4" />, module: "bakery", roles: ["owner", "manager", "baker"] },
  { label: "Production", href: "/bakery/production", icon: <Layers className="w-4 h-4" />, module: "bakery", roles: ["owner", "manager", "baker"] },
  { label: "Baked Items", href: "/bakery/items", icon: <Package className="w-4 h-4" />, module: "bakery", roles: ["owner", "manager"] },
  { label: "Recipes", href: "/bakery/recipes", icon: <ChefHat className="w-4 h-4" />, module: "bakery", roles: ["owner", "manager"] },
  { label: "Ingredients", href: "/bakery/materials", icon: <Building2 className="w-4 h-4" />, module: "bakery", roles: ["owner", "manager", "baker"] },
  { label: "Ingredient Stock", href: "/bakery/stock", icon: <Package className="w-4 h-4" />, module: "bakery", roles: ["owner", "manager"] },
  { label: "Restock", href: "/bakery/stock/restock", icon: <RefreshCw className="w-4 h-4" />, module: "bakery", roles: ["owner", "manager"] },
  { label: "Closing Count", href: "/bakery/stock/closing", icon: <ClipboardList className="w-4 h-4" />, module: "bakery", roles: ["owner", "manager"] },
  { label: "Waste Log", href: "/bakery/waste", icon: <AlertTriangle className="w-4 h-4" />, module: "bakery", roles: ["owner", "manager", "baker"] },
  { label: "Custom Orders", href: "/bakery/custom-orders", icon: <ShoppingBag className="w-4 h-4" />, module: "bakery", roles: ["owner", "manager", "baker", "cashier"] },
  { label: "Bar", href: "/bar", icon: <Beer className="w-4 h-4" />, module: "bar", roles: ["owner", "manager", "bartender"] },
  { label: "Bar Items", href: "/bar/items", icon: <Package className="w-4 h-4" />, module: "bar", roles: ["owner", "manager"] },
  { label: "Bar POS", labelFn: (hm) => hm("restaurant") ? "POS" : "Bar POS", href: "/bar/pos", icon: <ShoppingCart className="w-4 h-4" />, module: "bar", roles: ["owner", "manager", "bartender", "cashier", "waiter"] },
  { label: "Tables", href: "/bar/tables", icon: <Layers className="w-4 h-4" />, module: "bar", roles: ["owner", "manager", "bartender", "waiter"] },
  { label: "Bar Stock", href: "/bar/stock", icon: <Package className="w-4 h-4" />, module: "bar", roles: ["owner", "manager"] },
  { label: "Restock", href: "/bar/stock/restock", icon: <RefreshCw className="w-4 h-4" />, module: "bar", roles: ["owner", "manager"] },
  { label: "Closing Count", href: "/bar/stock/closing", icon: <ClipboardList className="w-4 h-4" />, module: "bar", roles: ["owner", "manager"] },
  { label: "KDS Display", href: "/bar/display", icon: <LayoutDashboard className="w-4 h-4" />, module: "bar", roles: ["owner", "manager", "bartender"] },
  { label: "Bar Reports", href: "/bar/reports", icon: <BarChart3 className="w-4 h-4" />, module: "bar", roles: ["owner", "manager"] },
  { label: "Restaurant",      href: "/restaurant",      icon: <UtensilsCrossed className="w-4 h-4" />, module: "restaurant", roles: ["owner", "manager", "waiter"] },
  { label: "Menu",            href: "/restaurant/menu", icon: <ChefHat className="w-4 h-4" />,         module: "restaurant", roles: ["owner", "manager"] },
  { label: "Kitchen Display", href: "/restaurant/kds",  icon: <Monitor className="w-4 h-4" />,         module: "restaurant", roles: ["owner", "manager", "waiter"] },
  // POS + Tables for restaurant-only businesses (hidden when bar module is also active — bar section covers them)
  { label: "POS",    href: "/bar/pos",    icon: <ShoppingCart className="w-4 h-4" />, module: "restaurant", hideIfModule: "bar", roles: ["owner", "manager", "waiter", "cashier"] },
  { label: "Tables", href: "/bar/tables", icon: <Layers className="w-4 h-4" />,       module: "restaurant", hideIfModule: "bar", roles: ["owner", "manager", "waiter"] },
  { label: "Credits", href: "/credits", icon: <CreditCard className="w-4 h-4" />, roles: ["owner", "manager", "cashier", "bartender"] },
  { label: "Staff", href: "/staff", icon: <Users className="w-4 h-4" />, roles: ["owner", "manager"] },
  // Reports section
  { label: "Overview", href: "/reports", icon: <BarChart3 className="w-4 h-4" />, roles: ["owner", "manager"], sectionLabel: "Reports" },
  { label: "Sales", href: "/reports/sales", icon: <TrendingUp className="w-4 h-4" />, roles: ["owner", "manager"] },
  { label: "Stock", href: "/reports/stock", icon: <Package className="w-4 h-4" />, roles: ["owner", "manager"], anyModule: ["supermarket", "bakery", "restaurant"] as BusinessModule[] },
  { label: "Bakery", href: "/reports/bakery", icon: <ChefHat className="w-4 h-4" />, module: "bakery", roles: ["owner", "manager"] },
  { label: "Bar", href: "/reports/bar", icon: <Beer className="w-4 h-4" />, module: "bar", roles: ["owner", "manager"] },
  { label: "Credits", href: "/reports/credits", icon: <CreditCard className="w-4 h-4" />, roles: ["owner", "manager"] },
  { label: "Staff", href: "/reports/staff", icon: <Users className="w-4 h-4" />, roles: ["owner", "manager"] },
  { label: "Shifts", href: "/reports/shifts", icon: <Clock className="w-4 h-4" />, roles: ["owner", "manager"] },
  { label: "Daily Report", href: "/reports/daily", icon: <FileText className="w-4 h-4" />, roles: ["owner", "manager"] },
  // System
  // System section
  { label: "Notifications", href: "/notifications", icon: <Bell className="w-4 h-4" />, roles: ["owner", "manager"], sectionLabel: "System" },
  { label: "Settings", href: "/settings", icon: <Settings className="w-4 h-4" />, roles: ["owner", "manager"] },
  { label: "Branches", href: "/settings/branches", icon: <Building2 className="w-4 h-4" />, roles: ["owner"] },
  { label: "Profile", href: "/profile", icon: <Users className="w-4 h-4" />, roles: ["owner", "manager"] },
];

export default function Sidebar({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { business, staff, activeOperator, clearOperator, hasModule, canAccess, isPlatformAdmin } = useAuthStore();
  const { setOpen: openAI } = useAIStore();

  const handleLockScreen = async () => {
    await fetch("/api/auth/pin-login", { method: "DELETE" });
    clearOperator();
    window.location.href = "/pos-login";
  };

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.module && !hasModule(item.module)) return false;
    if (item.anyModule && !item.anyModule.some((m) => hasModule(m))) return false;
    if (item.hideIfModule && hasModule(item.hideIfModule)) return false;
    if (item.roles && !canAccess(item.roles)) return false;
    return true;
  });

  return (
    <aside
      className={cn(
        "flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 ease-in-out z-30",
        "fixed md:relative h-full",
        isOpen ? "w-56 translate-x-0" : "w-0 md:w-16 -translate-x-full md:translate-x-0",
        "overflow-hidden"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 h-16 px-4 border-b border-sidebar-border flex-shrink-0">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-white" fill="white" />
        </div>
        {isOpen && (
          <div className="min-w-0">
            <div className="font-bold text-sm text-white leading-none">DELRON</div>
            <div className="text-[10px] text-sidebar-foreground/50 leading-none mt-0.5 truncate">
              {business?.name ?? "AI POS"}
            </div>
          </div>
        )}
        {isOpen && (
          <button onClick={onToggle} className="ml-auto text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && item.href !== "/" && pathname.startsWith(item.href) && item.href.length > 1);
          return (
            <div key={item.href}>
              {item.sectionLabel && isOpen && (
                <div className="px-3 pt-3 pb-1">
                  <p className="text-[10px] font-semibold text-sidebar-foreground/30 uppercase tracking-widest">
                    {item.sectionLabel}
                  </p>
                </div>
              )}
              {item.sectionLabel && !isOpen && (
                <div className="my-1 mx-2 h-px bg-sidebar-border/40" />
              )}
              <button
                onClick={() => router.push(item.href)}
                title={!isOpen ? (item.labelFn ? item.labelFn(hasModule) : item.label) : undefined}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isActive ? "bg-sidebar-accent text-sidebar-primary shadow-sm" : "text-sidebar-foreground/70"
                )}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {isOpen && <span className="truncate">{item.labelFn ? item.labelFn(hasModule) : item.label}</span>}
                {isActive && isOpen && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary flex-shrink-0" />}
              </button>
            </div>
          );
        })}
      </nav>

      {/* Platform Admin link — visible to any user in the platform_admins table */}
      {isPlatformAdmin && (
        <div className="px-2 pb-2">
          {isOpen && (
            <div className="px-3 pt-3 pb-1">
              <p className="text-[10px] font-semibold text-violet-400/60 uppercase tracking-widest">Platform</p>
            </div>
          )}
          {!isOpen && <div className="my-1 mx-2 h-px bg-violet-500/20" />}
          <button
            onClick={() => router.push("/admin/businesses")}
            title={!isOpen ? "Platform Admin" : undefined}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
              "bg-violet-600/10 border border-violet-500/20 text-violet-400 hover:bg-violet-600/20 hover:text-violet-300"
            )}
          >
            <Shield className="w-4 h-4 flex-shrink-0" />
            {isOpen && <span className="truncate">Platform Admin</span>}
          </button>
        </div>
      )}

      {/* Lock Screen + AI */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
        {/* Active operator badge */}
        {activeOperator && isOpen && (
          <div className="px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Active operator</p>
            <p className="text-xs font-semibold text-white truncate">{activeOperator.name}</p>
          </div>
        )}

        <EndShiftButton isOpen={isOpen} />

        <button
          onClick={handleLockScreen}
          title={!isOpen ? "Lock Screen" : undefined}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-all text-sm font-medium"
        >
          <Lock className="w-4 h-4 flex-shrink-0" />
          {isOpen && <span>Lock Screen</span>}
        </button>

        <button
          onClick={() => openAI(true)}
          title={!isOpen ? "Ask DELRON AI" : undefined}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all text-sm font-medium"
        >
          <Zap className="w-4 h-4 flex-shrink-0" />
          {isOpen && <span>Ask DELRON AI</span>}
        </button>
      </div>
    </aside>
  );
}
