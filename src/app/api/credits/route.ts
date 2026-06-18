import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { sendSMS, SMS_TEMPLATES } from "@/lib/sms";

export async function GET(request: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "all";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 20;
  const offset = (page - 1) * limit;

  // Bartenders see only credits they personally recorded
  const { data: requester } = await supabase
    .from("staff")
    .select("role")
    .eq("id", auth.staffId)
    .single();

  let query = supabase
    .from("credits")
    .select("*", { count: "exact" })
    .eq("business_id", auth.businessId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (requester?.role === "bartender") {
    query = query.eq("created_by", auth.staffId);
  }

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ credits: data ?? [], total: count ?? 0, page, limit });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();
  const body = await request.json();

  const {
    customer_name,
    customer_phone,
    items_description,
    total_amount,
    due_date,
    order_id,
    notes,
  } = body;

  if (!customer_name || !customer_phone || !total_amount || !due_date) {
    return NextResponse.json(
      { error: "customer_name, customer_phone, total_amount, and due_date are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("credits")
    .insert({
      business_id: auth.businessId,
      branch_id: auth.branchId,
      order_id: order_id ?? null,
      customer_name,
      customer_phone,
      items_description: items_description ?? "",
      total_amount,
      amount_paid: 0,
      due_date,
      status: "unpaid",
      created_by: auth.staffId,
      notes: notes ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send SMS notifications asynchronously (don't block response)
  if (data) {
    const { data: business } = await supabase
      .from("businesses")
      .select("name, phone")
      .eq("id", auth.businessId)
      .single();

    const businessName = business?.name ?? "DELRON POS";
    const formattedDue = new Date(due_date).toLocaleDateString("en-RW", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // SMS to customer
    void sendSMS(
      customer_phone,
      SMS_TEMPLATES.creditGiven(customer_name, total_amount, businessName, formattedDue)
    );

    // SMS to owner
    if (business?.phone) {
      void sendSMS(
        business.phone,
        SMS_TEMPLATES.ownerCreditAlert(customer_name, customer_phone, total_amount, formattedDue)
      );
    }

    // Log notification
    void supabase.from("notifications").insert({
      business_id: auth.businessId,
      user_id: auth.staffId,
      title: "Credit Sale Recorded",
      message: `${customer_name} (${customer_phone}) took ${total_amount.toLocaleString()} RWF on credit. Due: ${formattedDue}`,
      type: "warning",
      category: "credit",
      sent_via: ["sms", "in-app"],
      is_read: false,
    });
  }

  return NextResponse.json({ credit: data }, { status: 201 });
}
