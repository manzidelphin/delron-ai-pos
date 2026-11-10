import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth";

const STATUSES = ["empty", "occupied", "bill_requested", "reserved"];

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const body = await request.json();
  const supabase = createAdminClient();

  // Only the table's own fields can change (never business_id, branch_id, …).
  const update: Record<string, unknown> = {};
  if (body.table_number !== undefined) {
    const number = parseInt(body.table_number);
    if (!(number > 0)) return NextResponse.json({ error: "Table number must be 1 or more" }, { status: 400 });
    const { data: clash } = await supabase
      .from("floor_tables").select("id")
      .eq("business_id", auth.businessId).is("archived_at", null)
      .eq("table_number", String(number)).neq("id", params.id).limit(1);
    if (clash?.length) return NextResponse.json({ error: `Table ${number} is already in use` }, { status: 409 });
    update.table_number = String(number);
  }
  if (body.capacity !== undefined) update.capacity = parseInt(body.capacity) > 0 ? parseInt(body.capacity) : 4;
  if (body.name !== undefined) update.section = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 40) : null;
  if (body.is_fixed !== undefined) update.is_fixed = body.is_fixed === true;
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    // A table with an unpaid bill can't be marked free: it would look empty while
    // the bill (and its drinks) stays open.
    if (body.status === "empty" || body.status === "reserved") {
      const { data: openBills } = await supabase
        .from("orders").select("total")
        .eq("business_id", auth.businessId).eq("table_id", params.id)
        .not("status", "in", "(completed,cancelled)");
      if (openBills?.length) {
        const unpaid = openBills.reduce((s, o) => s + Number(o.total ?? 0), 0);
        return NextResponse.json(
          { error: `This table has an open bill (RWF ${unpaid.toLocaleString()}). Pay it or put it on credit first.` },
          { status: 409 }
        );
      }
    }
    update.status = body.status;
  }

  const { data, error } = await supabase
    .from("floor_tables")
    .update(update)
    .eq("id", params.id)
    .eq("business_id", auth.businessId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ table: data });
}

/**
 * Removes a table from the floor. It is hidden, not deleted, so past orders and
 * reports keep their table number and name. A table with an open bill can't be removed.
 */
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();

  const { data: openTab } = await supabase
    .from("orders").select("id")
    .eq("business_id", auth.businessId).eq("table_id", params.id)
    .not("status", "in", "(completed,cancelled)").limit(1);
  if (openTab?.length) {
    return NextResponse.json({ error: "This table has an open bill. Pay or close it first." }, { status: 409 });
  }

  const { error } = await supabase
    .from("floor_tables")
    .update({ archived_at: new Date().toISOString(), status: "empty" })
    .eq("id", params.id)
    .eq("business_id", auth.businessId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
