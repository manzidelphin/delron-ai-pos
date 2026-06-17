import { createAdminClient } from "@/lib/supabase/admin";
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

  const supabase = createAdminClient();

  // Previous period for growth calculation
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const periodMs = toDate.getTime() - fromDate.getTime();
  const prevFrom = new Date(fromDate.getTime() - periodMs)
    .toISOString()
    .split("T")[0];
  const prevTo = new Date(fromDate.getTime() - 1)
    .toISOString()
    .split("T")[0];

  const [txRes, prevTxRes, ordersRes] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, total, payment_method, module_source, created_at, cashier_id, receipt_number")
      .eq("business_id", auth.businessId)
      .gte("created_at", from)
      .lte("created_at", toEnd)
      .order("created_at", { ascending: false }),
    supabase
      .from("transactions")
      .select("total")
      .eq("business_id", auth.businessId)
      .gte("created_at", prevFrom)
      .lte("created_at", prevTo + "T23:59:59.999Z"),
    supabase
      .from("orders")
      .select("id")
      .eq("business_id", auth.businessId)
      .eq("status", "completed")
      .gte("created_at", from)
      .lte("created_at", toEnd),
  ]);

  const transactions = txRes.data ?? [];
  const prevTransactions = prevTxRes.data ?? [];
  const orderIds = (ordersRes.data ?? []).map((o) => o.id);

  // Order items for top products
  let topProducts: {item_name: string; quantity: number; revenue: number}[] = [];
  if (orderIds.length > 0) {
    const chunk = orderIds.slice(0, 200);
    const { data: items } = await supabase
      .from("order_items")
      .select("item_name, item_type, quantity, total_price")
      .in("order_id", chunk);

    const productMap: Record<string, { quantity: number; revenue: number }> = {};
    for (const item of items ?? []) {
      if (!productMap[item.item_name]) {
        productMap[item.item_name] = { quantity: 0, revenue: 0 };
      }
      productMap[item.item_name].quantity += item.quantity ?? 0;
      productMap[item.item_name].revenue += item.total_price ?? 0;
    }
    topProducts = Object.entries(productMap)
      .map(([name, v]) => ({ item_name: name, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }

  // Aggregations
  const totalRevenue = transactions.reduce((s, t) => s + (t.total ?? 0), 0);
  const prevRevenue = prevTransactions.reduce((s, t) => s + (t.total ?? 0), 0);
  const growth =
    prevRevenue > 0
      ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100)
      : totalRevenue > 0
      ? 100
      : 0;

  const avgTransaction =
    transactions.length > 0
      ? Math.round(totalRevenue / transactions.length)
      : 0;

  // Daily revenue
  const dailyMap: Record<string, number> = {};
  for (const t of transactions) {
    const day = t.created_at.split("T")[0];
    dailyMap[day] = (dailyMap[day] ?? 0) + (t.total ?? 0);
  }
  const dailyRevenue = Object.entries(dailyMap)
    .map(([date, revenue]) => ({ date, revenue }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Best day
  const bestDay =
    dailyRevenue.length > 0
      ? dailyRevenue.reduce((best, d) => (d.revenue > best.revenue ? d : best))
      : null;

  // By module
  const moduleMap: Record<string, number> = {};
  for (const t of transactions) {
    const mod = t.module_source ?? "other";
    moduleMap[mod] = (moduleMap[mod] ?? 0) + (t.total ?? 0);
  }

  // By payment method
  const paymentMap: Record<string, number> = {};
  for (const t of transactions) {
    const pm = t.payment_method ?? "other";
    paymentMap[pm] = (paymentMap[pm] ?? 0) + (t.total ?? 0);
  }

  // Hourly
  const hourlyMap: Record<number, number> = {};
  for (const t of transactions) {
    const h = new Date(t.created_at).getHours();
    hourlyMap[h] = (hourlyMap[h] ?? 0) + (t.total ?? 0);
  }
  const hourly = Array.from({ length: 24 }, (_, h) => ({
    hour: `${String(h).padStart(2, "0")}:00`,
    revenue: hourlyMap[h] ?? 0,
  }));

  return NextResponse.json({
    kpis: {
      total_revenue: totalRevenue,
      total_transactions: transactions.length,
      avg_transaction: avgTransaction,
      best_day: bestDay,
      growth,
      prev_revenue: prevRevenue,
    },
    daily_revenue: dailyRevenue,
    by_module: Object.entries(moduleMap).map(([name, value]) => ({
      name,
      value,
    })),
    by_payment: Object.entries(paymentMap).map(([name, value]) => ({
      name: name.replace("_", " "),
      value,
    })),
    top_products: topProducts,
    hourly,
    transactions: transactions.slice(0, 100),
  });
}
