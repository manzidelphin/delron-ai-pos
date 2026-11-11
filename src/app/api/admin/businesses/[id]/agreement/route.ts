import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkPlatformAdmin } from "@/lib/admin-auth";

/**
 * Data for a business's signed agreement PDF (platform admins only):
 * the business, its owner, and its latest acceptance of the Terms.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { error } = await checkPlatformAdmin();
  if (error) return error;

  const admin = createAdminClient();
  const [bizRes, ownerRes, accRes] = await Promise.all([
    admin.from("businesses").select("id, name, location, phone, email, created_at").eq("id", params.id).single(),
    admin.from("staff").select("name, email, phone").eq("business_id", params.id).eq("role", "owner").order("created_at").limit(1),
    admin.from("agreement_acceptances").select("*").eq("business_id", params.id).order("accepted_at", { ascending: false }).limit(1),
  ]);

  if (!bizRes.data) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  return NextResponse.json({
    business: bizRes.data,
    owner: ownerRes.data?.[0] ?? null,
    acceptance: accRes.data?.[0] ?? null,
  });
}
