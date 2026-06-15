import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth";

export async function GET(_request: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const supabase = createClient();

  const { data: recipes, error } = await supabase
    .from("recipes")
    .select(`
      *,
      finished_goods(id, name, selling_price, cost_price, barcode_type, unit, quantity),
      recipe_ingredients(
        id, quantity_needed, unit,
        raw_materials(id, name, unit, cost_per_unit)
      )
    `)
    .eq("business_id", auth.businessId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const enriched = (recipes ?? []).map((r) => {
    const ingredients = r.recipe_ingredients ?? [];
    const batchCost = ingredients.reduce((sum: number, ing: { quantity_needed: number; raw_materials?: { cost_per_unit: number } | null }) => {
      const costPer = ing.raw_materials?.cost_per_unit ?? 0;
      return sum + ing.quantity_needed * costPer;
    }, 0);
    const yieldQty = r.yield_quantity || 1;
    const costPerPiece = batchCost / yieldQty;
    const sellingPrice = r.finished_goods?.selling_price ?? 0;
    const profitPerPiece = sellingPrice - costPerPiece;

    return {
      ...r,
      batch_cost: batchCost,
      cost_per_piece: costPerPiece,
      profit_per_piece: profitPerPiece,
      ingredient_count: ingredients.length,
    };
  });

  return NextResponse.json({ recipes: enriched });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { finished_good_id, name, yield_quantity, yield_unit, instructions, ingredients } = body;

  if (!finished_good_id || !name?.trim() || !yield_quantity) {
    return NextResponse.json({ error: "finished_good_id, name, and yield_quantity are required" }, { status: 400 });
  }

  const supabase = createClient();

  const { data: recipe, error: recipeError } = await supabase
    .from("recipes")
    .insert({
      business_id: auth.businessId,
      finished_good_id,
      name: name.trim(),
      yield_quantity: parseFloat(yield_quantity),
      yield_unit: yield_unit || "pieces",
      instructions: instructions?.trim() || null,
    })
    .select()
    .single();

  if (recipeError) return NextResponse.json({ error: recipeError.message }, { status: 500 });

  if (ingredients && ingredients.length > 0) {
    const rows = ingredients.map((ing: { raw_material_id: string; quantity_needed: number; unit: string }) => ({
      recipe_id: recipe.id,
      raw_material_id: ing.raw_material_id,
      quantity_needed: parseFloat(String(ing.quantity_needed)),
      unit: ing.unit,
    }));

    const { error: ingError } = await supabase.from("recipe_ingredients").insert(rows);
    if (ingError) return NextResponse.json({ error: ingError.message }, { status: 500 });
  }

  return NextResponse.json({ recipe }, { status: 201 });
}
