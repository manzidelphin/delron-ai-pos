import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "open";

  const supabase = createClient();

  const { data, error } = await supabase
    .from("orders")
    .select("*, floor_tables(table_number, capacity, location)")
    .eq("business_id", auth.businessId)
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ tabs: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { table_id, customer_name, num_guests } = body;

  const supabase = createClient();

  // Mark table occupied
  if (table_id) {
    await supabase
      .from("floor_tables")
      .update({ status: "occupied" })
      .eq("id", table_id)
      .eq("business_id", auth.businessId);
  }

  const { data, error } = await supabase
    .from("orders")
    .insert({
      business_id: auth.businessId,
      branch_id: auth.branchId,
      table_id: table_id ?? null,
      staff_id: auth.staffId,
      customer_name: customer_name ?? null,
      num_guests: num_guests ?? 1,
      status: "open",
      total_amount: 0,
      order_type: "bar_tab",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ tab: data }, { status: 201 });
}
