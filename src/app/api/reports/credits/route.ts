import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const today = new Date().toISOString().split("T")[0];
  const startOfMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  )
    .toISOString()
    .split("T")[0];

  const from = searchParams.get("from") ?? startOfMonth;
  const to = searchParams.get("to") ?? today;
  const toEnd = to + "T23:59:59.999Z";

  const supabase = createClient();

  // All credits for aging and current state
  const { data: allCredits } = await supabase
    .from("credits")
    .select("*")
    .eq("business_id", auth.businessId)
    .order("created_at", { ascending: false });

  // Credits created in period
  const { data: periodCredits } = await supabase
    .from("credits")
    .select("*")
    .eq("business_id", auth.businessId)
    .gte("created_at", from)
    .lte("created_at", toEnd);

  const credits = allCredits ?? [];
  const period = periodCredits ?? [];

  // KPIs
  const totalGiven = period.reduce((s, c) => s + (c.total_amount ?? 0), 0);
  const totalCollected = period.reduce((s, c) => s + (c.amount_paid ?? 0), 0);
  const collectionRate =
    totalGiven > 0 ? Math.round((totalCollected / totalGiven) * 100) : 0;
  const stillOutstanding = credits
    .filter((c) => c.status !== "paid")
    .reduce((s, c) => s + (c.balance ?? 0), 0);

  // Avg days to pay (only for paid credits)
  const paidCredits = period.filter((c) => c.status === "paid" && c.paid_at);
  const avgDaysToPay =
    paidCredits.length > 0
      ? Math.round(
          paidCredits.reduce((s, c) => {
            const created = new Date(c.created_at).getTime();
            const paid = new Date(c.paid_at!).getTime();
            return s + (paid - created) / (1000 * 60 * 60 * 24);
          }, 0) / paidCredits.length
        )
      : 0;

  // Monthly chart (given vs collected per month)
  const monthlyMap: Record<string, { given: number; collected: number }> = {};
  for (const c of credits) {
    const month = c.created_at.substring(0, 7); // YYYY-MM
    if (!monthlyMap[month]) monthlyMap[month] = { given: 0, collected: 0 };
    monthlyMap[month].given += c.total_amount ?? 0;
    monthlyMap[month].collected += c.amount_paid ?? 0;
  }
  const monthlyChart = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, vals]) => ({ month, ...vals }));

  // Outstanding by customer (top 10)
  const customerMap: Record<string, number> = {};
  for (const c of credits.filter((c) => c.status !== "paid")) {
    const key = c.customer_name;
    customerMap[key] = (customerMap[key] ?? 0) + (c.balance ?? 0);
  }
  const topDebtors = Object.entries(customerMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, amount]) => ({ name, amount }));

  // Status distribution
  const statusMap: Record<string, number> = {};
  for (const c of credits) {
    statusMap[c.status] = (statusMap[c.status] ?? 0) + 1;
  }
  const statusDist = Object.entries(statusMap).map(([name, value]) => ({
    name,
    value,
  }));

  // Aging report for unpaid credits
  const todayMs = new Date().getTime();
  const agingTable = credits
    .filter((c) => c.status !== "paid")
    .map((c) => {
      const dueMs = new Date(c.due_date).getTime();
      const daysOverdue = Math.max(
        0,
        Math.floor((todayMs - dueMs) / (1000 * 60 * 60 * 24))
      );
      const bucket =
        daysOverdue === 0
          ? "current"
          : daysOverdue <= 7
          ? "0-7 days"
          : daysOverdue <= 30
          ? "8-30 days"
          : "30+ days";
      return {
        customer_name: c.customer_name,
        customer_phone: c.customer_phone,
        total_owed: c.balance,
        due_date: c.due_date,
        days_overdue: daysOverdue,
        bucket,
        status: c.status,
        last_payment: c.paid_at,
      };
    })
    .sort((a, b) => b.days_overdue - a.days_overdue);

  // Collection history
  const history = period
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .map((c) => ({
      created_at: c.created_at,
      customer_name: c.customer_name,
      total_amount: c.total_amount,
      amount_paid: c.amount_paid,
      balance: c.balance,
      status: c.status,
      due_date: c.due_date,
    }));

  return NextResponse.json({
    kpis: {
      total_given: totalGiven,
      total_collected: totalCollected,
      collection_rate: collectionRate,
      still_outstanding: stillOutstanding,
      avg_days_to_pay: avgDaysToPay,
    },
    monthly_chart: monthlyChart,
    top_debtors: topDebtors,
    status_dist: statusDist,
    aging_table: agingTable,
    history,
  });
}
