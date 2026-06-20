import { Resend } from "resend";

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
