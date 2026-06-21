/**
 * Creates the "Test Fresh Produce" test business.
 * Safe to re-run — all steps are idempotent.
 *
 * Steps:
 *   1. Create Supabase auth user (or resolve existing)
 *   2. Create business (two_factor_enabled: false, modules: ["supermarket"])
 *   3. Create main branch
 *   4. Create owner staff record linked to auth user
 *   5. Seed 3 produce products
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL     = "https://hfjggupbkbudnqplxviq.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmamdndXBia2J1ZG5xcGx4dmlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTQ1MzA5MywiZXhwIjoyMDk3MDI5MDkzfQ.sDxVRUjYEOube85pxwKkT3j1b8BtApaR20UC0Cc4Li0";

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BIZ_ID    = "55000000-0000-0000-0000-000000000002";
const BRANCH_ID = "55000000-0000-0000-0000-000000000003";
const EMAIL     = "testproduce@delronpos.rw";
const PASSWORD  = "Delron@2002";
const BIZ_NAME  = "Test Fresh Produce";
const PHONE     = "+250788000005";

function ok(label, error) {
  if (error) { console.error(`  ✗ ${label}: ${error.message}`); return false; }
  console.log(`  ✓ ${label}`);
  return true;
}

async function run() {
  console.log(`\n→ ${BIZ_NAME} (${EMAIL})\n`);

  // ── 1. Auth user ─────────────────────────────────────────────────
  process.stdout.write("  Creating auth user ... ");
  const { data: created, error: createErr } = await sb.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name: `${BIZ_NAME} Owner` },
  });

  let authUserId;
  if (createErr) {
    if (createErr.message?.toLowerCase().includes("already")) {
      const { data: list } = await sb.auth.admin.listUsers({ perPage: 1000 });
      const existing = list?.users?.find(u => u.email === EMAIL);
      if (!existing) { console.log(`FAIL — ${createErr.message}`); process.exit(1); }
      authUserId = existing.id;
      console.log(`already exists → ${authUserId}`);
    } else {
      console.log(`FAIL — ${createErr.message}`); process.exit(1);
    }
  } else {
    authUserId = created.user.id;
    console.log(`created → ${authUserId}`);
  }

  // ── 2. Business ──────────────────────────────────────────────────
  const { error: bizErr } = await sb.from("businesses").upsert(
    {
      id: BIZ_ID,
      name: BIZ_NAME,
      owner_id: authUserId,
      modules: ["supermarket"],
      location: "Kigali, Rwanda",
      phone: PHONE,
      email: EMAIL,
      plan: "free",
      language: "en",
      currency: "RWF",
      two_factor_enabled: false,
    },
    { onConflict: "id", ignoreDuplicates: false }
  );
  if (!ok("business", bizErr)) process.exit(1);

  // ── 3. Branch ────────────────────────────────────────────────────
  const { error: branchErr } = await sb.from("branches").upsert(
    {
      id: BRANCH_ID,
      business_id: BIZ_ID,
      name: `${BIZ_NAME} — Main Branch`,
      location: "Kigali, Rwanda",
      phone: PHONE,
      is_main: true,
    },
    { onConflict: "id", ignoreDuplicates: false }
  );
  if (!ok("branch", branchErr)) process.exit(1);

  // ── 4. Owner staff record ────────────────────────────────────────
  const { data: existingOwner } = await sb
    .from("staff")
    .select("id")
    .eq("business_id", BIZ_ID)
    .eq("role", "owner")
    .maybeSingle();

  if (existingOwner) {
    // Update user_id in case it's wrong
    const { error: updErr } = await sb
      .from("staff")
      .update({ user_id: authUserId })
      .eq("id", existingOwner.id);
    ok("owner staff (updated user_id)", updErr);
  } else {
    const { error: ownerErr } = await sb.from("staff").insert({
      business_id: BIZ_ID,
      branch_id: BRANCH_ID,
      user_id: authUserId,
      name: `${BIZ_NAME} Owner`,
      email: EMAIL,
      phone: PHONE,
      role: "owner",
      pin: "2002",
      is_active: true,
    });
    if (!ok("owner staff", ownerErr)) process.exit(1);
  }

  // ── 5. Products ──────────────────────────────────────────────────
  const PRODUCTS = [
    { name: "Tomatoes", category: "produce", price: 800, cost_price: 500, quantity: 25,  min_quantity: 5,  unit: "kg",    stock_type: "supermarket" },
    { name: "Avocados", category: "produce", price: 200, cost_price: 120, quantity: 100, min_quantity: 10, unit: "piece", stock_type: "supermarket" },
    { name: "Onions",   category: "produce", price: 600, cost_price: 400, quantity: 30,  min_quantity: 5,  unit: "kg",    stock_type: "supermarket" },
  ];

  for (const p of PRODUCTS) {
    const { error } = await sb.from("products").insert({
      ...p,
      business_id: BIZ_ID,
      branch_id: BRANCH_ID,
      is_active: true,
    });
    if (error && error.code?.includes("23505")) {
      console.log(`  ↩ product ${p.name} already exists`);
    } else {
      ok(`product ${p.name}`, error);
    }
  }

  // ── Done ─────────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(60));
  console.log("✅  Test Fresh Produce ready.\n");
  console.log("  Login:              " + EMAIL);
  console.log("  Password:           " + PASSWORD);
  console.log("  two_factor_enabled: false  (no OTP required)");
  console.log("  Modules:            supermarket");
  console.log("  Products:           Tomatoes · Avocados · Onions");
  console.log("─".repeat(60));
}

run().catch(err => { console.error("Unexpected error:", err); process.exit(1); });
