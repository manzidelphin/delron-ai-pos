import { NextRequest, NextResponse } from "next/server";
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

  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, category, quantity, min_quantity")
    .eq("business_id", auth.businessId)
    .eq("is_active", true)
    .eq("stock_type", "supermarket")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Sold today
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

  // Restocked today
  const { data: todayRestocks } = await supabase
    .from("product_restock_logs")
    .select("product_id, quantity_received")
    .eq("business_id", auth.businessId)
    .gte("created_at", fromStr)
    .lte("created_at", toStr);

  const restockMap: Record<string, number> = {};
  for (const r of todayRestocks ?? []) {
    if (r.product_id) restockMap[r.product_id] = (restockMap[r.product_id] ?? 0) + r.quantity_received;
  }

  // Yesterday's closing → today's opening
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

  const enriched = (products ?? []).map((p) => {
    const current         = p.quantity;
    const sold_today      = soldMap[p.id] ?? 0;
    const restocked_today = restockMap[p.id] ?? 0;
    const opening         = openingMap[p.id] !== undefined
      ? openingMap[p.id]
      : current + sold_today - restocked_today;
    const expected        = opening + restocked_today - sold_today;
    return { ...p, opening, sold_today, restocked_today, expected_quantity: expected };
  });

  return NextResponse.json({ items: enriched, count_date: todayStr });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const body = await req.json();
  const { count_date, entries } = body as {
    count_date: string;
    entries: {
      item_id: string;
      actual_quantity: number;
      expected_quantity: number;
      opening_quantity: number;
      sold_today: number;
      restocked_today: number;
    }[];
  };

  if (!count_date || !entries?.length) {
    return NextResponse.json({ error: "count_date and entries required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const itemIds = entries.map((e) => e.item_id);
  const { data: products } = await supabase
    .from("products")
    .select("id, name")
    .in("id", itemIds)
    .eq("business_id", auth.businessId);

  const nameMap = Object.fromEntries((products ?? []).map((p) => [p.id, p.name]));

  const countRows: object[] = [];
  let flaggedCount = 0;

  for (const entry of entries) {
    const variance     = entry.expected_quantity - entry.actual_quantity;
    const variance_pct = entry.expected_quantity > 0
      ? parseFloat(((variance / entry.expected_quantity) * 100).toFixed(2))
      : 0;

    if (Math.abs(variance_pct) > 5) flaggedCount++;

    countRows.push({
      business_id:       auth.businessId,
      branch_id:         auth.branchId !== auth.businessId ? auth.branchId : null,
      count_date,
      product_id:        entry.item_id,
      item_name:         nameMap[entry.item_id] ?? "Unknown",
      opening_quantity:  entry.opening_quantity,
      sold_today:        entry.sold_today,
      restocked_today:   entry.restocked_today,
      expected_quantity: entry.expected_quantity,
      actual_quantity:   entry.actual_quantity,
      variance,
      variance_percent:  variance_pct,
      counted_by:        auth.ownerStaffId,
    });

    await supabase
      .from("products")
      .update({ quantity: entry.actual_quantity, updated_at: new Date().toISOString() })
      .eq("id", entry.item_id)
      .eq("business_id", auth.businessId);
  }

  const { error: insertErr } = await supabase.from("daily_stock_counts").insert(countRows);
  if (insertErr) {
    console.error("[supermarket/closing] insert error:", insertErr.message);
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, items_counted: countRows.length, flagged_items: flaggedCount });
}
