import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkPlatformAdmin } from "@/lib/admin-auth";

/**
 * GET — return full business/staff/branch context for the currently impersonated business.
 * Used by useBusiness hook when impersonation is active.
 */
export async function GET() {
  const { error } = await checkPlatformAdmin();
  if (error) return error;

  const cookieStore = cookies();
  const raw = cookieStore.get("admin_impersonation")?.value;
  if (!raw) {
    return NextResponse.json({ error: "No active impersonation" }, { status: 400 });
  }

  let imp: {
    target_business_id: string;
    target_business_name: string;
    target_owner_staff_id: string | null;
    target_main_branch_id: string | null;
  };

  try {
    imp = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid impersonation cookie" }, { status: 400 });
  }

  const admin = createAdminClient();

  const [bizRes, branchRes] = await Promise.all([
    admin.from("businesses").select("*").eq("id", imp.target_business_id).single(),
    admin.from("branches").select("*").eq("business_id", imp.target_business_id),
  ]);

  if (!bizRes.data) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  // Build a synthetic staff record representing the platform admin acting as owner
  let ownerStaff = null;
  if (imp.target_owner_staff_id) {
    const { data } = await admin
      .from("staff")
      .select("*")
      .eq("id", imp.target_owner_staff_id)
      .single();
    ownerStaff = data;
  }

  // Fallback: find any owner staff record
  if (!ownerStaff) {
    const { data } = await admin
      .from("staff")
      .select("*")
      .eq("business_id", imp.target_business_id)
      .eq("role", "owner")
      .eq("is_active", true)
      .limit(1)
      .single();
    ownerStaff = data;
  }

  return NextResponse.json({
    staff: ownerStaff,
    business: bizRes.data,
    branches: branchRes.data ?? [],
  });
}
