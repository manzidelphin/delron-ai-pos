import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  console.log(
    "[middleware] path:", pathname,
    "| pos_operator:", request.cookies.get("pos_operator")?.value ?? "(not present)"
  );

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
    "/api/auth/session-business", "/api/auth/staff-by-phone",
    "/api/cron",
    "/api/webhooks",
    "/supermarket", "/supermarket/pos",
    "/customer-display",
    "/api/pwa-icon",
    "/offline.html",
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

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // ── Suspension hard lock ────────────────────────────────────────────────────
  // For authenticated users on non-public, non-API, non-admin, non-suspended routes:
  // check if their business is suspended and redirect to /account-suspended.
  // Platform admins are excluded; impersonating admins pass through (they need access
  // to suspended businesses to help resolve billing issues).
  if (
    user &&
    !isPublicRoute &&
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/admin") &&
    pathname !== "/account-suspended"
  ) {
    // Allow platform admins through unconditionally
    const { data: adminRecord } = await supabase
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!adminRecord) {
      // Check for active impersonation (admin viewing a suspended business — let through)
      const impCookie = request.cookies.get("admin_impersonation")?.value;
      let isImpersonating = false;
      if (impCookie) {
        try {
          const imp = JSON.parse(impCookie) as { target_business_id?: string };
          isImpersonating = !!imp.target_business_id;
        } catch { /* ignore */ }
      }

      if (!isImpersonating) {
        // Look up user's business subscription status
        const { data: staffRecord } = await supabase
          .from("staff")
          .select("business_id")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .maybeSingle();

        if (staffRecord?.business_id) {
          const { data: bizStatus } = await supabase
            .from("businesses")
            .select("subscription_status")
            .eq("id", staffRecord.business_id)
            .single();

          if (bizStatus?.subscription_status === "suspended") {
            console.log("[middleware] Suspended business → /account-suspended for user:", user.id);
            const url = request.nextUrl.clone();
            url.pathname = "/account-suspended";
            return NextResponse.redirect(url);
          }
        }
      }
    }
  }

  // Stamp this device with the owner's businessId so /pos-login works without a session
  if (user && !request.cookies.get("pos_business_id")?.value) {
    try {
      const { data: staffRecord } = await supabase
        .from("staff")
        .select("business_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();
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
