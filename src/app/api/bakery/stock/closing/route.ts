import { NextRequest, NextResponse } from "next/server";
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

  const { data: materials, error } = await supabase
    .from("raw_materials")
    .select("id, name, unit, quantity, min_quantity")
    .eq("business_id", auth.businessId)
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Consumed today via production
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

  // Restocked today
  const { data: todayRestocks } = await supabase
    .from("material_restock_logs")
    .select("raw_material_id, quantity_received")
    .eq("business_id", auth.businessId)
    .gte("created_at", fromStr)
    .lte("created_at", toStr);

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

  const enriched = (materials ?? []).map((m) => {
    const current         = m.quantity;
    const consumed_today  = consumedMap[m.id] ?? 0;
    const restocked_today = restockMap[m.id] ?? 0;
    const opening         = openingMap[m.id] !== undefined
      ? openingMap[m.id]
      : current + consumed_today - restocked_today;
    const expected        = opening + restocked_today - consumed_today;
    return { ...m, opening, consumed_today, restocked_today, expected_quantity: expected };
  });

  return NextResponse.json({ items: enriched, count_date: todayStr });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const body = await req.json();
  const { count_date, entries } = body as {
    count_date: string;
    entries: {
      item_id: string;
      actual_quantity: number;
      expected_quantity: number;
      opening_quantity: number;
      consumed_today: number;
      restocked_today: number;
    }[];
  };

  if (!count_date || !entries?.length) {
    return NextResponse.json({ error: "count_date and entries required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const itemIds = entries.map((e) => e.item_id);
  const { data: materials } = await supabase
    .from("raw_materials")
    .select("id, name")
    .in("id", itemIds)
    .eq("business_id", auth.businessId);

  const nameMap = Object.fromEntries((materials ?? []).map((m) => [m.id, m.name]));

  const countRows: object[] = [];
  let flaggedCount = 0;

  for (const entry of entries) {
    const variance     = entry.expected_quantity - entry.actual_quantity;
    const variance_pct = entry.expected_quantity > 0
      ? parseFloat(((variance / entry.expected_quantity) * 100).toFixed(2))
      : 0;

    if (Math.abs(variance_pct) > 5) flaggedCount++;

    countRows.push({
      business_id:       auth.businessId,
      branch_id:         auth.branchId !== auth.businessId ? auth.branchId : null,
      count_date,
      raw_material_id:   entry.item_id,
      item_name:         nameMap[entry.item_id] ?? "Unknown",
      opening_quantity:  entry.opening_quantity,
      sold_today:        entry.consumed_today,
      restocked_today:   entry.restocked_today,
      expected_quantity: entry.expected_quantity,
      actual_quantity:   entry.actual_quantity,
      variance,
      variance_percent:  variance_pct,
      counted_by:        auth.ownerStaffId,
    });

    await supabase
      .from("raw_materials")
      .update({ quantity: entry.actual_quantity, updated_at: new Date().toISOString() })
      .eq("id", entry.item_id)
      .eq("business_id", auth.businessId);
  }

  const { error: insertErr } = await supabase.from("daily_stock_counts").insert(countRows);
  if (insertErr) {
    console.error("[bakery/closing] insert error:", insertErr.message);
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, items_counted: countRows.length, flagged_items: flaggedCount });
}
