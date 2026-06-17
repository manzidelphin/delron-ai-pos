import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { name, unit, quantity, min_quantity, cost_per_unit, supplier_id } = body;

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("raw_materials")
    .update({
      name: name?.trim(),
      unit,
      quantity: parseFloat(quantity),
      min_quantity: parseFloat(min_quantity),
      cost_per_unit: parseFloat(cost_per_unit),
      supplier_id: supplier_id || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .eq("business_id", auth.businessId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ material: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("raw_materials")
    .delete()
    .eq("id", params.id)
    .eq("business_id", auth.businessId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
