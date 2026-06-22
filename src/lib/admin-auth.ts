import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface AdminCheck {
  admin: { id: string; business_id: string } | null;
  userId: string | null;
  error: NextResponse | null;
}

/** Verify the caller is a platform admin. Use at the top of every /api/admin/* route. */
export async function checkPlatformAdmin(): Promise<AdminCheck> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      admin: null,
      userId: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: staffRecord } = await supabase
    .from("staff")
    .select("id, business_id, is_platform_admin")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!staffRecord?.is_platform_admin) {
    return {
      admin: null,
      userId: user.id,
      error: NextResponse.json({ error: "Forbidden — platform admin only" }, { status: 403 }),
    };
  }

  return {
    admin: { id: staffRecord.id, business_id: staffRecord.business_id },
    userId: user.id,
    error: null,
  };
}
