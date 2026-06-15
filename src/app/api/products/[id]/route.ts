import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, suppliers(name)")
    .eq("id", params.id)
    .eq("business_id", auth.businessId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  return NextResponse.json({ product: data });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const supabase = createClient();
  const body = await request.json();

  const updates: Record<string, unknown> = {};
  const allowed = [
    "name", "barcode", "category", "subcategory", "description",
    "price", "cost_price", "quantity", "min_quantity", "unit",
    "expiry_date", "supplier_id", "image_url",
  ];
  for (const key of allowed) {
    if (key in body) {
      if (key === "price" || key === "cost_price" || key === "quantity" || key === "min_quantity") {
        updates[key] = parseFloat(body[key]) || 0;
      } else {
        updates[key] = body[key];
      }
    }
  }
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("products")
    .update(updates)
    .eq("id", params.id)
    .eq("business_id", auth.businessId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ product: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const supabase = createClient();
  // Soft delete
  const { error } = await supabase
    .from("products")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("business_id", auth.businessId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
