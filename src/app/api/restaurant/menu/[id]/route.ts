import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;
  const supabase = createAdminClient();

  const body = await request.json();
  const { name, category, selling_price, cost_price, prep_time_minutes, is_active, ingredients } = body;

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name              != null) update.name              = (name as string).trim();
  if (category          != null) update.category          = category;
  if (selling_price     != null) update.selling_price     = parseFloat(selling_price);
  if (cost_price        != null) update.cost_price        = parseFloat(cost_price);
  if (prep_time_minutes != null) update.prep_time_minutes = parseInt(prep_time_minutes);
  if (is_active         != null) update.is_active         = is_active;

  const { data, error } = await supabase
    .from("menu_items")
    .update(update)
    .eq("id", params.id)
    .eq("business_id", auth.businessId)
    .select()
    .single();

  if (error) {
    console.error("[restaurant/menu PUT]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (ingredients != null) {
    await supabase.from("menu_recipes").delete().eq("menu_item_id", params.id);
    type Ing = { raw_material_id: string; quantity_needed: number; unit: string };
    const rows = (ingredients as Ing[])
      .filter((i) => i.raw_material_id && i.quantity_needed > 0)
      .map((i) => ({
        menu_item_id:    params.id,
        raw_material_id: i.raw_material_id,
        quantity_needed: i.quantity_needed,
        unit:            i.unit,
      }));
    if (rows.length > 0) {
      await supabase.from("menu_recipes").insert(rows);
    }
  }

  return NextResponse.json({ item: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("menu_items")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("business_id", auth.businessId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
