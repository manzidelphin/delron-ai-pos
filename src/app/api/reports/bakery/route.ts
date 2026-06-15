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

  const [prodRes, wasteRes, goodsRes, ordersRes, materialsRes] =
    await Promise.all([
      supabase
        .from("production_logs")
        .select(
          "id, quantity_produced, finished_good_id, baker_id, production_time, created_at, staff:baker_id(name)"
        )
        .eq("business_id", auth.businessId)
        .gte("created_at", from)
        .lte("created_at", toEnd),
      supabase
        .from("waste_logs")
        .select(
          "id, item_id, item_name, item_type, quantity_wasted, cost_of_waste, date, created_at"
        )
        .eq("business_id", auth.businessId)
        .gte("created_at", from)
        .lte("created_at", toEnd),
      supabase
        .from("finished_goods")
        .select("id, name, selling_price, cost_price, unit")
        .eq("business_id", auth.businessId)
        .eq("is_active", true),
      supabase
        .from("orders")
        .select("id")
        .eq("business_id", auth.businessId)
        .eq("status", "completed")
        .gte("created_at", from)
        .lte("created_at", toEnd),
      supabase
        .from("raw_materials")
        .select("id, name, unit, quantity, min_quantity, cost_per_unit")
        .eq("business_id", auth.businessId),
    ]);

  const productions = prodRes.data ?? [];
  const wastes = wasteRes.data ?? [];
  const goods = goodsRes.data ?? [];
  const orderIds = (ordersRes.data ?? []).map((o) => o.id);

  // Sales for bakery items
  let bakeryItems: {item_name: string; quantity: number; total_price: number}[] = [];
  if (orderIds.length > 0) {
    const { data: items } = await supabase
      .from("order_items")
      .select("item_name, item_id, item_type, quantity, total_price")
      .in("order_id", orderIds.slice(0, 200))
      .eq("item_type", "finished_good");
    bakeryItems = items ?? [];
  }

  const goodsMap = Object.fromEntries(goods.map((g) => [g.id, g]));

  // Daily chart data
  const dailyMap: Record<string, { produced: number; wasted: number }> = {};
  for (const p of productions) {
    const day = (p.created_at ?? p.production_time).split("T")[0];
    if (!dailyMap[day]) dailyMap[day] = { produced: 0, wasted: 0 };
    dailyMap[day].produced += p.quantity_produced ?? 0;
  }
  for (const w of wastes) {
    const day = (w.created_at ?? w.date).split("T")[0];
    if (!dailyMap[day]) dailyMap[day] = { produced: 0, wasted: 0 };
    dailyMap[day].wasted += w.quantity_wasted ?? 0;
  }

  // Sales by item name
  const salesByItem: Record<string, { qty: number; revenue: number }> = {};
  for (const s of bakeryItems) {
    if (!salesByItem[s.item_name]) salesByItem[s.item_name] = { qty: 0, revenue: 0 };
    salesByItem[s.item_name].qty += s.quantity ?? 0;
    salesByItem[s.item_name].revenue += s.total_price ?? 0;
  }

  // Production by finished_good_id
  const prodByGood: Record<string, number> = {};
  for (const p of productions) {
    prodByGood[p.finished_good_id] = (prodByGood[p.finished_good_id] ?? 0) + (p.quantity_produced ?? 0);
  }

  // Waste by item_id (for bakery items)
  const wasteByGood: Record<string, { qty: number; cost: number }> = {};
  for (const w of wastes) {
    if (w.item_type === "finished_good") {
      if (!wasteByGood[w.item_id]) wasteByGood[w.item_id] = { qty: 0, cost: 0 };
      wasteByGood[w.item_id].qty += w.quantity_wasted ?? 0;
      wasteByGood[w.item_id].cost += w.cost_of_waste ?? 0;
    }
  }

  // Items breakdown
  const itemsBreakdown = goods.map((g) => {
    const produced = prodByGood[g.id] ?? 0;
    const sold = salesByItem[g.name]?.qty ?? 0;
    const wasted = wasteByGood[g.id]?.qty ?? 0;
    const revenue = salesByItem[g.name]?.revenue ?? 0;
    const cost = produced * (g.cost_price ?? 0);
    const profit = revenue - cost;
    const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
    const wastePercent = produced > 0 ? Math.round((wasted / produced) * 100) : 0;
    return { id: g.id, name: g.name, produced, sold, wasted, waste_percent: wastePercent, revenue, cost, profit, margin };
  }).filter(i => i.produced > 0 || i.sold > 0);

  // Baker performance
  const bakerMap: Record<string, { name: string; batches: number; units: number; wasted: number }> = {};
  for (const p of productions) {
    const bakerId = p.baker_id ?? "unknown";
    const bakerName = (p.staff as { name?: string } | null)?.name ?? "Unknown";
    if (!bakerMap[bakerId]) bakerMap[bakerId] = { name: bakerName, batches: 0, units: 0, wasted: 0 };
    bakerMap[bakerId].batches++;
    bakerMap[bakerId].units += p.quantity_produced ?? 0;
  }
  const bakerPerformance = Object.values(bakerMap).map((b) => ({
    ...b,
    waste_rate: b.units > 0 ? Math.round((b.wasted / b.units) * 100) : 0,
  }));

  // KPIs
  const totalProduced = productions.reduce((s, p) => s + (p.quantity_produced ?? 0), 0);
  const totalSold = bakeryItems.reduce((s, i) => s + (i.quantity ?? 0), 0);
  const totalWasted = wastes.reduce((s, w) => s + (w.quantity_wasted ?? 0), 0);
  const totalWasteCost = wastes.reduce((s, w) => s + (w.cost_of_waste ?? 0), 0);
  const bakeryRevenue = bakeryItems.reduce((s, i) => s + (i.total_price ?? 0), 0);
  const bakeryCost = itemsBreakdown.reduce((s, i) => s + i.cost, 0);
  const efficiencyRate = totalProduced > 0 ? Math.round((totalSold / totalProduced) * 100) : 0;

  const dailyChart = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({ date, ...vals }));

  return NextResponse.json({
    kpis: {
      total_produced: totalProduced,
      total_sold: totalSold,
      total_wasted: totalWasted,
      waste_cost: totalWasteCost,
      efficiency_rate: efficiencyRate,
      bakery_revenue: bakeryRevenue,
      bakery_profit: bakeryRevenue - bakeryCost,
    },
    daily_chart: dailyChart,
    items_breakdown: itemsBreakdown,
    baker_performance: bakerPerformance,
    materials: materialsRes.data ?? [],
  });
}
