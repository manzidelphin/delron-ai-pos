import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth";

export async function GET() {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;
  const { staffId } = auth;

  const supabase = createAdminClient();

  const { data: shift } = await supabase
    .from("shifts")
    .select("*")
    .eq("staff_id", staffId)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ shift: shift ?? null });
}
