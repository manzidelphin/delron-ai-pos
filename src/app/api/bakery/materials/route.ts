import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "all";

  const supabase = createAdminClient();

  let query = supabase
    .from("raw_materials")
    .select("*, suppliers(name)")
    .eq("business_id", auth.businessId)
    .order("name");

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let materials = data ?? [];

  if (status === "low") {
    materials = materials.filter((m) => m.quantity > 0 && m.quantity <= m.min_quantity);
  } else if (status === "out") {
    materials = materials.filter((m) => m.quantity <= 0);
  }

  const totalValue = materials.reduce((sum, m) => sum + m.quantity * m.cost_per_unit, 0);
  const lowCount = (data ?? []).filter((m) => m.quantity > 0 && m.quantity <= m.min_quantity).length;
  const outCount = (data ?? []).filter((m) => m.quantity <= 0).length;

  return NextResponse.json({ materials, totalValue, lowCount, outCount, total: (data ?? []).length });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { name, unit, quantity, min_quantity, cost_per_unit, supplier_id } = body;

  if (!name?.trim() || !unit) {
    return NextResponse.json({ error: "Name and unit are required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("raw_materials")
    .insert({
      business_id: auth.businessId,
      branch_id: auth.branchId,
      name: name.trim(),
      unit,
      quantity: parseFloat(quantity) || 0,
      min_quantity: parseFloat(min_quantity) || 1,
      cost_per_unit: parseFloat(cost_per_unit) || 0,
      supplier_id: supplier_id || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ material: data }, { status: 201 });
}
