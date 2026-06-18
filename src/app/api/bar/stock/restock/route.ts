import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth";

export async function GET() {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();
  const { data: items, error } = await supabase
    .from("bar_items")
    .select("id, name, category, quantity_bottles, min_quantity, shots_per_bottle, price_per_bottle")
    .eq("business_id", auth.businessId)
    .eq("is_active", true)
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

  if (!entries || entries.length === 0) {
    return NextResponse.json({ error: "No restock entries provided" }, { status: 400 });
  }

  const validEntries = entries.filter((e) => e.quantity_received > 0);
  if (validEntries.length === 0) {
    return NextResponse.json({ error: "All quantities are 0" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Load the items being restocked to get their current state
  const itemIds = validEntries.map((e) => e.item_id);
  const { data: items, error: fetchErr } = await supabase
    .from("bar_items")
    .select("id, name, quantity_bottles, shots_remaining, shots_per_bottle")
    .in("id", itemIds)
    .eq("business_id", auth.businessId);

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });

  const itemMap = Object.fromEntries((items ?? []).map((i) => [i.id, i]));

  // Update each item and collect log inserts
  const logs: object[] = [];
  const updateErrors: string[] = [];

  for (const entry of validEntries) {
    const item = itemMap[entry.item_id];
    if (!item) continue;

    const newBottles = item.quantity_bottles + entry.quantity_received;
    const newShots   = item.shots_per_bottle > 0
      ? item.shots_remaining + entry.quantity_received * item.shots_per_bottle
      : item.shots_remaining;

    const { error: updErr } = await supabase
      .from("bar_items")
      .update({ quantity_bottles: newBottles, shots_remaining: newShots, updated_at: new Date().toISOString() })
      .eq("id", entry.item_id)
      .eq("business_id", auth.businessId);

    if (updErr) { updateErrors.push(item.name); continue; }

    logs.push({
      business_id:       auth.businessId,
      branch_id:         auth.branchId !== auth.businessId ? auth.branchId : null,
      bar_item_id:       entry.item_id,
      item_name:         item.name,
      quantity_received: entry.quantity_received,
      supplier_name:     supplier_name ?? null,
      notes:             notes ?? null,
      restocked_by:      auth.ownerStaffId,
    });
  }

  if (logs.length > 0) {
    const { error: logErr } = await supabase.from("bar_restock_logs").insert(logs);
    if (logErr) console.error("[restock] log insert error:", logErr.message);
  }

  return NextResponse.json({
    success: true,
    restocked: logs.length,
    errors: updateErrors,
  });
}
