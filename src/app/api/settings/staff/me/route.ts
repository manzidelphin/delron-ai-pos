import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth";

export async function PUT(req: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;
  const { staffId } = auth;

  const body = await req.json();
  const allowed = ["pin", "name"];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.from("staff").update(update).eq("id", staffId).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
