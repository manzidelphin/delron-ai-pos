import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Compare by last 9 digits so +250785995840 / 0785995840 / 785995840 all match.
function last9(phone: string): string {
  return phone.replace(/\D/g, "").slice(-9);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawPhone: string = body.phone ?? "";

    if (!rawPhone.trim()) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    const needle = last9(rawPhone);
    if (needle.length < 7) {
      return NextResponse.json({ error: "Please enter a valid phone number" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Fetch all active staff with a phone number recorded
    const { data: rows, error } = await supabase
      .from("staff")
      .select("id, phone, business_id, businesses(id, name)")
      .eq("is_active", true)
      .not("phone", "is", null);

    if (error) {
      console.error("[staff-by-phone] query error:", error);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }

    // Filter by last-9-digit match
    const matched = (rows ?? []).filter((row) => {
      if (!row.phone) return false;
      return last9(row.phone) === needle;
    });

    if (matched.length === 0) {
      return NextResponse.json(
        { error: "No staff member found with that phone number. Please ask your manager for help." },
        { status: 404 }
      );
    }

    // Deduplicate by businessId (same phone might appear on multiple staff rows for the same business)
    const seen = new Set<string>();
    const matches: Array<{ businessId: string; businessName: string }> = [];

    for (const row of matched) {
      if (!row.business_id || seen.has(row.business_id)) continue;
      seen.add(row.business_id);

      const bizRaw = row.businesses;
      const biz = (Array.isArray(bizRaw) ? bizRaw[0] : bizRaw) as { id: string; name: string } | null;
      if (!biz) continue;

      matches.push({ businessId: biz.id, businessName: biz.name });
    }

    if (matches.length === 0) {
      return NextResponse.json(
        { error: "Could not resolve business for that phone number. Please contact support." },
        { status: 404 }
      );
    }

    return NextResponse.json({ matches });
  } catch (err) {
    console.error("[staff-by-phone] unexpected error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
