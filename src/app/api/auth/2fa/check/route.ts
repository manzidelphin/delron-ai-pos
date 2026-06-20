import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ enabled: false });

  const admin = createAdminClient();
  const { data: staffRecord } = await admin
    .from("staff")
    .select("business_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!staffRecord) return NextResponse.json({ enabled: false });

  const { data: business } = await admin
    .from("businesses")
    .select("two_factor_enabled, email, name")
    .eq("id", staffRecord.business_id)
    .single();

  const enabled = business?.two_factor_enabled ?? false;
  const email   = user.email ?? business?.email ?? "";
  const masked  = email.replace(/(.{1,3})(.*)(@.+)/, (_: string, a: string, b: string, c: string) => a + b.replace(/./g, "*") + c);

  return NextResponse.json({
    enabled,
    email,
    masked_email: masked,
    business_name: business?.name ?? "DELRON AI POS",
  });
}
