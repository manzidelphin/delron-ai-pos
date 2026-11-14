import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEVICE_COOKIE, sha256Hex } from "@/lib/two-factor";

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Forward pathname as a request header so Server Component layouts can read it
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          const updatedHeaders = new Headers(request.headers);
          updatedHeaders.set("x-pathname", pathname);
          supabaseResponse = NextResponse.next({
            request: { headers: updatedHeaders },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Email verification gate — redirect unverified owners to the check-inbox page.
  // Exempt: /auth/* (the callback that sets email_confirmed_at), /verify-email itself,
  // and all /api/* routes (server-side calls that don't need browser auth).
  if (user && !user.email_confirmed_at) {
    const isVerifyExempt =
      pathname === "/verify-email" ||
      pathname.startsWith("/auth/") ||
      pathname.startsWith("/api/");
    if (!isVerifyExempt) {
      console.log("[middleware] Unverified email → /verify-email for user:", user.id);
      const url = request.nextUrl.clone();
      url.pathname = "/verify-email";
      return NextResponse.redirect(url);
    }
  }

  const publicRoutes = [
    "/login", "/onboarding", "/", "/pos-login",
    "/api/auth/pos-staff", "/api/auth/pin-login", "/api/auth/complete-onboarding",
    "/api/auth/session-business", "/api/auth/staff-by-phone", "/api/auth/staff-login",
    "/api/cron",
    "/api/webhooks",
    "/supermarket", "/supermarket/pos",
    "/customer-display",
    "/offline.html",
    "/sitemap.xml",
    "/robots.txt",
    "/terms",
    "/privacy",
    "/verify-email",  // accessible without session (user may have closed browser)
    "/auth",          // covers /auth/callback — must be reachable without session
  ];
  const isPublicRoute = publicRoutes.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(route + "?") ||
      pathname.startsWith(route + "/")
  );

  if (!user && !isPublicRoute) {
    // Allow PIN-authenticated operators (cashiers on dedicated POS devices).
    const operatorCookie = request.cookies.get("pos_operator")?.value;
    if (operatorCookie) {
      try {
        const op = JSON.parse(operatorCookie) as { id?: string; role?: string };
        if (op.id && op.role) {
          console.log("[middleware] PIN operator allowed:", op.role, "→", pathname);
          return supabaseResponse;
        }
      } catch {
        // malformed cookie — fall through to redirect
      }
    }

    console.log("[middleware] No session, no valid pos_operator → redirect /login from:", pathname);
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // ── Email code (2FA) for owners, managers and platform admins ──────────────
  // Until this device has passed the emailed code, pages send them to the code
  // step and data requests are refused. The code routes themselves (/api/auth/*)
  // and public pages stay reachable. PIN staff never need it.
  const twoFactorStatus = async (): Promise<string> => {
    const token = request.cookies.get(DEVICE_COOKIE)?.value;
    const { data, error } = await supabase.rpc("two_factor_status", {
      p_token_hash: token ? await sha256Hex(token) : null,
    });
    if (error) console.error("[middleware] two_factor_status error:", error.message);
    return error ? "required" : String(data); // fail closed
  };
  const needsCodeCheck =
    !!user &&
    !pathname.startsWith("/api/auth/") &&
    (!isPublicRoute || pathname === "/login" || pathname.startsWith("/api/"));
  const codeRequired = needsCodeCheck ? (await twoFactorStatus()) === "required" : false;

  if (codeRequired && pathname !== "/login") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Enter the code sent to your email to continue.", code: "two_factor_required" },
        { status: 401 }
      );
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "?verify=1";
    return NextResponse.redirect(url);
  }

  // Protect /admin routes: requires a record in platform_admins (independent of staff/business).
  if (user && pathname.startsWith("/admin") && !pathname.startsWith("/api/admin")) {
    const { data: adminRecord } = await supabase
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!adminRecord) {
      console.log("[middleware] /admin access denied — not in platform_admins:", user.id);
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // A signed-in user on /login goes to their home. Without a business (staff row) the
  // dashboard would send them straight back here, so: platform admins go to /admin,
  // and anyone else is left on /login instead of bouncing in a loop.
  if (user && pathname === "/login" && !codeRequired) {
    const { data: staffRow } = await supabase
      .from("staff").select("business_id").eq("user_id", user.id).eq("is_active", true).maybeSingle();
    let target: string | null = staffRow ? "/dashboard" : null;
    if (!target) {
      const { data: adminRecord } = await supabase
        .from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle();
      if (adminRecord) target = "/admin";
    }
    if (target) {
      const url = request.nextUrl.clone();
      url.pathname = target;
      return NextResponse.redirect(url);
    }
  }

  // ── Suspension hard lock ────────────────────────────────────────────────────
  // For authenticated users on non-public, non-API, non-admin, non-suspended routes:
  // check if their business is suspended and redirect to /account-suspended.
  // Platform admins are excluded; impersonating admins pass through (they need access
  // to suspended businesses to help resolve billing issues).
  // One query for the user's staff row + business status; reused for the device stamp below.
  let staffBusinessId: string | null | undefined; // undefined = not looked up yet
  const lookupStaff = async () => {
    const { data } = await supabase
      .from("staff")
      .select("business_id, businesses(subscription_status)")
      .eq("user_id", user!.id)
      .eq("is_active", true)
      .maybeSingle();
    staffBusinessId = data?.business_id ?? null;
    const biz = data?.businesses as { subscription_status?: string } | { subscription_status?: string }[] | null | undefined;
    return Array.isArray(biz) ? biz[0]?.subscription_status : biz?.subscription_status;
  };

  if (
    user &&
    !isPublicRoute &&
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/admin") &&
    pathname !== "/account-suspended"
  ) {
    // Impersonating admins pass through (they need access to suspended businesses).
    const impCookie = request.cookies.get("admin_impersonation")?.value;
    let isImpersonating = false;
    if (impCookie) {
      try {
        const imp = JSON.parse(impCookie) as { target_business_id?: string };
        isImpersonating = !!imp.target_business_id;
      } catch { /* ignore */ }
    }

    if (!isImpersonating && (await lookupStaff()) === "suspended") {
      // Platform admins are exempt — only checked in the rare suspended case.
      const { data: adminRecord } = await supabase
        .from("platform_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!adminRecord) {
        console.log("[middleware] Suspended business → /account-suspended for user:", user.id);
        const url = request.nextUrl.clone();
        url.pathname = "/account-suspended";
        return NextResponse.redirect(url);
      }
    }
  }

  // Stamp this device with the owner's businessId so /pos-login works without a session
  if (user && !request.cookies.get("pos_business_id")?.value) {
    try {
      if (staffBusinessId === undefined) await lookupStaff();
      const staffRecord = staffBusinessId ? { business_id: staffBusinessId } : null;
      if (staffRecord?.business_id) {
        supabaseResponse.cookies.set("pos_business_id", staffRecord.business_id, {
          httpOnly: false,
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 30,
        });
      }
    } catch {
      // fail silently — pos-login shows "ask owner to log in" if cookie is missing
    }
  }

  return supabaseResponse;
}
