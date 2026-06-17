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
  if (tab.status !== "open") return NextResponse.json({ error: "Tab already closed" }, { status: 400 });

  const total = tab.total_amount;
  const paid = amount_paid ? parseFloat(amount_paid) : total;
  const change = Math.max(0, paid - total);

  // Create transaction record
  const receiptNumber = `BAR-${Date.now().toString(36).toUpperCase()}`;

  const { data: transaction, error: txError } = await supabase
    .from("transactions")
    .insert({
      business_id: auth.businessId,
      branch_id: auth.branchId,
      staff_id: auth.staffId,
      order_id: params.id,
      receipt_number: receiptNumber,
      total_amount: total,
      amount_paid: paid,
      change_given: change,
      payment_method,
      phone: phone ?? null,
      reference: reference ?? null,
      split_count: split_count ?? 1,
      transaction_type: "bar_tab",
    })
    .select()
    .single();

  if (txError) return NextResponse.json({ error: txError.message }, { status: 500 });

  // Close tab and set table empty
  await supabase
    .from("orders")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", params.id);

  if (tab.table_id) {
    await supabase
      .from("floor_tables")
      .update({ status: "empty" })
      .eq("id", tab.table_id);
  }

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
