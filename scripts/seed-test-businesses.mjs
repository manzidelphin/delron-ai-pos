/**
 * Seeds the 4 test businesses into the production Supabase DB.
 * Does NOT touch auth.users — run create-test-users.mjs afterward
 * to link the real Supabase auth UIDs to each owner staff record.
 *
 * Safe to re-run: all inserts use upsert (onConflict: "id") or
 * onConflict: "ignore" where there's no stable unique column.
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://hfjggupbkbudnqplxviq.supabase.co";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmamdndXBia2J1ZG5xcGx4dmlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTQ1MzA5MywiZXhwIjoyMDk3MDI5MDkzfQ.sDxVRUjYEOube85pxwKkT3j1b8BtApaR20UC0Cc4Li0";

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Shared test data ─────────────────────────────────────────────────────────
const BUSINESSES = [
  {
    id: "11000000-0000-0000-0000-000000000002",
    branch_id: "11000000-0000-0000-0000-000000000003",
    name: "Test Bar Restaurant",
    modules: ["bar", "restaurant"],
    email: "testbarrest@delronpos.rw",
    phone: "+250788000001",
    owner_name: "Test BarRest Owner",
    extra_staff: [
      { name: "Uwase (Bartender)", phone: "+250788001001", role: "bartender" },
      { name: "Mugisha (Waiter)",  phone: "+250788001002", role: "waiter" },
    ],
  },
  {
    id: "22000000-0000-0000-0000-000000000002",
    branch_id: "22000000-0000-0000-0000-000000000003",
    name: "Test Super Bakery",
    modules: ["supermarket", "bakery"],
    email: "testsuperbakery@delronpos.rw",
    phone: "+250788000002",
    owner_name: "Test SuperBakery Owner",
    extra_staff: [
      { name: "Ingabire (Cashier)", phone: "+250788002001", role: "cashier" },
      { name: "Habimana (Baker)",   phone: "+250788002002", role: "baker" },
    ],
  },
  {
    id: "33000000-0000-0000-0000-000000000002",
    branch_id: "33000000-0000-0000-0000-000000000003",
    name: "Test Super Bar",
    modules: ["supermarket", "bar"],
    email: "testsuperbar@delronpos.rw",
    phone: "+250788000003",
    owner_name: "Test SuperBar Owner",
    extra_staff: [
      { name: "Nkurunziza (Cashier)", phone: "+250788003001", role: "cashier" },
      { name: "Uwimana (Bartender)",  phone: "+250788003002", role: "bartender" },
    ],
  },
  {
    id: "44000000-0000-0000-0000-000000000002",
    branch_id: "44000000-0000-0000-0000-000000000003",
    name: "Test Super Bakery Bar",
    modules: ["supermarket", "bakery", "bar"],
    email: "testsuperbakerybar@delronpos.rw",
    phone: "+250788000004",
    owner_name: "Test SuperBakeryBar Owner",
    extra_staff: [
      { name: "Mukamurenzi (Cashier)", phone: "+250788004001", role: "cashier" },
      { name: "Bizimana (Baker)",       phone: "+250788004002", role: "baker" },
      { name: "Kayitesi (Bartender)",   phone: "+250788004003", role: "bartender" },
    ],
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function ok(label, error) {
  if (error) { console.error(`  ✗ ${label}: ${error.message}`); return false; }
  console.log(`  ✓ ${label}`);
  return true;
}

// ── Main ─────────────────────────────────────────────────────────────────────
let allOk = true;

for (const biz of BUSINESSES) {
  console.log(`\n→ ${biz.name}`);

  // 1. Business
  const { error: bizErr } = await sb.from("businesses").upsert(
    {
      id: biz.id,
      name: biz.name,
      owner_id: null,          // create-test-users.mjs sets this
      modules: biz.modules,
      location: "Kigali, Rwanda",
      phone: biz.phone,
      email: biz.email,
      plan: "free",
      language: "en",
      currency: "RWF",
    },
    { onConflict: "id", ignoreDuplicates: false }
  );
  if (!ok("business", bizErr)) { allOk = false; continue; }

  // 2. Branch
  const { error: branchErr } = await sb.from("branches").upsert(
    {
      id: biz.branch_id,
      business_id: biz.id,
      name: `${biz.name} — Main Branch`,
      location: "Kigali, Rwanda",
      phone: biz.phone,
      is_main: true,
    },
    { onConflict: "id", ignoreDuplicates: false }
  );
  if (!ok("branch", branchErr)) { allOk = false; continue; }

  // 3. Owner staff record (user_id left null — create-test-users.mjs fills it in)
  // Check if owner row already exists first
  const { data: existingOwner } = await sb
    .from("staff")
    .select("id, user_id")
    .eq("business_id", biz.id)
    .eq("role", "owner")
    .single();

  if (existingOwner) {
    console.log(`  ✓ owner staff row exists (user_id: ${existingOwner.user_id ?? "NULL — will be fixed"})`);
  } else {
    const { error: ownerErr } = await sb.from("staff").insert({
      business_id: biz.id,
      branch_id: biz.branch_id,
      user_id: null,
      name: biz.owner_name,
      email: biz.email,
      phone: biz.phone,
      role: "owner",
      pin: "2002",
      is_active: true,
    });
    if (!ok("owner staff", ownerErr)) { allOk = false; continue; }
  }

  // 4. Extra staff
  for (const s of biz.extra_staff) {
    const { error: staffErr } = await sb.from("staff").insert({
      business_id: biz.id,
      branch_id: biz.branch_id,
      name: s.name,
      phone: s.phone,
      role: s.role,
      pin: "2002",
      is_active: true,
    });
    // Ignore duplicates (re-run safe)
    if (staffErr && !staffErr.message.includes("duplicate") && !staffErr.code?.includes("23505")) {
      ok(`staff ${s.name}`, staffErr);
    } else if (!staffErr) {
      ok(`staff ${s.name}`, null);
    } else {
      console.log(`  ↩ staff ${s.name} already exists`);
    }
  }

  // 5. Bar items (for bar/restaurant businesses)
  if (biz.modules.includes("bar")) {
    const barItems =
      biz.id === "11000000-0000-0000-0000-000000000002"
        ? [
            { name: "Primus Beer",       category: "beer",   price_per_bottle: 600,   price_per_shot: 0,    shots_per_bottle: 0,  quantity_bottles: 48, min_quantity: 6 },
            { name: "Johnnie Walker Red", category: "whisky", price_per_bottle: 18000, price_per_shot: 1500, shots_per_bottle: 12, quantity_bottles: 5,  min_quantity: 2 },
          ]
        : biz.id === "33000000-0000-0000-0000-000000000002"
        ? [
            { name: "Mutzig Beer", category: "beer", price_per_bottle: 700,  price_per_shot: 0,   shots_per_bottle: 0,  quantity_bottles: 60, min_quantity: 10 },
            { name: "Konyagi",     category: "gin",  price_per_bottle: 5000, price_per_shot: 500, shots_per_bottle: 10, quantity_bottles: 8,  min_quantity: 2 },
          ]
        : [
            { name: "Amstel Beer", category: "beer",    price_per_bottle: 650,   price_per_shot: 0,    shots_per_bottle: 0,  quantity_bottles: 72, min_quantity: 12 },
            { name: "Amarula",     category: "liqueur", price_per_bottle: 22000, price_per_shot: 2000, shots_per_bottle: 11, quantity_bottles: 4,  min_quantity: 2 },
          ];

    for (const item of barItems) {
      const { error } = await sb.from("bar_items").insert({
        ...item,
        business_id: biz.id,
        branch_id: biz.branch_id,
        is_active: true,
      });
      if (error && !error.code?.includes("23505")) ok(`bar_item ${item.name}`, error);
      else if (!error) ok(`bar_item ${item.name}`, null);
      else console.log(`  ↩ bar_item ${item.name} already exists`);
    }
  }

  // 6. Tables (for bar/restaurant)
  if (biz.modules.includes("bar") || biz.modules.includes("restaurant")) {
    for (const [num, cap, sec] of [["1", 4, "main"], ["2", 6, "main"], ["3", 2, "terrace"]]) {
      const { error } = await sb.from("floor_tables").insert({
        business_id: biz.id,
        branch_id: biz.branch_id,
        table_number: num,
        capacity: cap,
        section: sec,
        status: "empty",
      });
      if (error && !error.code?.includes("23505")) ok(`table ${num}`, error);
    }
    ok("tables inserted", null);
  }

  // 7. Supermarket products
  if (biz.modules.includes("supermarket")) {
    const products =
      biz.id === "22000000-0000-0000-0000-000000000002"
        ? [
            { name: "Inyange Milk 1L",     category: "dairy",     price: 800,  cost_price: 600, quantity: 100, min_quantity: 10, unit: "litre",  stock_type: "supermarket" },
            { name: "Azam Spaghetti 500g", category: "dry goods", price: 700,  cost_price: 500, quantity: 80,  min_quantity: 10, unit: "packet", stock_type: "supermarket" },
          ]
        : biz.id === "33000000-0000-0000-0000-000000000002"
        ? [
            { name: "Coca-Cola 500ml",  category: "beverages", price: 500,  cost_price: 350,  quantity: 120, min_quantity: 12, unit: "bottle", stock_type: "supermarket" },
            { name: "Pringles Original",category: "snacks",    price: 2500, cost_price: 1800, quantity: 40,  min_quantity: 5,  unit: "can",    stock_type: "supermarket" },
          ]
        : [
            { name: "Blue Band 250g", category: "dairy",     price: 900,  cost_price: 650, quantity: 60,  min_quantity: 8,  unit: "packet", stock_type: "supermarket" },
            { name: "Sugar 1kg",      category: "dry goods", price: 1100, cost_price: 800, quantity: 200, min_quantity: 20, unit: "kg",     stock_type: "supermarket" },
          ];

    for (const p of products) {
      const { error } = await sb.from("products").insert({
        ...p,
        business_id: biz.id,
        branch_id: biz.branch_id,
        is_active: true,
      });
      if (error && !error.code?.includes("23505")) ok(`product ${p.name}`, error);
      else if (!error) ok(`product ${p.name}`, null);
      else console.log(`  ↩ product ${p.name} already exists`);
    }
  }

  // 8. Raw materials + finished goods (bakery)
  if (biz.modules.includes("bakery")) {
    const { error: rmErr } = await sb.from("raw_materials").insert({
      business_id: biz.id,
      branch_id: biz.branch_id,
      name: "Flour",
      unit: "kg",
      quantity: biz.id === "44000000-0000-0000-0000-000000000002" ? 100 : 50,
      min_quantity: biz.id === "44000000-0000-0000-0000-000000000002" ? 10 : 5,
      cost_per_unit: 800,
    });
    if (rmErr && !rmErr.code?.includes("23505")) ok("raw_material Flour", rmErr);
    else ok("raw_material Flour", null);

    const goods =
      biz.id === "44000000-0000-0000-0000-000000000002"
        ? [
            { name: "Bread Loaf", selling_price: 800, cost_price: 400, quantity: 40, unit: "loaf",  category: "bakery" },
            { name: "Croissant",  selling_price: 600, cost_price: 250, quantity: 25, unit: "piece", category: "pastry" },
          ]
        : [
            { name: "Bread Loaf",      selling_price: 800, cost_price: 400, quantity: 30, unit: "loaf", category: "bakery" },
            { name: "Mandazi (6 pcs)", selling_price: 500, cost_price: 200, quantity: 50, unit: "pack", category: "pastry" },
          ];

    for (const g of goods) {
      const { error } = await sb.from("finished_goods").insert({
        ...g,
        business_id: biz.id,
        branch_id: biz.branch_id,
        is_active: true,
      });
      if (error && !error.code?.includes("23505")) ok(`finished_good ${g.name}`, error);
      else if (!error) ok(`finished_good ${g.name}`, null);
      else console.log(`  ↩ finished_good ${g.name} already exists`);
    }
  }

  // 9. Restaurant raw material + menu item (only for bar+restaurant biz)
  if (biz.modules.includes("restaurant")) {
    const { data: rm, error: rmErr } = await sb
      .from("raw_materials")
      .insert({
        business_id: biz.id,
        branch_id: biz.branch_id,
        name: "Chicken",
        unit: "kg",
        quantity: 10,
        min_quantity: 2,
        cost_per_unit: 3500,
      })
      .select("id")
      .single();
    if (rmErr && !rmErr.code?.includes("23505")) { ok("raw_material Chicken", rmErr); }
    else {
      ok("raw_material Chicken", null);
      if (rm) {
        const { data: mi, error: miErr } = await sb
          .from("menu_items")
          .insert({
            business_id: biz.id,
            branch_id: biz.branch_id,
            name: "Grilled Chicken",
            category: "main",
            selling_price: 5500,
            cost_price: 3500,
            prep_time_minutes: 20,
            is_active: true,
          })
          .select("id")
          .single();
        if (!miErr && mi) {
          await sb.from("menu_recipes").insert({
            menu_item_id: mi.id,
            raw_material_id: rm.id,
            quantity_needed: 0.5,
            unit: "kg",
          });
          ok("menu_item + recipe", null);
        }
      }
    }
  }
}

console.log("\n" + "─".repeat(60));
if (allOk) {
  console.log("✅ All 4 test businesses seeded.");
  console.log("\nNext step — link auth UIDs to staff records:");
  console.log("  node scripts/create-test-users.mjs");
} else {
  console.log("⚠️  Some businesses failed — review errors above.");
  process.exit(1);
}
