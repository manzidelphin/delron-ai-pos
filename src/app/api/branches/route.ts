import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth";

export async function GET() {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;
  const { businessId } = auth;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("branches")
    .select("*")
    .eq("business_id", businessId)
    .order("is_main", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;
  const { businessId, staffId } = auth;

  const supabase = createClient();
  const { data: requester } = await supabase.from("staff").select("role").eq("id", staffId).single();
  if (requester?.role !== "owner") {
    return NextResponse.json({ error: "Only owners can create branches" }, { status: 403 });
  }

  const body = await req.json();
  const { name, location, phone } = body;
  if (!name) return NextResponse.json({ error: "Branch name is required" }, { status: 400 });

  const { data, error } = await supabase
    .from("branches")
    .insert({ business_id: businessId, name, location: location || null, phone: phone || null, is_main: false })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
