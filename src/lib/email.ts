import { Resend } from "resend";
import type { ProductSoldRow } from "@/lib/daily-report";

const key  = process.env.RESEND_API_KEY ?? "";
const from = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

// Real key starts with "re_" and is not the literal placeholder
const isRealKey = key.startsWith("re_") && key !== "re_placeholder";

const resend = isRealKey ? new Resend(key) : null;

const FOUNDER_EMAIL  = "manzidelphin2@gmail.com";
const ADMIN_BASE_URL = "https://delron-ai-pos.vercel.app/admin/businesses";

const WELCOME_FROM  = "info@delronpos.com";
const SUPPORT_EMAIL = "support@delronpos.com";
const SUPPORT_PHONE = "+250 785 995 840";

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
    const { data, error } = await resend.emails.send({ from, to, subject, html });
    if (error) { console.error("[email] OTP FAILED — from:", from, "| error:", JSON.stringify(error)); return false; }
    console.log("[email] OTP sent — id:", data?.id);
    return true;
  } catch (e) {
    console.error("[email] OTP exception:", e);
    return false;
  }
}

// ── Owner: Welcome Email ──────────────────────────────────────────────────────

const MODULE_LABELS: Record<string, string> = {
  pos:         "Point of Sale (POS)",
  bar:         "Bar & Drinks",
  bakery:      "Bakery",
  restaurant:  "Restaurant / KDS",
  supermarket: "Supermarket",
  credits:     "Credits & Accounts",
};

