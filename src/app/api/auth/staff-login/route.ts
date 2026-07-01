import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Simple in-memory rate limiter (per phone, resets on server restart — acceptable for now)
const attempts = new Map<string, { count: number; firstAt: number; lockedUntil?: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS    = 15 * 60 * 1000;
const LOCKOUT_MS   = 15 * 60 * 1000;

function checkRateLimit(key: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const rec = attempts.get(key);
  if (rec?.lockedUntil && now < rec.lockedUntil) {
    return { allowed: false, retryAfter: Math.ceil((rec.lockedUntil - now) / 1000) };
  }
  if (!rec || now - rec.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: now });
    return { allowed: true };
  }
  rec.count++;
  if (rec.count > MAX_ATTEMPTS) {
    rec.lockedUntil = now + LOCKOUT_MS;
    return { allowed: false, retryAfter: Math.ceil(LOCKOUT_MS / 1000) };
  }
  return { allowed: true };
}

function clearRateLimit(key: string) {
  attempts.delete(key);
}

export async function POST(req: NextRequest) {
  const ip   = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const body = await req.json();
  const { phone, pin } = body as { phone?: string; pin?: string };

  if (!phone?.trim() || !pin?.trim()) {
    return NextResponse.json({ error: "Phone number and PIN are required" }, { status: 400 });
  }

  const normalizedPhone = phone.trim();
  const rateLimitKey    = `${ip}:${normalizedPhone}`;
  const rl              = checkRateLimit(rateLimitKey);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many failed attempts. Try again in ${Math.ceil((rl.retryAfter ?? 900) / 60)} minutes.` },
      { status: 429 },
    );
  }

  const supabase = createAdminClient();
  const { data: staff } = await supabase
    .from("staff")
    .select("id, business_id, branch_id, name, role, pin, is_active, phone")
    .eq("phone", normalizedPhone)
    .eq("is_active", true)
    .maybeSingle();

  // Generic error — don't reveal whether the phone exists
  const authError = NextResponse.json({ error: "Incorrect phone number or PIN" }, { status: 401 });

  if (!staff || !staff.pin) return authError;

  if (String(staff.pin).trim() !== String(pin).trim()) return authError;

  // Correct credentials — clear rate limit
  clearRateLimit(rateLimitKey);

  const [{ data: business }, { data: branches }] = await Promise.all([
    supabase.from("businesses").select("*").eq("id", staff.business_id).single(),
    supabase.from("branches").select("*").eq("business_id", staff.business_id),
  ]);

  const resolvedBranchId = staff.branch_id ?? branches?.[0]?.id ?? null;

  const operatorPayload = {
    id:        staff.id,
    name:      staff.name,
    role:      staff.role,
    branch_id: resolvedBranchId,
  };

  const res = NextResponse.json({
    staff:             operatorPayload,
    business:          business ?? null,
    branches:          branches ?? [],
    requiresOpeningCash: staff.role === "cashier",
  });

  res.cookies.set("pos_operator", JSON.stringify(operatorPayload), {
    httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 12,
  });
  res.cookies.set("pos_business_id", staff.business_id, {
    httpOnly: false, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 24 * 365,
  });

  return res;
}
