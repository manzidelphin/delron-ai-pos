import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "all";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 20;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("credits")
    .select("*", { count: "exact" })
    .eq("business_id", auth.businessId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

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

  const supabase = createClient();
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

  return NextResponse.json({ credit: data }, { status: 201 });
}
