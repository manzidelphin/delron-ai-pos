/**
 * MTN MoMo Collection API client — sandbox/production with placeholder fallback.
 * Sandbox docs: https://momodeveloper.mtn.com/api-documentation/collection/
 *
 * Placeholder mode: if MOMO_COLLECTION_PRIMARY_KEY is missing or "placeholder",
 * all calls log to console and return fake success — zero real API calls.
 */

const PRIMARY_KEY  = process.env.MOMO_COLLECTION_PRIMARY_KEY ?? "";
const API_USER     = process.env.MOMO_API_USER ?? "";
const API_KEY      = process.env.MOMO_API_KEY ?? "";
const TARGET_ENV   = process.env.MOMO_TARGET_ENVIRONMENT ?? "sandbox";
const CALLBACK_URL = process.env.MOMO_CALLBACK_URL ?? "";

const BASE_URL = TARGET_ENV === "production"
  ? "https://momodeveloper.mtn.com"
  : "https://sandbox.momodeveloper.mtn.com";

// In sandbox MTN requires EUR; production Rwanda uses RWF
const CURRENCY = TARGET_ENV === "production" ? "RWF" : "EUR";

// Real keys are 32-char hex strings (UUIDs without dashes, or full UUIDs)
export const MOMO_IS_PLACEHOLDER =
  !PRIMARY_KEY || PRIMARY_KEY === "placeholder" || PRIMARY_KEY.length < 20;

/** Normalize a Rwandan phone to MSISDN (250XXXXXXXXX, no +). */
export function normalizeMsisdn(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.startsWith("250")) return d;
  if (d.startsWith("0") && d.length === 10) return "250" + d.slice(1);
  if (d.length === 9) return "250" + d;
  return d;
}

async function getAccessToken(): Promise<string> {
  const credentials = Buffer.from(`${API_USER}:${API_KEY}`).toString("base64");
  const res = await fetch(`${BASE_URL}/collection/token/`, {
    method: "POST",
    headers: {
      Authorization:               `Basic ${credentials}`,
      "Ocp-Apim-Subscription-Key": PRIMARY_KEY,
    },
  });
  if (!res.ok) throw new Error(`MoMo token: ${res.status} ${await res.text()}`);
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

// ─────────────────────────────────────────────────────────────────────────────

export interface RequestToPayOptions {
  /** Amount in local currency (stored as RWF; sent as EUR in sandbox). */
  amount: number;
  /** Payer phone number — will be normalized to MSISDN. */
  phoneNumber: string;
  /** Your internal reference — use the invoice UUID so callbacks can resolve it. */
  externalId: string;
  payerMessage: string;
  payeeNote: string;
}

export interface RequestToPayResult {
  referenceId: string;
  isPlaceholder: boolean;
}

export async function momoRequestToPay(opts: RequestToPayOptions): Promise<RequestToPayResult> {
  const referenceId = crypto.randomUUID();
  const msisdn = normalizeMsisdn(opts.phoneNumber);

  if (MOMO_IS_PLACEHOLDER) {
    console.log("════════════════════════════════════════════════════════════");
    console.log("[MoMo RTP] ▶ PLACEHOLDER — Request to Pay NOT sent to MTN");
    console.log(`[MoMo RTP] Phone:       ${msisdn} (${opts.phoneNumber})`);
    console.log(`[MoMo RTP] Amount:      ${opts.amount} ${CURRENCY}`);
    console.log(`[MoMo RTP] ExternalId:  ${opts.externalId}`);
    console.log(`[MoMo RTP] Message:     ${opts.payerMessage}`);
    console.log(`[MoMo RTP] ReferenceId: ${referenceId}`);
    console.log(`[MoMo RTP] Callback:    ${CALLBACK_URL || "(not configured)"}`);
    console.log("[MoMo RTP] → Set MOMO_COLLECTION_PRIMARY_KEY to send real requests");
    console.log("════════════════════════════════════════════════════════════");
    return { referenceId, isPlaceholder: true };
  }

  const token = await getAccessToken();

  const webhookSecret = process.env.MOMO_WEBHOOK_SECRET;
  const callbackUrl = CALLBACK_URL
    ? `${CALLBACK_URL}?ref=${referenceId}${webhookSecret ? `&secret=${webhookSecret}` : ""}`
    : undefined;

  const headers: Record<string, string> = {
    Authorization:               `Bearer ${token}`,
    "X-Reference-Id":            referenceId,
    "X-Target-Environment":      TARGET_ENV,
    "Ocp-Apim-Subscription-Key": PRIMARY_KEY,
    "Content-Type":              "application/json",
  };
  if (callbackUrl) headers["X-Callback-Url"] = callbackUrl;

  const res = await fetch(`${BASE_URL}/collection/v1_0/requesttopay`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      amount:       String(opts.amount),
      currency:     CURRENCY,
      externalId:   opts.externalId,
      payer:        { partyIdType: "MSISDN", partyId: msisdn },
      payerMessage: opts.payerMessage.slice(0, 160),
      payeeNote:    opts.payeeNote.slice(0, 160),
    }),
  });

  if (res.status !== 202) {
    const text = await res.text();
    throw new Error(`MoMo requesttopay ${res.status}: ${text}`);
  }

  return { referenceId, isPlaceholder: false };
}

// ─────────────────────────────────────────────────────────────────────────────

export type MoMoPaymentStatus = "PENDING" | "SUCCESSFUL" | "FAILED" | "TIMEOUT";

export async function getMoMoPaymentStatus(referenceId: string): Promise<MoMoPaymentStatus> {
  if (MOMO_IS_PLACEHOLDER) {
    console.log(`[MoMo STATUS] Placeholder — referenceId: ${referenceId} → PENDING`);
    return "PENDING";
  }

  const token = await getAccessToken();
  const res = await fetch(`${BASE_URL}/collection/v1_0/requesttopay/${referenceId}`, {
    headers: {
      Authorization:               `Bearer ${token}`,
      "X-Target-Environment":      TARGET_ENV,
      "Ocp-Apim-Subscription-Key": PRIMARY_KEY,
    },
  });

  if (!res.ok) throw new Error(`MoMo status ${res.status}: ${await res.text()}`);
  const data = await res.json() as { status: MoMoPaymentStatus };
  return data.status;
}

/** Verify MOMO_WEBHOOK_SECRET in callback URL query. Returns true in placeholder mode. */
export function verifyMoMoSecret(secret: string | null): boolean {
  const expected = process.env.MOMO_WEBHOOK_SECRET;
  if (!expected || expected === "placeholder") return true; // dev / unconfigured
  return secret === expected;
}
