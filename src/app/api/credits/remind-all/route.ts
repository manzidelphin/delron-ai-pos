import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { sendSMS, SMS_TEMPLATES } from "@/lib/sms";

export async function POST() {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const supabase = createClient();

  const { data: overdueCredits, error } = await supabase
    .from("credits")
    .select("*")
    .eq("business_id", auth.businessId)
    .eq("status", "overdue");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: business } = await supabase
    .from("businesses")
    .select("name")
    .eq("id", auth.businessId)
    .single();

  const businessName = business?.name ?? "DELRON POS";
  const credits = overdueCredits ?? [];
  let sent = 0;

  for (const credit of credits) {
    const ok = await sendSMS(
      credit.customer_phone,
      SMS_TEMPLATES.creditDueReminder(credit.customer_name, credit.balance, businessName)
    );
    if (ok) sent++;
  }

  void supabase.from("notifications").insert({
    business_id: auth.businessId,
    user_id: auth.staffId,
    title: "Bulk Reminders Sent",
    message: `Sent ${sent}/${credits.length} reminder SMS to overdue customers`,
    type: "info",
    category: "credit",
    sent_via: ["sms", "in-app"],
    is_read: false,
  });

  return NextResponse.json({ sent, total: credits.length });
}
