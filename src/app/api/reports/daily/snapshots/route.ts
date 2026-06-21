import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const date        = searchParams.get("date");
  const includeData = searchParams.get("include_data") === "true";

  const supabase = createAdminClient();

  const select = includeData
    ? "id, report_date, generated_by, generated_at, generation_type, snapshot_data, created_at"
    : "id, report_date, generated_by, generated_at, generation_type, created_at";

  let query = supabase
    .from("daily_reports")
    .select(select)
    .eq("business_id", auth.businessId)
    .order("generated_at", { ascending: false })
    .limit(50);

  if (date) query = query.eq("report_date", date);

  const { data: snapshots, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with staff name
  const rawSnaps = (snapshots ?? []) as unknown as Record<string, unknown>[];
  const staffIds = [...new Set(rawSnaps.map((s) => s.generated_by as string).filter(Boolean))];
  const staffNames: Record<string, string> = {};
  if (staffIds.length > 0) {
    const { data: staffData } = await supabase
      .from("staff")
      .select("id, name")
      .in("id", staffIds);
    for (const s of staffData ?? []) staffNames[s.id] = s.name;
  }

  const enriched = rawSnaps.map((s) => ({
    ...s,
    generated_by_name: s.generated_by
      ? (staffNames[s.generated_by as string] ?? "Unknown")
      : null,
  }));

  return NextResponse.json({ snapshots: enriched });
}
