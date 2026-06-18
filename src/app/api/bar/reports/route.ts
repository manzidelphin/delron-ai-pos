import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") ?? new Date(Date.now() - 7 * 86400000).toISOString();
  const to = searchParams.get("to") ?? new Date().toISOString();

  const supabase = createAdminClient();

  const [txRes, barItemsRes] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, total, payment_method, module_source, cashier_id, created_at")
      .eq("business_id", auth.businessId)
      .eq("module_source", "bar")   // was: transaction_type "bar_tab" (column doesn't exist)
      .gte("created_at", from)
      .lte("created_at", to),

    supabase
      .from("bar_items")
      .select("id, name, shots_per_bottle, price_per_bottle, price_per_shot")
      .eq("business_id", auth.businessId)
      .gt("shots_per_bottle", 0),   // was: is_shot_item (column doesn't exist)
  ]);

  if (txRes.error) console.error("[bar/reports] transactions query error:", txRes.error.message);
  if (barItemsRes.error) console.error("[bar/reports] bar_items query error:", barItemsRes.error.message);

  // Get orders in range for item-level breakdown
  const ordersRes = await supabase
    .from("orders")
    .select("id")
    .eq("business_id", auth.businessId)
    .eq("order_type", "bar_tab")    // orders table uses order_type, not module_source
    .gte("created_at", from)
    .lte("created_at", to);

  if (ordersRes.error) console.error("[bar/reports] orders query error:", ordersRes.error.message);

  const orderIds = (ordersRes.data ?? []).map((o) => o.id);

  const orderItemsRes = orderIds.length > 0
    ? await supabase
        .from("order_items")
        .select("item_id, item_name, quantity, unit_price, total_price, notes") // actual column is total_price
        .in("order_id", orderIds)
    : { data: [], error: null };

  if (orderItemsRes.error) console.error("[bar/reports] order_items query error:", orderItemsRes.error.message);

  const transactions = txRes.data ?? [];
  const barItems = barItemsRes.data ?? [];
  const oi = orderItemsRes.data ?? [];

  const totalRevenue = transactions.reduce((s, t) => s + (t.total ?? 0), 0);  // was: t.total_amount
  const totalOrders = transactions.length;

  // Per-item sales summary
  // serve_as was stored in notes as "serve_as:shot" or "serve_as:bottle"
  const itemMap: Record<string, { name: string; bottles_sold: number; shots_sold: number; revenue: number }> = {};
  for (const item of oi) {
    const key = item.item_id;
    if (!key) continue;
    if (!itemMap[key]) {
      itemMap[key] = { name: item.item_name, bottles_sold: 0, shots_sold: 0, revenue: 0 };
    }
    if (item.notes?.includes("serve_as:shot")) {
      itemMap[key].shots_sold += item.quantity;
    } else {
      itemMap[key].bottles_sold += item.quantity;
    }
    itemMap[key].revenue += item.total_price ?? 0;
  }

  // Bottle vs shot variance (theft detection)
  const variance = barItems
    .map((bi) => {
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
    })
    .filter((v) => v.bottles_sold > 0 || v.shots_sold > 0);

  // Daily breakdown
  const dailyMap: Record<string, number> = {};
  for (const tx of transactions) {
    const day = tx.created_at.slice(0, 10);
    dailyMap[day] = (dailyMap[day] ?? 0) + (tx.total ?? 0);   // was: tx.total_amount
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
