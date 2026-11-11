import { jsPDF } from "jspdf";
import { PROVIDER, TERMS_INTRO, TERMS_SECTIONS } from "@/lib/legal/terms";

export interface AgreementData {
  business: { id: string; name: string; location: string | null; phone: string | null; email: string | null; created_at: string };
  owner: { name: string; email: string | null; phone: string | null } | null;
  acceptance: {
    id: string;
    business_name: string;
    accepted_by_name: string;
    accepted_by_email: string | null;
    accepted_by_phone: string | null;
    terms_version: string;
    method: "signup" | "reaccept";
    ip_address: string | null;
    user_agent: string | null;
    accepted_at: string;
  } | null;
}

const kigali = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    timeZone: "Africa/Kigali", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  }) + " (Kigali time)";

/** Short device description from a browser user-agent string. */
function deviceLabel(ua: string | null): string {
  if (!ua) return "not recorded";
  const os = /Android/i.test(ua) ? "Android" : /iPhone|iPad/i.test(ua) ? "iOS" : /Windows/i.test(ua) ? "Windows" : /Mac OS/i.test(ua) ? "macOS" : /Linux/i.test(ua) ? "Linux" : "Other";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  return `${browser} on ${os}`;
}

async function loadLogo(): Promise<string | null> {
  try {
    const blob = await (await fetch("/brand/logo-receipt.png")).blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * The business's signed agreement: parties, the full Terms of Service it
 * accepted, and a signature block with the business name in the signature place
 * plus the evidence of the electronic acceptance.
 */
export async function buildAgreementPdf(
  d: AgreementData,
  /** Logo as a data URL; leave out in the browser (loaded from /brand), null for none. */
  opts: { logoDataUrl?: string | null } = {}
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const W = 210, M = 18, CW = W - M * 2, BOTTOM = 280;
  let y = M;
  const acc = d.acceptance;
  const ref = acc ? `DEL-AGR-${acc.id.slice(0, 8).toUpperCase()}` : "—";

  const ensure = (h: number) => { if (y + h > BOTTOM) { doc.addPage(); y = M; } };
  const text = (s: string, size = 9.5, style: "normal" | "bold" | "italic" = "normal", indent = 0, gap = 1.2) => {
    doc.setFont("helvetica", style); doc.setFontSize(size);
    const lines = doc.splitTextToSize(s, CW - indent) as string[];
    const lh = size * 0.42;
    for (const line of lines) { ensure(lh); doc.text(line, M + indent, y); y += lh; }
    y += gap;
  };
  const rule = () => { ensure(4); doc.setDrawColor(190); doc.setLineWidth(0.2); doc.line(M, y, W - M, y); y += 4; };

  // ── Header ──────────────────────────────────────────────
  const logo = opts.logoDataUrl !== undefined ? opts.logoDataUrl : await loadLogo();
  if (logo) doc.addImage(logo, "PNG", M, y - 2, 16, 15.6);
  doc.setFont("helvetica", "bold"); doc.setFontSize(16);
  doc.text("SERVICE AGREEMENT", W - M, y + 4, { align: "right" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.text(`${PROVIDER.product} — Terms of Service`, W - M, y + 9, { align: "right" });
  doc.text(`Terms version: ${acc?.terms_version ?? "—"}   ·   Reference: ${ref}`, W - M, y + 13.5, { align: "right" });
  y += 20; rule();

  // ── Parties ─────────────────────────────────────────────
  text("BETWEEN", 9, "bold", 0, 0.5);
  text(`${PROVIDER.name}, provider of ${PROVIDER.product}, TIN ${PROVIDER.tin}, ${PROVIDER.address}. Email ${PROVIDER.email}, phone ${PROVIDER.phone} ("the Provider")`, 9.5, "normal", 0, 2.5);
  text("AND", 9, "bold", 0, 0.5);
  const owner = d.owner;
  const customer = [
    d.business.name.toUpperCase(),
    d.business.location ? `located at ${d.business.location}` : null,
    owner ? `represented by ${owner.name}` : null,
    (owner?.phone ?? d.business.phone) ? `phone ${owner?.phone ?? d.business.phone}` : null,
    (owner?.email ?? d.business.email) ? `email ${owner?.email ?? d.business.email}` : null,
  ].filter(Boolean).join(", ");
  text(`${customer} ("the Customer")`, 9.5, "normal", 0, 2.5);
  text(`Customer account created on ${kigali(d.business.created_at)}.`, 8.5, "italic", 0, 1);
  rule();

  // ── Terms ───────────────────────────────────────────────
  for (const p of TERMS_INTRO) text(p, 9.5, "normal", 0, 1.8);
  y += 1;
  for (const s of TERMS_SECTIONS) {
    ensure(10);
    text(`${s.n}. ${s.title}`, 10, "bold", 0, 1);
    for (const b of s.blocks) {
      if ("p" in b) text(b.p, 9.5, "normal", 0, 1.5);
      else for (const item of b.ul) text(`•  ${item}`, 9.5, "normal", 3, 0.8);
    }
    y += 1.5;
  }

  // ── Signatures ──────────────────────────────────────────
  ensure(78);
  rule();
  text("SIGNATURES", 11, "bold", 0, 2);

  const colW = (CW - 8) / 2;
  const left = M, right = M + colW + 8;
  const top = y;

  // Customer: the business name is its signature.
  doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
  doc.text("FOR THE CUSTOMER", left, top);
  if (acc) {
    doc.setFont("times", "bolditalic"); doc.setFontSize(19);
    const sig = doc.splitTextToSize(acc.business_name || d.business.name, colW) as string[];
    doc.text(sig.slice(0, 2), left, top + 11);
    const sy = top + 11 + (sig.length > 1 ? 8 : 0) + 3;
    doc.setDrawColor(60); doc.setLineWidth(0.3); doc.line(left, sy, left + colW, sy);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    const ev = [
      `Signed electronically by ${acc.accepted_by_name}`,
      `on behalf of ${acc.business_name || d.business.name}`,
      acc.accepted_by_email ? `Email: ${acc.accepted_by_email}` : null,
      acc.accepted_by_phone ? `Phone: ${acc.accepted_by_phone}` : null,
      `Date: ${kigali(acc.accepted_at)}`,
      `How: ${acc.method === "signup" ? "ticked “I agree” when creating the account" : "ticked “I agree” after signing in"}`,
      `IP address: ${acc.ip_address ?? "not recorded"}`,
      `Device: ${deviceLabel(acc.user_agent)}`,
      `Reference: ${ref}`,
    ].filter(Boolean) as string[];
    let ly = sy + 4.5;
    for (const l of ev) { for (const w of doc.splitTextToSize(l, colW) as string[]) { doc.text(w, left, ly); ly += 3.8; } }
  } else {
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(180, 0, 0);
    doc.text(doc.splitTextToSize("NOT YET SIGNED", colW), left, top + 10);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
    doc.text(doc.splitTextToSize(
      `${d.business.name} accepted the Terms when creating the account on ${kigali(d.business.created_at)}, before acceptances were recorded. The owner will be asked to accept again at the next login; this agreement will then show the signature.`,
      colW), left, top + 16);
    doc.setTextColor(0, 0, 0);
  }

  // Provider.
  doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
  doc.text("FOR THE PROVIDER", right, top);
  doc.setFont("times", "bolditalic"); doc.setFontSize(19);
  doc.text(PROVIDER.name, right, top + 11);
  doc.setDrawColor(60); doc.setLineWidth(0.3); doc.line(right, top + 14, right + colW, top + 14);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  doc.text([`${PROVIDER.name} — ${PROVIDER.product}`, `TIN ${PROVIDER.tin}`, PROVIDER.address.replace(", Kigali", ",\nKigali")].join("\n"), right, top + 18.5);

  // ── Footer on every page ────────────────────────────────
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(120);
    doc.text(`${PROVIDER.product} · Service agreement with ${d.business.name} · Ref ${ref}`, M, 290);
    doc.text(`Page ${i} of ${pages}`, W - M, 290, { align: "right" });
    doc.setTextColor(0);
  }
  return doc;
}
