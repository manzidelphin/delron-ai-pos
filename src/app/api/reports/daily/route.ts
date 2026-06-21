import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { buildDailyReportData } from "@/lib/daily-report";

export async function GET(req: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  // Default to today in Rwanda time (UTC+2)
  const date = searchParams.get("date") ?? new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().split("T")[0];

  const supabase = createAdminClient();

  // Debug: log resolved context so Vercel logs reveal mismatches
  const { dayStart, dayEnd } = (() => {
    const RW = 2 * 60 * 60 * 1000;
    const [y, m, d] = date.split("-").map(Number);
    return {
      dayStart: new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0) - RW).toISOString(),
      dayEnd:   new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999) - RW).toISOString(),
    };
  })();
  const { data: orderCount } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("business_id", auth.businessId)
    .eq("status", "completed")
    .gte("created_at", dayStart)
    .lte("created_at", dayEnd);
  console.error(
    "[daily-report GET]",
    JSON.stringify({ businessId: auth.businessId, staffId: auth.staffId, date, dayStart, dayEnd, orderCount })
  );

  const data = await buildDailyReportData(supabase, auth.businessId, date);
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const body = await req.json();
  const date = body.date ?? new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().split("T")[0];

  const supabase = createAdminClient();
  const data = await buildDailyReportData(supabase, auth.businessId, date);

  const { data: snapshot, error } = await supabase
    .from("daily_reports")
    .insert({
      business_id:     auth.businessId,
      report_date:     date,
      generated_by:    auth.staffId ?? null,
      generation_type: "manual",
      snapshot_data:   data,
    })
    .select("id, report_date, generated_by, generated_at, generation_type, created_at")
    .single();

  if (error) {
    console.error("[daily report] insert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(snapshot, { status: 201 });
}
