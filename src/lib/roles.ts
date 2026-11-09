import type { BusinessModule, UserRole } from "@/types";

// Shared by server and client code — keep this file free of server-only imports.

/** Roles allowed to see the business dashboard, reports and their data APIs. */
export const MANAGEMENT_ROLES: UserRole[] = ["owner", "manager"];

export function isManagementRole(role: UserRole | null | undefined): boolean {
  return !!role && MANAGEMENT_ROLES.includes(role);
}

/**
 * The screen each role works from, given the business's enabled modules.
 * Never returns /dashboard for non-management roles.
 */
export function roleHomePath(role: UserRole | null | undefined, modules: BusinessModule[]): string {
  const has = (m: BusinessModule) => modules.includes(m);
  const hasBarOrRestaurant = has("bar") || has("restaurant");

  switch (role) {
    case "owner":
    case "manager":
      return "/dashboard";
    case "cashier":
      if (has("supermarket")) return "/supermarket/pos";
      if (hasBarOrRestaurant) return "/bar/pos";
      if (has("bakery")) return "/bakery/custom-orders";
      break;
    case "bartender":
      if (has("bar")) return "/bar/pos";
      break;
    case "waiter":
      if (hasBarOrRestaurant) return "/bar/tables";
      break;
    case "baker":
      if (has("bakery")) return "/bakery/production";
      break;
    case "chef":
      if (has("restaurant")) return "/restaurant/kds";
      break;
  }
  return "/pos-login";
}
