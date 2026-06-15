import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth";

export async function GET() {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;
  const { businessId } = auth;

  const supabase = createClient();
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  // Week ranges
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekStartStr = weekStart.toISOString().split("T")[0];
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(weekStart.getDate() - 7);
  const lastWeekEnd = new Date(weekStart);
  lastWeekEnd.setDate(weekStart.getDate() - 1);

  // Month ranges
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthStartStr = monthStart.toISOString().split("T")[0];
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

  // 7 days ago
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 6);
  const sevenDaysStr = sevenDaysAgo.toISOString().split("T")[0];

  const [
    todayTx,
    yesterdayTx,
    weekTx,
    lastWeekTx,
    monthTx,
    lastMonthTx,
    creditsRes,
    recentTx,
    lowStockRes,
    barItemsRes,
    openTabsRes,
    last7DaysTx,
    topSellerOrders,
    allStaff,
  ] = await Promise.all([
    supabase.from("transactions").select("total,module_source,cashier_id,created_at").eq("business_id", businessId).gte("created_at", `${todayStr}T00:00:00`).lte("created_at", `${todayStr}T23:59:59`),
    supabase.from("transactions").select("total").eq("business_id", businessId).gte("created_at", `${yesterdayStr}T00:00:00`).lte("created_at", `${yesterdayStr}T23:59:59`),
    supabase.from("transactions").select("total").eq("business_id", businessId).gte("created_at", `${weekStartStr}T00:00:00`),
    supabase.from("transactions").select("total").eq("business_id", businessId).gte("created_at", lastWeekStart.toISOString()).lte("created_at", lastWeekEnd.toISOString()),
    supabase.from("transactions").select("total").eq("business_id", businessId).gte("created_at", `${monthStartStr}T00:00:00`),
    supabase.from("transactions").select("total").eq("business_id", businessId).gte("created_at", lastMonthStart.toISOString()).lte("created_at", lastMonthEnd.toISOString()),
    supabase.from("credits").select("balance,status,customer_name").eq("business_id", businessId).in("status", ["unpaid", "partial", "overdue"]),
    supabase.from("transactions").select("id,total,payment_method,module_source,created_at,cashier_id").eq("business_id", businessId).order("created_at", { ascending: false }).limit(10),
    supabase.from("products").select("id,name").eq("business_id", businessId).eq("is_active", true).filter("quantity", "lte", "min_quantity"),
    supabase.from("bar_items").select("id,name").eq("business_id", businessId).eq("is_active", true).filter("quantity_bottles", "lte", "min_quantity"),
    supabase.from("floor_tables").select("id").eq("business_id", businessId).eq("status", "occupied"),
    supabase.from("transactions").select("total,module_source,created_at").eq("business_id", businessId).gte("created_at", `${sevenDaysStr}T00:00:00`),
    supabase.from("orders").select("id").eq("business_id", businessId).eq("status", "completed").gte("created_at", `${todayStr}T00:00:00`).lte("created_at", `${todayStr}T23:59:59`).limit(100),
    supabase.from("staff").select("id,name,role").eq("business_id", businessId).eq("is_active", true),
  ]);

  // Compute revenues
  const sumTotal = (rows: {total: number}[] | null) => (rows ?? []).reduce((s, r) => s + r.total, 0);
  const pct = (cur: number, prev: number) => prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100);

  const todayRevenue = sumTotal(todayTx.data);
  const yesterdayRevenue = sumTotal(yesterdayTx.data);
  const weekRevenue = sumTotal(weekTx.data);
  const lastWeekRevenue = sumTotal(lastWeekTx.data);
  const monthRevenue = sumTotal(monthTx.data);
  const lastMonthRevenue = sumTotal(lastMonthTx.data);

  // By module today
  const byModule: Record<string, number> = { supermarket: 0, bakery: 0, bar: 0, restaurant: 0 };
  for (const t of todayTx.data ?? []) {
    if (t.module_source && t.module_source in byModule) {
      byModule[t.module_source] += t.total;
    }
  }

  // Credits
  const credits = creditsRes.data ?? [];
  const outstandingCredits = credits.reduce((s, c) => s + c.balance, 0);
  const overdueCredits = credits.filter((c) => c.status === "overdue");

  // Alerts
  const lowStockCount = (lowStockRes.data?.length ?? 0) + (barItemsRes.data?.length ?? 0);
  const openTabsCount = openTabsRes.data?.length ?? 0;

  // Hourly today
  const hourlyMap: Record<number, number> = {};
  for (const t of todayTx.data ?? []) {
    const h = new Date(t.created_at).getHours();
    hourlyMap[h] = (hourlyMap[h] ?? 0) + t.total;
  }
  const hourly_today = Array.from({ length: 24 }, (_, h) => ({
    hour: `${String(h).padStart(2, "0")}:00`,
    revenue: hourlyMap[h] ?? 0,
  }));

  // Last 7 days
  const dailyMap: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dailyMap[d.toISOString().split("T")[0]] = 0;
  }
  for (const t of last7DaysTx.data ?? []) {
    const d = t.created_at.split("T")[0];
    if (d in dailyMap) dailyMap[d] += t.total;
  }
  const last_7_days = Object.entries(dailyMap).map(([date, revenue]) => ({
    date: new Date(date).toLocaleDateString("en", { month: "short", day: "numeric" }),
    revenue,
  }));

  // Top sellers today
  let top_sellers_today: {name: string; module: string; quantity: number; revenue: number}[] = [];
  if (topSellerOrders.data && topSellerOrders.data.length > 0) {
    const orderIds = topSellerOrders.data.map((o) => o.id);
    const { data: items } = await supabase.from("order_items").select("item_name,item_type,quantity,total_price").in("order_id", orderIds);
    const itemMap: Record<string, {name: string; module: string; quantity: number; revenue: number}> = {};
    for (const item of items ?? []) {
      const key = item.item_name;
      if (!itemMap[key]) itemMap[key] = { name: item.item_name, module: item.item_type, quantity: 0, revenue: 0 };
      itemMap[key].quantity += item.quantity;
      itemMap[key].revenue += item.total_price;
    }
    top_sellers_today = Object.values(itemMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }

  // Staff on duty with today's stats
  const staffMap: Record<string, {transactions: number; revenue: number}> = {};
  for (const t of todayTx.data ?? []) {
    if (t.cashier_id) {
      if (!staffMap[t.cashier_id]) staffMap[t.cashier_id] = { transactions: 0, revenue: 0 };
      staffMap[t.cashier_id].transactions += 1;
      staffMap[t.cashier_id].revenue += t.total;
    }
  }
  const staff_on_duty = (allStaff.data ?? [])
    .filter((s) => staffMap[s.id])
    .map((s) => ({ ...s, transactions: staffMap[s.id].transactions, revenue: staffMap[s.id].revenue }));

  // Recent transactions with cashier names
  const cashierIds = [...new Set((recentTx.data ?? []).map((t) => t.cashier_id).filter(Boolean))];
  let cashierMap: Record<string, string> = {};
  if (cashierIds.length > 0) {
    const { data: cashiers } = await supabase.from("staff").select("id,name").in("id", cashierIds as string[]);
    cashierMap = Object.fromEntries((cashiers ?? []).map((c) => [c.id, c.name]));
  }
  const recent_transactions = (recentTx.data ?? []).map((t) => ({
    id: t.id,
    total: t.total,
    payment_method: t.payment_method,
    module_source: t.module_source,
    created_at: t.created_at,
    cashier_name: t.cashier_id ? cashierMap[t.cashier_id] ?? "Unknown" : "Unknown",
  }));

  return NextResponse.json({
    revenue: {
      today: todayRevenue,
      today_change: pct(todayRevenue, yesterdayRevenue),
      week: weekRevenue,
      week_change: pct(weekRevenue, lastWeekRevenue),
      month: monthRevenue,
      month_change: pct(monthRevenue, lastMonthRevenue),
      by_module: byModule,
      transactions_today: todayTx.data?.length ?? 0,
    },
    credits: {
      outstanding: outstandingCredits,
      count: credits.length,
      overdue_count: overdueCredits.length,
    },
    alerts: {
      low_stock: lowStockCount,
      overdue_credits: overdueCredits.length,
      open_tabs: openTabsCount,
    },
    recent_transactions,
    hourly_today,
    last_7_days,
    top_sellers_today,
    staff_on_duty,
  });
}
