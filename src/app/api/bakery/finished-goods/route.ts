import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth";

function generateBakeryBarcode(name: string, type: string): string {
  const prefix = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 3);
  const ts = Date.now().toString().slice(-6);
  return type === "pre-packaged" ? `DLR-${prefix}-${ts}` : `DLR-GEN-${prefix}-${ts}`;
}

export async function GET(request: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const includeInactive = searchParams.get("include_inactive") === "true";
  const category = searchParams.get("category") || "";

  const supabase = createClient();

  let query = supabase
    .from("finished_goods")
    .select("*")
    .eq("business_id", auth.businessId)
    .order("name");

  if (!includeInactive) query = query.eq("is_active", true);
  if (category) query = query.eq("category", category);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { name, barcode_type, selling_price, cost_price, unit, category, is_active } = body;

  if (!name?.trim() || !barcode_type) {
    return NextResponse.json({ error: "Name and barcode type are required" }, { status: 400 });
  }

  const supabase = createClient();

  const barcode = generateBakeryBarcode(name.trim(), barcode_type);

  const { data, error } = await supabase
    .from("finished_goods")
    .insert({
      business_id: auth.businessId,
      branch_id: auth.branchId,
      name: name.trim(),
      barcode,
      barcode_type,
      selling_price: parseFloat(selling_price) || 0,
      cost_price: parseFloat(cost_price) || 0,
      quantity: 0,
      unit: unit || "piece",
      category: category || "bread",
      is_active: is_active !== false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { id, name, barcode_type, selling_price, cost_price, unit, category, is_active } = body;

  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const supabase = createClient();

  const { data, error } = await supabase
    .from("finished_goods")
    .update({
      name: name?.trim(),
      barcode_type,
      selling_price: parseFloat(selling_price),
      cost_price: parseFloat(cost_price),
      unit,
      category,
      is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("business_id", auth.businessId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}
