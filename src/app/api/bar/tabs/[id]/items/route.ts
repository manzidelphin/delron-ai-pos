import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { bar_item_id, menu_item_id, quantity, serve_as } = body;
  // serve_as: "bottle" | "shot" (bar items only)

  if (!quantity || (!bar_item_id && !menu_item_id)) {
    return NextResponse.json({ error: "quantity and either bar_item_id or menu_item_id are required" }, { status: 400 });
  }

  const qty = parseFloat(quantity);
  const supabase = createAdminClient();

  // ── Food / menu item path ─────────────────────────────────────────────────
  if (menu_item_id) {
    const { data: menuItem } = await supabase
      .from("menu_items")
      .select("*")
      .eq("id", menu_item_id)
      .eq("business_id", auth.businessId)
      .single();

    if (!menuItem) return NextResponse.json({ error: "Menu item not found" }, { status: 404 });

    // Deduct ingredients from raw_materials if a recipe exists
    const { data: recipe } = await supabase
      .from("menu_recipes")
      .select("*, raw_materials(id, name, quantity, unit)")
      .eq("menu_item_id", menu_item_id);

    if (recipe && recipe.length > 0) {
      const shortages: string[] = [];
      for (const ing of recipe) {
        const mat = ing.raw_materials as { id: string; name: string; quantity: number; unit: string } | null;
        if (!mat) continue;
        const needed = ing.quantity_needed * qty;
        if (mat.quantity < needed) {
          shortages.push(`${mat.name}: need ${needed.toFixed(2)}${ing.unit}, have ${mat.quantity}`);
        }
      }
      if (shortages.length > 0) {
        return NextResponse.json({ error: `Insufficient ingredients: ${shortages.join("; ")}` }, { status: 422 });
      }
      for (const ing of recipe) {
        const mat = ing.raw_materials as { id: string; quantity: number } | null;
        if (!mat) continue;
        await supabase
          .from("raw_materials")
          .update({ quantity: Math.max(0, mat.quantity - ing.quantity_needed * qty), updated_at: new Date().toISOString() })
          .eq("id", mat.id);
      }
    }

    const { data: orderItem, error: insertErr } = await supabase
      .from("order_items")
      .insert({
        order_id:    params.id,
        item_id:     menu_item_id,
        item_type:   "menu_item",
        item_name:   menuItem.name,
        quantity:    qty,
        unit_price:  menuItem.selling_price,
        total_price: menuItem.selling_price * qty,
        notes:       String(menuItem.prep_time_minutes ?? 15),
        status:      "pending",
      })
      .select()
      .single();

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

    const { data: allItems } = await supabase
      .from("order_items")
      .select("total_price")
      .eq("order_id", params.id);

    const newTotal = (allItems ?? []).reduce((s, i) => s + i.total_price, 0);
    await supabase.from("orders").update({ total: newTotal }).eq("id", params.id);

    return NextResponse.json({ order_item: orderItem, tab_total: newTotal }, { status: 201 });
  }
  // ── Bar item path (existing) ──────────────────────────────────────────────

  // Fetch the bar item
  const { data: item } = await supabase
    .from("bar_items")
    .select("*")
    .eq("id", bar_item_id)
    .eq("business_id", auth.businessId)
    .single();

  if (!item) return NextResponse.json({ error: "Bar item not found" }, { status: 404 });

  const isShot = serve_as === "shot" && item.shots_per_bottle > 1;
  const unit_price = isShot ? (item.price_per_shot ?? 0) : item.price_per_bottle;
  const line_total = unit_price * qty;

  // Stock check
  if (isShot) {
    if (item.shots_remaining < qty) {
      return NextResponse.json({ error: `Only ${item.shots_remaining} shots remaining` }, { status: 422 });
    }
  } else {
    if (item.quantity_bottles < qty) {
      return NextResponse.json({ error: `Only ${item.quantity_bottles} bottles in stock` }, { status: 422 });
    }
  }

  // Deduct stock
  if (isShot) {
    const shots_deducted = qty;
    const bottles_deducted = qty / (item.shots_per_bottle ?? 1);
    await supabase
      .from("bar_items")
      .update({
        shots_remaining: item.shots_remaining - shots_deducted,
        quantity_bottles: Math.max(0, item.quantity_bottles - bottles_deducted),
      })
      .eq("id", bar_item_id);
  } else {
    await supabase
      .from("bar_items")
      .update({ quantity_bottles: item.quantity_bottles - qty })
      .eq("id", bar_item_id);
  }

  // Insert order item
  const { data: orderItem, error } = await supabase
    .from("order_items")
    .insert({
      order_id: params.id,
      item_id: bar_item_id,
      item_type: "bar_item",
      item_name: item.name,
      quantity: qty,
      unit_price,
      total_price: line_total,
      notes: isShot ? "served as shot" : null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update tab total
  const { data: allItems } = await supabase
    .from("order_items")
    .select("total_price")
    .eq("order_id", params.id);

  const newTotal = (allItems ?? []).reduce((s, i) => s + i.total_price, 0);

  await supabase
    .from("orders")
    .update({ total: newTotal })
    .eq("id", params.id);

  return NextResponse.json({ order_item: orderItem, tab_total: newTotal }, { status: 201 });
}
