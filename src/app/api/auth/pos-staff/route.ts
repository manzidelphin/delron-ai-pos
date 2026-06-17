import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("businessId");
  if (!businessId) {
    return NextResponse.json({ error: "businessId is required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const [businessResult, staffResult] = await Promise.all([
    supabase.from("businesses").select("name").eq("id", businessId).single(),
    supabase
      .from("staff")
      .select("id, name, role")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .order("name"),
  ]);

  return NextResponse.json({
    businessName: businessResult.data?.name ?? null,
    staff: staffResult.data ?? [],
  });
}
