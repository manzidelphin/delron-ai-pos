import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth";

interface ProductionItem {
  finished_good_id: string;
  quantity_produced: number;
  batch_label?: string;
  expiry_hours?: number;
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { items, notes }: { items: ProductionItem[]; notes?: string } = body;

  if (!items || items.length === 0) {
    return NextResponse.json({ error: "No items provided" }, { status: 400 });
  }

  const validItems = items.filter((i) => i.quantity_produced > 0);
  if (validItems.length === 0) {
    return NextResponse.json({ error: "All quantities are 0" }, { status: 400 });
  }

  const supabase = createClient();

  // 1. Fetch recipes for all items
  const fgIds = validItems.map((i) => i.finished_good_id);
  const { data: recipes, error: recipesError } = await supabase
    .from("recipes")
    .select(`
      id, finished_good_id, yield_quantity,
      recipe_ingredients(raw_material_id, quantity_needed)
    `)
    .eq("business_id", auth.businessId)
    .in("finished_good_id", fgIds);

  if (recipesError) return NextResponse.json({ error: recipesError.message }, { status: 500 });

  // 2. Calculate total ingredient requirements
  const ingredientNeeds = new Map<string, number>();

  for (const item of validItems) {
    const recipe = (recipes ?? []).find((r) => r.finished_good_id === item.finished_good_id);
    if (!recipe) continue;
    const scale = item.quantity_produced / recipe.yield_quantity;
    for (const ing of recipe.recipe_ingredients ?? []) {
      const current = ingredientNeeds.get(ing.raw_material_id) ?? 0;
      ingredientNeeds.set(ing.raw_material_id, current + ing.quantity_needed * scale);
    }
  }

  // 3. Check ingredient availability
  if (ingredientNeeds.size > 0) {
    const materialIds = [...ingredientNeeds.keys()];
    const { data: materials } = await supabase
      .from("raw_materials")
      .select("id, name, quantity, unit")
      .in("id", materialIds)
      .eq("business_id", auth.businessId);

    const shortages: Array<{ name: string; needed: number; available: number; unit: string }> = [];

    for (const mat of materials ?? []) {
      const needed = ingredientNeeds.get(mat.id) ?? 0;
      if (mat.quantity < needed) {
        shortages.push({ name: mat.name, needed, available: mat.quantity, unit: mat.unit });
      }
    }

    if (shortages.length > 0) {
      return NextResponse.json({ error: "Insufficient ingredients", shortages }, { status: 422 });
    }

    // 4. Deduct ingredients
    for (const [materialId, qty] of ingredientNeeds.entries()) {
      const mat = (materials ?? []).find((m) => m.id === materialId);
      if (!mat) continue;
      await supabase
        .from("raw_materials")
        .update({ quantity: Math.max(0, mat.quantity - qty), updated_at: new Date().toISOString() })
        .eq("id", materialId);
    }
  }

  // 5. Add to finished_goods and create production_logs
  const now = new Date().toISOString();
  const productionLogs = [];

  for (const item of validItems) {
    const { data: fg } = await supabase
      .from("finished_goods")
      .select("quantity, name, barcode, barcode_type, selling_price")
      .eq("id", item.finished_good_id)
      .single();

    if (!fg) continue;

    await supabase
      .from("finished_goods")
      .update({ quantity: (fg.quantity || 0) + item.quantity_produced, updated_at: now })
      .eq("id", item.finished_good_id);

    const expiryTime = item.expiry_hours
      ? new Date(Date.now() + item.expiry_hours * 3600000).toISOString()
      : null;

    const { data: log } = await supabase
      .from("production_logs")
      .insert({
        business_id: auth.businessId,
        branch_id: auth.branchId,
        baker_id: auth.staffId,
        finished_good_id: item.finished_good_id,
        quantity_produced: item.quantity_produced,
        batch_label: item.batch_label || null,
        production_time: now,
        expiry_time: expiryTime,
        notes: notes || null,
      })
      .select()
      .single();

    productionLogs.push({
      ...log,
      item_name: fg.name,
      barcode: fg.barcode,
      barcode_type: fg.barcode_type,
      selling_price: fg.selling_price,
      quantity_produced: item.quantity_produced,
    });
  }

  return NextResponse.json({ success: true, production_logs: productionLogs }, { status: 201 });
}
