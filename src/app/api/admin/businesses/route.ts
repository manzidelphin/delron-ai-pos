import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkPlatformAdmin } from "@/lib/admin-auth";

export async function GET() {
  const { error } = await checkPlatformAdmin();
  if (error) return error;

  const admin = createAdminClient();

  const { data: businesses, error: bizErr } = await admin
    .from("businesses")
    .select("*")
    .order("created_at", { ascending: false });

  if (bizErr || !businesses) {
    return NextResponse.json({ error: bizErr?.message ?? "Failed to load businesses" }, { status: 500 });
  }

  const ids = businesses.map((b) => b.id);

  // Fetch active staff (one query)
  const { data: allStaff } = await admin
    .from("staff")
    .select("business_id")
    .in("business_id", ids)
    .eq("is_active", true);

  const staffCountMap = new Map<string, number>();
  allStaff?.forEach((s) => {
    staffCountMap.set(s.business_id, (staffCountMap.get(s.business_id) ?? 0) + 1);
  });

  // Latest transaction per business (ordered desc, take first per business)
  const { data: txns } = await admin
    .from("transactions")
    .select("business_id, created_at")
    .in("business_id", ids)
    .order("created_at", { ascending: false });

  const lastActivityMap = new Map<string, string>();
  txns?.forEach((t) => {
    if (!lastActivityMap.has(t.business_id)) {
      lastActivityMap.set(t.business_id, t.created_at);
    }
  });

  // Owner emails from auth.users
  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emailMap = new Map(users.map((u) => [u.id, u.email ?? null]));

  const result = businesses.map((b) => ({
    ...b,
    owner_email: emailMap.get(b.owner_id) ?? null,
    staff_count: staffCountMap.get(b.id) ?? 0,
    last_activity: lastActivityMap.get(b.id) ?? null,
  }));

  return NextResponse.json(result);
}
