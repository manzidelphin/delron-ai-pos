/**
 * Seed "Client Three Test" — fruits/vegetables/groceries shop, single cashier.
 * Safe to re-run: upserts where stable IDs exist, SELECT-before-INSERT elsewhere.
 *
 * Usage:  node scripts/seed-client-three.mjs
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://hfjggupbkbudnqplxviq.supabase.co";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmamdndXBia2J1ZG5xcGx4dmlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTQ1MzA5MywiZXhwIjoyMDk3MDI5MDkzfQ.sDxVRUjYEOube85pxwKkT3j1b8BtApaR20UC0Cc4Li0";

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BIZ_ID    = "c3000000-0000-0000-0000-000000000002";
const BRANCH_ID = "c3000000-0000-0000-0000-000000000003";
const EMAIL     = "client3@delronpos.rw";
const PASSWORD  = "Delron@2002";

function ok(label, error) {
  if (error) { console.error(`  ✗ ${label}: ${error.message}`); return false; }
  console.log(`  ✓ ${label}`);
  return true;
}

async function run() {
  let allOk = true;

  // ── 1. Business ───────────────────────────────────────────────────────────
  console.log("\n→ Business");
  const { error: bizErr } = await sb.from("businesses").upsert(
    {
      id: BIZ_ID,
      name: "Client Three Test",
      owner_id: null,
      modules: ["supermarket"],
      location: "Kigali, Rwanda",
      phone: "+250788099003",
      email: EMAIL,
      plan: "free",
      language: "en",
      currency: "RWF",
      two_factor_enabled: false,
    },
    { onConflict: "id", ignoreDuplicates: false }
  );
  if (!ok("business", bizErr)) { allOk = false; }

  // ── 2. Branch ─────────────────────────────────────────────────────────────
  console.log("\n→ Branch");
  const { error: branchErr } = await sb.from("branches").upsert(
    {
      id: BRANCH_ID,
      business_id: BIZ_ID,
      name: "Client Three Test — Main Branch",
      location: "Kigali, Rwanda",
      phone: "+250788099003",
      is_main: true,
    },
    { onConflict: "id", ignoreDuplicates: false }
  );
  if (!ok("branch", branchErr)) { allOk = false; }

  // ── 3. Auth user (owner) ─────────────────────────────────────────────────
  console.log("\n→ Auth user");
  let authUserId;

  const { data: created, error: createErr } = await sb.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name: "Client Three Owner" },
  });

  if (createErr) {
    if (createErr.message?.toLowerCase().includes("already")) {
      const { data: list } = await sb.auth.admin.listUsers({ perPage: 1000 });
      const existing = list?.users?.find((u) => u.email === EMAIL);
      if (!existing) {
        console.error(`  ✗ auth user: ${createErr.message}`);
        allOk = false;
      } else {
        authUserId = existing.id;
        console.log(`  ↩ already exists (id: ${authUserId})`);
      }
    } else {
      console.error(`  ✗ auth user: ${createErr.message}`);
      allOk = false;
    }
  } else {
    authUserId = created.user.id;
    console.log(`  ✓ created (id: ${authUserId})`);
  }

  if (!authUserId) { console.error("\nAbort: no auth UID."); process.exit(1); }

  // ── 4. Link owner_id on businesses ───────────────────────────────────────
  const { error: ownerLinkErr } = await sb
    .from("businesses")
    .update({ owner_id: authUserId })
    .eq("id", BIZ_ID);
  if (!ok("businesses.owner_id", ownerLinkErr)) allOk = false;

  // ── 5. Owner staff row ────────────────────────────────────────────────────
  console.log("\n→ Owner staff");
  const { data: existingOwner } = await sb
    .from("staff")
    .select("id")
    .eq("business_id", BIZ_ID)
    .eq("role", "owner")
    .maybeSingle();

  if (existingOwner) {
    await sb.from("staff").update({ user_id: authUserId }).eq("id", existingOwner.id);
    console.log(`  ↩ owner row exists — user_id updated`);
  } else {
    const { error: ownerStaffErr } = await sb.from("staff").insert({
      business_id: BIZ_ID,
      branch_id: BRANCH_ID,
      user_id: authUserId,
      name: "Client Three Owner",
      email: EMAIL,
      phone: "+250788099003",
      role: "owner",
      pin: "2002",
      is_active: true,
    });
    if (!ok("owner staff", ownerStaffErr)) allOk = false;
  }

  // ── 6. Single shift staff ─────────────────────────────────────────────────
  console.log("\n→ Shift staff");
  const { data: existingJoseph } = await sb
    .from("staff")
    .select("id")
    .eq("business_id", BIZ_ID)
    .eq("name", "Cashier Joseph")
    .maybeSingle();

  if (existingJoseph) {
    console.log("  ↩ staff Cashier Joseph already exists");
  } else {
    const { error } = await sb.from("staff").insert({
      business_id: BIZ_ID,
      branch_id: BRANCH_ID,
      name: "Cashier Joseph",
      phone: "+250788099031",
      role: "cashier",
      pin: "2002",
      is_active: true,
    });
    if (error) { ok("staff Cashier Joseph", error); allOk = false; }
    else ok("staff Cashier Joseph", null);
  }

  // ── 7. Products ───────────────────────────────────────────────────────────
  console.log("\n→ Products");
  const products = [
    // Weight-based produce (kg) — cart shows decimal input
    { name: "Tomatoes",       category: "fresh produce", price: 800,  cost_price: 400,  quantity: 25,  min_quantity: 3,  unit: "kg"     },
    { name: "Onions",         category: "fresh produce", price: 600,  cost_price: 300,  quantity: 30,  min_quantity: 3,  unit: "kg"     },
    { name: "Bananas",        category: "fresh produce", price: 500,  cost_price: 250,  quantity: 40,  min_quantity: 5,  unit: "kg"     },
    { name: "Irish Potatoes", category: "fresh produce", price: 700,  cost_price: 350,  quantity: 50,  min_quantity: 5,  unit: "kg"     },
    // Piece-based produce — cart shows +/- stepper
    { name: "Avocados",       category: "fresh produce", price: 200,  cost_price: 80,   quantity: 100, min_quantity: 10, unit: "piece"  },
    { name: "Eggs",           category: "fresh produce", price: 150,  cost_price: 80,   quantity: 200, min_quantity: 20, unit: "piece"  },
    { name: "Cabbage",        category: "fresh produce", price: 500,  cost_price: 200,  quantity: 20,  min_quantity: 3,  unit: "piece"  },
    // Packaged groceries — cart shows +/- stepper
    { name: "Salt 1kg",       category: "groceries",     price: 500,  cost_price: 300,  quantity: 40,  min_quantity: 5,  unit: "packet" },
    { name: "Cooking Oil 1L", category: "groceries",     price: 3500, cost_price: 2500, quantity: 25,  min_quantity: 5,  unit: "bottle" },
    { name: "Soap",           category: "groceries",     price: 800,  cost_price: 500,  quantity: 50,  min_quantity: 8,  unit: "packet" },
  ];

  for (const p of products) {
    const { data: existing } = await sb
      .from("products")
      .select("id")
      .eq("business_id", BIZ_ID)
      .eq("name", p.name)
      .maybeSingle();
    if (existing) { console.log(`  ↩ product ${p.name} already exists`); continue; }

    const { error } = await sb.from("products").insert({
      ...p,
      business_id: BIZ_ID,
      branch_id: BRANCH_ID,
      stock_type: "supermarket",
      is_active: true,
    });
    if (error) { ok(`product ${p.name}`, error); allOk = false; }
    else ok(`product ${p.name}`, null);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(60));
  if (allOk) {
    console.log("✅ Client Three Test seeded successfully.\n");
    console.log("  Owner login:");
    console.log(`    Email:    ${EMAIL}`);
    console.log(`    Password: ${PASSWORD}`);
    console.log("\n  Staff (PIN: 2002):");
    console.log("    Cashier Joseph  — cashier  → /supermarket/pos");
    console.log("    Client Three Owner — owner  → dashboard");
    console.log("\n  Products seeded (10 items):");
    console.log("    Weight-based (kg — decimal input in cart):");
    console.log("      Tomatoes RWF 800/kg  · Onions RWF 600/kg");
    console.log("      Bananas  RWF 500/kg  · Irish Potatoes RWF 700/kg");
    console.log("    Piece-based (piece — +/- stepper in cart):");
    console.log("      Avocados RWF 200  · Eggs RWF 150  · Cabbage RWF 500");
    console.log("    Packaged (packet/bottle — +/- stepper in cart):");
    console.log("      Salt 1kg RWF 500  · Cooking Oil 1L RWF 3,500  · Soap RWF 800");
  } else {
    console.log("⚠️  Some steps failed — review errors above.");
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
