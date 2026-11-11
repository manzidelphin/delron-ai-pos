import type { SupabaseClient } from "@supabase/supabase-js";
import { TERMS_VERSION } from "@/lib/legal/terms";
import type { AgreementData } from "@/lib/agreement-pdf";
import { sendAgreementEmail } from "@/lib/email";

/** Client IP and device of the request, kept as evidence of the electronic signature. */
export function requestEvidence(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0].trim() || req.headers.get("x-real-ip") || null;
  const userAgent = (req.headers.get("user-agent") ?? "").slice(0, 300) || null;
  return { ip, userAgent };
}

/** Saves one acceptance of the current Terms. Server only (service-role client). */
export async function recordAcceptance(
  admin: SupabaseClient,
  req: Request,
  a: {
    businessId: string;
    businessName: string;
    userId: string | null;
    name: string;
    email?: string | null;
    phone?: string | null;
    method: "signup" | "reaccept";
  }
) {
  const { ip, userAgent } = requestEvidence(req);
  const result = await admin.from("agreement_acceptances").insert({
    business_id: a.businessId,
    business_name: a.businessName,
    user_id: a.userId,
    accepted_by_name: a.name,
    accepted_by_email: a.email ?? null,
    accepted_by_phone: a.phone ?? null,
    terms_version: TERMS_VERSION,
    method: a.method,
    ip_address: ip,
    user_agent: userAgent,
  }).select().single();

  // Send the owner their copy. Never fails the acceptance itself.
  if (!result.error && result.data && a.email) {
    try {
      await emailAgreementCopy(admin, req, result.data as AcceptanceRow);
    } catch (e) {
      console.error("[agreement] email copy failed:", e);
    }
  }
  return result;
}

/** Logo for the PDF, fetched from this site (public files aren't on the server's disk). */
async function logoDataUrl(req: Request): Promise<string | null> {
  try {
    const res = await fetch(new URL("/brand/logo-receipt.png", req.url));
    if (!res.ok) return null;
    return `data:image/png;base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

/** Builds the signed agreement PDF and emails it to the owner who accepted. */
type AcceptanceRow = NonNullable<AgreementData["acceptance"]> & { business_id: string };

async function emailAgreementCopy(admin: SupabaseClient, req: Request, acceptance: AcceptanceRow) {
  const [{ data: business }, { data: owners }] = await Promise.all([
    admin.from("businesses").select("id, name, location, phone, email, created_at").eq("id", acceptance.business_id).single(),
    admin.from("staff").select("name, email, phone").eq("business_id", acceptance.business_id).eq("role", "owner").order("created_at").limit(1),
  ]);
  if (!business || !acceptance.accepted_by_email) return;

  const { buildAgreementPdf } = await import("@/lib/agreement-pdf");
  const doc = await buildAgreementPdf(
    { business, owner: owners?.[0] ?? null, acceptance },
    { logoDataUrl: await logoDataUrl(req) }
  );
  await sendAgreementEmail({
    to: acceptance.accepted_by_email,
    ownerName: acceptance.accepted_by_name,
    businessName: acceptance.business_name || business.name,
    reference: `DEL-AGR-${acceptance.id.slice(0, 8).toUpperCase()}`,
    pdf: Buffer.from(doc.output("arraybuffer")),
  });
}

/** True when the business has accepted the current Terms version. */
export async function hasAcceptedCurrentTerms(admin: SupabaseClient, businessId: string): Promise<boolean> {
  const { data } = await admin
    .from("agreement_acceptances")
    .select("id")
    .eq("business_id", businessId)
    .eq("terms_version", TERMS_VERSION)
    .limit(1);
  return !!data?.length;
}
