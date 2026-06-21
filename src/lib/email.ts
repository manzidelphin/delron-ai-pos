import { Resend } from "resend";
import type { ProductSoldRow } from "@/lib/daily-report";

const key  = process.env.RESEND_API_KEY ?? "";
const from = process.env.RESEND_FROM_EMAIL ?? "noreply@delronpos.rw";

// Real key starts with "re_" and is not the literal placeholder
const isRealKey = key.startsWith("re_") && key !== "re_placeholder";

const resend = isRealKey ? new Resend(key) : null;

export async function sendOTPEmail(to: string, otp: string, businessName: string): Promise<boolean> {
  const subject = `Your DELRON login code: ${otp}`;
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <div style="background:#1e293b;border-radius:16px;padding:32px;text-align:center">
        <div style="background:#3b82f6;width:48px;height:48px;border-radius:12px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center">
          <span style="color:white;font-size:24px;font-weight:bold">D</span>
        </div>
        <h2 style="color:#f8fafc;margin:0 0 8px;font-size:20px">DELRON AI POS</h2>
        <p style="color:#94a3b8;margin:0 0 24px;font-size:14px">${businessName}</p>
        <p style="color:#cbd5e1;font-size:15px;margin:0 0 16px">Your two-factor authentication code is:</p>
        <div style="background:#0f172a;border-radius:12px;padding:20px;margin:0 0 20px;letter-spacing:12px;font-size:36px;font-weight:bold;color:#3b82f6;font-family:monospace">
          ${otp}
        </div>
        <p style="color:#64748b;font-size:13px;margin:0">This code expires in <strong style="color:#94a3b8">10 minutes</strong>.</p>
        <p style="color:#64748b;font-size:13px;margin:8px 0 0">If you didn't request this code, ignore this email.</p>
      </div>
    </div>
  `;

  if (!resend) {
    // Placeholder key — log OTP to server console for testing
    console.log("════════════════════════════════════");
    console.log(`[2FA OTP] To: ${to}`);
    console.log(`[2FA OTP] Code: ${otp}`);
    console.log(`[2FA OTP] (Set RESEND_API_KEY to send real emails)`);
    console.log("════════════════════════════════════");
    return true; // Treat as sent so the flow works in dev
  }

  try {
    const { error } = await resend.emails.send({ from, to, subject, html });
    if (error) { console.error("[email] Resend error:", error); return false; }
    return true;
  } catch (e) {
    console.error("[email] Send failed:", e);
    return false;
  }
}

// ── Daily Report Email ────────────────────────────────────────────────────────

export async function sendDailyReportEmail(opts: {
  to: string;
  businessName: string;
  date: string;
  kpis: { total_revenue: number; total_items_sold: number; total_transactions: number; shifts_today: number };
  topProducts: ProductSoldRow[];
  cashVariances: Array<{ staff_name: string; variance: number; expected_cash: number | null }>;
}): Promise<boolean> {
  const { to, businessName, date, kpis, topProducts, cashVariances } = opts;

  const displayDate = new Date(date + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const reportUrl = `https://delron-ai-pos.vercel.app/reports/daily?date=${date}`;
  const subject   = `Daily Report — ${businessName} — ${date}`;

  const fmtRWF = (n: number) => `RWF ${Math.round(n).toLocaleString("en-US")}`;

  const productRows = topProducts.slice(0, 3).map((p, i) => `
    <tr style="border-bottom:1px solid #e2e8f0">
      <td style="padding:10px 12px;color:#1e293b;font-size:13px">${i + 1}. ${p.item_name}</td>
      <td style="padding:10px 12px;text-align:center;color:#64748b;font-size:13px">${Math.round(p.qty_sold)}</td>
      <td style="padding:10px 12px;text-align:right;color:#1d4ed8;font-weight:600;font-size:13px">${fmtRWF(p.revenue)}</td>
    </tr>`).join("");

  const varianceRows = cashVariances.map((v) => {
    const color = v.variance < 0 ? "#dc2626" : "#16a34a";
    const sign  = v.variance >= 0 ? "+" : "";
    return `
      <tr>
        <td style="padding:8px 12px;color:#1e293b;font-size:13px">${v.staff_name}</td>
        <td style="padding:8px 12px;text-align:right;color:${color};font-weight:600;font-size:13px">${sign}${fmtRWF(v.variance)}</td>
      </tr>`;
  }).join("");

  const varianceSection = cashVariances.length > 0 ? `
    <div style="background:#fefce8;border:1px solid #fde047;border-radius:8px;padding:16px;margin:0 0 20px">
      <p style="color:#92400e;font-weight:700;margin:0 0 10px;font-size:13px">⚠️ Cash Variance Detected</p>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr>
          <th style="text-align:left;padding:4px 12px;font-size:11px;color:#92400e;text-transform:uppercase;font-weight:600">Staff</th>
          <th style="text-align:right;padding:4px 12px;font-size:11px;color:#92400e;text-transform:uppercase;font-weight:600">Variance</th>
        </tr></thead>
        <tbody>${varianceRows}</tbody>
      </table>
    </div>` : "";

  const topProductsSection = topProducts.length > 0 ? `
    <p style="color:#374151;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin:0 0 8px">Top Products</p>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:24px">
      <thead>
        <tr style="background:#f1f5f9;border-bottom:1px solid #e2e8f0">
          <th style="text-align:left;padding:8px 12px;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase">Item</th>
          <th style="text-align:center;padding:8px 12px;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase">Sold</th>
          <th style="text-align:right;padding:8px 12px;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase">Revenue</th>
        </tr>
      </thead>
      <tbody>${productRows}</tbody>
    </table>` : "";

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<div style="max-width:560px;margin:32px auto;padding:0 16px 32px">

  <div style="background:#0f172a;border-radius:16px 16px 0 0;padding:20px 28px;display:flex;align-items:center;gap:12px">
    <div style="background:#3b82f6;width:38px;height:38px;border-radius:9px;display:inline-flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:white;flex-shrink:0">D</div>
    <div>
      <p style="color:#f8fafc;font-size:15px;font-weight:700;margin:0">DELRON AI POS</p>
      <p style="color:#94a3b8;font-size:12px;margin:2px 0 0">${businessName}</p>
    </div>
  </div>

  <div style="background:#1e293b;padding:14px 28px;border-bottom:1px solid #334155">
    <p style="color:#f8fafc;font-size:17px;font-weight:700;margin:0">Daily Report</p>
    <p style="color:#64748b;font-size:12px;margin:3px 0 0">${displayDate}</p>
  </div>

  <div style="background:#ffffff;border:1px solid #e2e8f0;border-top:none;padding:24px 28px">

    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <tr>
        <td style="width:50%;padding:0 6px 8px 0;vertical-align:top">
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px 16px">
            <p style="color:#1d4ed8;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin:0 0 4px">Total Revenue</p>
            <p style="color:#1e293b;font-size:20px;font-weight:800;margin:0">${fmtRWF(kpis.total_revenue)}</p>
          </div>
        </td>
        <td style="width:50%;padding:0 0 8px 6px;vertical-align:top">
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 16px">
            <p style="color:#15803d;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin:0 0 4px">Items Sold</p>
            <p style="color:#1e293b;font-size:20px;font-weight:800;margin:0">${kpis.total_items_sold}</p>
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding:0 6px 0 0;vertical-align:top">
          <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:10px;padding:14px 16px">
            <p style="color:#7c3aed;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin:0 0 4px">Transactions</p>
            <p style="color:#1e293b;font-size:20px;font-weight:800;margin:0">${kpis.total_transactions}</p>
          </div>
        </td>
        <td style="padding:0 0 0 6px;vertical-align:top">
          <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:14px 16px">
            <p style="color:#c2410c;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin:0 0 4px">Shifts Today</p>
            <p style="color:#1e293b;font-size:20px;font-weight:800;margin:0">${kpis.shifts_today}</p>
          </div>
        </td>
      </tr>
    </table>

    ${varianceSection}
    ${topProductsSection}

    <div style="text-align:center">
      <a href="${reportUrl}" style="display:inline-block;background:#3b82f6;color:white;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:14px">View Full Report →</a>
    </div>
  </div>

  <div style="background:#f1f5f9;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;padding:14px 28px;text-align:center">
    <p style="color:#94a3b8;font-size:11px;margin:0">Powered by <strong style="color:#64748b">DELRON AI POS</strong> · Built for Rwanda</p>
    <p style="color:#cbd5e1;font-size:10px;margin:6px 0 0">To stop these emails, go to Settings → Notifications and disable "Daily report email".</p>
  </div>

</div>
</body>
</html>`;

  if (!resend) {
    console.log("════════════════════════════════════");
    console.log(`[Daily Report Email] To:      ${to}`);
    console.log(`[Daily Report Email] Subject:  ${subject}`);
    console.log(`[Daily Report Email] Revenue:  ${fmtRWF(kpis.total_revenue)}`);
    console.log(`[Daily Report Email] Items:    ${kpis.total_items_sold}  Transactions: ${kpis.total_transactions}  Shifts: ${kpis.shifts_today}`);
    if (topProducts.length > 0)
      console.log(`[Daily Report Email] Top products: ${topProducts.slice(0, 3).map((p) => `${p.item_name} (${fmtRWF(p.revenue)})`).join(" | ")}`);
    if (cashVariances.length > 0)
      console.log(`[Daily Report Email] ⚠ Variances: ${cashVariances.map((v) => `${v.staff_name} ${v.variance > 0 ? "+" : ""}${v.variance}`).join(", ")}`);
    console.log(`[Daily Report Email] Link:     ${reportUrl}`);
    console.log("════════════════════════════════════");
    return true;
  }

  try {
    const { error } = await resend.emails.send({ from, to, subject, html });
    if (error) { console.error("[email] Daily report Resend error:", error); return false; }
    return true;
  } catch (e) {
    console.error("[email] Daily report send failed:", e);
    return false;
  }
}
