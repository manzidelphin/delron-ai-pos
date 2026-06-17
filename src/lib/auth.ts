import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/** Resolve the authenticated business context.
 *  - businessId always comes from the owner's Supabase session.
 *  - staffId uses the PIN-switched operator (pos_operator cookie) when present,
 *    so sales/orders are attributed to the cashier, not the owner. */
export async function getAuthContext(): Promise<
  | { businessId: string; branchId: string; staffId: string; error: null }
  | { businessId: null; branchId: null; staffId: null; error: NextResponse }
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // No Supabase session — try PIN-only authentication (cashier on dedicated POS device).
    const cookieStore = cookies();
    const operatorRaw = cookieStore.get("pos_operator")?.value;
    const businessId = cookieStore.get("pos_business_id")?.value;
    if (operatorRaw && businessId) {
      try {
        const op = JSON.parse(operatorRaw) as { id?: string; branch_id?: string | null };
        if (op.id) {
          return {
            businessId,
            branchId: op.branch_id ?? businessId,
            staffId: op.id,
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
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: profile } = await supabase
    .from("staff")
    .select("id, business_id, branch_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!profile) {
    return {
      businessId: null,
      branchId: null,
      staffId: null,
      error: NextResponse.json({ error: "Staff profile not found" }, { status: 404 }),
    };
  }

  // Check if there is a PIN-switched active operator
  let staffId = profile.id;
  let branchId = profile.branch_id ?? profile.business_id;

  try {
    const cookieStore = cookies();
    const operatorCookie = cookieStore.get("pos_operator");
    if (operatorCookie?.value) {
      const op = JSON.parse(operatorCookie.value) as {
        id?: string;
        branch_id?: string | null;
      };
      if (op.id) staffId = op.id;
      if (op.branch_id) branchId = op.branch_id;
    }
  } catch {
    // cookie missing or malformed — use owner defaults
  }

  return {
    businessId: profile.business_id,
    branchId,
    staffId,
    error: null,
  };
}
