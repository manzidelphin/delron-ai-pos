import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { name, category, barcode, price_per_bottle, price_per_shot, shots_per_bottle, quantity_bottles, min_quantity, is_active } = body;

  const supabase = createAdminClient();

  // Recalculate shots_remaining when shots_per_bottle or quantity changes
  const parsedShots = shots_per_bottle != null ? parseInt(shots_per_bottle) : undefined;
  const parsedQty   = quantity_bottles  != null ? parseFloat(quantity_bottles) : undefined;

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name            != null) update.name             = name;
  if (category        != null) update.category         = category;
  if (barcode         != null) update.barcode          = barcode || null;
  if (price_per_bottle != null) update.price_per_bottle = parseFloat(price_per_bottle);
  if (price_per_shot  != null) update.price_per_shot   = parseFloat(price_per_shot) || null;
  if (parsedShots     != null) update.shots_per_bottle = parsedShots || null;
  if (parsedQty       != null) update.quantity_bottles = parsedQty;
  if (min_quantity    != null) update.min_quantity      = parseFloat(min_quantity);
  if (is_active       != null) update.is_active         = is_active;

  // Recompute shots_remaining if either shots_per_bottle or quantity_bottles changed
  if (parsedShots != null || parsedQty != null) {
    const { data: current } = await supabase
      .from("bar_items")
      .select("quantity_bottles, shots_per_bottle")
      .eq("id", params.id)
      .single();
    const qty   = parsedQty   ?? current?.quantity_bottles   ?? 0;
    const shots = parsedShots ?? current?.shots_per_bottle   ?? 0;
    update.shots_remaining = shots > 0 ? qty * shots : 0;
  }

  const { data, error } = await supabase
    .from("bar_items")
    .update(update)
    .eq("id", params.id)
    .eq("business_id", auth.businessId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("bar_items")
    .update({ is_active: false })
    .eq("id", params.id)
    .eq("business_id", auth.businessId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
