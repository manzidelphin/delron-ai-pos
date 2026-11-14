import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOTPEmail } from "@/lib/email";
import { CODE_TTL_MS, RESEND_COOLDOWN_MS, codeHash, newCode } from "@/lib/two-factor";

/** Emails a new 6-digit sign-in code to the signed-in user (at most one every 30 s). */
export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const to = user.email ?? "";
  if (!to) return NextResponse.json({ error: "No email address on account" }, { status: 400 });

  const admin = createAdminClient();

  // Rate limit: one code per 30 seconds per user.
  const { data: last } = await admin
    .from("login_otps").select("created_at")
    .eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (last?.created_at && Date.now() - new Date(last.created_at).getTime() < RESEND_COOLDOWN_MS) {
    const wait = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - new Date(last.created_at).getTime())) / 1000);
    return NextResponse.json({ error: `Please wait ${wait} seconds before asking for a new code.` }, { status: 429 });
  }

  // Business name for the email.
  const { data: staffRecord } = await admin
    .from("staff").select("business_id").eq("user_id", user.id).eq("is_active", true).maybeSingle();
  const { data: business } = staffRecord
    ? await admin.from("businesses").select("name").eq("id", staffRecord.business_id).single()
    : { data: null };

  const code = newCode();
  // Cancel any earlier unused code, then store only the hash of the new one.
  await admin.from("login_otps").update({ used: true }).eq("user_id", user.id).eq("used", false);
  const { error } = await admin.from("login_otps").insert({
    user_id: user.id,
    code: await codeHash(user.id, code),
    expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
    used: false,
    attempts: 0,
  });
  if (error) {
    console.error("[2fa/send] insert error:", error.message);
    return NextResponse.json({ error: "Failed to generate code" }, { status: 500 });
  }

  const sent = await sendOTPEmail(to, code, business?.name ?? "DELRON AI POS");
  if (!sent) return NextResponse.json({ error: "Failed to send email" }, { status: 500 });

  const masked = to.replace(/(.{1,3})(.*)(@.+)/, (_, a, b, c) => a + b.replace(/./g, "*") + c);
  return NextResponse.json({ sent: true, masked_email: masked });
}
