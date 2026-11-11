import type { SupabaseClient } from "@supabase/supabase-js";
import { TERMS_VERSION } from "@/lib/legal/terms";

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
  return admin.from("agreement_acceptances").insert({
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
