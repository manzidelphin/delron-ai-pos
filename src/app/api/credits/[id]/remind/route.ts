import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { sendSMS, SMS_TEMPLATES } from "@/lib/sms";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const supabase = createClient();
  const { data: credit, error } = await supabase
    .from("credits")
    .select("*")
    .eq("id", params.id)
    .eq("business_id", auth.businessId)
    .single();

  if (error || !credit) {
    return NextResponse.json({ error: "Credit not found" }, { status: 404 });
  }

  if (credit.status === "paid") {
    return NextResponse.json({ error: "Credit is already paid" }, { status: 400 });
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("name")
    .eq("id", auth.businessId)
    .single();

  const businessName = business?.name ?? "DELRON POS";

  const sent = await sendSMS(
    credit.customer_phone,
    SMS_TEMPLATES.creditDueReminder(credit.customer_name, credit.balance, businessName)
  );

  // Log notification
  void supabase.from("notifications").insert({
    business_id: auth.businessId,
    user_id: auth.staffId,
    title: "Reminder Sent",
    message: `Reminder SMS sent to ${credit.customer_name} (${credit.customer_phone}) for ${credit.balance.toLocaleString()} RWF`,
    type: "info",
    category: "credit",
    sent_via: ["sms", "in-app"],
    is_read: false,
  });

  return NextResponse.json({ success: sent, message: sent ? "SMS sent" : "SMS failed" });
}
