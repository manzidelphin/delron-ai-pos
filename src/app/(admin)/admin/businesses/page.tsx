import { createAdminClient } from "@/lib/supabase/admin";
import BusinessesTable from "@/components/admin/businesses-table";

export const dynamic = "force-dynamic";

async function getBusinesses() {
  const admin = createAdminClient();

  const { data: businesses } = await admin
    .from("businesses")
    .select("*")
    .order("created_at", { ascending: false });

  if (!businesses) return [];

  const ids = businesses.map((b) => b.id);

  const [staffRes, txnRes, usersRes] = await Promise.all([
    admin.from("staff").select("business_id").in("business_id", ids).eq("is_active", true),
    admin.from("transactions").select("business_id, created_at").in("business_id", ids).order("created_at", { ascending: false }),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const staffCountMap = new Map<string, number>();
  staffRes.data?.forEach((s) => {
    staffCountMap.set(s.business_id, (staffCountMap.get(s.business_id) ?? 0) + 1);
  });

  const lastActivityMap = new Map<string, string>();
  txnRes.data?.forEach((t) => {
    if (!lastActivityMap.has(t.business_id)) lastActivityMap.set(t.business_id, t.created_at);
  });

  const emailMap = new Map(usersRes.data.users.map((u) => [u.id, u.email ?? null]));

  return businesses.map((b) => ({
    ...b,
    owner_email: emailMap.get(b.owner_id) ?? null,
    staff_count: staffCountMap.get(b.id) ?? 0,
    last_activity: lastActivityMap.get(b.id) ?? null,
  }));
}

export default async function BusinessesPage() {
  const businesses = await getBusinesses();

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Businesses</h1>
        <p className="text-zinc-400 mt-1">
          {businesses.length} business{businesses.length !== 1 ? "es" : ""} on the platform
        </p>
      </div>

      <BusinessesTable businesses={businesses} />
    </div>
  );
}
