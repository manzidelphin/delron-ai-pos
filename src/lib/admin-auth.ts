import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface AdminCheck {
  userId: string | null;
  /** Staff ID if the platform admin also has a staff record; null if they have no business. */
  staffId: string | null;
  error: NextResponse | null;
}

/**
 * Verify the caller is a platform admin by checking the platform_admins table.
 * Independent of any business/staff membership — survives business deletion.
 */
export async function checkPlatformAdmin(): Promise<AdminCheck> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { userId: null, staffId: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: adminRecord } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRecord) {
    return { userId: user.id, staffId: null, error: NextResponse.json({ error: "Forbidden — platform admin only" }, { status: 403 }) };
  }

  // Look up a staff record if one exists (optional — used for audit log attribution).
  const { data: staffRecord } = await supabase
    .from("staff")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  return { userId: user.id, staffId: staffRecord?.id ?? null, error: null };
}
