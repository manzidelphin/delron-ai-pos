import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth";

export async function GET() {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;
  const { businessId } = auth;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("staff")
    .select("id,name,phone,email,role,branch_id,is_active,created_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;
  const { businessId, staffId: requesterId } = auth;

  const supabase = createAdminClient();
  const { data: requester } = await supabase.from("staff").select("role").eq("id", requesterId).single();
  if (!["owner", "manager"].includes(requester?.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { name, phone, email, role, branch_id, pin } = body;

  if (!name || !phone || !role || !pin) {
    return NextResponse.json({ error: "name, phone, role and pin are required" }, { status: 400 });
  }

  // Create auth user with temporary password (admin client required for auth.admin)
  const adminClient = createAdminClient();
  const tempPassword = Math.random().toString(36).slice(-8) + "A1!";
  const { data: authUser } = await adminClient.auth.admin.createUser({
    email: email || `${phone.replace(/\D/g, "")}@delron.rw`,
    password: tempPassword,
    email_confirm: true,
  });

  const { data: newStaff, error } = await supabase
    .from("staff")
    .insert({
      business_id: businessId,
      branch_id: branch_id || null,
      user_id: authUser?.user?.id ?? null,
      name,
      phone,
      email: email || null,
      role,
      pin,
      is_active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send SMS with login details if possible
  try {
    const { sendSMS, SMS_TEMPLATES } = await import("@/lib/sms");
    const msg = SMS_TEMPLATES.staffWelcome(name, "DELRON AI POS", pin);
    if (phone) await sendSMS(phone, msg);
  } catch {}

  return NextResponse.json(newStaff, { status: 201 });
}
