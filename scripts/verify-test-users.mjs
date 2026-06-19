import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://hfjggupbkbudnqplxviq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmamdndXBia2J1ZG5xcGx4dmlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTQ1MzA5MywiZXhwIjoyMDk3MDI5MDkzfQ.sDxVRUjYEOube85pxwKkT3j1b8BtApaR20UC0Cc4Li0",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Dump all owner staff rows + their linked business name
const { data: staffRows, error: staffErr } = await sb
  .from("staff")
  .select("id, name, email, user_id, is_active, business_id")
  .eq("role", "owner");
if (staffErr) { console.error("staff query failed:", staffErr.message); process.exit(1); }

const { data: bizRows, error: bizErr } = await sb
  .from("businesses")
  .select("id, name, owner_id");
if (bizErr) { console.error("businesses query failed:", bizErr.message); process.exit(1); }

const bizMap = Object.fromEntries(bizRows.map((b) => [b.id, b]));

console.log(`\nAll owner staff rows (${staffRows.length} total):\n`);
staffRows.forEach((s) => {
  const biz = bizMap[s.business_id];
  console.log(`  staff.name    : ${s.name}`);
  console.log(`  staff.user_id : ${s.user_id ?? "NULL ← broken"}`);
  console.log(`  business_id   : ${s.business_id}`);
  console.log(`  biz.name      : ${biz?.name ?? "NOT FOUND"}`);
  console.log(`  biz.owner_id  : ${biz?.owner_id ?? "NULL"}`);
  console.log("");
});
