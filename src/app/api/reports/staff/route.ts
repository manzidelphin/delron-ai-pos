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

  const [staffRes, txRes, creditsRes, ordersRes] = await Promise.all([
    supabase
      .from("staff")
      .select("id, name, role, is_active")
      .eq("business_id", auth.businessId)
      .eq("is_active", true),
    supabase
      .from("transactions")
      .select("id, total, cashier_id, created_at, payment_method")
      .eq("business_id", auth.businessId)
      .gte("created_at", from)
      .lte("created_at", toEnd),
    supabase
      .from("credits")
      .select("id, created_by, total_amount")
      .eq("business_id", auth.businessId)
      .gte("created_at", from)
      .lte("created_at", toEnd),
    supabase
      .from("orders")
      .select("id, staff_id, total, discount, created_at")
      .eq("business_id", auth.businessId)
      .eq("status", "completed")
      .gte("created_at", from)
      .lte("created_at", toEnd),
  ]);

  const staff = staffRes.data ?? [];
  const transactions = txRes.data ?? [];
  const credits = creditsRes.data ?? [];
  const orders = ordersRes.data ?? [];

  // Aggregate per staff member
  const txByStaff: Record<string, { count: number; revenue: number }> = {};
  for (const t of transactions) {
    const id = t.cashier_id ?? "unknown";
    if (!txByStaff[id]) txByStaff[id] = { count: 0, revenue: 0 };
    txByStaff[id].count++;
    txByStaff[id].revenue += t.total ?? 0;
  }

  const creditsByStaff: Record<string, number> = {};
  for (const c of credits) {
    const id = c.created_by ?? "unknown";
    creditsByStaff[id] = (creditsByStaff[id] ?? 0) + 1;
  }

  const discountsByStaff: Record<string, number> = {};
  for (const o of orders) {
    const id = o.staff_id ?? "unknown";
    discountsByStaff[id] = (discountsByStaff[id] ?? 0) + (o.discount ?? 0);
  }

  const performance = staff.map((s) => {
    const tx = txByStaff[s.id] ?? { count: 0, revenue: 0 };
    const avgTx = tx.count > 0 ? Math.round(tx.revenue / tx.count) : 0;
    return {
      id: s.id,
      name: s.name,
      role: s.role,
      transactions: tx.count,
      revenue: tx.revenue,
      avg_transaction: avgTx,
      credits_given: creditsByStaff[s.id] ?? 0,
      discounts_given: discountsByStaff[s.id] ?? 0,
    };
  });

  // Top performers
  const byRevenue = [...performance].sort((a, b) => b.revenue - a.revenue);
  const cashiers = performance.filter((s) =>
    ["cashier", "manager", "owner"].includes(s.role)
  );
  const waiters = performance.filter((s) => s.role === "waiter");

  return NextResponse.json({
    performance,
    top_performers: {
      best_revenue: byRevenue[0] ?? null,
      best_cashier: cashiers.sort((a, b) => b.revenue - a.revenue)[0] ?? null,
      best_waiter: waiters.sort((a, b) => b.transactions - a.transactions)[0] ?? null,
      most_accurate:
        [...performance]
          .filter((s) => s.transactions > 0)
          .sort((a, b) => a.discounts_given - b.discounts_given)[0] ?? null,
    },
    summary: {
      total_staff: staff.length,
      total_transactions: transactions.length,
      total_revenue: transactions.reduce((s, t) => s + (t.total ?? 0), 0),
    },
  });
}
