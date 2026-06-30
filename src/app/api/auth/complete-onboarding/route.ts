import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNewSignupEmail, sendWelcomeEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      full_name,
      business_name,
      phone,
      email,
      password,
      location,
      modules,
      language,
    } = body;

    if (!email || !password || !full_name || !business_name) {
      return NextResponse.json(
        { error: "email, password, full_name and business_name are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 0. Create the auth user server-side — synchronous, no FK propagation race.
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { full_name },
    });
    if (createError || !newUser.user) {
      const isDuplicate =
        createError?.message?.toLowerCase().includes("already been registered") ||
        createError?.message?.toLowerCase().includes("already registered") ||
        createError?.code === "email_exists";
      return NextResponse.json(
        {
          error: isDuplicate
            ? "An account with this email already exists."
            : (createError?.message ?? "Failed to create account"),
          duplicate: isDuplicate,
        },
        { status: isDuplicate ? 409 : 400 }
      );
    }
    const user_id = newUser.user.id;

    // Trigger Supabase's confirmation email — admin.createUser() does not auto-send it.
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
      });
      if (resendError) {
        console.error("[onboarding] confirmation email resend failed:", resendError);
      }
    } catch (e) { console.error("[onboarding] confirmation email resend threw:", e); }

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

    // Await both emails inside try/catch — failure never blocks signup,
    // but awaiting ensures the function doesn't terminate before Resend responds.
    if (email) {
      try {
        await sendWelcomeEmail({
          to:           email,
          ownerName:    full_name,
          businessName: business_name,
          modules:      modules ?? [],
        });
      } catch (e) { console.error("[onboarding] welcome email failed:", e); }
    }

    try {
      await sendNewSignupEmail({
        businessId:   business.id,
        businessName: business_name,
        ownerEmail:   email ?? "",
        ownerPhone:   phone ?? null,
        modules:      modules ?? [],
        signupDate:   new Date().toISOString().split("T")[0],
      });
    } catch (e) { console.error("[onboarding] signup email failed:", e); }

    return NextResponse.json({ business, branch });
  } catch (err) {
    console.error("[onboarding] unexpected error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
