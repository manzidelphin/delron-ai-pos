import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth";

export async function GET() {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;
  const supabase = createAdminClient();

  const { data: recipes, error } = await supabase
    .from("menu_recipes")
    .select(`
      raw_material_id, quantity_needed, unit,
      raw_materials(id, name, unit, quantity, min_quantity, cost_per_unit),
      menu_items!inner(name, business_id)
    `)
    .eq("menu_items.business_id", auth.businessId);

  if (error) {
    console.error("[restaurant/stock GET]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type MatEntry = {
    id: string; name: string; unit: string;
    quantity: number; min_quantity: number; cost_per_unit: number;
    used_in: string[]; status: string;
  };

  const matMap = new Map<string, MatEntry>();

  for (const row of recipes ?? []) {
    // Supabase returns joined tables as arrays even for to-one FK relations
    const matArr  = row.raw_materials as unknown as { id: string; name: string; unit: string; quantity: number; min_quantity: number; cost_per_unit: number }[] | null;
    const itemArr = row.menu_items   as unknown as { name: string; business_id: string }[] | null;

    const mat  = Array.isArray(matArr)  ? matArr[0]  : matArr;
    const item = Array.isArray(itemArr) ? itemArr[0] : itemArr;

    if (!mat || !item) continue;

    if (!matMap.has(mat.id)) {
      matMap.set(mat.id, {
        id: mat.id, name: mat.name, unit: mat.unit,
        quantity: mat.quantity, min_quantity: mat.min_quantity,
        cost_per_unit: mat.cost_per_unit,
        used_in: [], status: "ok",
      });
    }
    const entry = matMap.get(mat.id)!;
    if (!entry.used_in.includes(item.name)) {
      entry.used_in.push(item.name);
    }
  }

  const materials = Array.from(matMap.values()).map((m) => ({
    ...m,
    status: m.quantity === 0 ? "out_of_stock"
          : m.quantity <= m.min_quantity ? "low_stock"
          : "ok",
  }));

  const valuation = materials.reduce((s, m) => s + m.quantity * m.cost_per_unit, 0);
  const low       = materials.filter((m) => m.status !== "ok").length;

  return NextResponse.json({
    materials,
    valuation,
    summary: { total: materials.length, low },
  });
}
