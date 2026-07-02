import type { ReactNode } from "react";
import type { BusinessModule, UserRole } from "@/types";
import {
  LayoutDashboard, Store, ChefHat, Beer, UtensilsCrossed, CreditCard, Users,
  BarChart3, Settings, Package, ShoppingCart, Layers, Bell, Building2,
  AlertTriangle, TrendingUp, RefreshCw, ClipboardList, Monitor, Clock,
  FileText, ShoppingBag,
} from "lucide-react";

export interface NavItem {
  label: string;
  labelFn?: (hasModule: (m: BusinessModule) => boolean) => string;
  href: string;
  icon: ReactNode;
  module?: BusinessModule;
  anyModule?: BusinessModule[];
  hideIfModule?: BusinessModule;
  roles?: UserRole[];
  sectionLabel?: string;
}

export const NAV_ITEMS: NavItem[] = [
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
  { label: "Baked Items", href: "/bakery/items", icon: <Package className="w-4 h-4" />, module: "bakery", roles: ["owner", "manager", "baker"] },
  { label: "Recipes", href: "/bakery/recipes", icon: <ChefHat className="w-4 h-4" />, module: "bakery", roles: ["owner", "manager", "baker"] },
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
  { label: "Bar Stock", href: "/bar/stock", icon: <Package className="w-4 h-4" />, module: "bar", roles: ["owner", "manager", "bartender"] },
  { label: "Restock", href: "/bar/stock/restock", icon: <RefreshCw className="w-4 h-4" />, module: "bar", roles: ["owner", "manager"] },
  { label: "Closing Count", href: "/bar/stock/closing", icon: <ClipboardList className="w-4 h-4" />, module: "bar", roles: ["owner", "manager"] },
  { label: "KDS Display", href: "/bar/display", icon: <LayoutDashboard className="w-4 h-4" />, module: "bar", roles: ["owner", "manager", "bartender"] },
  { label: "Bar Reports", href: "/bar/reports", icon: <BarChart3 className="w-4 h-4" />, module: "bar", roles: ["owner", "manager", "bartender"] },
  { label: "Restaurant",      href: "/restaurant",      icon: <UtensilsCrossed className="w-4 h-4" />, module: "restaurant", roles: ["owner", "manager", "waiter", "chef", "bartender"] },
  { label: "Menu",            href: "/restaurant/menu", icon: <ChefHat className="w-4 h-4" />,         module: "restaurant", roles: ["owner", "manager"] },
  { label: "Kitchen Display", href: "/restaurant/kds",  icon: <Monitor className="w-4 h-4" />,         module: "restaurant", roles: ["owner", "manager", "waiter", "chef", "bartender"] },
  { label: "POS",    href: "/bar/pos",    icon: <ShoppingCart className="w-4 h-4" />, module: "restaurant", hideIfModule: "bar", roles: ["owner", "manager", "waiter", "cashier"] },
  { label: "Tables", href: "/bar/tables", icon: <Layers className="w-4 h-4" />,       module: "restaurant", hideIfModule: "bar", roles: ["owner", "manager", "waiter"] },
  { label: "Credits", href: "/credits", icon: <CreditCard className="w-4 h-4" />, roles: ["owner", "manager", "cashier", "bartender"] },
  { label: "Staff", href: "/staff", icon: <Users className="w-4 h-4" />, roles: ["owner", "manager"] },
  { label: "Overview", href: "/reports", icon: <BarChart3 className="w-4 h-4" />, roles: ["owner", "manager"], sectionLabel: "Reports" },
  { label: "Sales", href: "/reports/sales", icon: <TrendingUp className="w-4 h-4" />, roles: ["owner", "manager"] },
  { label: "Stock", href: "/reports/stock", icon: <Package className="w-4 h-4" />, roles: ["owner", "manager"], anyModule: ["supermarket", "bakery", "restaurant"] as BusinessModule[] },
  { label: "Bakery", href: "/reports/bakery", icon: <ChefHat className="w-4 h-4" />, module: "bakery", roles: ["owner", "manager"] },
  { label: "Bar", href: "/reports/bar", icon: <Beer className="w-4 h-4" />, module: "bar", roles: ["owner", "manager"] },
  { label: "Credits", href: "/reports/credits", icon: <CreditCard className="w-4 h-4" />, roles: ["owner", "manager"] },
  { label: "Staff", href: "/reports/staff", icon: <Users className="w-4 h-4" />, roles: ["owner", "manager"] },
  { label: "Shifts", href: "/reports/shifts", icon: <Clock className="w-4 h-4" />, roles: ["owner", "manager"] },
  { label: "Daily Report", href: "/reports/daily", icon: <FileText className="w-4 h-4" />, roles: ["owner", "manager"] },
  { label: "Notifications", href: "/notifications", icon: <Bell className="w-4 h-4" />, roles: ["owner", "manager"], sectionLabel: "System" },
  { label: "Settings", href: "/settings", icon: <Settings className="w-4 h-4" />, roles: ["owner", "manager"] },
  { label: "Branches", href: "/settings/branches", icon: <Building2 className="w-4 h-4" />, roles: ["owner"] },
  { label: "Profile", href: "/profile", icon: <Users className="w-4 h-4" />, roles: ["owner", "manager"] },
];
