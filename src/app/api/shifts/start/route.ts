import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;
  const { businessId, branchId, staffId } = auth;

  let opening_cash: number | null = null;
  try {
    const body = await req.json();
    opening_cash = typeof body.opening_cash === "number" ? body.opening_cash : null;
  } catch {
    // body optional
  }

  const supabase = createAdminClient();

  const { data: staffRecord } = await supabase
    .from("staff")
    .select("name, role")
    .eq("id", staffId)
    .single();

  if (!staffRecord) {
    return NextResponse.json({ error: "Staff not found" }, { status: 404 });
  }

  // Auto-close any dangling active shift for this staff member
  await supabase
    .from("shifts")
    .update({ status: "ended", ended_at: new Date().toISOString(), notes: "Auto-closed on new login" })
    .eq("staff_id", staffId)
    .eq("status", "active");

  const { data: shift, error } = await supabase
    .from("shifts")
    .insert({
      business_id: businessId,
      branch_id: branchId !== businessId ? branchId : null,
      staff_id: staffId,
      staff_name: staffRecord.name,
      role: staffRecord.role,
      opening_cash: opening_cash,
      status: "active",
    })
    .select("id, started_at")
    .single();

  if (error) {
    console.error("[shifts/start] insert error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ shift_id: shift.id, started_at: shift.started_at });
}
