import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";

export async function GET() {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();
  const today = new Date().toISOString().split("T")[0];
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split("T")[0];

  const { data: credits } = await supabase
    .from("credits")
    .select("*")
    .eq("business_id", auth.businessId);

  const all = credits ?? [];

  const totalOutstanding = all
    .filter((c) => c.status !== "paid")
    .reduce((sum: number, c) => sum + (c.balance ?? 0), 0);

  const overdue = all.filter((c) => c.status === "overdue");
  const overdueAmount = overdue.reduce((sum: number, c) => sum + (c.balance ?? 0), 0);

  const dueToday = all.filter(
    (c) => c.due_date === today && c.status !== "paid"
  );
  const dueTodayAmount = dueToday.reduce((sum: number, c) => sum + (c.balance ?? 0), 0);

  const paidThisMonth = all.filter(
    (c) => c.status === "paid" && c.paid_at && c.paid_at >= startOfMonth
  );
  const paidThisMonthAmount = paidThisMonth.reduce(
    (sum: number, c) => sum + (c.total_amount ?? 0),
    0
  );

  const recentCredits = [...all]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 10);

  return NextResponse.json({
    total_outstanding: totalOutstanding,
    overdue_count: overdue.length,
    overdue_amount: overdueAmount,
    due_today_count: dueToday.length,
    due_today_amount: dueTodayAmount,
    paid_this_month_count: paidThisMonth.length,
    paid_this_month_amount: paidThisMonthAmount,
    recent_credits: recentCredits,
  });
}
