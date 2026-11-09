import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isManagementRole, roleHomePath } from "@/lib/roles";
import type { BusinessModule, UserRole } from "@/types";

/**
 * For API routes: returns a 403 response when the caller isn't owner/manager,
 * or null when they may continue.
 *   const denied = forbidUnlessManagement(auth.role);
 *   if (denied) return denied;
 */
export function forbidUnlessManagement(role: UserRole | null | undefined): NextResponse | null {
  if (isManagementRole(role)) return null;
  return NextResponse.json({ error: "Only owners and managers can access this." }, { status: 403 });
}

/**
 * Server-side page guard for owner/manager-only sections (dashboard, reports).
 * Not signed in → /login. Any other role → that role's own work screen.
 */
export async function requireManagementPage(): Promise<void> {
  const auth = await getAuthContext();
  if (auth.error) redirect("/login");
  if (isManagementRole(auth.role)) return;

  const { data } = await createAdminClient()
    .from("businesses")
    .select("modules")
    .eq("id", auth.businessId)
    .single();

  redirect(roleHomePath(auth.role, (data?.modules ?? []) as BusinessModule[]));
}
