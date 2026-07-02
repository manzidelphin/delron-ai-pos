import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth";

export async function GET() {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();
  const now = new Date();
  // Use Kigali local date (UTC+2). toISOString() is UTC and can be off by one calendar day.
  const todayStr     = now.toLocaleDateString("en-CA", { timeZone: "Africa/Kigali" });
  const yesterdayStr = new Date(now.getTime() - 86400000).toLocaleDateString("en-CA", { timeZone: "Africa/Kigali" });
  // Anchor timestamps to Kigali midnight so the comparison against UTC-stored timestamptz is correct.
  const fromStr = new Date(`${todayStr}T00:00:00+02:00`).toISOString();
  const toStr   = new Date(`${todayStr}T23:59:59+02:00`).toISOString();

  // All active bar items
  const { data: items, error: itemsErr } = await supabase
    .from("bar_items")
    .select("id, name, category, quantity_bottles, shots_remaining, shots_per_bottle, min_quantity, price_per_bottle")
    .eq("business_id", auth.businessId)
    .eq("is_active", true)
    .order("name");

  if (itemsErr) console.error("[bar/stock] items:", itemsErr.message);

  // Today's bar orders → item quantities sold
  const { data: todayOrders } = await supabase
    .from("orders")
    .select("id")
    .eq("business_id", auth.businessId)
    .eq("order_type", "bar_tab")
    .gte("created_at", fromStr)
    .lte("created_at", toStr);

  const orderIds = (todayOrders ?? []).map((o) => o.id);
  console.log(`[bar/stock] Found ${orderIds.length} bar_tab orders today (${todayStr}) for business ${auth.businessId}`);
  const soldMap: Record<string, number> = {};
  if (orderIds.length > 0) {
    const { data: ois } = await supabase
      .from("order_items")
      .select("item_id, quantity")
      .in("order_id", orderIds)
      .eq("item_type", "bar_item");
    for (const oi of ois ?? []) {
      if (oi.item_id) soldMap[oi.item_id] = (soldMap[oi.item_id] ?? 0) + oi.quantity;
    }
  }

  // Today's restocks
  const { data: todayRestocks, error: rErr } = await supabase
    .from("bar_restock_logs")
    .select("bar_item_id, quantity_received, supplier_name, created_at")
    .eq("business_id", auth.businessId)
    .gte("created_at", fromStr)
    .lte("created_at", toStr)
    .order("created_at", { ascending: false });

  if (rErr) console.error("[bar/stock] restock_logs:", rErr.message);

  const restockMap: Record<string, number> = {};
  for (const r of todayRestocks ?? []) {
    if (r.bar_item_id) restockMap[r.bar_item_id] = (restockMap[r.bar_item_id] ?? 0) + r.quantity_received;
  }

  // Yesterday's closing counts (= today's opening stock)
  const { data: lastCounts, error: cErr } = await supabase
    .from("daily_stock_counts")
    .select("bar_item_id, actual_quantity")
    .eq("business_id", auth.businessId)
    .eq("count_date", yesterdayStr);

  if (cErr) console.error("[bar/stock] daily_stock_counts:", cErr.message);

  const openingMap: Record<string, number> = {};
  for (const c of lastCounts ?? []) {
    if (c.bar_item_id) openingMap[c.bar_item_id] = c.actual_quantity;
  }

  // Recent restock events (last 10)
  const { data: recentRestocks } = await supabase
    .from("bar_restock_logs")
    .select("id, item_name, quantity_received, supplier_name, created_at")
    .eq("business_id", auth.businessId)
    .order("created_at", { ascending: false })
    .limit(10);

  // Build enriched items
  const enriched = (items ?? []).map((item) => {
    const current     = item.quantity_bottles;
    const soldToday   = soldMap[item.id] ?? 0;
    const reStocked   = restockMap[item.id] ?? 0;
    // Opening = yesterday closing if available, else reconstruct
    const opening = openingMap[item.id] !== undefined
      ? openingMap[item.id]
      : current + soldToday - reStocked;
    const status =
      current === 0        ? "out_of_stock"
      : current <= item.min_quantity ? "low_stock"
      : "ok";
    return { ...item, opening, sold_today: soldToday, restocked_today: reStocked, current, status };
  });

  const summary = {
    total_items:   enriched.length,
    low_stock:     enriched.filter((i) => i.status === "low_stock").length,
    out_of_stock:  enriched.filter((i) => i.status === "out_of_stock").length,
    restocked_today: (todayRestocks ?? []).length,
  };

  return NextResponse.json({ items: enriched, summary, recent_restocks: recentRestocks ?? [] });
}
