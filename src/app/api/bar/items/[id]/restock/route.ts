import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { bottles_to_add, cost_paid } = body;

  const qty = parseFloat(bottles_to_add);
  if (isNaN(qty) || qty <= 0) {
    return NextResponse.json({ error: "bottles_to_add must be a positive number" }, { status: 400 });
  }

  const supabase = createClient();

  const { data: existing } = await supabase
    .from("bar_items")
    .select("quantity_bottles, shots_remaining, shots_per_bottle, is_shot_item, cost_per_bottle")
    .eq("id", params.id)
    .eq("business_id", auth.businessId)
    .single();

  if (!existing) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const newBottles = existing.quantity_bottles + qty;
  const newCost = cost_paid ? parseFloat(cost_paid) / qty : existing.cost_per_bottle;

  let newShotsRemaining = existing.shots_remaining;
  if (existing.is_shot_item && existing.shots_per_bottle) {
    newShotsRemaining += qty * existing.shots_per_bottle;
  }

  const { data, error } = await supabase
    .from("bar_items")
    .update({
      quantity_bottles: newBottles,
      shots_remaining: newShotsRemaining,
      cost_per_bottle: newCost,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ item: data, added_bottles: qty });
}
