import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { name, yield_quantity, yield_unit, instructions, ingredients } = body;

  const supabase = createAdminClient();

  const { error: recipeError } = await supabase
    .from("recipes")
    .update({
      name: name?.trim(),
      yield_quantity: parseFloat(yield_quantity),
      yield_unit: yield_unit || "pieces",
      instructions: instructions?.trim() || null,
    })
    .eq("id", params.id)
    .eq("business_id", auth.businessId);

  if (recipeError) return NextResponse.json({ error: recipeError.message }, { status: 500 });

  if (ingredients) {
    await supabase.from("recipe_ingredients").delete().eq("recipe_id", params.id);

    if (ingredients.length > 0) {
      const rows = ingredients.map((ing: { raw_material_id: string; quantity_needed: number; unit: string }) => ({
        recipe_id: params.id,
        raw_material_id: ing.raw_material_id,
        quantity_needed: parseFloat(String(ing.quantity_needed)),
        unit: ing.unit,
      }));
      const { error: ingError } = await supabase.from("recipe_ingredients").insert(rows);
      if (ingError) return NextResponse.json({ error: ingError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();

  await supabase.from("recipe_ingredients").delete().eq("recipe_id", params.id);

  const { error } = await supabase
    .from("recipes")
    .delete()
    .eq("id", params.id)
    .eq("business_id", auth.businessId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
