import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOTPEmail } from "@/lib/email";

function generateOTP(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // Get business name for the email
  const { data: staffRecord } = await admin
    .from("staff")
    .select("business_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  const { data: business } = staffRecord
    ? await admin.from("businesses").select("name").eq("id", staffRecord.business_id).single()
    : { data: null };

  const code       = generateOTP();
  const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

  // Invalidate any previous unused OTPs for this user
  await admin.from("login_otps").update({ used: true }).eq("user_id", user.id).eq("used", false);

  // Insert new OTP
  const { error } = await admin.from("login_otps").insert({
    user_id: user.id,
    code,
    expires_at,
    used: false,
  });

  if (error) {
    console.error("[2fa/send] insert error:", error.message);
    return NextResponse.json({ error: "Failed to generate code" }, { status: 500 });
  }

  const to = user.email ?? "";
  if (!to) return NextResponse.json({ error: "No email address on account" }, { status: 400 });

  const sent = await sendOTPEmail(to, code, business?.name ?? "DELRON AI POS");
  if (!sent) return NextResponse.json({ error: "Failed to send email" }, { status: 500 });

  const masked = to.replace(/(.{1,3})(.*)(@.+)/, (_, a, b, c) => a + b.replace(/./g, "*") + c);

  return NextResponse.json({ sent: true, masked_email: masked });
}
