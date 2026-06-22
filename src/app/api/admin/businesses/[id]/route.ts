import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkPlatformAdmin } from "@/lib/admin-auth";
import { startOfDay, startOfWeek, startOfMonth } from "date-fns";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { error } = await checkPlatformAdmin();
  if (error) return error;

  const { id } = params;
  const admin = createAdminClient();

  const [bizRes, staffRes, branchRes, txnRes] = await Promise.all([
    admin.from("businesses").select("*").eq("id", id).single(),
    admin.from("staff").select("id, name, email, phone, role, is_active, created_at, user_id").eq("business_id", id).order("created_at"),
    admin.from("branches").select("*").eq("business_id", id),
    admin.from("transactions").select("total, created_at, payment_method").eq("business_id", id).order("created_at", { ascending: false }),
  ]);

  if (!bizRes.data) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  // Get owner email
  const { data: { user: ownerUser } } = await admin.auth.admin.getUserById(bizRes.data.owner_id);

  // Revenue aggregation
  const now = new Date();
  const todayStart = startOfDay(now).toISOString();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
  const monthStart = startOfMonth(now).toISOString();

  let revenueTotal = 0;
  let revenueToday = 0;
  let revenueWeek = 0;
  let revenueMonth = 0;
  let txnTotal = 0;
  let txnToday = 0;
  let txnMonth = 0;

  txnRes.data?.forEach((t) => {
    const amount = Number(t.total);
    revenueTotal += amount;
    txnTotal++;
    if (t.created_at >= todayStart) { revenueToday += amount; txnToday++; }
    if (t.created_at >= weekStart) revenueWeek += amount;
    if (t.created_at >= monthStart) { revenueMonth += amount; txnMonth++; }
  });

  return NextResponse.json({
    business: bizRes.data,
    owner_email: ownerUser?.email ?? null,
    staff: staffRes.data ?? [],
    branches: branchRes.data ?? [],
    revenue: {
      today: revenueToday,
      this_week: revenueWeek,
      this_month: revenueMonth,
      total: revenueTotal,
    },
    transaction_count: {
      today: txnToday,
      this_month: txnMonth,
      total: txnTotal,
    },
  });
}
