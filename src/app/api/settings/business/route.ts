import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth";

export async function GET() {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;
  const { businessId } = auth;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;
  const { businessId, staffId } = auth;

  const supabase = createAdminClient();

  // Only owners can update business settings
  const { data: staffRow } = await supabase.from("staff").select("role").eq("id", staffId).single();
  if (staffRow?.role !== "owner") {
    return NextResponse.json({ error: "Only owners can update business settings" }, { status: 403 });
  }

  const body = await req.json();
  const allowed = ["name", "phone", "email", "location", "language", "modules", "daily_report_email", "momo_number"];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }
  update.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("businesses")
    .update(update)
    .eq("id", businessId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
