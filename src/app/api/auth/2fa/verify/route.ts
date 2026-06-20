import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await req.json() as { code?: string };
  if (!code || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Invalid code format" }, { status: 400 });
  }

  const admin = createAdminClient();
  const now   = new Date().toISOString();

  const { data: otp } = await admin
    .from("login_otps")
    .select("id, code, expires_at, used")
    .eq("user_id", user.id)
    .eq("used", false)
    .gte("expires_at", now)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!otp || otp.code !== code) {
    return NextResponse.json({ error: "Incorrect or expired code. Try again." }, { status: 401 });
  }

  // Mark used
  await admin.from("login_otps").update({ used: true }).eq("id", otp.id);

  return NextResponse.json({ valid: true });
}
