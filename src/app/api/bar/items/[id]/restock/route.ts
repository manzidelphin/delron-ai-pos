import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const body = await request.json();
  // cost_paid is accepted but not stored: bar_items has no cost column.
  const { bottles_to_add } = body;

  const qty = parseFloat(bottles_to_add);
  if (isNaN(qty) || qty <= 0) {
    return NextResponse.json({ error: "bottles_to_add must be a positive number" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("bar_items")
    // Only real columns (is_shot_item / cost_per_bottle don't exist and made this fail).
    .select("quantity_bottles, shots_remaining, shots_per_bottle")
    .eq("id", params.id)
    .eq("business_id", auth.businessId)
    .single();

  if (!existing) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const newBottles = Number(existing.quantity_bottles ?? 0) + qty;

  // Same rule as /api/bar/stock/restock: items with shots per bottle gain those shots.
  let newShotsRemaining = Number(existing.shots_remaining ?? 0);
  if (Number(existing.shots_per_bottle ?? 0) > 0) {
    newShotsRemaining += qty * Number(existing.shots_per_bottle);
  }

  const { data, error } = await supabase
    .from("bar_items")
    .update({
      quantity_bottles: newBottles,
      shots_remaining: newShotsRemaining,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ item: data, added_bottles: qty });
}
