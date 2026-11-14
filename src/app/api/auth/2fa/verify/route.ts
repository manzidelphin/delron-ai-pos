import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DEVICE_COOKIE, MAX_ATTEMPTS, SESSION_VERIFY_HOURS, TRUSTED_DAYS,
  codeHash, newDeviceToken, safeEqual, sha256Hex,
} from "@/lib/two-factor";

/**
 * Checks the emailed code. On success this device is marked verified (httpOnly
 * cookie + hashed token in trusted_devices): 30 days with "Trust this device",
 * otherwise 12 hours. 5 wrong tries cancel the code.
 */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as { code?: string; trust?: boolean };
  const code = String(body.code ?? "");
  if (!/^\d{6}$/.test(code)) return NextResponse.json({ error: "Enter the 6-digit code" }, { status: 400 });

  const admin = createAdminClient();
  const { data: otp } = await admin
    .from("login_otps")
    .select("id, code, attempts")
    .eq("user_id", user.id)
    .eq("used", false)
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!otp) return NextResponse.json({ error: "This code has expired. Ask for a new one." }, { status: 401 });

  if (!safeEqual(otp.code, await codeHash(user.id, code))) {
    const attempts = Number(otp.attempts ?? 0) + 1;
    const cancelled = attempts >= MAX_ATTEMPTS;
    await admin.from("login_otps").update({ attempts, ...(cancelled ? { used: true } : {}) }).eq("id", otp.id);
    return NextResponse.json(
      { error: cancelled ? "Too many wrong tries. Ask for a new code." : `Wrong code. ${MAX_ATTEMPTS - attempts} tries left.` },
      { status: 401 }
    );
  }

  await admin.from("login_otps").update({ used: true }).eq("id", otp.id);

  // Mark this device verified.
  const trust = body.trust === true;
  const token = newDeviceToken();
  const expires = new Date(Date.now() + (trust ? TRUSTED_DAYS * 86_400_000 : SESSION_VERIFY_HOURS * 3_600_000));
  const { error } = await admin.from("trusted_devices").insert({
    user_id: user.id,
    token_hash: await sha256Hex(token),
    remembered: trust,
    user_agent: (req.headers.get("user-agent") ?? "").slice(0, 300) || null,
    expires_at: expires.toISOString(),
  });
  if (error) {
    console.error("[2fa/verify] device insert error:", error.message);
    return NextResponse.json({ error: "Could not finish signing in. Try again." }, { status: 500 });
  }

  const res = NextResponse.json({ valid: true });
  res.cookies.set(DEVICE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // Trusted: survives closing the browser for 30 days. Otherwise: until the browser closes.
    ...(trust ? { maxAge: TRUSTED_DAYS * 86_400 } : {}),
  });
  return res;
}
