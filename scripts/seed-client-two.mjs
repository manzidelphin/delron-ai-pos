/**
 * Seed "Client Two Test" — bar + restaurant, 6 shift staff (2 per role), full catalog.
 * Safe to re-run: upserts where stable IDs exist, skips duplicates elsewhere.
 *
 * Usage:  node scripts/seed-client-two.mjs
 *
 * PRE-REQUISITE: Run supabase/migrations/add_chef_role.sql first if the staff
 * table has a role check constraint that doesn't already include 'chef'.
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://hfjggupbkbudnqplxviq.supabase.co";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmamdndXBia2J1ZG5xcGx4dmlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTQ1MzA5MywiZXhwIjoyMDk3MDI5MDkzfQ.sDxVRUjYEOube85pxwKkT3j1b8BtApaR20UC0Cc4Li0";

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BIZ_ID    = "c2000000-0000-0000-0000-000000000002";
const BRANCH_ID = "c2000000-0000-0000-0000-000000000003";
const EMAIL     = "client2@delronpos.rw";
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
      name: "Client Two Test",
      owner_id: null,
      modules: ["bar", "restaurant"],
      location: "Kigali, Rwanda",
      phone: "+250788099002",
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
      name: "Client Two Test — Main Branch",
      location: "Kigali, Rwanda",
      phone: "+250788099002",
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
    user_metadata: { name: "Client Two Owner" },
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
      name: "Client Two Owner",
      email: EMAIL,
      phone: "+250788099002",
      role: "owner",
      pin: "2002",
      is_active: true,
    });
    if (!ok("owner staff", ownerStaffErr)) allOk = false;
  }

  // ── 6. Shift staff ────────────────────────────────────────────────────────
  console.log("\n→ Shift staff");
  const shiftStaff = [
    { name: "Bartender Morning", role: "bartender", phone: "+250788099021" },
    { name: "Bartender Evening", role: "bartender", phone: "+250788099022" },
    { name: "Waiter Morning",    role: "waiter",    phone: "+250788099023" },
    { name: "Waiter Evening",    role: "waiter",    phone: "+250788099024" },
    { name: "Chef Morning",      role: "chef",      phone: "+250788099025" },
    { name: "Chef Evening",      role: "chef",      phone: "+250788099026" },
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

  // ── 7. Bar items ──────────────────────────────────────────────────────────
  console.log("\n→ Bar items");
  const barItems = [
    { name: "Primus Beer",  category: "beer", price_per_bottle: 600,  price_per_shot: 0, shots_per_bottle: 0, quantity_bottles: 60, min_quantity: 10 },
    { name: "Mutzig Beer",  category: "beer", price_per_bottle: 1000, price_per_shot: 0, shots_per_bottle: 0, quantity_bottles: 40, min_quantity: 8  },
    { name: "Fanta Orange", category: "soda", price_per_bottle: 500,  price_per_shot: 0, shots_per_bottle: 0, quantity_bottles: 50, min_quantity: 12 },
  ];

  for (const item of barItems) {
    const { error } = await sb.from("bar_items").insert({
      ...item,
      business_id: BIZ_ID,
      branch_id: BRANCH_ID,
      is_active: true,
    });
    if (error && !isDupe(error)) { ok(`bar_item ${item.name}`, error); allOk = false; }
    else if (!error) ok(`bar_item ${item.name}`, null);
    else console.log(`  ↩ bar_item ${item.name} already exists`);
  }

  // ── 8. Raw materials (for restaurant recipes) ─────────────────────────────
  console.log("\n→ Raw materials");
  const rawMaterials = [
    { name: "Beef",    unit: "kg",     quantity: 10, min_quantity: 2, cost_per_unit: 4000 },
    { name: "Charcoal",unit: "kg",     quantity: 20, min_quantity: 5, cost_per_unit: 500  },
    { name: "Potato",  unit: "kg",     quantity: 15, min_quantity: 3, cost_per_unit: 400  },
    { name: "Tilapia", unit: "kg",     quantity: 8,  min_quantity: 2, cost_per_unit: 5000 },
  ];

  const rmIds = {};
  for (const r of rawMaterials) {
    const { data, error } = await sb
      .from("raw_materials")
      .insert({ ...r, business_id: BIZ_ID, branch_id: BRANCH_ID })
      .select("id")
      .single();
    if (error && !isDupe(error)) { ok(`raw_material ${r.name}`, error); allOk = false; }
    else if (!error) { ok(`raw_material ${r.name}`, null); rmIds[r.name] = data.id; }
    else {
      console.log(`  ↩ raw_material ${r.name} already exists`);
      const { data: existing } = await sb
        .from("raw_materials")
        .select("id")
        .eq("business_id", BIZ_ID)
        .eq("name", r.name)
        .maybeSingle();
      if (existing) rmIds[r.name] = existing.id;
    }
  }

  // ── 9. Menu items ─────────────────────────────────────────────────────────
  console.log("\n→ Menu items");
  const menuItems = [
    { name: "Brochette",    category: "grill",  selling_price: 3000, cost_price: 1000, prep_time_minutes: 20 },
    { name: "Chips",        category: "sides",  selling_price: 1500, cost_price: 500,  prep_time_minutes: 10 },
    { name: "Grilled Fish", category: "grill",  selling_price: 4500, cost_price: 2100, prep_time_minutes: 25 },
  ];

  const menuIds = {};
  for (const m of menuItems) {
    const { data, error } = await sb
      .from("menu_items")
      .insert({ ...m, business_id: BIZ_ID, branch_id: BRANCH_ID, is_active: true })
      .select("id")
      .single();
    if (error && !isDupe(error)) { ok(`menu_item ${m.name}`, error); allOk = false; }
    else if (!error) { ok(`menu_item ${m.name}`, null); menuIds[m.name] = data.id; }
    else {
      console.log(`  ↩ menu_item ${m.name} already exists`);
      const { data: existing } = await sb
        .from("menu_items")
        .select("id")
        .eq("business_id", BIZ_ID)
        .eq("name", m.name)
        .maybeSingle();
      if (existing) menuIds[m.name] = existing.id;
    }
  }

  // ── 10. Menu recipes ──────────────────────────────────────────────────────
  console.log("\n→ Menu recipes");

  // Brochette → Beef 200g + Charcoal 100g
  if (menuIds["Brochette"] && rmIds["Beef"] && rmIds["Charcoal"]) {
    const { data: existing } = await sb
      .from("menu_recipes")
      .select("id")
      .eq("menu_item_id", menuIds["Brochette"])
      .limit(1);
    if (!existing?.length) {
      const { error } = await sb.from("menu_recipes").insert([
        { menu_item_id: menuIds["Brochette"], raw_material_id: rmIds["Beef"],    quantity_needed: 0.2, unit: "kg" },
        { menu_item_id: menuIds["Brochette"], raw_material_id: rmIds["Charcoal"],quantity_needed: 0.1, unit: "kg" },
      ]);
      ok("recipe Brochette (Beef + Charcoal)", error);
      if (error) allOk = false;
    } else {
      console.log("  ↩ Brochette recipe already exists");
    }
  }

  // Chips → Potato 300g
  if (menuIds["Chips"] && rmIds["Potato"]) {
    const { data: existing } = await sb
      .from("menu_recipes")
      .select("id")
      .eq("menu_item_id", menuIds["Chips"])
      .limit(1);
    if (!existing?.length) {
      const { error } = await sb.from("menu_recipes").insert([
        { menu_item_id: menuIds["Chips"], raw_material_id: rmIds["Potato"], quantity_needed: 0.3, unit: "kg" },
      ]);
      ok("recipe Chips (Potato)", error);
      if (error) allOk = false;
    } else {
      console.log("  ↩ Chips recipe already exists");
    }
  }

  // Grilled Fish → Tilapia 400g + Charcoal 100g
  if (menuIds["Grilled Fish"] && rmIds["Tilapia"] && rmIds["Charcoal"]) {
    const { data: existing } = await sb
      .from("menu_recipes")
      .select("id")
      .eq("menu_item_id", menuIds["Grilled Fish"])
      .limit(1);
    if (!existing?.length) {
      const { error } = await sb.from("menu_recipes").insert([
        { menu_item_id: menuIds["Grilled Fish"], raw_material_id: rmIds["Tilapia"],  quantity_needed: 0.4, unit: "kg" },
        { menu_item_id: menuIds["Grilled Fish"], raw_material_id: rmIds["Charcoal"], quantity_needed: 0.1, unit: "kg" },
      ]);
      ok("recipe Grilled Fish (Tilapia + Charcoal)", error);
      if (error) allOk = false;
    } else {
      console.log("  ↩ Grilled Fish recipe already exists");
    }
  }

  // ── 11. Floor tables ──────────────────────────────────────────────────────
  console.log("\n→ Floor tables");
  const tables = [
    { table_number: "1", capacity: 4, section: "main",    status: "empty" },
    { table_number: "2", capacity: 6, section: "main",    status: "empty" },
    { table_number: "3", capacity: 4, section: "terrace", status: "empty" },
    { table_number: "4", capacity: 2, section: "vip",     status: "empty" },
  ];

  for (const t of tables) {
    const { error } = await sb.from("floor_tables").insert({
      ...t,
      business_id: BIZ_ID,
      branch_id: BRANCH_ID,
    });
    if (error && !isDupe(error)) { ok(`table ${t.table_number} (${t.section})`, error); allOk = false; }
    else if (!error) ok(`table ${t.table_number} (${t.section})`, null);
    else console.log(`  ↩ table ${t.table_number} already exists`);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(60));
  if (allOk) {
    console.log("✅ Client Two Test seeded successfully.\n");
    console.log("  Owner login:");
    console.log(`    Email:    ${EMAIL}`);
    console.log(`    Password: ${PASSWORD}`);
    console.log("\n  Staff (all PIN: 2002):");
    console.log("    Bartender Morning  — bartender  → /bar/pos");
    console.log("    Bartender Evening  — bartender  → /bar/pos");
    console.log("    Waiter Morning     — waiter     → /bar/tables");
    console.log("    Waiter Evening     — waiter     → /bar/tables");
    console.log("    Chef Morning       — chef       → /restaurant/kds  (no opening cash)");
    console.log("    Chef Evening       — chef       → /restaurant/kds  (no opening cash)");
    console.log("\n  Bar items seeded:");
    console.log("    Primus Beer  — RWF 600  — qty 60");
    console.log("    Mutzig Beer  — RWF 1000 — qty 40");
    console.log("    Fanta Orange — RWF 500  — qty 50");
    console.log("\n  Menu items + recipes:");
    console.log("    Brochette    — RWF 3000  (Beef 200g + Charcoal 100g)");
    console.log("    Chips        — RWF 1500  (Potato 300g)");
    console.log("    Grilled Fish — RWF 4500  (Tilapia 400g + Charcoal 100g)");
    console.log("\n  Floor tables:");
    console.log("    Table 1 (main, cap 4)  Table 2 (main, cap 6)");
    console.log("    Table 3 (terrace, cap 4)  Table 4 (VIP, cap 2)");
    console.log("\n  Chef shift behaviour:");
    console.log("    ✓ End Shift button shows (added to SHIFT_ROLES)");
    console.log("    ✓ Opening Cash prompt skipped (not in CASH_ROLES)");
    console.log("    ✓ Redirects to /restaurant/kds on PIN login");
  } else {
    console.log("⚠️  Some steps failed — review errors above.");
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
