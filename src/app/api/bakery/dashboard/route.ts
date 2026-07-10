import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth";

export async function GET() {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();

  const todayStr = new Date().toISOString().split("T")[0];
  const todayStart = `${todayStr}T00:00:00.000Z`;
  const todayEnd = `${todayStr}T23:59:59.999Z`;

  // Last 7 days, oldest first — used both for the chart queries and today's stats below.
  const chartDays = Array.from({ length: 7 }, (_, idx) => {
    const i = 6 - idx;
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStr = d.toISOString().split("T")[0];
    return {
      dayStr,
      label: d.toLocaleDateString("en-RW", { weekday: "short", month: "short", day: "numeric" }),
      dayStart: `${dayStr}T00:00:00.000Z`,
      dayEnd: `${dayStr}T23:59:59.999Z`,
    };
  });

  // All of today's stats + the 7-day chart's per-day queries are independent of each other,
  // so fire them concurrently instead of one round trip at a time.
  const [
    [{ data: todayLogs }, { data: wasteToday }, { data: todaySales }, { data: fgStock }, { data: lowMaterials }, { data: fgItems }],
    chartResults,
  ] = await Promise.all([
    Promise.all([
      // Today's production
      supabase
        .from("production_logs")
        .select("quantity_produced, finished_good_id, production_time, staff!baker_id(name), finished_goods(name, selling_price, cost_price)")
        .eq("business_id", auth.businessId)
        .gte("production_time", todayStart)
        .lte("production_time", todayEnd)
        .order("production_time", { ascending: false }),
      // Today's waste
      supabase
        .from("waste_logs")
        .select("quantity_wasted, cost_of_waste")
        .eq("business_id", auth.businessId)
        .eq("date", todayStr),
      // Today's bakery sales
      supabase
        .from("order_items")
        .select("quantity, total_price, item_id")
        .eq("item_type", "finished_good")
        .gte("created_at", todayStart)
        .lte("created_at", todayEnd),
      // Remaining stock
      supabase
        .from("finished_goods")
        .select("quantity")
        .eq("business_id", auth.businessId)
        .eq("is_active", true),
      // Low stock materials
      supabase
        .from("raw_materials")
        .select("id, name, quantity, min_quantity, unit")
        .eq("business_id", auth.businessId)
        .filter("quantity", "lte", "min_quantity"),
      // Top items today
      supabase
        .from("finished_goods")
        .select("id, name, quantity")
        .eq("business_id", auth.businessId)
        .eq("is_active", true)
        .order("name"),
    ]),
    Promise.all(
      chartDays.map((day) =>
        Promise.all([
          supabase.from("production_logs").select("quantity_produced").eq("business_id", auth.businessId).gte("production_time", day.dayStart).lte("production_time", day.dayEnd),
          supabase.from("waste_logs").select("quantity_wasted").eq("business_id", auth.businessId).eq("date", day.dayStr),
          supabase.from("order_items").select("quantity").eq("item_type", "finished_good").gte("created_at", day.dayStart).lte("created_at", day.dayEnd),
        ])
      )
    ),
  ]);

  const producedToday = (todayLogs ?? []).reduce((sum, l) => sum + l.quantity_produced, 0);
  const productionCostToday = (todayLogs ?? []).reduce((sum, l) => {
    const costPrice = (l.finished_goods as { cost_price?: number } | null)?.cost_price ?? 0;
    return sum + l.quantity_produced * costPrice;
  }, 0);

  const wastedToday = (wasteToday ?? []).reduce((sum, w) => sum + w.quantity_wasted, 0);

  const soldToday = (todaySales ?? []).reduce((sum, s) => sum + s.quantity, 0);
  const revenueToday = (todaySales ?? []).reduce((sum, s) => sum + s.total_price, 0);
  const profitToday = revenueToday - productionCostToday;

  const remainingStock = (fgStock ?? []).reduce((sum, f) => sum + (f.quantity || 0), 0);

  // Last 7 days production chart
  const chartData = chartDays.map((day, idx) => {
    const [{ data: dayProd }, { data: dayWaste }, { data: daySales }] = chartResults[idx];
    return {
      date: day.dayStr,
      label: day.label,
      produced: (dayProd ?? []).reduce((s, l) => s + l.quantity_produced, 0),
      wasted: (dayWaste ?? []).reduce((s, w) => s + w.quantity_wasted, 0),
      sold: (daySales ?? []).reduce((s, sl) => s + sl.quantity, 0),
    };
  });

  const topItems = (fgItems ?? []).map((fg) => {
    const logs = (todayLogs ?? []).filter((l) => l.finished_good_id === fg.id);
    const sales = (todaySales ?? []).filter((s) => s.item_id === fg.id);
    const wasteItems = (wasteToday ?? []);
    return {
      id: fg.id,
      name: fg.name,
      produced: logs.reduce((s, l) => s + l.quantity_produced, 0),
      sold: sales.reduce((s, sl) => s + sl.quantity, 0),
      remaining: fg.quantity,
      wasted: wasteItems.reduce((s, w) => s + w.quantity_wasted, 0),
    };
  });

  return NextResponse.json({
    stats: {
      produced_today: producedToday,
      sold_today: soldToday,
      remaining_stock: remainingStock,
      wasted_today: wastedToday,
      revenue_today: revenueToday,
      profit_today: profitToday,
    },
    chart_data: chartData,
    top_items: topItems,
    low_materials: lowMaterials ?? [],
    today_logs: todayLogs ?? [],
  });
}
