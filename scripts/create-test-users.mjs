import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://hfjggupbkbudnqplxviq.supabase.co";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmamdndXBia2J1ZG5xcGx4dmlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTQ1MzA5MywiZXhwIjoyMDk3MDI5MDkzfQ.sDxVRUjYEOube85pxwKkT3j1b8BtApaR20UC0Cc4Li0";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// These UUIDs match what was seeded by seed_test_businesses.sql
const TEST_USERS = [
  {
    email: "testbarrest@delronpos.rw",
    password: "Delron@2002",
    name: "Test BarRest Owner",
    bizId: "11000000-0000-0000-0000-000000000002",
    oldUserId: "11000000-0000-0000-0000-000000000001",
  },
  {
    email: "testsuperbakery@delronpos.rw",
    password: "Delron@2002",
    name: "Test SuperBakery Owner",
    bizId: "22000000-0000-0000-0000-000000000002",
    oldUserId: "22000000-0000-0000-0000-000000000001",
  },
  {
    email: "testsuperbar@delronpos.rw",
    password: "Delron@2002",
    name: "Test SuperBar Owner",
    bizId: "33000000-0000-0000-0000-000000000002",
    oldUserId: "33000000-0000-0000-0000-000000000001",
  },
  {
    email: "testsuperbakerybar@delronpos.rw",
    password: "Delron@2002",
    name: "Test SuperBakeryBar Owner",
    bizId: "44000000-0000-0000-0000-000000000002",
    oldUserId: "44000000-0000-0000-0000-000000000001",
  },
];

async function run() {
  let allOk = true;

  for (const user of TEST_USERS) {
    process.stdout.write(`\n→ ${user.email} ... `);

    // 1. Check if auth user already exists (by email search isn't available,
    //    so try creating and handle duplicate gracefully)
    const { data: created, error: createErr } =
      await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: { name: user.name },
      });

    let authUserId;

    if (createErr) {
      // If it's a duplicate, fetch the existing user via listUsers
      if (createErr.message?.toLowerCase().includes("already")) {
        const { data: list } = await supabase.auth.admin.listUsers({
          perPage: 1000,
        });
        const existing = list?.users?.find((u) => u.email === user.email);
        if (!existing) {
          console.log(`FAIL — ${createErr.message}`);
          allOk = false;
          continue;
        }
        authUserId = existing.id;
        console.log(`already exists (id: ${authUserId}), updating links...`);
      } else {
        console.log(`FAIL — ${createErr.message}`);
        allOk = false;
        continue;
      }
    } else {
      authUserId = created.user.id;
      console.log(`created (id: ${authUserId})`);
    }

    // 2. Update businesses.owner_id
    const { error: bizErr } = await supabase
      .from("businesses")
      .update({ owner_id: authUserId })
      .eq("id", user.bizId);

    if (bizErr) {
      console.log(`  ✗ businesses.owner_id update failed: ${bizErr.message}`);
      allOk = false;
      continue;
    }
    console.log(`  ✓ businesses.owner_id → ${authUserId}`);

    // 3. Update the owner staff record (matches by bizId + role='owner')
    const { error: staffErr } = await supabase
      .from("staff")
      .update({ user_id: authUserId })
      .eq("business_id", user.bizId)
      .eq("role", "owner");

    if (staffErr) {
      console.log(`  ✗ staff.user_id update failed: ${staffErr.message}`);
      allOk = false;
      continue;
    }
    console.log(`  ✓ staff.user_id (owner row) → ${authUserId}`);
  }

  console.log("\n" + "─".repeat(60));
  if (allOk) {
    console.log("✅ All 4 users ready. Login credentials:");
    console.log("   testbarrest@delronpos.rw        Delron@2002  (bar + restaurant)");
    console.log("   testsuperbakery@delronpos.rw    Delron@2002  (supermarket + bakery)");
    console.log("   testsuperbar@delronpos.rw       Delron@2002  (supermarket + bar)");
    console.log("   testsuperbakerybar@delronpos.rw Delron@2002  (supermarket + bakery + bar)");
  } else {
    console.log("⚠️  Some users failed — review errors above.");
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
