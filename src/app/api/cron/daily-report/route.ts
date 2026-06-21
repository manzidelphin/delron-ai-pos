import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { buildDailyReportData } from "@/lib/daily-report";
import { sendDailyReportEmail } from "@/lib/email";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Rwanda is UTC+2; use local date for the report
  const nowRwanda = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const date = nowRwanda.toISOString().split("T")[0];

  // Day bounds for the shift variance query (same helper as daily-report lib)
  const [y, m, d] = date.split("-").map(Number);
  const RW_OFFSET_MS = 2 * 60 * 60 * 1000;
  const dayStart = new Date(Date.UTC(y, m - 1, d,  0,  0,  0,   0) - RW_OFFSET_MS).toISOString();
  const dayEnd   = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999) - RW_OFFSET_MS).toISOString();

  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, name, owner_id, daily_report_email");

  if (!businesses?.length) {
    return NextResponse.json({ message: "No businesses found" });
  }

  const results: { business: string; status: string; email?: string; error?: string }[] = [];

  for (const biz of businesses) {
    try {
      // Build and save snapshot
      const data = await buildDailyReportData(supabase, biz.id, date);
      const { error: insertErr } = await supabase.from("daily_reports").insert({
        business_id:     biz.id,
        report_date:     date,
        generated_by:    null,
        generation_type: "auto",
        snapshot_data:   data,
      });

      if (insertErr) {
        results.push({ business: biz.name, status: "error", error: insertErr.message });
        continue;
      }

      // Email — enabled by default; owner must opt out in Settings → Notifications
      const emailEnabled = biz.daily_report_email !== false;
      if (!emailEnabled || !biz.owner_id) {
        results.push({ business: biz.name, status: "ok", email: emailEnabled ? "no owner_id" : "disabled" });
        continue;
      }

      try {
        const { data: { user } } = await supabase.auth.admin.getUserById(biz.owner_id);
        const ownerEmail = user?.email;

        if (!ownerEmail) {
          results.push({ business: biz.name, status: "ok", email: "owner email not found" });
          continue;
        }

        // Ended shifts with a non-zero cash variance today
        const { data: shiftsRaw } = await supabase
          .from("shifts")
          .select("staff_name, cash_variance, expected_cash")
          .eq("business_id", biz.id)
          .eq("status", "ended")
          .not("cash_variance", "is", null)
          .gte("ended_at", dayStart)
          .lte("ended_at", dayEnd);

        const cashVariances = (shiftsRaw ?? [])
          .filter((s) => s.cash_variance !== 0)
          .map((s) => ({
            staff_name:    s.staff_name as string,
            variance:      s.cash_variance as number,
            expected_cash: s.expected_cash as number | null,
          }));

        const sent = await sendDailyReportEmail({
          to: ownerEmail,
          businessName: biz.name,
          date,
          kpis: data.kpis,
          topProducts: data.products_sold.slice(0, 3),
          cashVariances,
        });

        results.push({
          business: biz.name,
          status: "ok",
          email: sent ? `sent → ${ownerEmail}` : "send failed",
        });
      } catch (emailErr) {
        // Email failure must never block snapshot generation
        console.error(`[cron/daily-report] Email error for ${biz.name}:`, emailErr);
        results.push({ business: biz.name, status: "ok", email: "email error — snapshot saved" });
      }
    } catch (err) {
      results.push({ business: biz.name, status: "error", error: String(err) });
    }
  }

  console.log("[cron/daily-report] Completed for", date, results);
  return NextResponse.json({ success: true, date, results });
}
