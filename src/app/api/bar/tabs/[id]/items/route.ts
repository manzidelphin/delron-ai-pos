import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { bar_item_id, quantity, serve_as } = body;
  // serve_as: "bottle" | "shot"

  if (!bar_item_id || !quantity) {
    return NextResponse.json({ error: "bar_item_id and quantity required" }, { status: 400 });
  }

  const qty = parseFloat(quantity);
  const supabase = createClient();

  // Fetch the bar item
  const { data: item } = await supabase
    .from("bar_items")
    .select("*")
    .eq("id", bar_item_id)
    .eq("business_id", auth.businessId)
    .single();

  if (!item) return NextResponse.json({ error: "Bar item not found" }, { status: 404 });

  const isShot = serve_as === "shot" && item.is_shot_item;
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
      item_name: item.name,
      bar_item_id,
      quantity: qty,
      unit_price,
      total_price: line_total,
      serve_as: isShot ? "shot" : "bottle",
      status: "pending",
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
    .update({ total_amount: newTotal })
    .eq("id", params.id);

  return NextResponse.json({ order_item: orderItem, tab_total: newTotal }, { status: 201 });
}
