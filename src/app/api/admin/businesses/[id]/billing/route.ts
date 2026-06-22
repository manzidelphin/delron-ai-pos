import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkPlatformAdmin } from "@/lib/admin-auth";

const VALID_PLANS = ["trial", "starter", "professional", "enterprise"];
const VALID_STATUSES = ["active", "overdue", "suspended", "cancelled"];
const VALID_CYCLES = ["monthly", "annual"];

/** PATCH — update billing fields on a business */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await checkPlatformAdmin();
  if (error) return error;

  const body = await req.json();
  const allowed = ["subscription_plan", "subscription_status", "billing_cycle", "monthly_amount"];
  const update: Record<string, unknown> = {};

  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  if (update.subscription_plan && !VALID_PLANS.includes(update.subscription_plan as string)) {
    return NextResponse.json({ error: "Invalid subscription_plan" }, { status: 400 });
  }
  if (update.subscription_status && !VALID_STATUSES.includes(update.subscription_status as string)) {
    return NextResponse.json({ error: "Invalid subscription_status" }, { status: 400 });
  }
  if (update.billing_cycle && !VALID_CYCLES.includes(update.billing_cycle as string)) {
    return NextResponse.json({ error: "Invalid billing_cycle" }, { status: 400 });
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error: dbErr } = await admin
    .from("businesses")
    .update(update)
    .eq("id", params.id)
    .select("id, subscription_plan, subscription_status, billing_cycle, monthly_amount, next_payment_due, last_payment_date")
    .single();

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json(data);
}
