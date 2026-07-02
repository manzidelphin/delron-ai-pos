import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth";

export async function GET() {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();

  // .eq("orders.business_id", ...) only filters the join result, not the parent rows —
  // all order_items across every business would still return with orders:null for non-matches.
  // Fix: pre-fetch valid order IDs so the filter is on a top-level column.
  const { data: bizOrders } = await supabase
    .from("orders")
    .select("id")
    .eq("business_id", auth.businessId)
    .in("status", ["open", "pending", "completed"]);

  const orderIds = (bizOrders ?? []).map((o) => o.id);

  if (orderIds.length === 0) {
    return NextResponse.json({ pending: [], preparing: [], ready: [] });
  }

  const { data: items, error } = await supabase
    .from("order_items")
    .select("*, orders(table_id, floor_tables(table_number))")
    .in("order_id", orderIds)
    .in("status", ["pending", "preparing", "ready"])
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const pending = (items ?? []).filter((i) => i.status === "pending");
  const preparing = (items ?? []).filter((i) => i.status === "preparing");
  const ready = (items ?? []).filter((i) => i.status === "ready");

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

  const { data, error } = await supabase
    .from("order_items")
    .update({ status })
    .eq("id", order_item_id)
    .select("*, orders(business_id)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Verify ownership
  if ((data.orders as { business_id: string })?.business_id !== auth.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  return NextResponse.json({ order_item: data });
}
