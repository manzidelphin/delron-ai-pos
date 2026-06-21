/**
 * Seed "Client One Test" — supermarket + bakery, 4 shift staff, full product catalog.
 * Safe to re-run: upserts where stable IDs exist, skips duplicates elsewhere.
 *
 * Usage:  node scripts/seed-client-one.mjs
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://hfjggupbkbudnqplxviq.supabase.co";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmamdndXBia2J1ZG5xcGx4dmlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTQ1MzA5MywiZXhwIjoyMDk3MDI5MDkzfQ.sDxVRUjYEOube85pxwKkT3j1b8BtApaR20UC0Cc4Li0";

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BIZ_ID    = "c1000000-0000-0000-0000-000000000002";
const BRANCH_ID = "c1000000-0000-0000-0000-000000000003";
const EMAIL     = "client1@delronpos.rw";
const PASSWORD  = "Delron@2002";

function ok(label, error) {
  if (error) { console.error(`  ✗ ${label}: ${error.message}`); return false; }
  console.log(`  ✓ ${label}`);
  return true;
}

function isDupe(error) {
  return error?.code?.includes("23505") || error?.message?.toLowerCase().includes("duplicate");
}

async function run() {
  let allOk = true;

  // ── 1. Business ───────────────────────────────────────────────────────────
  console.log("\n→ Business");
  const { error: bizErr } = await sb.from("businesses").upsert(
    {
      id: BIZ_ID,
      name: "Client One Test",
      owner_id: null,
      modules: ["supermarket", "bakery"],
      location: "Kigali, Rwanda",
      phone: "+250788099001",
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
      name: "Client One Test — Main Branch",
      location: "Kigali, Rwanda",
      phone: "+250788099001",
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
    user_metadata: { name: "Client One Owner" },
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
      name: "Client One Owner",
      email: EMAIL,
      phone: "+250788099001",
      role: "owner",
      pin: "2002",
      is_active: true,
    });
    if (!ok("owner staff", ownerStaffErr)) allOk = false;
  }

  // ── 6. Shift staff ────────────────────────────────────────────────────────
  console.log("\n→ Shift staff");
  const shiftStaff = [
    { name: "Cashier Morning", role: "cashier", phone: "+250788099011" },
    { name: "Cashier Evening", role: "cashier", phone: "+250788099012" },
    { name: "Baker Morning",   role: "baker",   phone: "+250788099013" },
    { name: "Baker Evening",   role: "baker",   phone: "+250788099014" },
  ];

  for (const s of shiftStaff) {
    const { data: existing } = await sb
      .from("staff")
      .select("id")
      .eq("business_id", BIZ_ID)
      .eq("name", s.name)
      .maybeSingle();
    if (existing) { console.log(`  ↩ staff ${s.name} already exists`); continue; }

    const { error } = await sb.from("staff").insert({
      business_id: BIZ_ID,
      branch_id: BRANCH_ID,
      name: s.name,
      phone: s.phone,
      role: s.role,
      pin: "2002",
      is_active: true,
    });
    if (error) { ok(`staff ${s.name}`, error); allOk = false; }
    else ok(`staff ${s.name}`, null);
  }

  // ── 7. Supermarket products ───────────────────────────────────────────────
  console.log("\n→ Supermarket products");
  const superProducts = [
    { name: "Rice 5kg",        category: "dry goods",  price: 5000, cost_price: 3500, quantity: 40, min_quantity: 5,  unit: "bag"    },
    { name: "Cooking Oil 1L",  category: "cooking",    price: 3500, cost_price: 2500, quantity: 30, min_quantity: 5,  unit: "bottle" },
    { name: "Sugar 1kg",       category: "dry goods",  price: 1200, cost_price: 800,  quantity: 50, min_quantity: 10, unit: "kg"     },
  ];

  for (const p of superProducts) {
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

  // ── 8. Bakery finished goods ──────────────────────────────────────────────
  console.log("\n→ Bakery finished goods");
  const finishedGoods = [
    { name: "Bread Loaf", selling_price: 800, cost_price: 400, quantity: 30, unit: "loaf",  category: "bakery" },
    { name: "Mandazi",    selling_price: 500, cost_price: 200, quantity: 60, unit: "piece", category: "pastry" },
  ];

  const goodIds = {};
  for (const g of finishedGoods) {
    const { data: existing } = await sb
      .from("finished_goods")
      .select("id")
      .eq("business_id", BIZ_ID)
      .eq("name", g.name)
      .maybeSingle();
    if (existing) { console.log(`  ↩ finished_good ${g.name} already exists`); goodIds[g.name] = existing.id; continue; }

    const { data, error } = await sb
      .from("finished_goods")
      .insert({ ...g, business_id: BIZ_ID, branch_id: BRANCH_ID, is_active: true })
      .select("id")
      .single();
    if (error) { ok(`finished_good ${g.name}`, error); allOk = false; }
    else { ok(`finished_good ${g.name}`, null); goodIds[g.name] = data.id; }
  }

  // ── 9. Bakery raw materials ───────────────────────────────────────────────
  console.log("\n→ Bakery raw materials");
  const rawMaterials = [
    { name: "Flour", unit: "kg", quantity: 100, min_quantity: 10, cost_per_unit: 800  },
    { name: "Yeast", unit: "kg", quantity: 5,   min_quantity: 1,  cost_per_unit: 5000 },
    { name: "Sugar", unit: "kg", quantity: 20,  min_quantity: 5,  cost_per_unit: 1100 },
  ];

  const rmIds = {};
  for (const r of rawMaterials) {
    const { data: existing } = await sb
      .from("raw_materials")
      .select("id")
      .eq("business_id", BIZ_ID)
      .eq("name", r.name)
      .maybeSingle();
    if (existing) { console.log(`  ↩ raw_material ${r.name} already exists`); rmIds[r.name] = existing.id; continue; }

    const { data, error } = await sb
      .from("raw_materials")
      .insert({ ...r, business_id: BIZ_ID, branch_id: BRANCH_ID })
      .select("id")
      .single();
    if (error) { ok(`raw_material ${r.name}`, error); allOk = false; }
    else { ok(`raw_material ${r.name}`, null); rmIds[r.name] = data.id; }
  }

  // ── 10. Recipe: Bread Loaf → Flour + Yeast ───────────────────────────────
  console.log("\n→ Recipe (Bread Loaf)");
  const breadId = goodIds["Bread Loaf"];
  const flourId = rmIds["Flour"];
  const yeastId = rmIds["Yeast"];

  if (!breadId || !flourId || !yeastId) {
    console.log("  ⚠ Skipping recipe — missing IDs (likely already existed above)");
    // Try linking via existing lookup
  } else {
    // Check if recipe already exists
    const { data: existingRecipe } = await sb
      .from("recipes")
      .select("id")
      .eq("business_id", BIZ_ID)
      .eq("finished_good_id", breadId)
      .maybeSingle();

    let recipeId;
    if (existingRecipe) {
      recipeId = existingRecipe.id;
      console.log(`  ↩ recipe already exists`);
    } else {
      const { data: recipe, error: recipeErr } = await sb
        .from("recipes")
        .insert({
          business_id: BIZ_ID,
          finished_good_id: breadId,
          name: "Standard Bread Loaf",
          yield_quantity: 1,
          yield_unit: "loaf",
          instructions: "Mix flour and yeast, knead, proof, bake at 200°C for 35 minutes.",
        })
        .select("id")
        .single();
      if (!ok("recipe", recipeErr)) { allOk = false; }
      else recipeId = recipe.id;
    }

    if (recipeId) {
      // Check if ingredients already seeded
      const { data: existingIngr } = await sb
        .from("recipe_ingredients")
        .select("id")
        .eq("recipe_id", recipeId)
        .limit(1);

      if (existingIngr?.length > 0) {
        console.log("  ↩ recipe ingredients already exist");
      } else {
        const ingredients = [
          { recipe_id: recipeId, raw_material_id: flourId, quantity_needed: 0.5,  unit: "kg" },
          { recipe_id: recipeId, raw_material_id: yeastId, quantity_needed: 0.007, unit: "kg" },
        ];
        const { error: ingrErr } = await sb.from("recipe_ingredients").insert(ingredients);
        if (!ok("recipe_ingredients (Flour + Yeast)", ingrErr)) allOk = false;
      }
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(60));
  if (allOk) {
    console.log("✅ Client One Test seeded successfully.\n");
    console.log("  Owner login:");
    console.log(`    Email:    ${EMAIL}`);
    console.log(`    Password: ${PASSWORD}`);
    console.log("\n  Staff (all PIN: 2002):");
    console.log("    Cashier Morning  — cashier");
    console.log("    Cashier Evening  — cashier");
    console.log("    Baker Morning    — baker");
    console.log("    Baker Evening    — baker");
    console.log("\n  Products seeded:");
    console.log("    Supermarket: Rice 5kg, Cooking Oil 1L, Sugar 1kg");
    console.log("    Finished:    Bread Loaf, Mandazi");
    console.log("    Raw mats:    Flour, Yeast, Sugar");
    console.log("    Recipe:      Bread Loaf → 500g Flour + 7g Yeast");
  } else {
    console.log("⚠️  Some steps failed — review errors above.");
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
