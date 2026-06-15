import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const body = await request.json();
  const supabase = createClient();

  const { data, error } = await supabase
    .from("floor_tables")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("business_id", auth.businessId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ table: data });
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const supabase = createClient();

  const { error } = await supabase
    .from("floor_tables")
    .delete()
    .eq("id", params.id)
    .eq("business_id", auth.businessId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
