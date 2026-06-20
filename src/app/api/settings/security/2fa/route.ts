import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth";

export async function GET() {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;
  const { businessId } = auth;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("businesses")
    .select("two_factor_enabled")
    .eq("id", businessId)
    .single();

  return NextResponse.json({ enabled: data?.two_factor_enabled ?? false });
}

export async function PUT(req: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;
  const { businessId, ownerStaffId } = auth;

  // Only owners can change 2FA
  const supabase = createAdminClient();
  const { data: me } = await supabase.from("staff").select("role").eq("id", ownerStaffId).single();
  if (me?.role !== "owner") {
    return NextResponse.json({ error: "Only the owner can change 2FA settings" }, { status: 403 });
  }

  const { enabled } = await req.json() as { enabled: boolean };

  const { error } = await supabase
    .from("businesses")
    .update({ two_factor_enabled: !!enabled })
    .eq("id", businessId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ enabled: !!enabled });
}
