import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SERVICE_ROLE_KEY } from "./lib/supabase-env.mjs";

const sb = createClient(
  SUPABASE_URL,
  SERVICE_ROLE_KEY,
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
