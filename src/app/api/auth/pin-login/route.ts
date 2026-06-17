import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Resolve business_id using the same priority as pos-login:
 *  1. Active Supabase session (owner logged in via email/password)
 *  2. pos_business_id cookie  (dedicated PIN-only POS device) */
async function resolveBusinessId(req: NextRequest): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const admin = createAdminClient();
      const { data: profile } = await admin
        .from("staff")
        .select("business_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();
      if (profile?.business_id) {
        console.log("[pin-login] businessId from Supabase session:", profile.business_id);
        return profile.business_id;
      }
    }
  } catch (err) {
    console.warn("[pin-login] session lookup failed, falling back to cookie:", err);
  }

  const cookieId = req.cookies.get("pos_business_id")?.value ?? null;
  console.log("[pin-login] businessId from cookie:", cookieId ?? "(missing)");
  return cookieId;
}

export async function POST(req: NextRequest) {
  try {
    const businessId = await resolveBusinessId(req);

    if (!businessId) {
      return NextResponse.json(
        { error: "Device not configured. Please ask the owner to log in first." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { staffId, pin } = body as { staffId?: string; pin?: string };
    console.log("[pin-login] staffId:", staffId, "| pin length:", pin?.length ?? 0, "| businessId:", businessId);

    if (!staffId || !pin) {
      return NextResponse.json({ error: "staffId and pin are required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Look up by staffId only first so we can give precise error messages
    const { data: staff, error: fetchError } = await supabase
      .from("staff")
      .select("id, business_id, branch_id, user_id, name, phone, email, role, pin, is_active, created_at")
      .eq("id", staffId)
      .single();

    if (fetchError || !staff) {
      console.error("[pin-login] staff not found by id:", staffId, fetchError?.message);
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    // Verify the staff belongs to the resolved business
    if (staff.business_id !== businessId) {
      console.error("[pin-login] business mismatch — staff.business_id:", staff.business_id, "resolved:", businessId);
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    if (!staff.is_active) {
      return NextResponse.json({ error: "This account has been deactivated" }, { status: 403 });
    }

    // Coerce both sides to string — PIN may be stored as integer in DB
    const storedPin = String(staff.pin ?? "").trim();

    if (!storedPin) {
      console.error("[pin-login] staff has no PIN set:", staff.name);
      return NextResponse.json(
        { error: `No PIN has been set for ${staff.name}. Please ask the manager to set a PIN in Staff Settings.` },
        { status: 401 }
      );
    }

    const enteredPin = String(pin).trim();
    console.log("[pin-login] PIN match:", storedPin === enteredPin, "| staff:", staff.name);

    if (storedPin !== enteredPin) {
      return NextResponse.json({ error: "Incorrect PIN. Please try again." }, { status: 401 });
    }

    // Load business and branches
    const [{ data: business }, { data: branches }] = await Promise.all([
      supabase.from("businesses").select("*").eq("id", businessId).single(),
      supabase.from("branches").select("*").eq("business_id", businessId),
    ]);

    const resolvedBranchId = staff.branch_id ?? branches?.[0]?.id ?? null;

    const operatorPayload = {
      id:        staff.id,
      name:      staff.name,
      role:      staff.role,
      branch_id: resolvedBranchId,
    };

    const staffRecord = {
      id:          staff.id,
      business_id: staff.business_id,
      branch_id:   resolvedBranchId,
      user_id:     staff.user_id ?? null,
      name:        staff.name,
      phone:       staff.phone ?? null,
      email:       staff.email ?? null,
      role:        staff.role,
      pin:         null, // never expose PIN to client
      is_active:   staff.is_active,
      created_at:  staff.created_at,
    };

    console.log("[pin-login] success — operator:", staff.name, staff.role);

    const res = NextResponse.json({
      staff: operatorPayload,
      staffRecord,
      business: business ?? null,
      branches:  branches ?? [],
    });

    res.cookies.set("pos_operator", JSON.stringify(operatorPayload), {
      httpOnly: true,
      sameSite: "lax",
      secure:   false, // must be false on http://localhost
      path:     "/",
      maxAge:   60 * 60 * 12,
    });

    return res;
  } catch (err) {
    console.error("[pin-login] unhandled error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete("pos_operator");
  return res;
}
