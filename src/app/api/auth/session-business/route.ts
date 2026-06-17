import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

/** Returns the business_id for the currently authenticated Supabase user.
 *  Called by /pos-login to show the correct staff grid when the owner is
 *  logged in via Supabase auth rather than the pos_business_id cookie. */
export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ businessId: null, businessName: null });
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("staff")
      .select("business_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (!profile?.business_id) {
      return NextResponse.json({ businessId: null, businessName: null });
    }

    const { data: business } = await admin
      .from("businesses")
      .select("name")
      .eq("id", profile.business_id)
      .single();

    return NextResponse.json({
      businessId: profile.business_id,
      businessName: business?.name ?? null,
    });
  } catch (err) {
    console.error("[session-business] error:", err);
    return NextResponse.json({ businessId: null, businessName: null });
  }
}
