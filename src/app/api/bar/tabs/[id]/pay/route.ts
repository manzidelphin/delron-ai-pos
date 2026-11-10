import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { payment_method, amount_paid, split_count, phone, reference } = body;

  if (!payment_method) {
    return NextResponse.json({ error: "payment_method required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Fetch tab
  const { data: tab } = await supabase
    .from("orders")
    .select("*, floor_tables(id)")
    .eq("id", params.id)
    .eq("business_id", auth.businessId)
    .single();

  if (!tab) return NextResponse.json({ error: "Tab not found" }, { status: 404 });
  if (["completed", "cancelled"].includes(tab.status)) {
    return NextResponse.json({ error: "Tab already closed" }, { status: 400 });
  }

  const total = tab.total;
  const paid = amount_paid ? parseFloat(amount_paid) : total;
  const change = Math.max(0, paid - total);

  // Create transaction record
  const receiptNumber = `BAR-${Date.now().toString(36).toUpperCase()}`;

  const { data: transaction, error: txError } = await supabase
    .from("transactions")
    .insert({
      business_id: auth.businessId,
      branch_id: auth.branchId,
      cashier_id: auth.staffId,
      order_id: params.id,
      receipt_number: receiptNumber,
      total,
      payment_method,
      module_source: "bar",
    })
    .select()
    .single();

  if (txError) return NextResponse.json({ error: txError.message }, { status: 500 });

  // Close tab and set table empty
  await supabase
    .from("orders")
    .update({ status: "completed", updated_at: new Date().toISOString() })
    .eq("id", params.id);

  // Free the table: a fixed table goes back to "empty"; any other table was opened
  // for these customers and disappears from the floor (hidden, not deleted, so
  // reports keep its number and name).
  if (tab.table_id) {
    const { data: table } = await supabase
      .from("floor_tables").select("is_fixed")
      .eq("id", tab.table_id).eq("business_id", auth.businessId).maybeSingle();
    await supabase
      .from("floor_tables")
      .update(table?.is_fixed ? { status: "empty" } : { status: "empty", archived_at: new Date().toISOString() })
      .eq("id", tab.table_id)
      .eq("business_id", auth.businessId);
  }

  // Auto-mark everything still waiting (food AND drinks) as served so both the
  // kitchen and bar displays clear it. Payment means the tab is done.
  await supabase
    .from("order_items")
    .update({ status: "served" })
    .eq("order_id", params.id)
    .in("status", ["pending", "preparing", "ready"]);

  // Fetch all items for receipt
  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", params.id);

  return NextResponse.json({
    transaction,
    receipt_number: receiptNumber,
    total,
    amount_paid: paid,
    change,
    items: items ?? [],
  });
}
