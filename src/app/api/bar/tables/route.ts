import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth";
import { nextTableNumber } from "@/lib/tables";

/** Tables still on the floor. Tables hidden after payment (archived_at) are left out. */
export async function GET() {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("floor_tables")
    .select("*")
    .eq("business_id", auth.businessId)
    .is("archived_at", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Numeric order (table_number is text, so "10" would sort before "2").
  const tables = (data ?? []).sort((a, b) => (parseInt(a.table_number) || 0) - (parseInt(b.table_number) || 0));
  return NextResponse.json({ tables, next_number: nextTableNumber(tables) });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { table_number, capacity, name, is_fixed } = body;

  const supabase = createAdminClient();

  const { data: active } = await supabase
    .from("floor_tables")
    .select("table_number")
    .eq("business_id", auth.businessId)
    .is("archived_at", null);

  // No number given: take the next free one.
  const number = parseInt(table_number) > 0 ? parseInt(table_number) : nextTableNumber(active ?? []);
  if ((active ?? []).some((t) => parseInt(t.table_number) === number)) {
    return NextResponse.json({ error: `Table ${number} is already in use` }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("floor_tables")
    .insert({
      business_id: auth.businessId,
      branch_id: auth.branchId,
      table_number: String(number),
      capacity: parseInt(capacity) > 0 ? parseInt(capacity) : 4,
      section: typeof name === "string" && name.trim() ? name.trim().slice(0, 40) : null, // the table's name
      is_fixed: is_fixed === true,
      status: "empty",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ table: data }, { status: 201 });
}
