import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth";

export async function GET() {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("floor_tables")
    .select("*")
    .eq("business_id", auth.businessId)
    .order("table_number");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ tables: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { table_number, capacity, section } = body;

  if (!table_number) {
    return NextResponse.json({ error: "table_number required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("floor_tables")
    .insert({
      business_id: auth.businessId,
      branch_id: auth.branchId,
      table_number: parseInt(table_number),
      capacity: capacity ? parseInt(capacity) : 4,
      section: section ?? null,
      status: "empty",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ table: data }, { status: 201 });
}
