import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth";
import { generateReceiptNumber } from "@/lib/utils";

const VALID_METHODS = ["cash", "mtn_momo", "airtel_money", "bank_transfer"];

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const { payment_method, amount_paid } = await req.json();

  if (!VALID_METHODS.includes(payment_method)) {
    return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: order } = await supabase
    .from("custom_orders")
    .select("*")
    .eq("id", params.id)
    .eq("business_id", auth.businessId)
    .single();

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status === "collected") return NextResponse.json({ error: "Already collected" }, { status: 400 });
  if (order.status === "cancelled") return NextResponse.json({ error: "Order is cancelled" }, { status: 400 });

  const balance_due = order.total_price - order.deposit_paid;
  const paid = amount_paid != null ? parseFloat(amount_paid) : balance_due;

  const now = new Date().toISOString();

  // Create transaction record so daily report and revenue reports pick it up
  if (balance_due > 0) {
    const receiptNumber = generateReceiptNumber();
    await supabase.from("transactions").insert({
      business_id:    auth.businessId,
      branch_id:      auth.branchId,
      cashier_id:     auth.staffId,
      total:          balance_due,
      payment_method,
      receipt_number: receiptNumber,
      module_source:  "bakery",
    });
  }

  // Mark collected
  const { data: updated, error } = await supabase
    .from("custom_orders")
    .update({
      status:       "collected",
      collected_by: auth.staffId,
      collected_at: now,
      deposit_paid: order.deposit_paid + paid, // record final deposit_paid = total collected
      updated_at:   now,
    })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    order: { ...updated, balance_due: 0 },
    amount_paid: paid,
    payment_method,
  });
}
