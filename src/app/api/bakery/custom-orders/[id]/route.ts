import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const { status } = await req.json();
  const ALLOWED = ["in_progress", "ready", "cancelled"];
  if (!ALLOWED.includes(status)) {
    return NextResponse.json({ error: "Invalid status. Allowed: in_progress, ready, cancelled" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("custom_orders")
    .select("status, business_id")
    .eq("id", params.id)
    .single();

  if (!existing) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (existing.business_id !== auth.businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  if (existing.status === "collected") return NextResponse.json({ error: "Order already collected" }, { status: 400 });
  if (existing.status === "cancelled") return NextResponse.json({ error: "Cannot update a cancelled order" }, { status: 400 });

  const { data, error } = await supabase
    .from("custom_orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ order: { ...data, balance_due: data.total_price - data.deposit_paid } });
}
