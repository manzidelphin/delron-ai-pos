import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth";

export async function GET() {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [tabsRes, itemsRes, txRes] = await Promise.all([
    supabase
      .from("orders")
      .select("id, status, total_amount, created_at")
      .eq("business_id", auth.businessId)
      .eq("order_type", "bar_tab"),

    supabase
      .from("bar_items")
      .select("id, name, quantity_bottles, reorder_point, cost_per_bottle")
      .eq("business_id", auth.businessId)
      .eq("is_active", true),

    supabase
      .from("transactions")
      .select("total_amount, created_at")
      .eq("business_id", auth.businessId)
      .eq("transaction_type", "bar_tab")
      .gte("created_at", todayStart.toISOString())
      .lte("created_at", todayEnd.toISOString()),
  ]);

  const allTabs = tabsRes.data ?? [];
  const allItems = itemsRes.data ?? [];
  const todayTx = txRes.data ?? [];

  const openTabs = allTabs.filter((t) => t.status === "open");
  const todayRevenue = todayTx.reduce((s, t) => s + t.total_amount, 0);
  const lowStock = allItems.filter((i) => i.quantity_bottles <= i.reorder_point);

  // Hourly chart for today (0–23h)
  const hourlyMap: Record<number, number> = {};
  for (let h = 0; h < 24; h++) hourlyMap[h] = 0;
  for (const tx of todayTx) {
    const h = new Date(tx.created_at).getHours();
    hourlyMap[h] = (hourlyMap[h] ?? 0) + tx.total_amount;
  }
  const hourlyChart = Object.entries(hourlyMap).map(([hour, revenue]) => ({
    hour: `${hour}:00`,
    revenue,
  }));

  return NextResponse.json({
    stats: {
      open_tabs: openTabs.length,
      today_revenue: todayRevenue,
      today_orders: todayTx.length,
      low_stock_count: lowStock.length,
    },
    open_tabs: openTabs,
    low_stock: lowStock.slice(0, 10),
    hourly_chart: hourlyChart,
  });
}
