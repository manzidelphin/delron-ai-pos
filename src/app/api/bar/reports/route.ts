import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") ?? new Date(Date.now() - 7 * 86400000).toISOString();
  const to = searchParams.get("to") ?? new Date().toISOString();

  const supabase = createClient();

  const [txRes, itemsRes] = await Promise.all([
    supabase
      .from("transactions")
      .select("*")
      .eq("business_id", auth.businessId)
      .eq("transaction_type", "bar_tab")
      .gte("created_at", from)
      .lte("created_at", to),

    supabase
      .from("bar_items")
      .select("id, name, shots_per_bottle, price_per_bottle, price_per_shot, cost_per_bottle")
      .eq("business_id", auth.businessId)
      .eq("is_shot_item", true),
  ]);

  // Get order_items in date range via orders
  const { data: ordersInRange } = await supabase
    .from("orders")
    .select("id")
    .eq("business_id", auth.businessId)
    .eq("order_type", "bar_tab")
    .gte("created_at", from)
    .lte("created_at", to);

  const orderIds = (ordersInRange ?? []).map((o) => o.id);

  const { data: orderItems } = orderIds.length > 0
    ? await supabase
        .from("order_items")
        .select("bar_item_id, item_name, quantity, unit_price, total_price, serve_as")
        .in("order_id", orderIds)
    : { data: [] };

  const transactions = txRes.data ?? [];
  const barItems = itemsRes.data ?? [];
  const oi = orderItems ?? [];

  const totalRevenue = transactions.reduce((s, t) => s + t.total_amount, 0);
  const totalOrders = transactions.length;

  // Per-item sales summary
  const itemMap: Record<string, { name: string; bottles_sold: number; shots_sold: number; revenue: number }> = {};
  for (const item of oi) {
    if (!item.bar_item_id) continue;
    if (!itemMap[item.bar_item_id]) {
      itemMap[item.bar_item_id] = { name: item.item_name, bottles_sold: 0, shots_sold: 0, revenue: 0 };
    }
    if (item.serve_as === "shot") {
      itemMap[item.bar_item_id].shots_sold += item.quantity;
    } else {
      itemMap[item.bar_item_id].bottles_sold += item.quantity;
    }
    itemMap[item.bar_item_id].revenue += item.total_price;
  }

  // Bottle vs shot variance (theft detection)
  const variance = barItems.map((bi) => {
    const sold = itemMap[bi.id];
    const bottlesSold = sold?.bottles_sold ?? 0;
    const shotsSold = sold?.shots_sold ?? 0;
    const expectedBottlesFromShots = bi.shots_per_bottle ? shotsSold / bi.shots_per_bottle : 0;
    const totalBottlesConsumed = bottlesSold + expectedBottlesFromShots;
    return {
      item_name: bi.name,
      bottles_sold: bottlesSold,
      shots_sold: shotsSold,
      expected_bottles_from_shots: parseFloat(expectedBottlesFromShots.toFixed(2)),
      total_bottles_consumed: parseFloat(totalBottlesConsumed.toFixed(2)),
      revenue: sold?.revenue ?? 0,
    };
  }).filter((v) => v.bottles_sold > 0 || v.shots_sold > 0);

  // Daily breakdown
  const dailyMap: Record<string, number> = {};
  for (const tx of transactions) {
    const day = tx.created_at.slice(0, 10);
    dailyMap[day] = (dailyMap[day] ?? 0) + tx.total_amount;
  }
  const dailyChart = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({ date, revenue }));

  const topItems = Object.entries(itemMap)
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  return NextResponse.json({
    stats: { total_revenue: totalRevenue, total_orders: totalOrders },
    daily_chart: dailyChart,
    top_items: topItems,
    variance,
  });
}
