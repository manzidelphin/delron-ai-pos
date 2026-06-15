"use client";

import { useCallback, useEffect, useState } from "react";
import { StatCard } from "@/components/ui/stat-card";
import { DateRangeFilter } from "@/components/reports/date-range-filter";
import { formatRWF } from "@/lib/utils";
import { Users, TrendingUp, DollarSign, Award, TableProperties, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const defaultFrom = () => {
  const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0];
};
const defaultTo = () => new Date().toISOString().split("T")[0];

interface StaffData {
  performance: {
    id: string; name: string; role: string; transactions: number;
    revenue: number; avg_transaction: number; credits_given: number; discounts_given: number;
  }[];
  top_performers: {
    best_revenue: { name: string; revenue: number; role: string } | null;
    best_cashier: { name: string; revenue: number } | null;
    best_waiter: { name: string; transactions: number } | null;
    most_accurate: { name: string; discounts_given: number } | null;
  };
  summary: { total_staff: number; total_transactions: number; total_revenue: number };
}

const ROLE_BADGE: Record<string, string> = {
  owner: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  manager: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  cashier: "bg-green-500/10 text-green-400 border-green-500/20",
  baker: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  waiter: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  bartender: "bg-teal-500/10 text-teal-400 border-teal-500/20",
};

export default function StaffReportPage() {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [data, setData] = useState<StaffData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/staff?from=${from}&to=${to}`);
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      toast.error("Failed to load staff report");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  const handleExportExcel = async () => {
    if (!data) return;
    setExporting(true);
    try {
      const { exportToExcel } = await import("@/lib/export");
      await exportToExcel("Staff Report", [
        {
          name: "Performance",
          data: data.performance.map((s) => ({
            name: s.name,
            role: s.role,
            transactions: s.transactions,
            revenue: s.revenue,
            avg_tx: s.avg_transaction,
            credits: s.credits_given,
            discounts: s.discounts_given,
          })),
          columns: [
            { header: "Staff Name", key: "name" },
            { header: "Role", key: "role" },
            { header: "Transactions", key: "transactions" },
            { header: "Revenue Generated (RWF)", key: "revenue" },
            { header: "Avg Transaction (RWF)", key: "avg_tx" },
            { header: "Credits Given", key: "credits" },
            { header: "Discounts Given (RWF)", key: "discounts" },
          ],
        },
      ]);
    } finally {
      setExporting(false);
    }
  };

  const sortedPerformance = [...(data?.performance ?? [])].sort(
    (a, b) => b.revenue - a.revenue
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-purple-400" />
            Staff Report
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Performance, revenue, and transaction breakdown per staff member</p>
        </div>
        <button onClick={handleExportExcel} disabled={exporting || loading} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm disabled:opacity-40">
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <TableProperties className="w-4 h-4" />}
          Export Excel
        </button>
      </div>

      <DateRangeFilter from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Active Staff" value={data?.summary.total_staff ?? 0} icon={<Users className="w-5 h-5" />} color="blue" loading={loading || !data} />
        <StatCard label="Total Transactions" value={data?.summary.total_transactions ?? 0} icon={<TrendingUp className="w-5 h-5" />} color="green" loading={loading || !data} />
        <StatCard label="Total Revenue" value={formatRWF(data?.summary.total_revenue ?? 0)} icon={<DollarSign className="w-5 h-5" />} color="purple" loading={loading || !data} />
      </div>

      {/* Top Performers */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              title: "Best Cashier",
              emoji: "🏆",
              name: data.top_performers.best_cashier?.name,
              sub: data.top_performers.best_cashier ? formatRWF(data.top_performers.best_cashier.revenue) : undefined,
              color: "border-amber-500/30 bg-amber-500/5",
            },
            {
              title: "Top Waiter",
              emoji: "🍽️",
              name: data.top_performers.best_waiter?.name,
              sub: data.top_performers.best_waiter ? `${data.top_performers.best_waiter.transactions} transactions` : undefined,
              color: "border-blue-500/30 bg-blue-500/5",
            },
            {
              title: "Most Accurate",
              emoji: "🎯",
              name: data.top_performers.most_accurate?.name,
              sub: data.top_performers.most_accurate ? `${formatRWF(data.top_performers.most_accurate.discounts_given)} in discounts` : undefined,
              color: "border-green-500/30 bg-green-500/5",
            },
          ].map((card) => (
            <div key={card.title} className={cn("border rounded-xl p-5", card.color)}>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                <Award className="w-3.5 h-3.5" /> {card.title}
              </p>
              {card.name ? (
                <>
                  <p className="text-lg font-bold text-white flex items-center gap-1.5">
                    <span>{card.emoji}</span> {card.name}
                  </p>
                  {card.sub && <p className="text-sm text-slate-400 mt-0.5">{card.sub}</p>}
                </>
              ) : (
                <p className="text-slate-500 text-sm">No data for this period</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Performance Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-700">
          <h2 className="font-semibold text-white">Staff Performance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-900/50">
                {["#", "Staff Name", "Role", "Transactions", "Revenue Generated", "Avg Transaction", "Credits Given", "Discounts Given"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-slate-400 font-medium text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin text-blue-400 mx-auto" /></td></tr>
              ) : sortedPerformance.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-slate-500">No staff data for this period</td></tr>
              ) : (
                sortedPerformance.map((s, i) => (
                  <tr key={s.id} className={cn("hover:bg-slate-700/20 transition-colors", i === 0 ? "bg-amber-500/5" : "")}>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {i === 0 ? <span className="text-amber-400">🏆</span> : i + 1}
                    </td>
                    <td className="px-4 py-3 font-medium text-white">{s.name}</td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2 py-0.5 rounded-full border text-xs capitalize", ROLE_BADGE[s.role] ?? "bg-slate-700 text-slate-300 border-slate-600")}>
                        {s.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{s.transactions}</td>
                    <td className="px-4 py-3 font-semibold text-green-400">{formatRWF(s.revenue)}</td>
                    <td className="px-4 py-3 text-slate-300">{formatRWF(s.avg_transaction)}</td>
                    <td className="px-4 py-3 text-slate-400">{s.credits_given}</td>
                    <td className="px-4 py-3 text-slate-400">{formatRWF(s.discounts_given)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
