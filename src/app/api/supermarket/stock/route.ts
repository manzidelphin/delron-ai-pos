import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth";

export async function GET() {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];
  const fromStr = `${todayStr}T00:00:00`;
  const toStr   = `${todayStr}T23:59:59`;

  const { data: products, error: prodErr } = await supabase
    .from("products")
    .select("id, name, category, quantity, min_quantity, cost_price")
    .eq("business_id", auth.businessId)
    .eq("is_active", true)
    .eq("stock_type", "supermarket")
    .order("name");

  if (prodErr) console.error("[supermarket/stock] products:", prodErr.message);

  // Today's orders for this business (exclude bar tabs)
  const { data: todayOrders } = await supabase
    .from("orders")
    .select("id")
    .eq("business_id", auth.businessId)
    .neq("order_type", "bar_tab")
    .gte("created_at", fromStr)
    .lte("created_at", toStr);

  const orderIds = (todayOrders ?? []).map((o) => o.id);
  const soldMap: Record<string, number> = {};
  if (orderIds.length > 0) {
    const { data: ois } = await supabase
      .from("order_items")
      .select("item_id, quantity")
      .in("order_id", orderIds)
      .eq("item_type", "product");
    for (const oi of ois ?? []) {
      if (oi.item_id) soldMap[oi.item_id] = (soldMap[oi.item_id] ?? 0) + oi.quantity;
    }
  }

  // Today's restocks
  const { data: todayRestocks } = await supabase
    .from("product_restock_logs")
    .select("product_id, quantity_received, item_name, supplier_name, created_at, id")
    .eq("business_id", auth.businessId)
    .gte("created_at", fromStr)
    .lte("created_at", toStr)
    .order("created_at", { ascending: false });

  const restockMap: Record<string, number> = {};
  for (const r of todayRestocks ?? []) {
    if (r.product_id) restockMap[r.product_id] = (restockMap[r.product_id] ?? 0) + r.quantity_received;
  }

  // Yesterday's closing counts → today's opening
  const { data: lastCounts } = await supabase
    .from("daily_stock_counts")
    .select("product_id, actual_quantity")
    .eq("business_id", auth.businessId)
    .eq("count_date", yesterdayStr)
    .not("product_id", "is", null);

  const openingMap: Record<string, number> = {};
  for (const c of lastCounts ?? []) {
    if (c.product_id) openingMap[c.product_id] = c.actual_quantity;
  }

  // Recent restocks (last 10)
  const { data: recentRestocks } = await supabase
    .from("product_restock_logs")
    .select("id, item_name, quantity_received, supplier_name, created_at")
    .eq("business_id", auth.businessId)
    .order("created_at", { ascending: false })
    .limit(10);

  const enriched = (products ?? []).map((p) => {
    const current    = p.quantity;
    const soldToday  = soldMap[p.id] ?? 0;
    const reStocked  = restockMap[p.id] ?? 0;
    const opening    = openingMap[p.id] !== undefined
      ? openingMap[p.id]
      : current + soldToday - reStocked;
    const status =
      current === 0        ? "out_of_stock"
      : current <= p.min_quantity ? "low_stock"
      : "ok";
    return { ...p, opening, sold_today: soldToday, restocked_today: reStocked, current, status };
  });

  const summary = {
    total_items:      enriched.length,
    low_stock:        enriched.filter((i) => i.status === "low_stock").length,
    out_of_stock:     enriched.filter((i) => i.status === "out_of_stock").length,
    restocked_today:  (todayRestocks ?? []).length,
  };

  return NextResponse.json({ items: enriched, summary, recent_restocks: recentRestocks ?? [] });
}
