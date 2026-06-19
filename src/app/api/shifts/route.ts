import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;
  const { businessId } = auth;

  const { searchParams } = new URL(req.url);
  const dateFrom = searchParams.get("date_from");
  const dateTo   = searchParams.get("date_to");
  const staffId  = searchParams.get("staff_id");
  const status   = searchParams.get("status");

  const supabase = createAdminClient();

  let query = supabase
    .from("shifts")
    .select("*")
    .eq("business_id", businessId)
    .order("started_at", { ascending: false });

  if (dateFrom) query = query.gte("started_at", `${dateFrom}T00:00:00`);
  if (dateTo)   query = query.lte("started_at", `${dateTo}T23:59:59`);
  if (staffId)  query = query.eq("staff_id", staffId);
  if (status)   query = query.eq("status", status);

  const { data: shifts, error } = await query.limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Derive unique staff list for filter dropdown
  const staffMap: Record<string, string> = {};
  (shifts ?? []).forEach((s) => { staffMap[s.staff_id] = s.staff_name; });
  const staffList = Object.entries(staffMap).map(([id, name]) => ({ id, name }));

  return NextResponse.json({ shifts: shifts ?? [], staff_list: staffList });
}
