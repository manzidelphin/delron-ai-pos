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

  const [txRes, tablesRes, barItemsRes, ordersRes] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, total, created_at, payment_method")
      .eq("business_id", auth.businessId)
      .eq("module_source", "bar")
      .gte("created_at", from)
      .lte("created_at", toEnd),
    supabase
      .from("floor_tables")
      .select("id, table_number, status")
      .eq("business_id", auth.businessId),
    supabase
      .from("bar_items")
      .select(
        "id, name, category, shots_per_bottle, price_per_bottle, price_per_shot, quantity_bottles, shots_remaining, is_shot_item"
      )
      .eq("business_id", auth.businessId)
      .eq("is_active", true),
    supabase
      .from("orders")
      .select("id, table_id, total, created_at, status")
      .eq("business_id", auth.businessId)
      .in("order_type", ["bar_tab", "table"])
      .eq("status", "completed")
      .gte("created_at", from)
      .lte("created_at", toEnd),
  ]);

  const transactions = txRes.data ?? [];
  const tables = tablesRes.data ?? [];
  const barItems = barItemsRes.data ?? [];
  const orders = ordersRes.data ?? [];
  const orderIds = orders.map((o) => o.id);

  // Order items for bar (drinks sold)
  let drinkItems: {item_name: string; item_id: string; quantity: number; total_price: number}[] = [];
  if (orderIds.length > 0) {
    const { data } = await supabase
      .from("order_items")
      .select("item_name, item_id, item_type, quantity, unit_price, total_price")
      .in("order_id", orderIds.slice(0, 200));
    drinkItems = data ?? [];
  }

  const totalRevenue = transactions.reduce((s, t) => s + (t.total ?? 0), 0);

  // Daily revenue
  const dailyMap: Record<string, number> = {};
  for (const t of transactions) {
    const day = t.created_at.split("T")[0];
    dailyMap[day] = (dailyMap[day] ?? 0) + (t.total ?? 0);
  }
  const dailyRevenue = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({ date, revenue }));

  // Top drinks
  const drinkMap: Record<string, { qty: number; revenue: number }> = {};
  for (const d of drinkItems) {
    if (!drinkMap[d.item_name]) drinkMap[d.item_name] = { qty: 0, revenue: 0 };
    drinkMap[d.item_name].qty += d.quantity ?? 0;
    drinkMap[d.item_name].revenue += d.total_price ?? 0;
  }
  const topDrinks = Object.entries(drinkMap)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // By category (use barItems category as source)
  const itemCategoryMap: Record<string, string> = {};
  for (const item of barItems) {
    itemCategoryMap[item.name] = item.category ?? "Other";
  }
  const categoryMap: Record<string, number> = {};
  for (const d of drinkItems) {
    const cat = itemCategoryMap[d.item_name] ?? "Other";
    categoryMap[cat] = (categoryMap[cat] ?? 0) + (d.total_price ?? 0);
  }
  const byCategory = Object.entries(categoryMap).map(([name, value]) => ({
    name,
    value,
  }));

  // Hourly
  const hourlyMap: Record<number, number> = {};
  for (const t of transactions) {
    const h = new Date(t.created_at).getHours();
    hourlyMap[h] = (hourlyMap[h] ?? 0) + (t.total ?? 0);
  }
  const peakHour = Object.entries(hourlyMap).reduce(
    (best, [h, v]) => (v > best[1] ? [h, v] : best),
    ["0", 0]
  );
  const hourly = Array.from({ length: 24 }, (_, h) => ({
    hour: `${String(h).padStart(2, "0")}:00`,
    revenue: hourlyMap[h] ?? 0,
  }));

  // Shot variance table for shot items
  const shotItemsMap: Record<string, { qty: number }> = {};
  for (const d of drinkItems) {
    shotItemsMap[d.item_id] = {
      qty: (shotItemsMap[d.item_id]?.qty ?? 0) + (d.quantity ?? 0),
    };
  }

  const varianceTable = barItems
    .filter((i) => i.is_shot_item && i.shots_per_bottle)
    .map((item) => {
      const shotsSold = shotItemsMap[item.id]?.qty ?? 0;
      const bottlesEquiv = item.shots_per_bottle
        ? shotsSold / item.shots_per_bottle
        : 0;
      const shotsExpected = item.shots_per_bottle
        ? (item.shots_per_bottle - (item.shots_remaining ?? 0)) + shotsSold
        : 0;
      const variance = shotsExpected - shotsSold;
      const variancePct =
        shotsExpected > 0 ? Math.round((variance / shotsExpected) * 100) : 0;
      return {
        item_name: item.name,
        bottles_in_stock: item.quantity_bottles,
        shots_remaining: item.shots_remaining,
        shots_sold: shotsSold,
        shots_expected: Math.round(shotsExpected),
        variance,
        variance_pct: variancePct,
        revenue_impact: variance * (item.price_per_shot ?? 0),
      };
    });

  // Tables report
  const tableRevMap: Record<string, { count: number; total: number }> = {};
  for (const o of orders) {
    if (!o.table_id) continue;
    if (!tableRevMap[o.table_id]) tableRevMap[o.table_id] = { count: 0, total: 0 };
    tableRevMap[o.table_id].count++;
    tableRevMap[o.table_id].total += o.total ?? 0;
  }
  const tablesReport = tables.map((t) => ({
    table_number: t.table_number,
    times_used: tableRevMap[t.id]?.count ?? 0,
    total_revenue: tableRevMap[t.id]?.total ?? 0,
    avg_spend:
      (tableRevMap[t.id]?.count ?? 0) > 0
        ? Math.round((tableRevMap[t.id]?.total ?? 0) / tableRevMap[t.id].count)
        : 0,
  }));

  // KPIs
  const bottlesSold = drinkItems
    .filter((d) => {
      const item = barItems.find((i) => i.id === d.item_id);
      return item && !item.is_shot_item;
    })
    .reduce((s, d) => s + (d.quantity ?? 0), 0);

  const shotsSold = drinkItems
    .filter((d) => {
      const item = barItems.find((i) => i.id === d.item_id);
      return item?.is_shot_item;
    })
    .reduce((s, d) => s + (d.quantity ?? 0), 0);

  const tablesServed = new Set(orders.filter((o) => o.table_id).map((o) => o.table_id)).size;
  const avgTabValue = tablesServed > 0 ? Math.round(totalRevenue / tablesServed) : 0;

  return NextResponse.json({
    kpis: {
      bar_revenue: totalRevenue,
      bottles_sold: bottlesSold,
      shots_sold: shotsSold,
      tables_served: tablesServed,
      avg_tab_value: avgTabValue,
      peak_hour: `${String(peakHour[0]).padStart(2, "0")}:00`,
    },
    daily_revenue: dailyRevenue,
    top_drinks: topDrinks,
    by_category: byCategory,
    hourly,
    variance_table: varianceTable,
    tables_report: tablesReport,
  });
}
