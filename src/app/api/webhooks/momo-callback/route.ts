/**
 * POST /api/webhooks/momo-callback
 *
 * MTN MoMo calls this URL after a Request to Pay completes (success or failure).
 * The callback URL is set per-request as:
 *   {MOMO_CALLBACK_URL}?ref={referenceId}&secret={MOMO_WEBHOOK_SECRET}
 *
 * Verification:
 *   1. Check ?secret matches MOMO_WEBHOOK_SECRET
 *   2. Look up invoice by externalId (invoice UUID) — verify it exists in our DB
 *   3. Trust the status in the body
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
import { verifyMoMoSecret } from "@/lib/momo";
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

export async function POST(req: Request) {
  // MTN MoMo doesn't support query params in callback URL — verify via shared secret
  // stored in MOMO_WEBHOOK_SECRET env var (compared against our own knowledge).
  // We accept callbacks if: (a) no secret configured, or (b) the secret header matches.
  const url = new URL(req.url);
  const secretParam = url.searchParams.get("secret"); // legacy — may be absent
  const refParam = url.searchParams.get("ref");       // legacy — may be absent

  if (!verifyMoMoSecret(secretParam)) {
    console.warn("[momo-callback] Invalid secret — rejected");
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: MoMoCallbackBody;
  try {
    body = await req.json() as MoMoCallbackBody;
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  const { externalId, status, payer, amount: amountStr, financialTransactionId } = body;

  console.log("[momo-callback] Received:", { externalId, status, refParam, financialTransactionId });

  if (!externalId || !status) {
    return NextResponse.json({ error: "Missing externalId or status" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // 2. Look up invoice by externalId (= invoice UUID we passed as externalId)
  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, business_id, amount, due_date, status")
    .eq("id", externalId)
    .maybeSingle();

  if (!invoice) {
    // Try by momo_request_id in case externalId convention changed
    const { data: byRef } = refParam
      ? await supabase.from("invoices").select("id, business_id, amount, due_date, status").eq("momo_request_id", refParam).maybeSingle()
      : { data: null };

    if (!byRef) {
      console.warn("[momo-callback] Invoice not found for externalId:", externalId, "ref:", refParam);
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    Object.assign(invoice ?? {}, byRef);
  }

  // Re-assign after potential fallback lookup (TypeScript narrowing)
  const inv = invoice!;

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
      notes:             `Auto — ${financialTransactionId ?? refParam ?? inv.id}`,
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
