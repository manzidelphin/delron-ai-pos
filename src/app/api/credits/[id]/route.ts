import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("credits")
    .select("*")
    .eq("id", params.id)
    .eq("business_id", auth.businessId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ credit: data });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const supabase = createClient();
  const body = await req.json();

  const { data, error } = await supabase
    .from("credits")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("business_id", auth.businessId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ credit: data });
}
