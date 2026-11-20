import { createAdminClient } from "@/lib/supabase/admin";
import BusinessesTable, { type BusinessRow } from "@/components/admin/businesses-table";
import { TrendingUp, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function getBusinesses(): Promise<BusinessRow[]> {
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
    // billing — use DB values, fall back to defaults if migration not yet run
    subscription_plan: (b as Record<string, unknown>).subscription_plan as string ?? "trial",
    subscription_status: (b as Record<string, unknown>).subscription_status as string ?? "active",
    next_payment_due: (b as Record<string, unknown>).next_payment_due as string | null ?? null,
    monthly_amount: (b as Record<string, unknown>).monthly_amount as number ?? 0,
  }));
}

function SummaryCards({ businesses }: { businesses: BusinessRow[] }) {
  const active = businesses.filter(
    (b) => b.subscription_status === "active" && b.subscription_plan !== "trial"
  );
  const mrr = active.reduce((sum, b) => sum + (b.monthly_amount ?? 0), 0);
  const overdue = businesses.filter((b) => b.subscription_status === "overdue").length;
  const trial = businesses.filter((b) => b.subscription_plan === "trial").length;

  const cards = [
    {
      label: "Active Subscriptions",
      value: active.length,
      icon: <CheckCircle className="w-5 h-5 text-green-400" />,
      color: "border-green-500/20",
    },
    {
      label: "Monthly Recurring Revenue",
      value: `RWF ${mrr.toLocaleString()}`,
      icon: <TrendingUp className="w-5 h-5 text-violet-400" />,
      color: "border-violet-500/20",
    },
    {
      label: "Overdue",
      value: overdue,
      icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
      color: overdue > 0 ? "border-amber-500/30" : "border-zinc-800",
    },
    {
      label: "On Trial",
      value: trial,
      icon: <Clock className="w-5 h-5 text-zinc-400" />,
      color: "border-zinc-800",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((c) => (
        <div key={c.label} className={cn("bg-zinc-900 border rounded-xl p-4 flex items-start gap-3", c.color)}>
          <div className="mt-0.5">{c.icon}</div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wide leading-none mb-1">{c.label}</p>
            <p className="text-xl font-bold text-white">{c.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function BusinessesPage() {
  const businesses = await getBusinesses();

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Businesses</h1>
        <p className="text-zinc-400 mt-1">
          {businesses.length} business{businesses.length !== 1 ? "es" : ""} on the platform
        </p>
      </div>

      <SummaryCards businesses={businesses} />
      <BusinessesTable businesses={businesses} />
    </div>
  );
}
