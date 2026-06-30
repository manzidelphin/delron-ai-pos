import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { UserRole } from "@/types";

/** Resolve the authenticated business context.
 *  - businessId always comes from the owner's Supabase session.
 *  - staffId uses the PIN-switched operator (pos_operator cookie) when present,
 *    so sales/orders are attributed to the cashier, not the owner.
 *  - When a platform admin is impersonating, returns the target business context. */
export async function getAuthContext(): Promise<
  | { businessId: string; branchId: string; staffId: string; ownerStaffId: string; role: UserRole; error: null }
  | { businessId: null; branchId: null; staffId: null; ownerStaffId: null; role: null; error: NextResponse }
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const cookieStore = cookies();

  if (!user) {
    // No Supabase session — try PIN-only authentication (cashier on dedicated POS device).
    const operatorRaw = cookieStore.get("pos_operator")?.value;
    const businessId = cookieStore.get("pos_business_id")?.value;
    if (operatorRaw && businessId) {
      try {
        const op = JSON.parse(operatorRaw) as { id?: string; branch_id?: string | null; role?: string };
        if (op.id) {
          return {
            businessId,
            branchId: op.branch_id ?? businessId,
            staffId: op.id,
            ownerStaffId: op.id, // PIN-only: no session owner; use operator as authorizer too
            role: (op.role as UserRole) ?? "cashier",
            error: null,
          };
        }
      } catch {
        // malformed cookie — fall through to 401
      }
    }
    return {
      businessId: null,
      branchId: null,
      staffId: null,
      ownerStaffId: null,
      role: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  // Check for active platform admin impersonation.
  // If the admin_impersonation cookie is present and the caller is verified as a platform admin,
  // return the target business context so all API routes transparently serve that business's data.
  const impersonationRaw = cookieStore.get("admin_impersonation")?.value;
  if (impersonationRaw) {
    try {
      const imp = JSON.parse(impersonationRaw) as {
        target_business_id: string;
        target_owner_staff_id: string | null;
        target_main_branch_id: string | null;
      };
      const { data: adminCheck } = await supabase
        .from("platform_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (adminCheck && imp.target_business_id) {
        return {
          businessId: imp.target_business_id,
          branchId: imp.target_main_branch_id ?? imp.target_business_id,
          staffId: imp.target_owner_staff_id ?? imp.target_business_id,
          ownerStaffId: imp.target_owner_staff_id ?? imp.target_business_id,
          role: "owner" as UserRole, // impersonating admin has full owner access
          error: null,
        };
      }
    } catch {
      // Malformed cookie — continue with normal auth context.
    }
  }

  const { data: profile } = await supabase
    .from("staff")
    .select("id, business_id, branch_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!profile) {
    return {
      businessId: null,
      branchId: null,
      staffId: null,
      ownerStaffId: null,
      role: null,
      error: NextResponse.json({ error: "Staff profile not found" }, { status: 404 }),
    };
  }

  // ownerStaffId is always the Supabase session owner — never overridden by PIN operator.
  // Use this for authorization checks (role gates). staffId may be the PIN operator.
  const ownerStaffId = profile.id;

  // Check if there is a PIN-switched active operator
  let staffId = profile.id;
  let branchId = profile.branch_id ?? profile.business_id;
  let role: UserRole = profile.role as UserRole;

  try {
    const operatorCookie = cookieStore.get("pos_operator");
    if (operatorCookie?.value) {
      const op = JSON.parse(operatorCookie.value) as {
        id?: string;
        branch_id?: string | null;
        role?: string;
      };
      if (op.id) staffId = op.id;
      if (op.branch_id) branchId = op.branch_id;
      if (op.role) role = op.role as UserRole;
    }
  } catch {
    // cookie missing or malformed — use owner defaults
  }

  return {
    businessId: profile.business_id,
    branchId,
    staffId,
    ownerStaffId,
    role,
    error: null,
  };
}
