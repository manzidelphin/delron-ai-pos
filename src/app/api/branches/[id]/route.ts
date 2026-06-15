import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;
  const { businessId, staffId } = auth;

  const supabase = createClient();
  const { data: requester } = await supabase.from("staff").select("role").eq("id", staffId).single();
  if (requester?.role !== "owner") {
    return NextResponse.json({ error: "Only owners can update branches" }, { status: 403 });
  }

  const body = await req.json();
  const allowed = ["name", "location", "phone", "is_main"];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  // If setting as main, unset others first
  if (update.is_main === true) {
    await supabase.from("branches").update({ is_main: false }).eq("business_id", businessId);
  }

  const { data, error } = await supabase
    .from("branches")
    .update(update)
    .eq("id", params.id)
    .eq("business_id", businessId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;
  const { businessId, staffId } = auth;

  const supabase = createClient();
  const { data: requester } = await supabase.from("staff").select("role").eq("id", staffId).single();
  if (requester?.role !== "owner") {
    return NextResponse.json({ error: "Only owners can delete branches" }, { status: 403 });
  }

  // Check if it's the main branch
  const { data: branch } = await supabase.from("branches").select("is_main").eq("id", params.id).single();
  if (branch?.is_main) {
    return NextResponse.json({ error: "Cannot delete the main branch" }, { status: 400 });
  }

  const { error } = await supabase.from("branches").delete().eq("id", params.id).eq("business_id", businessId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
