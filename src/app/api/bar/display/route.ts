import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth";
import { needsBarPreparation, serveFromNotes } from "@/lib/bar";

export async function GET() {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();

  // .eq("orders.business_id", ...) only filters the join result, not the parent rows —
  // all order_items across every business would still return with orders:null for non-matches.
  // Fix: pre-fetch valid order IDs so the filter is on a top-level column.
  // Only tabs that are still open: paid tabs ("completed") are done, and including
  // them left every drink ever sold stuck on the display.
  const { data: bizOrders } = await supabase
    .from("orders")
    .select("id")
    .eq("business_id", auth.businessId)
    .in("status", ["open", "pending"]);

  const orderIds = (bizOrders ?? []).map((o) => o.id);

  if (orderIds.length === 0) {
    return NextResponse.json({ pending: [], preparing: [], ready: [] });
  }

  // Drinks only (not food, supermarket or bakery items).
  const { data: rows, error } = await supabase
    .from("order_items")
    .select("*, orders(table_id, floor_tables(table_number))")
    .in("order_id", orderIds)
    .eq("item_type", "bar_item")
    .in("status", ["pending", "preparing", "ready"])
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Only drinks the bartender has to make: cocktails and poured drinks (single, double, quarter).
  const barItemIds = Array.from(new Set((rows ?? []).map((r) => r.item_id).filter(Boolean)));
  const { data: barItems } = barItemIds.length
    ? await supabase.from("bar_items").select("id, category").in("id", barItemIds)
    : { data: [] as Array<{ id: string; category: string | null }> };
  const categoryById = new Map((barItems ?? []).map((b) => [b.id, b.category]));
  const items = (rows ?? []).filter((r) =>
    needsBarPreparation(categoryById.get(r.item_id), serveFromNotes(r.notes) !== "bottle")
  );

  const pending = items.filter((i) => i.status === "pending");
  const preparing = items.filter((i) => i.status === "preparing");
  const ready = items.filter((i) => i.status === "ready");

  return NextResponse.json({ pending, preparing, ready });
}

export async function PUT(request: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { order_item_id, status } = body;

  if (!order_item_id || !status) {
    return NextResponse.json({ error: "order_item_id and status required" }, { status: 400 });
  }

  const validStatuses = ["pending", "preparing", "ready", "served"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Verify ownership BEFORE changing anything (it used to update first and check
  // after, so another business's item could be changed).
  const { data: existing } = await supabase
    .from("order_items")
    .select("id, orders!inner(business_id)")
    .eq("id", order_item_id)
    .eq("orders.business_id", auth.businessId)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { data, error } = await supabase
    .from("order_items")
    .update({ status })
    .eq("id", order_item_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ order_item: data });
}
