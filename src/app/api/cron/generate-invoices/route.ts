/**
 * POST /api/cron/generate-invoices
 * Runs daily (see vercel.json).
 *
 * Pass 1 — Invoice generation:
 *   For each active non-trial business whose next_payment_due <= today:
 *   • create an invoice row
 *   • send MTN MoMo Request to Pay
 *   • send invoice email to owner
 *   • update businesses: momo_request_id, momo_payment_status = 'pending'
 *
 * Pass 2 — Overdue marking:
 *   Mark pending invoices whose due_date < today as 'overdue'.
 *
 * Pass 3 — Suspension:
 *   For businesses with an overdue invoice AND due_date + 1 full billing cycle < today:
 *   set subscription_status = 'suspended'.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { momoRequestToPay, normalizeMsisdn, MOMO_IS_PLACEHOLDER } from "@/lib/momo";
import { sendInvoiceEmail } from "@/lib/email";
import { addMonths, addYears, format, parseISO, isBefore, subDays } from "date-fns";

function rwandaToday(): string {
  return new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().split("T")[0];
}

async function generateInvoiceNumber(supabase: ReturnType<typeof createAdminClient>, year: number): Promise<string> {
  const { count } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .gte("created_at", `${year}-01-01T00:00:00`)
    .lt("created_at", `${year + 1}-01-01T00:00:00`);
  const seq = (count ?? 0) + 1;
  return `INV-${year}-${String(seq).padStart(4, "0")}`;
}

function calcNextDue(fromDate: Date, billingCycle: string): string {
  return format(billingCycle === "annual" ? addYears(fromDate, 1) : addMonths(fromDate, 1), "yyyy-MM-dd");
}

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const today = rwandaToday();
  const year = parseInt(today.split("-")[0], 10);

  const invoiced: string[] = [];
  const suspended: string[] = [];
  const errors: { business: string; error: string }[] = [];

  // ── Pass 1: Invoice generation ──────────────────────────────────────────────
  const { data: dueBiz } = await supabase
    .from("businesses")
    .select("id, name, owner_id, phone, billing_cycle, monthly_amount, next_payment_due, subscription_plan, subscription_status")
    .not("subscription_plan", "eq", "trial")
    .in("subscription_status", ["active", "overdue"])
    .not("next_payment_due", "is", null)
    .lte("next_payment_due", today);

  for (const biz of dueBiz ?? []) {
    try {
      // Dedup: skip if we already have an invoice for this exact due date
      const { data: existing } = await supabase
        .from("invoices")
        .select("id")
        .eq("business_id", biz.id)
        .eq("due_date", biz.next_payment_due)
        .maybeSingle();
      if (existing) {
        console.log(`[cron/invoices] ${biz.name}: already invoiced for ${biz.next_payment_due}, skipping`);
        continue;
      }

      // Resolve owner phone (prefer staff table phone for the owner role)
      let ownerPhone: string | null = biz.phone ?? null;
      let ownerEmail: string | null = null;

      if (biz.owner_id) {
        const [{ data: { user: ownerUser } }, { data: ownerStaff }] = await Promise.all([
          supabase.auth.admin.getUserById(biz.owner_id),
          supabase.from("staff").select("phone").eq("business_id", biz.id).eq("user_id", biz.owner_id).maybeSingle(),
        ]);
        ownerEmail = ownerUser?.email ?? null;
        if (ownerStaff?.phone) ownerPhone = ownerStaff.phone;
      }

      const amount = biz.monthly_amount ?? 0;
      if (amount <= 0) {
        console.log(`[cron/invoices] ${biz.name}: monthly_amount is 0, skipping MoMo but creating invoice`);
      }

      // Create invoice row
      const invoiceNumber = await generateInvoiceNumber(supabase, year);
      const invoiceDueDate = biz.next_payment_due as string; // invoice due = billing date

      const { data: invoice, error: invoiceErr } = await supabase
        .from("invoices")
        .insert({
          business_id:    biz.id,
          invoice_number: invoiceNumber,
          amount,
          due_date:       invoiceDueDate,
          status:         "pending",
        })
        .select("id")
        .single();

      if (invoiceErr || !invoice) {
        errors.push({ business: biz.name, error: invoiceErr?.message ?? "insert failed" });
        continue;
      }

      let momoRequestId: string | null = null;
      let momoStatus: string = "pending";

      // Send MoMo Request to Pay (skip if amount is 0 or phone missing)
      if (amount > 0 && ownerPhone) {
        try {
          const msisdn = normalizeMsisdn(ownerPhone);
          const { referenceId } = await momoRequestToPay({
            amount,
            phoneNumber:  msisdn,
            externalId:   invoice.id,
            payerMessage: `${biz.name} — Subscription ${invoiceNumber}`,
            payeeNote:    `DELRON POS subscription ${invoiceNumber}`,
          });
          momoRequestId = referenceId;

          // Stamp referenceId on the invoice
          await supabase
            .from("invoices")
            .update({ momo_request_id: referenceId })
            .eq("id", invoice.id);

          console.log(`[cron/invoices] ${biz.name}: RTP sent → referenceId=${referenceId}`);
        } catch (momoErr) {
          console.error(`[cron/invoices] ${biz.name}: MoMo RTP failed:`, momoErr);
          momoStatus = "failed";
        }
      } else {
        console.log(`[cron/invoices] ${biz.name}: MoMo skipped (amount=${amount}, phone=${ownerPhone ?? "none"})`);
        if (MOMO_IS_PLACEHOLDER) momoRequestId = `placeholder-${invoice.id}`;
      }

      // Update business tracking
      await supabase.from("businesses").update({
        momo_request_id:    momoRequestId,
        momo_payment_status: momoStatus,
        invoice_generated_at: new Date().toISOString(),
      }).eq("id", biz.id);

      // Send invoice email
      if (ownerEmail) {
        await sendInvoiceEmail({
          to:            ownerEmail,
          businessName:  biz.name,
          invoiceNumber,
          amount,
          dueDate:       invoiceDueDate,
          phoneNumber:   ownerPhone ? normalizeMsisdn(ownerPhone) : "—",
          isPlaceholder: MOMO_IS_PLACEHOLDER,
        });
      }

      invoiced.push(`${biz.name} (${invoiceNumber}, RWF ${amount})`);
    } catch (err) {
      errors.push({ business: biz.name, error: String(err) });
    }
  }

  // ── Pass 2: Mark pending invoices as overdue if past due_date ───────────────
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
  await supabase
    .from("invoices")
    .update({ status: "overdue" })
    .eq("status", "pending")
    .lte("due_date", yesterday);

  console.log(`[cron/invoices] Marked pending invoices with due_date <= ${yesterday} as overdue`);

  // ── Pass 3: Suspend businesses that have been overdue for a full billing cycle ─
  const { data: overdueInvoices } = await supabase
    .from("invoices")
    .select("business_id, due_date, businesses!inner(billing_cycle, subscription_status, subscription_plan, name)")
    .eq("status", "overdue");

  for (const row of overdueInvoices ?? []) {
    const bizRaw = row.businesses;
    const biz = (Array.isArray(bizRaw) ? bizRaw[0] : bizRaw) as { billing_cycle: string; subscription_status: string; subscription_plan: string; name: string };
    if (biz.subscription_status === "suspended" || biz.subscription_status === "cancelled") continue;
    if (biz.subscription_plan === "trial") continue;

    const dueDate = parseISO(row.due_date as string);
    const graceCutoff = biz.billing_cycle === "annual" ? addYears(dueDate, 1) : addMonths(dueDate, 1);

    if (isBefore(graceCutoff, new Date())) {
      await supabase
        .from("businesses")
        .update({ subscription_status: "suspended" })
        .eq("id", row.business_id);
      suspended.push(biz.name);
      console.log(`[cron/invoices] SUSPENDED ${biz.name} — invoice overdue since ${row.due_date}, grace period expired`);
    }
  }

  console.log("[cron/invoices] Done:", { today, invoiced, suspended, errors });
  return NextResponse.json({ success: true, today, invoiced, suspended, errors });
}
