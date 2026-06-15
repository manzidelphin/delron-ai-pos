import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { generateReceiptNumber } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 20;
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from("orders")
    .select("*, order_items(*)", { count: "exact" })
    .eq("business_id", auth.businessId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ orders: data ?? [], total: count ?? 0, page, limit });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const supabase = createClient();
  const body = await request.json();

  const {
    items,
    payment_method,
    subtotal,
    discount = 0,
    total,
    order_type = "counter",
    notes,
  } = body;

  if (!items?.length) {
    return NextResponse.json({ error: "No items in order" }, { status: 400 });
  }

  // 1. Create order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      business_id: auth.businessId,
      branch_id: auth.branchId,
      staff_id: auth.staffId,
      order_type,
      status: "completed",
      subtotal,
      discount,
      tax: 0,
      total,
      payment_method,
      notes: notes ?? null,
    })
    .select()
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: orderError?.message ?? "Order creation failed" }, { status: 500 });
  }

  // 2. Insert order items
  const orderItems = items.map((item: {
    item_id: string;
    item_type: string;
    item_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    notes?: string;
  }) => ({
    order_id: order.id,
    item_id: item.item_id,
    item_type: item.item_type,
    item_name: item.item_name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.total_price,
    notes: item.notes ?? null,
  }));

  const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  // 3. Create transaction record
  const receiptNumber = generateReceiptNumber();
  const { data: transaction, error: txError } = await supabase
    .from("transactions")
    .insert({
      business_id: auth.businessId,
      branch_id: auth.branchId,
      order_id: order.id,
      cashier_id: auth.staffId,
      total,
      payment_method,
      receipt_number: receiptNumber,
      module_source: "supermarket",
    })
    .select()
    .single();

  if (txError) {
    return NextResponse.json({ error: txError.message }, { status: 500 });
  }

  // 4. Deduct stock
  for (const item of items) {
    if (item.item_type === "product") {
      const { data: p } = await supabase
        .from("products")
        .select("quantity")
        .eq("id", item.item_id)
        .single();
      if (p) {
        await supabase
          .from("products")
          .update({ quantity: Math.max(0, p.quantity - item.quantity) })
          .eq("id", item.item_id);
      }
    }
  }

  return NextResponse.json(
    { order, transaction, receipt_number: receiptNumber },
    { status: 201 }
  );
}
