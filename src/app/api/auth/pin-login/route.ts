import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const businessId = req.cookies.get("pos_business_id")?.value;
    console.log("[pin-login] businessId from cookie:", businessId ?? "(missing)");

    if (!businessId) {
      return NextResponse.json(
        { error: "Device not configured. Please ask the owner to log in first." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { staffId, pin } = body as { staffId?: string; pin?: string };
    console.log("[pin-login] staffId:", staffId, "| pin length:", pin?.length ?? 0);

    if (!staffId || !pin) {
      return NextResponse.json({ error: "staffId and pin are required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: staff, error } = await supabase
      .from("staff")
      .select("id, business_id, branch_id, user_id, name, phone, email, role, pin, is_active, created_at")
      .eq("id", staffId)
      .eq("business_id", businessId)
      .single();

    if (error || !staff) {
      console.error("[pin-login] staff lookup failed:", error?.message ?? "no row returned");
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    if (!staff.is_active) {
      return NextResponse.json({ error: "This account has been deactivated" }, { status: 403 });
    }

    // Coerce both sides to string — PIN may be stored as integer in DB
    const storedPin = String(staff.pin ?? "");
    const enteredPin = String(pin);
    console.log("[pin-login] PIN match:", storedPin === enteredPin);

    if (!storedPin || storedPin !== enteredPin) {
      return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 });
    }

    // Load business and branches first so we can resolve branch_id for unassigned staff
    const [{ data: business }, { data: branches }] = await Promise.all([
      supabase.from("businesses").select("*").eq("id", businessId).single(),
      supabase.from("branches").select("*").eq("business_id", businessId),
    ]);

    // If staff has no assigned branch, fall back to the business's first branch
    const resolvedBranchId = staff.branch_id ?? branches?.[0]?.id ?? null;

    const operatorPayload = {
      id: staff.id,
      name: staff.name,
      role: staff.role,
      branch_id: resolvedBranchId,
    };

    const staffRecord = {
      id: staff.id,
      business_id: staff.business_id,
      branch_id: resolvedBranchId,
      user_id: staff.user_id ?? null,
      name: staff.name,
      phone: staff.phone ?? null,
      email: staff.email ?? null,
      role: staff.role,
      pin: null, // never expose PIN to client
      is_active: staff.is_active,
      created_at: staff.created_at,
    };

    console.log("[pin-login] Setting pos_operator cookie:", JSON.stringify(operatorPayload));

    const res = NextResponse.json({
      staff: operatorPayload,
      staffRecord,
      business: business ?? null,
      branches: branches ?? [],
    });

    res.cookies.set("pos_operator", JSON.stringify(operatorPayload), {
      httpOnly: true,
      sameSite: "lax",   // strict can block RSC soft-navigation fetches in dev
      secure: false,     // must be false on http://localhost
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    console.log("[pin-login] Response Set-Cookie headers:", res.headers.get("set-cookie"));

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
