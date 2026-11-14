/**
 * Email code (2FA) for owners, managers and platform admins.
 * Works in the middleware (Edge) and in API routes (Node): Web Crypto only.
 */

/** httpOnly cookie holding this device's random verification token. */
export const DEVICE_COOKIE = "delron_device";
export const CODE_TTL_MS = 10 * 60 * 1000;          // a code is valid 10 minutes
export const MAX_ATTEMPTS = 5;                       // wrong tries before the code is cancelled
export const RESEND_COOLDOWN_MS = 30 * 1000;        // at most one new code every 30 s
export const TRUSTED_DAYS = 30;                      // "Trust this device"
export const SESSION_VERIFY_HOURS = 12;              // without "Trust this device"

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Codes are stored hashed with the user's id, so a leaked table reveals nothing usable. */
export function codeHash(userId: string, code: string) {
  return sha256Hex(`${userId}:${code}`);
}

/** 6-digit code from a cryptographically secure source (no modulo bias). */
export function newCode(): string {
  const buf = new Uint32Array(1);
  const limit = Math.floor(0xffffffff / 1_000_000) * 1_000_000;
  let n = 0;
  do { crypto.getRandomValues(buf); n = buf[0]; } while (n >= limit);
  return String(n % 1_000_000).padStart(6, "0");
}

/** Random device token (sent to the browser; only its hash is stored). */
export function newDeviceToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time comparison of two hex strings of equal length. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
