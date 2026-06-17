import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const unreadOnly = searchParams.get("unread") === "true";

  let query = supabase
    .from("notifications")
    .select("*", { count: "exact" })
    .eq("business_id", auth.businessId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (category && category !== "all") {
    query = query.eq("category", category);
  }
  if (unreadOnly) {
    query = query.eq("is_read", false);
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const unreadCount = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("business_id", auth.businessId)
    .eq("is_read", false);

  return NextResponse.json({
    notifications: data ?? [],
    total: count ?? 0,
    unread_count: unreadCount.count ?? 0,
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();
  const body = await req.json();
  const { ids, mark_all_read } = body;

  if (mark_all_read) {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("business_id", auth.businessId)
      .eq("is_read", false);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (ids?.length) {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", ids)
      .eq("business_id", auth.businessId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    // Delete all read notifications
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("business_id", auth.businessId)
      .eq("is_read", true);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", id)
    .eq("business_id", auth.businessId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
