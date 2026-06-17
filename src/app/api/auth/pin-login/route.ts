import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Resolve business_id for this PIN attempt.
 *
 *  Priority:
 *  1. businessId sent in the POST body — the pos-login page always knows which
 *     business it loaded staff for and sends it explicitly.
 *  2. pos_business_id HTTP-only cookie — set when the owner first logs in on a
 *     dedicated POS device.
 *
 *  We deliberately do NOT use the Supabase session here: the logged-in owner
 *  may belong to a different business than the POS device being used. */
function resolveBusinessId(req: NextRequest, bodyBusinessId?: string): string | null {
  if (bodyBusinessId) {
    console.log("[pin-login] businessId from request body:", bodyBusinessId);
    return bodyBusinessId;
  }
  const cookieId = req.cookies.get("pos_business_id")?.value ?? null;
  console.log("[pin-login] businessId from cookie:", cookieId ?? "(missing)");
  return cookieId;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { staffId, pin, businessId: bodyBusinessId } = body as {
      staffId?: string;
      pin?: string;
      businessId?: string;
    };

    const businessId = resolveBusinessId(req, bodyBusinessId);
    console.log("[pin-login] resolved businessId:", businessId ?? "(none)", "| staffId:", staffId);

    if (!businessId) {
      return NextResponse.json(
        { error: "Device not configured. Please ask the owner to log in first." },
        { status: 400 }
      );
    }

    if (!staffId || !pin) {
      return NextResponse.json({ error: "staffId and pin are required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: staff, error: fetchError } = await supabase
      .from("staff")
      .select("id, business_id, branch_id, user_id, name, phone, email, role, pin, is_active, created_at")
      .eq("id", staffId)
      .single();

    if (fetchError || !staff) {
      console.error("[pin-login] staff not found by id:", staffId, fetchError?.message);
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    if (staff.business_id !== businessId) {
      console.error("[pin-login] business mismatch — staff:", staff.business_id, "resolved:", businessId);
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    if (!staff.is_active) {
      return NextResponse.json({ error: "This account has been deactivated" }, { status: 403 });
    }

    const storedPin = String(staff.pin ?? "").trim();

    if (!storedPin) {
      console.error("[pin-login] no PIN set for:", staff.name);
      return NextResponse.json(
        { error: `No PIN has been set for ${staff.name}. Ask the manager to set a PIN in Staff Settings.` },
        { status: 401 }
      );
    }

    const enteredPin = String(pin).trim();
    console.log("[pin-login] PIN match:", storedPin === enteredPin, "| staff:", staff.name);

    if (storedPin !== enteredPin) {
      return NextResponse.json({ error: "Incorrect PIN. Please try again." }, { status: 401 });
    }

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
      pin:         null,
      is_active:   staff.is_active,
      created_at:  staff.created_at,
    };

    console.log("[pin-login] success —", staff.name, staff.role, "| business:", businessId);

    const res = NextResponse.json({
      staff:       operatorPayload,
      staffRecord,
      business:    business ?? null,
      branches:    branches ?? [],
    });

    res.cookies.set("pos_operator", JSON.stringify(operatorPayload), {
      httpOnly: true,
      sameSite: "lax",
      secure:   false,
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
