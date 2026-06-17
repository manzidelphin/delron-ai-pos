import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { sendSMS, SMS_TEMPLATES } from "@/lib/sms";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();
  const { amount_paid } = await req.json();

  if (!amount_paid || amount_paid <= 0) {
    return NextResponse.json({ error: "amount_paid must be greater than 0" }, { status: 400 });
  }

  // Fetch current credit
  const { data: credit, error: fetchErr } = await supabase
    .from("credits")
    .select("*")
    .eq("id", params.id)
    .eq("business_id", auth.businessId)
    .single();

  if (fetchErr || !credit) {
    return NextResponse.json({ error: "Credit not found" }, { status: 404 });
  }

  if (credit.status === "paid") {
    return NextResponse.json({ error: "This credit is already fully paid" }, { status: 400 });
  }

  const newAmountPaid = (credit.amount_paid ?? 0) + amount_paid;
  const newBalance = Math.max(0, credit.total_amount - newAmountPaid);
  const newStatus = newBalance === 0 ? "paid" : "partial";
  const paidAt = newBalance === 0 ? new Date().toISOString() : null;

  const { data: updated, error: updateErr } = await supabase
    .from("credits")
    .update({
      amount_paid: newAmountPaid,
      balance: newBalance,
      status: newStatus,
      paid_at: paidAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Send SMS confirmation to customer
  const { data: business } = await supabase
    .from("businesses")
    .select("name")
    .eq("id", auth.businessId)
    .single();

  const businessName = business?.name ?? "DELRON POS";

  void sendSMS(
    credit.customer_phone,
    SMS_TEMPLATES.paymentConfirmed(
      credit.customer_name,
      amount_paid,
      newBalance,
      businessName
    )
  );

  // Log notification
  void supabase.from("notifications").insert({
    business_id: auth.businessId,
    user_id: auth.staffId,
    title: "Payment Received",
    message: `${credit.customer_name} paid ${amount_paid.toLocaleString()} RWF. ${newBalance > 0 ? `Balance: ${newBalance.toLocaleString()} RWF` : "Fully paid!"}`,
    type: "success",
    category: "credit",
    sent_via: ["sms", "in-app"],
    is_read: false,
  });

  return NextResponse.json({ credit: updated });
}
