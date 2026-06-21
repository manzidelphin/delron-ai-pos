import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { buildDailyReportData } from "@/lib/daily-report";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Rwanda is UTC+2; offset the current UTC time to get the local date
  const nowRwanda = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const date = nowRwanda.toISOString().split("T")[0];

  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, name");

  if (!businesses?.length) {
    return NextResponse.json({ message: "No businesses found" });
  }

  const results: { business: string; status: string; error?: string }[] = [];

  for (const biz of businesses) {
    try {
      const data = await buildDailyReportData(supabase, biz.id, date);
      const { error } = await supabase.from("daily_reports").insert({
        business_id:     biz.id,
        report_date:     date,
        generated_by:    null,
        generation_type: "auto",
        snapshot_data:   data,
      });
      results.push({ business: biz.name, status: error ? "error" : "ok", error: error?.message });
    } catch (err) {
      results.push({ business: biz.name, status: "error", error: String(err) });
    }
  }

  console.log("[cron/daily-report] Auto-generated daily reports for", date, results);
  return NextResponse.json({ success: true, date, results });
}
