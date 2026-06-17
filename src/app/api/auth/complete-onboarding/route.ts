import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      user_id,
      full_name,
      business_name,
      phone,
      email,
      location,
      modules,
      language,
    } = body;

    if (!user_id || !full_name || !business_name) {
      return NextResponse.json(
        { error: "user_id, full_name and business_name are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 1. Create business
    const { data: business, error: bizError } = await supabase
      .from("businesses")
      .insert({
        name: business_name,
        owner_id: user_id,
        location: location || null,
        phone: phone || null,
        email: email || null,
        modules: modules ?? [],
        plan: "free",
        language: language ?? "en",
        currency: "RWF",
      })
      .select()
      .single();

    if (bizError) {
      console.error("[onboarding] business insert error:", bizError);
      return NextResponse.json(
        { error: `Failed to create business: ${bizError.message}` },
        { status: 500 }
      );
    }

    // 2. Create main branch
    const { data: branch, error: branchError } = await supabase
      .from("branches")
      .insert({
        business_id: business.id,
        name: `${business_name} — Main Branch`,
        location: location || null,
        phone: phone || null,
        is_main: true,
      })
      .select()
      .single();

    if (branchError) {
      console.error("[onboarding] branch insert error:", branchError);
      return NextResponse.json(
        { error: `Failed to create branch: ${branchError.message}` },
        { status: 500 }
      );
    }

    // 3. Create owner staff record
    const { error: staffError } = await supabase.from("staff").insert({
      business_id: business.id,
      branch_id: branch.id,
      user_id,
      name: full_name,
      phone: phone || null,
      email: email || null,
      role: "owner",
      is_active: true,
    });

    if (staffError) {
      console.error("[onboarding] staff insert error:", staffError);
      return NextResponse.json(
        { error: `Failed to create staff profile: ${staffError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ business, branch });
  } catch (err) {
    console.error("[onboarding] unexpected error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
