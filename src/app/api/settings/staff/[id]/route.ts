import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;
  const { businessId, staffId: requesterId } = auth;

  const supabase = createClient();
  const { data: requester } = await supabase.from("staff").select("role").eq("id", requesterId).single();
  if (!["owner", "manager"].includes(requester?.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const allowed = ["role", "branch_id", "is_active", "pin", "name", "phone"];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  const { data, error } = await supabase
    .from("staff")
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
  const { businessId, staffId: requesterId } = auth;

  const supabase = createClient();
  const { data: requester } = await supabase.from("staff").select("role").eq("id", requesterId).single();
  if (requester?.role !== "owner") {
    return NextResponse.json({ error: "Only owners can deactivate staff" }, { status: 403 });
  }

  if (params.id === requesterId) {
    return NextResponse.json({ error: "Cannot deactivate yourself" }, { status: 400 });
  }

  const { error } = await supabase
    .from("staff")
    .update({ is_active: false })
    .eq("id", params.id)
    .eq("business_id", businessId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
