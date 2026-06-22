import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkPlatformAdmin } from "@/lib/admin-auth";

const COOKIE_NAME = "admin_impersonation";
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours

/** GET — return current impersonation status (reads cookie only, no DB query) */
export async function GET() {
  const cookieStore = cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return NextResponse.json({ active: false });

  try {
    const imp = JSON.parse(raw) as {
      target_business_id: string;
      target_business_name: string;
    };
    return NextResponse.json({
      active: true,
      business_id: imp.target_business_id,
      business_name: imp.target_business_name,
    });
  } catch {
    return NextResponse.json({ active: false });
  }
}

/** POST — start impersonating a business. Body: { business_id: string } */
export async function POST(req: Request) {
  const { userId, staffId, error } = await checkPlatformAdmin();
  if (error || !userId) return error ?? NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { business_id } = await req.json();
  if (!business_id) return NextResponse.json({ error: "business_id required" }, { status: 400 });

  const adminClient = createAdminClient();

  // Fetch target business
  const { data: business } = await adminClient
    .from("businesses")
    .select("id, name")
    .eq("id", business_id)
    .single();

  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  // Find the owner's staff record for this business
  const { data: ownerStaff } = await adminClient
    .from("staff")
    .select("id")
    .eq("business_id", business_id)
    .eq("role", "owner")
    .eq("is_active", true)
    .single();

  // Find the main branch
  const { data: mainBranch } = await adminClient
    .from("branches")
    .select("id")
    .eq("business_id", business_id)
    .eq("is_main", true)
    .maybeSingle();

  // If no main branch, get any branch
  const { data: anyBranch } = mainBranch
    ? { data: mainBranch }
    : await adminClient.from("branches").select("id").eq("business_id", business_id).limit(1).single();

  // Log impersonation to audit trail
  await adminClient.from("admin_audit_log").insert({
    admin_user_id: userId,
    admin_staff_id: staffId,
    target_business_id: business_id,
    action: "impersonate_start",
    metadata: { target_business_name: business.name },
  });

  const cookieValue = JSON.stringify({
    target_business_id: business.id,
    target_business_name: business.name,
    target_owner_staff_id: ownerStaff?.id ?? null,
    target_main_branch_id: anyBranch?.id ?? null,
  });

  const response = NextResponse.json({ success: true, business_name: business.name });
  response.cookies.set(COOKIE_NAME, cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  return response;
}

/** DELETE — end impersonation session */
export async function DELETE() {
  const { userId, staffId, error } = await checkPlatformAdmin();
  if (error || !userId) return error ?? NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Read current impersonation for audit log
  const cookieStore = cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  let targetBusinessId: string | null = null;

  if (raw) {
    try {
      const imp = JSON.parse(raw);
      targetBusinessId = imp.target_business_id ?? null;
    } catch { /* ignore */ }
  }

  const adminClient = createAdminClient();
  await adminClient.from("admin_audit_log").insert({
    admin_user_id: userId,
    admin_staff_id: staffId,
    target_business_id: targetBusinessId,
    action: "impersonate_end",
    metadata: {},
  });

  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
