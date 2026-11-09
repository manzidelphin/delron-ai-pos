import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cookies, headers } from "next/headers";
import DashboardShell from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // TEMPORARY BYPASS: POS terminals skip auth here — the pages handle their own PIN-session auth.
  // This lets /supermarket/pos and /bar/pos render even before cookie propagation is fully debugged.
  const headersList = headers();
  const currentPath = headersList.get("x-pathname") ?? "";
  console.log("[layout] x-pathname:", currentPath);

  if (
    currentPath.startsWith("/supermarket/pos") ||
    currentPath.startsWith("/bar/pos")
  ) {
    console.log("[layout] POS terminal bypass — skipping auth check");
    return <DashboardShell>{children}</DashboardShell>;
  }

  const supabase = createClient();
  // Only "is someone signed in?" is needed here; getClaims() avoids a network
  // round trip when the JWT can be verified locally (middleware already ran getUser()).
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims?.sub ? { id: claimsData.claims.sub } : null;

  if (!user) {
    // Allow PIN-authenticated operators (cashiers on dedicated POS devices).
    const cookieStore = cookies();
    const allCookies = cookieStore.getAll().map((c) => c.name);
    console.log("[layout] No Supabase session. Cookies present:", allCookies);

    const operatorRaw = cookieStore.get("pos_operator")?.value;
    if (operatorRaw) {
      try {
        const op = JSON.parse(operatorRaw) as { id?: string; role?: string };
        if (op.id && op.role) {
          console.log("[layout] PIN operator allowed through:", op.role);
          return <DashboardShell>{children}</DashboardShell>;
        }
      } catch {
        console.log("[layout] pos_operator cookie present but failed to parse");
      }
    }

    console.log("[layout] No valid session or PIN cookie — redirecting to /login");
    redirect("/login");
  }

  return <DashboardShell>{children}</DashboardShell>;
}
