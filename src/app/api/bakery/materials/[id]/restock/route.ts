import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { quantity_to_add, cost_paid } = body;

  const qty = parseFloat(quantity_to_add);
  if (isNaN(qty) || qty <= 0) {
    return NextResponse.json({ error: "Quantity must be a positive number" }, { status: 400 });
  }

  const supabase = createClient();

  const { data: existing } = await supabase
    .from("raw_materials")
    .select("quantity, cost_per_unit")
    .eq("id", params.id)
    .eq("business_id", auth.businessId)
    .single();

  if (!existing) return NextResponse.json({ error: "Material not found" }, { status: 404 });

  const newQty = existing.quantity + qty;
  const newCost = cost_paid ? parseFloat(cost_paid) / qty : existing.cost_per_unit;

  const { data, error } = await supabase
    .from("raw_materials")
    .update({
      quantity: newQty,
      cost_per_unit: newCost,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ material: data, added: qty });
}
