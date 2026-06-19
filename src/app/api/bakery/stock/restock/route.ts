import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth";

export async function GET() {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();
  const { data: items, error } = await supabase
    .from("raw_materials")
    .select("id, name, unit, quantity, min_quantity, cost_per_unit")
    .eq("business_id", auth.businessId)
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: items ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const body = await req.json();
  const { supplier_name, notes, entries } = body as {
    supplier_name?: string;
    notes?: string;
    entries: { item_id: string; quantity_received: number }[];
  };

  if (!entries?.length) {
    return NextResponse.json({ error: "No restock entries provided" }, { status: 400 });
  }

  const validEntries = entries.filter((e) => e.quantity_received > 0);
  if (validEntries.length === 0) {
    return NextResponse.json({ error: "All quantities are 0" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const itemIds = validEntries.map((e) => e.item_id);
  const { data: materials, error: fetchErr } = await supabase
    .from("raw_materials")
    .select("id, name, unit, quantity")
    .in("id", itemIds)
    .eq("business_id", auth.businessId);

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });

  const itemMap = Object.fromEntries((materials ?? []).map((m) => [m.id, m]));
  const logs: object[] = [];
  const updateErrors: string[] = [];

  for (const entry of validEntries) {
    const mat = itemMap[entry.item_id];
    if (!mat) continue;

    const { error: updErr } = await supabase
      .from("raw_materials")
      .update({ quantity: mat.quantity + entry.quantity_received, updated_at: new Date().toISOString() })
      .eq("id", entry.item_id)
      .eq("business_id", auth.businessId);

    if (updErr) { updateErrors.push(mat.name); continue; }

    logs.push({
      business_id:       auth.businessId,
      branch_id:         auth.branchId !== auth.businessId ? auth.branchId : null,
      raw_material_id:   entry.item_id,
      item_name:         mat.name,
      unit:              mat.unit,
      quantity_received: entry.quantity_received,
      supplier_name:     supplier_name ?? null,
      notes:             notes ?? null,
      restocked_by:      auth.ownerStaffId,
    });
  }

  if (logs.length > 0) {
    const { error: logErr } = await supabase.from("material_restock_logs").insert(logs);
    if (logErr) console.error("[bakery/restock] log insert:", logErr.message);
  }

  return NextResponse.json({ success: true, restocked: logs.length, errors: updateErrors });
}
