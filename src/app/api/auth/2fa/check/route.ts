import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { DEVICE_COOKIE, sha256Hex } from "@/lib/two-factor";

/**
 * After the password: does this person still need the email code on this device?
 * Owners, managers and platform admins do, unless this device is already verified.
 * `enabled` is kept for the login page: true = show the code step.
 */
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ enabled: false });

  const token = cookies().get(DEVICE_COOKIE)?.value;
  const { data: status, error } = await supabase.rpc("two_factor_status", {
    p_token_hash: token ? await sha256Hex(token) : null,
  });
  if (error) {
    console.error("[2fa/check] status error:", error.message);
    // Fail closed: ask for the code rather than letting someone in unchecked.
    return NextResponse.json({ enabled: true });
  }

  const email = user.email ?? "";
  const masked = email.replace(/(.{1,3})(.*)(@.+)/, (_: string, a: string, b: string, c: string) => a + b.replace(/./g, "*") + c);
  return NextResponse.json({ enabled: status === "required", masked_email: masked });
}
