import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkPlatformAdmin } from "@/lib/admin-auth";
import { addMonths, addYears, format } from "date-fns";
import { sendPaymentReceivedEmail } from "@/lib/email";

const VALID_METHODS = ["cash", "momo", "airtel", "bank"];

/** POST — record a payment; auto-updates last_payment_date, next_payment_due, and reactivates if overdue */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { userId, error } = await checkPlatformAdmin();
  if (error || !userId) return error ?? NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { amount, payment_date, payment_method, notes } = await req.json();

  if (!amount || amount <= 0) return NextResponse.json({ error: "amount must be positive" }, { status: 400 });
  if (!payment_date) return NextResponse.json({ error: "payment_date required" }, { status: 400 });
  if (!VALID_METHODS.includes(payment_method)) {
    return NextResponse.json({ error: "payment_method must be cash, momo, airtel, or bank" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Fetch current billing cycle to calculate next_payment_due
  const { data: biz } = await admin
    .from("businesses")
    .select("name, billing_cycle, subscription_status")
    .eq("id", params.id)
    .single();

  if (!biz) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  // Calculate next due date
  const payDate = new Date(payment_date);
  const nextDue = biz.billing_cycle === "annual"
    ? addYears(payDate, 1)
    : addMonths(payDate, 1);
  const nextDueStr = format(nextDue, "yyyy-MM-dd");

  // Insert payment record
  const { error: insertErr } = await admin.from("billing_payments").insert({
    business_id: params.id,
    amount: Math.round(amount),
    payment_date,
    payment_method,
    recorded_by_user_id: userId,
    notes: notes ?? null,
  });

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  // Update business: last_payment_date, next_payment_due, reactivate if overdue
  const bizUpdate: Record<string, unknown> = {
    last_payment_date: payment_date,
    next_payment_due: nextDueStr,
  };
  if (biz.subscription_status === "overdue") bizUpdate.subscription_status = "active";

  await admin.from("businesses").update(bizUpdate).eq("id", params.id);

  // Fetch the admin's email for the "recorded by" field — best-effort, non-blocking
  const adminEmail = await admin.auth.admin.getUserById(userId)
    .then((r) => r.data.user?.email ?? `admin:${userId}`)
    .catch(() => `admin:${userId}`);

  sendPaymentReceivedEmail({
    businessId:    params.id,
    businessName:  biz.name,
    amount:        Math.round(amount),
    paymentDate:   payment_date,
    paymentMethod: payment_method,
    nextPaymentDue: nextDueStr,
    recordedBy:    adminEmail,
  }).catch((e) => console.error("[billing/payments] notify email failed:", e));

  return NextResponse.json({ success: true, next_payment_due: nextDueStr });
}

/** GET — return all payments for this business */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await checkPlatformAdmin();
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: dbErr } = await admin
    .from("billing_payments")
    .select("*")
    .eq("business_id", params.id)
    .order("payment_date", { ascending: false });

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
