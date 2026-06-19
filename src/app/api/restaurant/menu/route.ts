import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth";

export async function GET() {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("menu_items")
    .select(`
      *,
      menu_recipes(
        id, quantity_needed, unit,
        raw_materials(id, name, unit, cost_per_unit)
      )
    `)
    .eq("business_id", auth.businessId)
    .order("category")
    .order("name");

  if (error) {
    console.error("[restaurant/menu GET]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;
  const supabase = createAdminClient();

  const body = await request.json();
  const { name, category, selling_price, cost_price, prep_time_minutes, ingredients } = body;

  if (!name || !selling_price) {
    return NextResponse.json({ error: "name and selling_price are required" }, { status: 400 });
  }

  const { data: item, error } = await supabase
    .from("menu_items")
    .insert({
      business_id:       auth.businessId,
      branch_id:         auth.branchId,
      name:              name.trim(),
      category:          category ?? "main",
      selling_price:     parseFloat(selling_price),
      cost_price:        cost_price ? parseFloat(cost_price) : 0,
      prep_time_minutes: prep_time_minutes ? parseInt(prep_time_minutes) : 15,
      is_active:         true,
    })
    .select()
    .single();

  if (error) {
    console.error("[restaurant/menu POST]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (ingredients && ingredients.length > 0 && item) {
    type Ing = { raw_material_id: string; quantity_needed: number; unit: string };
    const rows = (ingredients as Ing[])
      .filter((i) => i.raw_material_id && i.quantity_needed > 0)
      .map((i) => ({
        menu_item_id:    item.id,
        raw_material_id: i.raw_material_id,
        quantity_needed: i.quantity_needed,
        unit:            i.unit,
      }));
    if (rows.length > 0) {
      await supabase.from("menu_recipes").insert(rows);
    }
  }

  return NextResponse.json({ item }, { status: 201 });
}
