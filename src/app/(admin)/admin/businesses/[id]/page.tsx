import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { format, startOfDay, startOfWeek, startOfMonth } from "date-fns";
import { ArrowLeft, Users, GitBranch } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import ImpersonateButton from "@/components/admin/impersonate-button";
import BillingTabs from "@/components/admin/billing-tabs";

export const dynamic = "force-dynamic";

const MODULE_COLORS: Record<string, string> = {
  supermarket: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  bakery: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  bar: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  restaurant: "bg-green-500/20 text-green-300 border-green-500/30",
};

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-violet-500/20 text-violet-300",
  manager: "bg-blue-500/20 text-blue-300",
  cashier: "bg-green-500/20 text-green-300",
  baker: "bg-amber-500/20 text-amber-300",
  bartender: "bg-purple-500/20 text-purple-300",
  waiter: "bg-cyan-500/20 text-cyan-300",
  chef: "bg-red-500/20 text-red-300",
};

async function getBusinessDetail(id: string) {
  const admin = createAdminClient();

  const [bizRes, staffRes, branchRes, txnRes, paymentsRes, invoicesRes] = await Promise.all([
    admin.from("businesses").select("*").eq("id", id).single(),
    admin.from("staff").select("id, name, email, phone, role, is_active, created_at, user_id").eq("business_id", id).order("created_at"),
    admin.from("branches").select("*").eq("business_id", id),
    admin.from("transactions").select("total, created_at").eq("business_id", id).order("created_at", { ascending: false }),
    admin.from("billing_payments").select("*").eq("business_id", id).order("payment_date", { ascending: false }),
    admin.from("invoices").select("*").eq("business_id", id).order("created_at", { ascending: false }),
  ]);

  if (!bizRes.data) return null;

  const { data: { user: ownerUser } } = await admin.auth.admin.getUserById(bizRes.data.owner_id);

  const now = new Date();
  const todayStart = startOfDay(now).toISOString();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
  const monthStart = startOfMonth(now).toISOString();

  let revenueTotal = 0, revenueToday = 0, revenueWeek = 0, revenueMonth = 0;
  let txnTotal = 0, txnToday = 0, txnMonth = 0;

  txnRes.data?.forEach((t) => {
    const amt = Number(t.total);
    revenueTotal += amt;
    txnTotal++;
    if (t.created_at >= todayStart) { revenueToday += amt; txnToday++; }
    if (t.created_at >= weekStart) revenueWeek += amt;
    if (t.created_at >= monthStart) { revenueMonth += amt; txnMonth++; }
  });

  const biz = bizRes.data as Record<string, unknown>;

  return {
    business: bizRes.data,
    owner_email: ownerUser?.email ?? null,
    staff: staffRes.data ?? [],
    branches: branchRes.data ?? [],
    payments: paymentsRes.data ?? [],
    invoices: invoicesRes.data ?? [],
    billing: {
      subscription_plan: (biz.subscription_plan as string) ?? "trial",
      subscription_status: (biz.subscription_status as string) ?? "active",
      billing_cycle: (biz.billing_cycle as string) ?? "monthly",
      next_payment_due: (biz.next_payment_due as string | null) ?? null,
      last_payment_date: (biz.last_payment_date as string | null) ?? null,
      monthly_amount: (biz.monthly_amount as number) ?? 0,
    },
    revenue: { today: revenueToday, this_week: revenueWeek, this_month: revenueMonth, total: revenueTotal },
    transaction_count: { today: txnToday, this_month: txnMonth, total: txnTotal },
  };
}

function fmt(amount: number) {
  return `RWF ${amount.toLocaleString()}`;
}

export default async function BusinessDetailPage({ params }: { params: { id: string } }) {
  const data = await getBusinessDetail(params.id);
  if (!data) notFound();

  const { business, owner_email, staff, branches, payments, invoices, billing, revenue, transaction_count } = data;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/admin/businesses" className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-sm mb-3 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            All businesses
          </Link>
          <h1 className="text-2xl font-bold text-white">{business.name}</h1>
          <p className="text-zinc-400 mt-1">{owner_email ?? "Owner email unknown"}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {(business.modules as string[]).map((m) => (
              <span key={m} className={cn("px-2.5 py-1 rounded-lg text-xs font-medium border", MODULE_COLORS[m] ?? "bg-zinc-700 text-zinc-300 border-zinc-600")}>
                {m}
              </span>
            ))}
          </div>
        </div>
        <ImpersonateButton businessId={business.id} businessName={business.name} />
      </div>

      {/* Revenue cards */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-4">Revenue</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Today", amount: revenue.today, txns: transaction_count.today },
            { label: "This Week", amount: revenue.this_week, txns: null },
            { label: "This Month", amount: revenue.this_month, txns: transaction_count.this_month },
            { label: "All Time", amount: revenue.total, txns: transaction_count.total },
          ].map(({ label, amount, txns }) => (
            <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wide">{label}</p>
              <p className="text-xl font-bold text-white mt-1">{fmt(amount)}</p>
              {txns !== null && (
                <p className="text-xs text-zinc-500 mt-1">{txns} transaction{txns !== 1 ? "s" : ""}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Info row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Branches</p>
          <p className="text-sm font-semibold text-white mt-1">{branches.length}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Staff (active)</p>
          <p className="text-sm font-semibold text-white mt-1">{staff.filter((s) => s.is_active).length}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Created</p>
          <p className="text-sm font-semibold text-white mt-1">{format(new Date(business.created_at), "dd MMM yyyy")}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Last Activity</p>
          <p className="text-sm font-semibold text-white mt-1">
            {(business as Record<string,unknown>).last_activity
              ? format(new Date((business as Record<string,unknown>).last_activity as string), "dd MMM yyyy")
              : "—"}
          </p>
        </div>
      </div>

      {/* Billing + Invoices tabs */}
      <BillingTabs
        businessId={business.id}
        initialBilling={billing}
        payments={payments}
        invoices={invoices}
      />

      {/* Staff list */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Staff ({staff.length})
        </h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Name</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Role</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Email / Phone</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Auth</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="border-b border-zinc-800/60 last:border-0">
                  <td className="px-4 py-3 font-medium text-white">{s.name}</td>
                  <td className="px-4 py-3">
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", ROLE_COLORS[s.role] ?? "bg-zinc-700 text-zinc-300")}>
                      {s.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{s.email ?? s.phone ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={cn("px-2 py-0.5 rounded-full text-xs", s.user_id ? "bg-blue-500/20 text-blue-300" : "bg-zinc-700/60 text-zinc-500")}>
                      {s.user_id ? "session" : "pin-only"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("px-2 py-0.5 rounded-full text-xs", s.is_active ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-400")}>
                      {s.is_active ? "active" : "inactive"}
                    </span>
                  </td>
                </tr>
              ))}
              {staff.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-zinc-600">No staff records</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Branches */}
      {branches.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            Branches ({branches.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {branches.map((b) => (
              <div key={b.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-white text-sm">{b.name}</p>
                  {b.is_main && (
                    <span className="px-1.5 py-0.5 bg-violet-500/20 text-violet-300 text-xs rounded">main</span>
                  )}
                </div>
                {b.location && <p className="text-xs text-zinc-500 mt-1">{b.location}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
