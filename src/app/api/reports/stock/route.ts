import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";

export async function GET() {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const supabase = createClient();

  const [productsRes, barRes, materialsRes] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, name, category, quantity, min_quantity, unit, price, cost_price, updated_at, is_active"
      )
      .eq("business_id", auth.businessId)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("bar_items")
      .select(
        "id, name, category, quantity_bottles, shots_remaining, min_quantity, price_per_bottle, cost_per_bottle, shots_per_bottle, is_shot_item, updated_at, is_active"
      )
      .eq("business_id", auth.businessId)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("raw_materials")
      .select(
        "id, name, unit, quantity, min_quantity, cost_per_unit, updated_at"
      )
      .eq("business_id", auth.businessId)
      .order("name"),
  ]);

  const products = productsRes.data ?? [];
  const barItems = barRes.data ?? [];
  const materials = materialsRes.data ?? [];

  // Tag stock status
  const withStatus = <T extends { quantity?: number; quantity_bottles?: number; min_quantity: number }>(
    items: T[],
    qtyField: "quantity" | "quantity_bottles" = "quantity"
  ) =>
    items.map((item) => {
      const qty = (item[qtyField] as number) ?? 0;
      const min = item.min_quantity ?? 0;
      const status =
        qty === 0
          ? "out_of_stock"
          : qty <= min
          ? "low_stock"
          : qty > min * 3
          ? "overstocked"
          : "ok";
      return { ...item, status };
    });

  const taggedProducts = withStatus(products);
  const taggedBar = withStatus(barItems, "quantity_bottles");
  const taggedMaterials = withStatus(materials);

  // Valuation
  const supermarketValue = products.reduce(
    (s, p) => s + (p.quantity ?? 0) * (p.cost_price ?? 0),
    0
  );
  const barValue = barItems.reduce(
    (s, i) => s + (i.quantity_bottles ?? 0) * (i.cost_per_bottle ?? 0),
    0
  );
  const materialsValue = materials.reduce(
    (s, m) => s + (m.quantity ?? 0) * (m.cost_per_unit ?? 0),
    0
  );

  return NextResponse.json({
    supermarket: taggedProducts,
    bar: taggedBar,
    materials: taggedMaterials,
    valuation: {
      supermarket: supermarketValue,
      bar: barValue,
      materials: materialsValue,
      total: supermarketValue + barValue + materialsValue,
    },
    summary: {
      supermarket_total: products.length,
      supermarket_low: taggedProducts.filter((p) => p.status === "low_stock").length,
      supermarket_out: taggedProducts.filter((p) => p.status === "out_of_stock").length,
      bar_total: barItems.length,
      bar_low: taggedBar.filter((i) => i.status === "low_stock").length,
      materials_total: materials.length,
      materials_low: taggedMaterials.filter((m) => m.status === "low_stock").length,
    },
  });
}
