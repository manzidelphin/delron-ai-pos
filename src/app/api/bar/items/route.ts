import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const category = searchParams.get("category") ?? "";

  const supabase = createClient();

  let query = supabase
    .from("bar_items")
    .select("*")
    .eq("business_id", auth.businessId)
    .eq("is_active", true)
    .order("name");

  if (search) query = query.ilike("name", `%${search}%`);
  if (category) query = query.eq("category", category);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = data ?? [];

  const stats = {
    total_items: items.length,
    low_stock: items.filter((i) => i.quantity_bottles <= i.reorder_point).length,
    out_of_stock: items.filter((i) => i.quantity_bottles === 0).length,
    total_value: items.reduce((s, i) => s + i.quantity_bottles * i.cost_per_bottle, 0),
  };

  return NextResponse.json({ items, stats });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const body = await request.json();
  const {
    name, category, barcode, price_per_bottle, price_per_shot,
    shots_per_bottle, cost_per_bottle, quantity_bottles, reorder_point,
    is_shot_item,
  } = body;

  if (!name || !price_per_bottle) {
    return NextResponse.json({ error: "name and price_per_bottle required" }, { status: 400 });
  }

  const supabase = createClient();

  const shots_remaining = is_shot_item
    ? (quantity_bottles ?? 0) * (shots_per_bottle ?? 1)
    : 0;

  const { data, error } = await supabase
    .from("bar_items")
    .insert({
      business_id: auth.businessId,
      branch_id: auth.branchId,
      name,
      category: category ?? "spirits",
      barcode: barcode ?? null,
      price_per_bottle: parseFloat(price_per_bottle),
      price_per_shot: price_per_shot ? parseFloat(price_per_shot) : null,
      shots_per_bottle: shots_per_bottle ? parseInt(shots_per_bottle) : null,
      cost_per_bottle: cost_per_bottle ? parseFloat(cost_per_bottle) : 0,
      quantity_bottles: quantity_bottles ? parseFloat(quantity_bottles) : 0,
      shots_remaining,
      reorder_point: reorder_point ? parseFloat(reorder_point) : 1,
      is_shot_item: is_shot_item ?? false,
      is_active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ item: data }, { status: 201 });
}
