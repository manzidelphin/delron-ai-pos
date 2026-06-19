import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth";

export async function GET() {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];
  const fromStr = `${todayStr}T00:00:00`;
  const toStr   = `${todayStr}T23:59:59`;

  const { data: materials, error: matErr } = await supabase
    .from("raw_materials")
    .select("id, name, quantity, unit, min_quantity, cost_per_unit")
    .eq("business_id", auth.businessId)
    .order("name");

  if (matErr) console.error("[bakery/stock] materials:", matErr.message);

  // Consumed today: production_logs → recipe_ingredients
  const { data: prodLogs } = await supabase
    .from("production_logs")
    .select("finished_good_id, quantity_produced")
    .eq("business_id", auth.businessId)
    .gte("production_time", fromStr)
    .lte("production_time", toStr);

  const consumedMap: Record<string, number> = {};
  if ((prodLogs ?? []).length > 0) {
    const fgIds = [...new Set((prodLogs ?? []).map((l) => l.finished_good_id))];
    const { data: recipes } = await supabase
      .from("recipes")
      .select("finished_good_id, yield_quantity, recipe_ingredients(raw_material_id, quantity_needed)")
      .eq("business_id", auth.businessId)
      .in("finished_good_id", fgIds);

    const recipeMap = Object.fromEntries((recipes ?? []).map((r) => [r.finished_good_id, r]));

    for (const log of prodLogs ?? []) {
      const recipe = recipeMap[log.finished_good_id];
      if (!recipe) continue;
      const scale = log.quantity_produced / (recipe.yield_quantity || 1);
      for (const ing of recipe.recipe_ingredients ?? []) {
        if (ing.raw_material_id) {
          consumedMap[ing.raw_material_id] = (consumedMap[ing.raw_material_id] ?? 0) + ing.quantity_needed * scale;
        }
      }
    }
  }

  // Today's restocks
  const { data: todayRestocks } = await supabase
    .from("material_restock_logs")
    .select("raw_material_id, quantity_received, item_name, supplier_name, created_at, id")
    .eq("business_id", auth.businessId)
    .gte("created_at", fromStr)
    .lte("created_at", toStr)
    .order("created_at", { ascending: false });

  const restockMap: Record<string, number> = {};
  for (const r of todayRestocks ?? []) {
    if (r.raw_material_id) restockMap[r.raw_material_id] = (restockMap[r.raw_material_id] ?? 0) + r.quantity_received;
  }

  // Yesterday's closing → today's opening
  const { data: lastCounts } = await supabase
    .from("daily_stock_counts")
    .select("raw_material_id, actual_quantity")
    .eq("business_id", auth.businessId)
    .eq("count_date", yesterdayStr)
    .not("raw_material_id", "is", null);

  const openingMap: Record<string, number> = {};
  for (const c of lastCounts ?? []) {
    if (c.raw_material_id) openingMap[c.raw_material_id] = c.actual_quantity;
  }

  // Recent restocks
  const { data: recentRestocks } = await supabase
    .from("material_restock_logs")
    .select("id, item_name, quantity_received, unit, supplier_name, created_at")
    .eq("business_id", auth.businessId)
    .order("created_at", { ascending: false })
    .limit(10);

  const enriched = (materials ?? []).map((m) => {
    const current       = m.quantity;
    const consumed      = consumedMap[m.id] ?? 0;
    const reStocked     = restockMap[m.id] ?? 0;
    const opening       = openingMap[m.id] !== undefined
      ? openingMap[m.id]
      : current + consumed - reStocked;
    const status =
      current <= 0         ? "out_of_stock"
      : current <= m.min_quantity ? "low_stock"
      : "ok";
    return { ...m, opening, consumed_today: consumed, restocked_today: reStocked, current, status };
  });

  const summary = {
    total_items:     enriched.length,
    low_stock:       enriched.filter((i) => i.status === "low_stock").length,
    out_of_stock:    enriched.filter((i) => i.status === "out_of_stock").length,
    restocked_today: (todayRestocks ?? []).length,
  };

  return NextResponse.json({ items: enriched, summary, recent_restocks: recentRestocks ?? [] });
}
