import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth";

export async function GET() {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;
  const supabase = createAdminClient();

  // Same PostgREST bug as bar/display: .eq("orders.business_id", ...) filters only the join,
  // not the parent rows. Pre-fetch valid order IDs and filter on order_id instead.
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
    .select("*, orders!inner(id, business_id, table_id, floor_tables(table_number))")
    .eq("item_type", "menu_item")
    .in("order_id", orderIds)
    .in("status", ["pending", "preparing", "ready"])
    .order("created_at");

  if (error) {
    console.error("[restaurant/kds GET]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const all = items ?? [];
  return NextResponse.json({
    pending:   all.filter((i) => i.status === "pending"),
    preparing: all.filter((i) => i.status === "preparing"),
    ready:     all.filter((i) => i.status === "ready"),
  });
}

export async function PUT(request: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const { order_item_id, status } = await request.json();
  if (!order_item_id || !status) {
    return NextResponse.json({ error: "order_item_id and status required" }, { status: 400 });
  }

  const VALID = ["pending", "preparing", "ready", "served"];
  if (!VALID.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("order_items")
    .update({ status })
    .eq("id", order_item_id)
    .select("*, orders!inner(business_id)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const orderBizId = (data.orders as { business_id: string })?.business_id;
  if (orderBizId !== auth.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  return NextResponse.json({ order_item: data });
}
