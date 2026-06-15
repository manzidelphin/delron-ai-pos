import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/** Resolve the authenticated staff member's business_id and branch_id.
 *  Returns null + a 401 response if unauthenticated or no staff record. */
export async function getAuthContext(): Promise<
  | { businessId: string; branchId: string; staffId: string; error: null }
  | { businessId: null; branchId: null; staffId: null; error: NextResponse }
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
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

  return {
    businessId: profile.business_id,
    branchId: profile.branch_id ?? profile.business_id,
    staffId: profile.id,
    error: null,
  };
}
