import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasAcceptedCurrentTerms, recordAcceptance } from "@/lib/agreement";
import { TERMS_VERSION } from "@/lib/legal/terms";

/**
 * GET: does the signed-in owner still need to accept the current Terms?
 * Only the business owner signs; other roles and impersonating admins never do.
 */
export async function GET() {
  const auth = await getAuthContext();
  if (auth.error) return NextResponse.json({ needs_acceptance: false });
  if (auth.role !== "owner" || cookies().get("admin_impersonation")?.value) {
    return NextResponse.json({ needs_acceptance: false });
  }

  const admin = createAdminClient();
  const { data: owner } = await admin
    .from("staff").select("role").eq("id", auth.ownerStaffId).eq("business_id", auth.businessId).maybeSingle();
  if (owner?.role !== "owner") return NextResponse.json({ needs_acceptance: false });

  const accepted = await hasAcceptedCurrentTerms(admin, auth.businessId);
  return NextResponse.json({ needs_acceptance: !accepted, terms_version: TERMS_VERSION });
}

/** POST: the owner accepts the current Terms and Privacy Policy. */
export async function POST(request: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;
  if (cookies().get("admin_impersonation")?.value) {
    return NextResponse.json({ error: "Only the business owner can accept the Terms" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  if (body.accept !== true) {
    return NextResponse.json({ error: "Tick the box to accept the Terms" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: owner } = await admin
    .from("staff").select("id, name, email, phone, role, user_id")
    .eq("id", auth.ownerStaffId).eq("business_id", auth.businessId).maybeSingle();
  if (owner?.role !== "owner") {
    return NextResponse.json({ error: "Only the business owner can accept the Terms" }, { status: 403 });
  }

  if (await hasAcceptedCurrentTerms(admin, auth.businessId)) return NextResponse.json({ ok: true });

  const { data: business } = await admin.from("businesses").select("name").eq("id", auth.businessId).single();
  const { error } = await recordAcceptance(admin, request, {
    businessId: auth.businessId,
    businessName: business?.name ?? "",
    userId: owner.user_id,
    name: owner.name,
    email: owner.email,
    phone: owner.phone,
    method: "reaccept",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
