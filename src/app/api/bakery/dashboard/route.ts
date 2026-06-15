import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth";

export async function GET() {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const supabase = createClient();

  const todayStr = new Date().toISOString().split("T")[0];
  const todayStart = `${todayStr}T00:00:00.000Z`;
  const todayEnd = `${todayStr}T23:59:59.999Z`;

  // Today's production
  const { data: todayLogs } = await supabase
    .from("production_logs")
    .select("quantity_produced, finished_good_id, finished_goods(name, selling_price, cost_price)")
    .eq("business_id", auth.businessId)
    .gte("production_time", todayStart)
    .lte("production_time", todayEnd);

  const producedToday = (todayLogs ?? []).reduce((sum, l) => sum + l.quantity_produced, 0);
  const productionCostToday = (todayLogs ?? []).reduce((sum, l) => {
    const costPrice = (l.finished_goods as { cost_price?: number } | null)?.cost_price ?? 0;
    return sum + l.quantity_produced * costPrice;
  }, 0);

  // Today's waste
  const { data: wasteToday } = await supabase
    .from("waste_logs")
    .select("quantity_wasted, cost_of_waste")
    .eq("business_id", auth.businessId)
    .eq("date", todayStr);

  const wastedToday = (wasteToday ?? []).reduce((sum, w) => sum + w.quantity_wasted, 0);

  // Today's bakery sales
  const { data: todaySales } = await supabase
    .from("order_items")
    .select("quantity, total_price, item_id")
    .eq("item_type", "finished_good")
    .gte("created_at", todayStart)
    .lte("created_at", todayEnd);

  const soldToday = (todaySales ?? []).reduce((sum, s) => sum + s.quantity, 0);
  const revenueToday = (todaySales ?? []).reduce((sum, s) => sum + s.total_price, 0);
  const profitToday = revenueToday - productionCostToday;

  // Remaining stock
  const { data: fgStock } = await supabase
    .from("finished_goods")
    .select("quantity")
    .eq("business_id", auth.businessId)
    .eq("is_active", true);

  const remainingStock = (fgStock ?? []).reduce((sum, f) => sum + (f.quantity || 0), 0);

  // Low stock materials
  const { data: lowMaterials } = await supabase
    .from("raw_materials")
    .select("id, name, quantity, min_quantity, unit")
    .eq("business_id", auth.businessId)
    .filter("quantity", "lte", "min_quantity");

  // Last 7 days production chart
  const chartData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStr = d.toISOString().split("T")[0];
    const dayStart = `${dayStr}T00:00:00.000Z`;
    const dayEnd = `${dayStr}T23:59:59.999Z`;

    const { data: dayProd } = await supabase
      .from("production_logs")
      .select("quantity_produced")
      .eq("business_id", auth.businessId)
      .gte("production_time", dayStart)
      .lte("production_time", dayEnd);

    const { data: dayWaste } = await supabase
      .from("waste_logs")
      .select("quantity_wasted")
      .eq("business_id", auth.businessId)
      .eq("date", dayStr);

    const { data: daySales } = await supabase
      .from("order_items")
      .select("quantity")
      .eq("item_type", "finished_good")
      .gte("created_at", dayStart)
      .lte("created_at", dayEnd);

    chartData.push({
      date: dayStr,
      label: d.toLocaleDateString("en-RW", { weekday: "short", month: "short", day: "numeric" }),
      produced: (dayProd ?? []).reduce((s, l) => s + l.quantity_produced, 0),
      wasted: (dayWaste ?? []).reduce((s, w) => s + w.quantity_wasted, 0),
      sold: (daySales ?? []).reduce((s, sl) => s + sl.quantity, 0),
    });
  }

  // Top items today
  const { data: fgItems } = await supabase
    .from("finished_goods")
    .select("id, name, quantity")
    .eq("business_id", auth.businessId)
    .eq("is_active", true)
    .order("name");

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
  }).filter((item) => item.produced > 0 || item.remaining > 0);

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
