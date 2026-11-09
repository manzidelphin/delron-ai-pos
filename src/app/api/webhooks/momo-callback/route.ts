/**
 * POST /api/webhooks/momo-callback
 *
 * MTN MoMo calls this URL (X-Callback-Url = MOMO_CALLBACK_URL) after a Request to
 * Pay completes. The URL is public, so the callback body is NOT trusted: it only
 * tells us which invoice to re-check.
 *
 * Verification:
 *   1. Look up the invoice by externalId (the invoice UUID we sent to MTN)
 *   2. Ask MTN for the payment using the invoice's saved momo_request_id
 *   3. Require MTN's record to reference the same invoice
 *   4. Act on MTN's status only (the status in the callback body is ignored)
 *
 * On SUCCESSFUL:
 *   - Mark invoice 'paid', set paid_at
 *   - Insert into billing_payments
 *   - Update business: subscription_status='active', last_payment_date, next_payment_due, momo_payment_status='successful'
 *
 * On FAILED / TIMEOUT:
 *   - Update invoice momo_request_id, update businesses.momo_payment_status='failed'
 *   - Leave subscription_status unchanged (suspension handled by daily cron)
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMoMoPayment, type MoMoPaymentRecord } from "@/lib/momo";
import { addMonths, addYears, format } from "date-fns";
import { sendPaymentReceivedEmail } from "@/lib/email";

interface MoMoCallbackBody {
  financialTransactionId?: string;
  externalId?: string;          // invoice UUID we set
  amount?: string;
  currency?: string;
  payer?: { partyIdType: string; partyId: string };
  payerMessage?: string;
  payeeNote?: string;
  status?: "SUCCESSFUL" | "FAILED" | "TIMEOUT";
  reason?: unknown;
}

function calcNextDue(fromDate: Date, billingCycle: string): string {
  return format(billingCycle === "annual" ? addYears(fromDate, 1) : addMonths(fromDate, 1), "yyyy-MM-dd");
}

// Invoice ids are what we sent MTN as externalId; reject anything that couldn't be one.
const ID_RE = /^[A-Za-z0-9-]{1,64}$/;

export async function POST(req: Request) {
  let body: MoMoCallbackBody;
  try {
    body = await req.json() as MoMoCallbackBody;
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  const { externalId } = body;
  console.log("[momo-callback] Received:", { externalId, claimedStatus: body.status, financialTransactionId: body.financialTransactionId });

  if (!externalId || !ID_RE.test(externalId)) {
    return NextResponse.json({ error: "Missing or invalid externalId" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // 1. Look up the invoice we billed (externalId = invoice UUID we sent to MTN)
  const { data: inv } = await supabase
    .from("invoices")
    .select("id, business_id, amount, due_date, status, momo_request_id")
    .eq("id", externalId)
    .maybeSingle();

  if (!inv) {
    console.warn("[momo-callback] Invoice not found for externalId:", externalId);
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (!inv.momo_request_id) {
    console.warn("[momo-callback] Invoice has no MoMo reference to verify against — ignored:", inv.id);
    return NextResponse.json({ ok: false, ignored: "no momo_request_id" });
  }

  // 2. Ask MTN for the authoritative state of this payment
  let mtn: MoMoPaymentRecord;
  try {
    mtn = await getMoMoPayment(inv.momo_request_id);
  } catch (e) {
    console.error("[momo-callback] Could not verify with MTN:", e);
    return NextResponse.json({ error: "Verification with MTN failed" }, { status: 502 });
  }

  // 3. MTN's record must belong to this invoice
  if (mtn.externalId && mtn.externalId !== inv.id) {
    console.warn("[momo-callback] MTN record externalId mismatch:", { invoice: inv.id, mtn: mtn.externalId });
    return NextResponse.json({ error: "Payment does not match invoice" }, { status: 409 });
  }

  // 4. Act on MTN's status only
  const status = mtn.status;
  const financialTransactionId = mtn.financialTransactionId;
  console.log("[momo-callback] MTN status:", { invoice: inv.id, status, claimedStatus: body.status });

  if (status === "PENDING") {
    return NextResponse.json({ ok: true, pending: true });
  }

  if (status === "SUCCESSFUL") {
    // Already paid? Idempotency guard.
    if (inv.status === "paid") {
      console.log("[momo-callback] Invoice already marked paid, skipping:", inv.id);
      return NextResponse.json({ ok: true });
    }

    const paymentDate = format(new Date(), "yyyy-MM-dd");
    const amount = inv.amount;

    // Fetch billing cycle + name for next_due calculation and email
    const { data: biz } = await supabase
      .from("businesses")
      .select("name, billing_cycle")
      .eq("id", inv.business_id)
      .single();

    const nextDue = biz ? calcNextDue(new Date(paymentDate), biz.billing_cycle) : null;

    // Mark invoice paid
    await supabase
      .from("invoices")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", inv.id);

    // Insert billing_payments record
    await supabase.from("billing_payments").insert({
      business_id:       inv.business_id,
      amount,
      payment_date:      paymentDate,
      payment_method:    "momo",
      recorded_by_user_id: null,
      notes:             `Auto — ${financialTransactionId ?? inv.momo_request_id ?? inv.id}`,
    });

    // Update business
    await supabase.from("businesses").update({
      subscription_status: "active",
      last_payment_date:   paymentDate,
      next_payment_due:    nextDue,
      momo_payment_status: "successful",
      momo_request_id:     null,
    }).eq("id", inv.business_id);

    console.log(`[momo-callback] ✓ SUCCESSFUL — invoice ${inv.id}, business ${inv.business_id}, next_due=${nextDue}`);

    try {
      await sendPaymentReceivedEmail({
        businessId:    inv.business_id,
        businessName:  biz?.name ?? inv.business_id,
        amount:        amount,
        paymentDate:   paymentDate,
        paymentMethod: "momo",
        nextPaymentDue: nextDue,
        recordedBy:    "MTN MoMo (automatic)",
      });
    } catch (e) { console.error("[momo-callback] notify email failed:", e); }

  } else {
    // FAILED or TIMEOUT
    const momoStatus = status === "FAILED" ? "failed" : "expired";

    await supabase
      .from("invoices")
      .update({ status: "overdue" })
      .eq("id", inv.id)
      .eq("status", "pending"); // only downgrade from pending

    await supabase.from("businesses").update({
      momo_payment_status: momoStatus,
    }).eq("id", inv.business_id);

    console.log(`[momo-callback] ✗ ${status} — invoice ${inv.id}, business ${inv.business_id}`);
  }

  // MTN MoMo expects a 200 response to acknowledge the callback
  return NextResponse.json({ ok: true });
}
