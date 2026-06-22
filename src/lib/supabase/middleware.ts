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
          // Update mutable request cookies (this also updates request.headers.cookie)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Rebuild headers from the updated request (includes new cookies) + x-pathname
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

  const publicRoutes = [
    "/login", "/onboarding", "/", "/pos-login",
    "/api/auth/pos-staff", "/api/auth/pin-login",
    "/api/cron",
    "/supermarket", "/supermarket/pos",
    "/customer-display",
    "/api/pwa-icon",
    "/offline.html",
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