export async function sendWelcomeEmail(opts: {
  to:           string;
  ownerName:    string;
  businessName: string;
  modules:      string[];
}): Promise<void> {
  const { to, ownerName, businessName, modules } = opts;

  const subject     = `Welcome to DELRON AI POS — ${businessName} is ready!`;
  const loginUrl    = "https://delron-ai-pos.vercel.app/login";
  const firstName   = ownerName.split(" ")[0];

  const moduleList = modules.length
    ? modules.map((m) => `
        <li style="padding:4px 0;color:#374151;font-size:14px">
          <span style="color:#3b82f6;font-weight:700;margin-right:6px">✓</span>${MODULE_LABELS[m] ?? m}
        </li>`).join("")
    : `<li style="padding:4px 0;color:#9ca3af;font-size:14px">No modules selected yet — add them from Settings</li>`;

  const productStep = modules.includes("bakery")    ? "Bakery Items"
    : modules.includes("bar")         ? "Bar Items"
    : modules.includes("restaurant")  ? "Menu Items"
    : modules.includes("supermarket") ? "Products"
    : "Products";

  const steps = [
    { n: "1", text: `Log in with your email and password at <a href="${loginUrl}" style="color:#3b82f6;text-decoration:none;font-weight:600">delron-ai-pos.vercel.app</a>` },
    { n: "2", text: "Add your staff members and set their PINs — go to <strong>Settings → Staff</strong>" },
    { n: "3", text: `Add your products or items — find the <strong>${productStep}</strong> section in the sidebar` },
    { n: "4", text: "Make your first sale — open the POS or your module and start recording transactions!" },
  ];

  const stepRows = steps.map((s) => `
    <tr>
      <td style="padding:10px 0;vertical-align:top;width:32px">
        <div style="background:#3b82f6;color:white;font-size:12px;font-weight:700;width:24px;height:24px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;text-align:center;line-height:24px">${s.n}</div>
      </td>
      <td style="padding:10px 0 10px 12px;color:#374151;font-size:14px;line-height:1.5">${s.text}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<div style="max-width:560px;margin:32px auto;padding:0 16px 32px">

  <div style="background:#0f172a;border-radius:16px 16px 0 0;padding:20px 28px;display:flex;align-items:center;gap:12px">
    <div style="background:#3b82f6;width:38px;height:38px;border-radius:9px;display:inline-flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:white;flex-shrink:0">D</div>
    <div>
      <p style="color:#f8fafc;font-size:15px;font-weight:700;margin:0">DELRON AI POS</p>
      <p style="color:#94a3b8;font-size:12px;margin:2px 0 0">Welcome aboard</p>
    </div>
  </div>

  <div style="background:#ffffff;border:1px solid #e2e8f0;border-top:none;padding:32px 28px">

    <h1 style="color:#0f172a;font-size:22px;font-weight:800;margin:0 0 8px">Welcome, ${firstName}! 🎉</h1>
    <p style="color:#475569;font-size:15px;margin:0 0 24px">
      <strong style="color:#0f172a">${businessName}</strong> is set up and ready to go on DELRON AI POS.
      Your account has been created successfully.
    </p>

    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:18px 20px;margin-bottom:24px">
      <p style="color:#1d4ed8;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin:0 0 10px">Modules Enabled</p>
      <ul style="margin:0;padding:0;list-style:none">${moduleList}</ul>
    </div>

    <p style="color:#374151;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin:0 0 12px">Getting Started</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      ${stepRows}
    </table>

    <div style="text-align:center;margin-bottom:24px">
      <a href="${loginUrl}" style="display:inline-block;background:#3b82f6;color:white;text-decoration:none;padding:14px 40px;border-radius:8px;font-weight:700;font-size:15px">Log In Now →</a>
    </div>

    <div style="border-top:1px solid #f1f5f9;padding-top:20px">
      <p style="color:#64748b;font-size:13px;margin:0">
        Questions or need help? Reach out at
        <a href="mailto:${SUPPORT_EMAIL}" style="color:#3b82f6;text-decoration:none">${SUPPORT_EMAIL}</a>
        or call <a href="tel:${SUPPORT_PHONE.replace(/\s/g, '')}" style="color:#3b82f6;text-decoration:none">${SUPPORT_PHONE}</a>
        — we're here for you.
      </p>
    </div>

  </div>

  <div style="background:#f1f5f9;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;padding:14px 28px;text-align:center">
    <p style="color:#94a3b8;font-size:11px;margin:0">Powered by <strong style="color:#64748b">DELRON AI POS</strong> · Built for Rwanda</p>
  </div>

</div>
</body>
</html>`;

  if (!resend) {
    console.log("════════════════════════════════════════════════════════════");
    console.log(`[Welcome Email] To:       ${to}`);
    console.log(`[Welcome Email] Business: ${businessName}`);
    console.log(`[Welcome Email] Owner:    ${ownerName}`);
    console.log(`[Welcome Email] Modules:  ${modules.join(", ") || "none"}`);
    console.log(`[Welcome Email] Login:    ${loginUrl}`);
    console.log("════════════════════════════════════════════════════════════");
    return;
  }

  try {
    const { data, error } = await resend.emails.send({ from: WELCOME_FROM, replyTo: SUPPORT_EMAIL, to, subject, html });
    if (error) console.error("[email] Welcome FAILED — from:", WELCOME_FROM, "| to:", to, "| error:", JSON.stringify(error));
    else console.log("[email] Welcome sent — id:", data?.id, "| to:", to);
  } catch (e) {
    console.error("[email] Welcome exception:", e);
  }
}

// ── Founder: New Signup Notification ─────────────────────────────────────────

export async function sendNewSignupEmail(opts: {
  businessId:   string;
  businessName: string;
  ownerEmail:   string;
  ownerPhone:   string | null;
  modules:      string[];
  signupDate:   string;
}): Promise<void> {
  const { businessId, businessName, ownerEmail, ownerPhone, modules, signupDate } = opts;

  const subject    = `New DELRON Signup — ${businessName}`;
  const adminUrl   = `${ADMIN_BASE_URL}/${businessId}`;
  const displayDate = new Date(signupDate + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const moduleBadges = modules.length
    ? modules.map((m) => `<span style="display:inline-block;background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;margin:2px 3px 2px 0;text-transform:capitalize">${m}</span>`).join("")
    : `<span style="color:#9ca3af;font-size:13px">None selected</span>`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<div style="max-width:520px;margin:32px auto;padding:0 16px 32px">

  <div style="background:#0f172a;border-radius:16px 16px 0 0;padding:20px 28px;display:flex;align-items:center;gap:12px">
    <div style="background:#3b82f6;width:38px;height:38px;border-radius:9px;display:inline-flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:white;flex-shrink:0">D</div>
    <div>
      <p style="color:#f8fafc;font-size:15px;font-weight:700;margin:0">DELRON AI POS</p>
      <p style="color:#94a3b8;font-size:12px;margin:2px 0 0">Founder Alert</p>
    </div>
  </div>

  <div style="background:#1e293b;padding:14px 28px;border-bottom:1px solid #334155">
    <p style="color:#f8fafc;font-size:17px;font-weight:700;margin:0">New Business Signup</p>
    <p style="color:#64748b;font-size:12px;margin:3px 0 0">${displayDate}</p>
  </div>

  <div style="background:#ffffff;border:1px solid #e2e8f0;border-top:none;padding:24px 28px">

    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:16px 20px;margin-bottom:20px">
      <p style="color:#1d4ed8;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin:0 0 4px">Business</p>
      <p style="color:#1e293b;font-size:22px;font-weight:800;margin:0">${businessName}</p>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
      <tr style="border-bottom:1px solid #f1f5f9">
        <td style="padding:10px 0;color:#64748b;font-size:13px;width:36%">Owner email</td>
        <td style="padding:10px 0;color:#1e293b;font-size:13px;font-weight:600">${ownerEmail}</td>
      </tr>
      <tr style="border-bottom:1px solid #f1f5f9">
        <td style="padding:10px 0;color:#64748b;font-size:13px">Phone</td>
        <td style="padding:10px 0;color:#1e293b;font-size:13px;font-weight:600">${ownerPhone ?? "—"}</td>
      </tr>
      <tr style="border-bottom:1px solid #f1f5f9">
        <td style="padding:10px 0;color:#64748b;font-size:13px;vertical-align:top">Modules</td>
        <td style="padding:10px 0">${moduleBadges}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#64748b;font-size:13px">Signed up</td>
        <td style="padding:10px 0;color:#1e293b;font-size:13px;font-weight:600">${displayDate}</td>
      </tr>
    </table>

    <div style="text-align:center">
      <a href="${adminUrl}" style="display:inline-block;background:#3b82f6;color:white;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:14px">View in Platform Admin →</a>
    </div>
  </div>

  <div style="background:#f1f5f9;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;padding:14px 28px;text-align:center">
    <p style="color:#94a3b8;font-size:11px;margin:0">Powered by <strong style="color:#64748b">DELRON AI POS</strong> · Built for Rwanda</p>
  </div>

</div>
</body>
</html>`;

  if (!resend) {
    console.log("════════════════════════════════════════════════════════════");
    console.log(`[Founder Signup] To:       ${FOUNDER_EMAIL}`);
    console.log(`[Founder Signup] Business: ${businessName}`);
    console.log(`[Founder Signup] Owner:    ${ownerEmail} | ${ownerPhone ?? "no phone"}`);
    console.log(`[Founder Signup] Modules:  ${modules.join(", ") || "none"}`);
    console.log(`[Founder Signup] Date:     ${signupDate}`);
    console.log(`[Founder Signup] Admin:    ${adminUrl}`);
    console.log("════════════════════════════════════════════════════════════");
    return;
  }

  try {
    const { data, error } = await resend.emails.send({ from, to: FOUNDER_EMAIL, subject, html });
    if (error) console.error("[email] Signup notify FAILED — from:", from, "| error:", JSON.stringify(error));
    else console.log("[email] Signup notify sent — id:", data?.id, "| to:", FOUNDER_EMAIL);
  } catch (e) {
    console.error("[email] Signup notify exception:", e);
  }
}

// ── Founder: Payment Received Notification ────────────────────────────────────

export async function sendPaymentReceivedEmail(opts: {
  businessId:     string;
  businessName:   string;
  amount:         number;
  paymentDate:    string;
  paymentMethod:  string;
  nextPaymentDue: string | null;
  recordedBy:     string;
}): Promise<void> {
  const { businessId, businessName, amount, paymentDate, paymentMethod, nextPaymentDue, recordedBy } = opts;

  const subject     = `Payment Received — ${businessName} — RWF ${amount.toLocaleString()}`;
  const adminUrl    = `${ADMIN_BASE_URL}/${businessId}`;
  const fmtDate     = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  const methodLabel: Record<string, string> = {
    momo: "MTN MoMo", airtel: "Airtel Money", cash: "Cash", bank: "Bank Transfer",
  };

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<div style="max-width:520px;margin:32px auto;padding:0 16px 32px">

  <div style="background:#0f172a;border-radius:16px 16px 0 0;padding:20px 28px;display:flex;align-items:center;gap:12px">
    <div style="background:#3b82f6;width:38px;height:38px;border-radius:9px;display:inline-flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:white;flex-shrink:0">D</div>
    <div>
      <p style="color:#f8fafc;font-size:15px;font-weight:700;margin:0">DELRON AI POS</p>
      <p style="color:#94a3b8;font-size:12px;margin:2px 0 0">Founder Alert</p>
    </div>
  </div>

  <div style="background:#1e293b;padding:14px 28px;border-bottom:1px solid #334155">
    <p style="color:#f8fafc;font-size:17px;font-weight:700;margin:0">Payment Received</p>
    <p style="color:#64748b;font-size:12px;margin:3px 0 0">${businessName}</p>
  </div>

  <div style="background:#ffffff;border:1px solid #e2e8f0;border-top:none;padding:24px 28px">

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;margin-bottom:20px;text-align:center">
      <p style="color:#15803d;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin:0 0 4px">Amount Received</p>
      <p style="color:#14532d;font-size:34px;font-weight:800;margin:0">RWF ${amount.toLocaleString()}</p>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
      <tr style="border-bottom:1px solid #f1f5f9">
        <td style="padding:10px 0;color:#64748b;font-size:13px;width:40%">Business</td>
        <td style="padding:10px 0;color:#1e293b;font-size:13px;font-weight:600">${businessName}</td>
      </tr>
      <tr style="border-bottom:1px solid #f1f5f9">
        <td style="padding:10px 0;color:#64748b;font-size:13px">Method</td>
        <td style="padding:10px 0;color:#1e293b;font-size:13px;font-weight:600">${methodLabel[paymentMethod] ?? paymentMethod}</td>
      </tr>
      <tr style="border-bottom:1px solid #f1f5f9">
        <td style="padding:10px 0;color:#64748b;font-size:13px">Payment date</td>
        <td style="padding:10px 0;color:#1e293b;font-size:13px;font-weight:600">${fmtDate(paymentDate)}</td>
      </tr>
      <tr style="border-bottom:1px solid #f1f5f9">
        <td style="padding:10px 0;color:#64748b;font-size:13px">Recorded by</td>
        <td style="padding:10px 0;color:#1e293b;font-size:13px;font-weight:600">${recordedBy}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#64748b;font-size:13px">Next due</td>
        <td style="padding:10px 0;color:#1e293b;font-size:13px;font-weight:600">${nextPaymentDue ? fmtDate(nextPaymentDue) : "—"}</td>
      </tr>
    </table>

    <div style="text-align:center">
      <a href="${adminUrl}" style="display:inline-block;background:#3b82f6;color:white;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:14px">View in Platform Admin →</a>
    </div>
  </div>

  <div style="background:#f1f5f9;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;padding:14px 28px;text-align:center">
    <p style="color:#94a3b8;font-size:11px;margin:0">Powered by <strong style="color:#64748b">DELRON AI POS</strong> · Built for Rwanda</p>
  </div>

</div>
</body>
</html>`;

  if (!resend) {
    console.log("════════════════════════════════════════════════════════════");
    console.log(`[Founder Payment] To:      ${FOUNDER_EMAIL}`);
    console.log(`[Founder Payment] Business: ${businessName}`);
    console.log(`[Founder Payment] Amount:   RWF ${amount.toLocaleString()}`);
    console.log(`[Founder Payment] Method:   ${methodLabel[paymentMethod] ?? paymentMethod}`);
    console.log(`[Founder Payment] Date:     ${paymentDate}`);
    console.log(`[Founder Payment] By:       ${recordedBy}`);
    console.log(`[Founder Payment] Next due: ${nextPaymentDue ?? "—"}`);
    console.log(`[Founder Payment] Admin:    ${adminUrl}`);
    console.log("════════════════════════════════════════════════════════════");
    return;
  }

  try {
    const { data, error } = await resend.emails.send({ from, to: FOUNDER_EMAIL, subject, html });
    if (error) console.error("[email] Payment notify FAILED — from:", from, "| error:", JSON.stringify(error));
    else console.log("[email] Payment notify sent — id:", data?.id, "| to:", FOUNDER_EMAIL);
  } catch (e) {
    console.error("[email] Payment notify exception:", e);
  }
}

// ── Invoice / Billing Email ───────────────────────────────────────────────────

export async function sendInvoiceEmail(opts: {
  to: string;
  businessName: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  phoneNumber: string;
  isPlaceholder: boolean;
}): Promise<boolean> {
  const { to, businessName, invoiceNumber, amount, dueDate, phoneNumber, isPlaceholder } = opts;
  const subject = `Invoice ${invoiceNumber} — ${businessName} — RWF ${amount.toLocaleString()}`;
  const displayDate = new Date(dueDate + "T12:00:00").toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  void isPlaceholder; // dormant automated-flow flag — kept for future use
  const momoNote = `
    <div style="background:#1f2937;border-radius:10px;padding:18px 20px;margin:0 0 20px">
      <p style="color:#9ca3af;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin:0 0 12px">How to pay</p>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:6px 0;vertical-align:top;width:20px"><span style="color:#a78bfa;font-weight:700;font-size:13px">1.</span></td>
            <td style="padding:6px 0 6px 8px;color:#d1d5db;font-size:13px;line-height:1.5">Send <strong style="color:white">RWF ${amount.toLocaleString()}</strong> via MTN MoMo or Airtel Money to <strong style="color:white;font-family:monospace">0785 995 840</strong></td></tr>
        <tr><td style="padding:6px 0;vertical-align:top"><span style="color:#a78bfa;font-weight:700;font-size:13px">2.</span></td>
            <td style="padding:6px 0 6px 8px;color:#d1d5db;font-size:13px;line-height:1.5">Send a screenshot of the payment confirmation via WhatsApp to <strong style="color:white">+250 785 995 840</strong></td></tr>
        <tr><td style="padding:6px 0;vertical-align:top"><span style="color:#a78bfa;font-weight:700;font-size:13px">3.</span></td>
            <td style="padding:6px 0 6px 8px;color:#d1d5db;font-size:13px;line-height:1.5">Your account will be reactivated once payment is confirmed <span style="color:#6b7280">(usually within a few hours)</span></td></tr>
      </table>
    </div>`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<div style="max-width:520px;margin:32px auto;padding:0 16px 32px">

  <div style="background:#1e293b;border-radius:16px 16px 0 0;padding:20px 28px;border-bottom:1px solid #334155">
    <div style="display:flex;align-items:center;gap:12px">
      <div style="background:#7c3aed;width:38px;height:38px;border-radius:9px;display:inline-flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:white;flex-shrink:0">D</div>
      <div>
        <p style="color:#f8fafc;font-size:15px;font-weight:700;margin:0">DELRON AI POS</p>
        <p style="color:#94a3b8;font-size:12px;margin:2px 0 0">${businessName}</p>
      </div>
    </div>
  </div>

  <div style="background:#111827;border:1px solid #1f2937;border-top:none;padding:28px">
    <p style="color:#94a3b8;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin:0 0 4px">Invoice</p>
    <h1 style="color:white;font-size:22px;font-weight:800;margin:0 0 4px">${invoiceNumber}</h1>
    <p style="color:#6b7280;font-size:13px;margin:0 0 24px">Due by ${displayDate}</p>

    <div style="background:#1f2937;border-radius:12px;padding:20px;margin:0 0 24px;text-align:center">
      <p style="color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:.06em;margin:0 0 4px">Amount Due</p>
      <p style="color:#a78bfa;font-size:36px;font-weight:800;margin:0">RWF ${amount.toLocaleString()}</p>
    </div>

    ${momoNote}

    <div style="border-top:1px solid #1f2937;padding-top:16px;margin-top:8px">
      <p style="color:#6b7280;font-size:12px;margin:0">If you have already paid or have questions, contact <strong style="color:#9ca3af">${SUPPORT_EMAIL}</strong> or call <strong style="color:#9ca3af">${SUPPORT_PHONE}</strong>.</p>
    </div>
  </div>

  <div style="background:#1e293b;border:1px solid #1f2937;border-top:none;border-radius:0 0 16px 16px;padding:14px 28px;text-align:center">
    <p style="color:#4b5563;font-size:11px;margin:0">Powered by <strong style="color:#6b7280">DELRON AI POS</strong> · Built for Rwanda</p>
  </div>
</div>
</body>
</html>`;

  if (!resend) {
    console.log("════════════════════════════════════════════════════════════");
    console.log(`[Invoice Email] To:      ${to}`);
    console.log(`[Invoice Email] Subject: ${subject}`);
    console.log(`[Invoice Email] Invoice: ${invoiceNumber}`);
    console.log(`[Invoice Email] Amount:  RWF ${amount.toLocaleString()}`);
    console.log(`[Invoice Email] Due:     ${dueDate}`);
    console.log(`[Invoice Email] Phone:   ${phoneNumber}`);
    console.log(`[Invoice Email] (Set RESEND_API_KEY to send real emails)`);
    console.log("════════════════════════════════════════════════════════════");
    return true;
  }

  try {
    const { data, error } = await resend.emails.send({ from, to, subject, html });
    if (error) { console.error("[email] Invoice FAILED — from:", from, "| error:", JSON.stringify(error)); return false; }
    console.log("[email] Invoice sent — id:", data?.id);
    return true;
  } catch (e) {
    console.error("[email] Invoice exception:", e);
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
    const { data, error } = await resend.emails.send({ from, to, subject, html });
    if (error) { console.error("[email] Daily report FAILED — from:", from, "| error:", JSON.stringify(error)); return false; }
    console.log("[email] Daily report sent — id:", data?.id);
    return true;
  } catch (e) {
    console.error("[email] Daily report exception:", e);
    return false;
  }
}
