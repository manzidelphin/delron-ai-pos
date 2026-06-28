import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code      = searchParams.get("code");
  const errorCode = searchParams.get("error_code");
  const next      = searchParams.get("next") ?? "/dashboard";

  // Supabase sends error params when the OTP was already consumed (e.g. by a
  // link-safety scanner). Instead of showing a scary "invalid or expired" page,
  // send the user to verify-email which explains what happened and lets them
  // resend or just log in.
  if (errorCode === "otp_expired" || searchParams.get("error") === "access_denied") {
    console.warn("[auth/callback] otp_expired — token likely pre-fetched by email scanner");
    return NextResponse.redirect(`${origin}/verify-email?error=link_used`);
  }

  if (code) {
    // Pre-build the success redirect so we can attach session cookies to it.
    const redirectResponse = NextResponse.redirect(`${origin}${next}`);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
            cookiesToSet.forEach(({ name, value, options }) =>
              redirectResponse.cookies.set(name, value, options ?? {})
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return redirectResponse;
    }
    console.error("[auth/callback] Code exchange failed:", error.message);
  }

  return NextResponse.redirect(`${origin}/login?error=verification_failed`);
}
