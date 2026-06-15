"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { StatCard } from "@/components/ui/stat-card";
import { DateRangeFilter } from "@/components/reports/date-range-filter";
import { formatRWF, formatDate } from "@/lib/utils";
import { CreditCard, TrendingUp, DollarSign, Clock, TableProperties, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const COLORS = ["#22c55e", "#f59e0b", "#ef4444", "#3b82f6"];
const BUCKET_COLOR: Record<string, string> = {
  current: "text-green-400",
  "0-7 days": "text-amber-400",
  "8-30 days": "text-orange-400",
  "30+ days": "text-red-400",
};

const defaultFrom = () => {
  const d = new Date(); d.setMonth(d.getMonth() - 3); d.setDate(1);
  return d.toISOString().split("T")[0];
};
const defaultTo = () => new Date().toISOString().split("T")[0];

interface CreditsReportData {
  kpis: {
    total_given: number; total_collected: number; collection_rate: number;
    still_outstanding: number; avg_days_to_pay: number;
  };
  monthly_chart: { month: string; given: number; collected: number }[];
  top_debtors: { name: string; amount: number }[];
  status_dist: { name: string; value: number }[];
  aging_table: {
    customer_name: string; customer_phone: string; total_owed: number;
    due_date: string; days_overdue: number; bucket: string; status: string;
  }[];
  history: {
    created_at: string; customer_name: string; total_amount: number;
    amount_paid: number; balance: number; status: string; due_date: string;
  }[];
}

export default function CreditsReportPage() {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [data, setData] = useState<CreditsReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/credits?from=${from}&to=${to}`);
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      toast.error("Failed to load credit report");
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
      await exportToExcel("Credit Report", [
        {
          name: "Aging Report",
          data: data.aging_table.map((r) => ({
            customer: r.customer_name,
            phone: r.customer_phone,
            owed: r.total_owed,
            due: formatDate(r.due_date),
            days_overdue: r.days_overdue,
            bucket: r.bucket,
            status: r.status,
          })),
          columns: [
            { header: "Customer", key: "customer" },
            { header: "Phone", key: "phone" },
            { header: "Amount Owed (RWF)", key: "owed" },
            { header: "Due Date", key: "due" },
            { header: "Days Overdue", key: "days_overdue" },
            { header: "Aging Bucket", key: "bucket" },
            { header: "Status", key: "status" },
          ],
        },
        {
          name: "History",
          data: data.history.map((h) => ({
            date: formatDate(h.created_at),
            customer: h.customer_name,
            given: h.total_amount,
            paid: h.amount_paid,
            balance: h.balance,
            status: h.status,
          })),
          columns: [
            { header: "Date", key: "date" },
            { header: "Customer", key: "customer" },
            { header: "Amount Given (RWF)", key: "given" },
            { header: "Amount Paid (RWF)", key: "paid" },
            { header: "Balance (RWF)", key: "balance" },
            { header: "Status", key: "status" },
          ],
        },
      ]);
    } finally {
      setExporting(false);
    }
  };

  const skeleton = loading || !data;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-red-400" />
            Credit Report
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Debt analysis, aging, and collection performance</p>
        </div>
        <button onClick={handleExportExcel} disabled={exporting || skeleton} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm disabled:opacity-40">
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <TableProperties className="w-4 h-4" />}
          Export Excel
        </button>
      </div>

      <DateRangeFilter from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total Credit Given" value={formatRWF(data?.kpis.total_given ?? 0)} icon={<CreditCard className="w-5 h-5" />} color="blue" loading={skeleton} />
        <StatCard label="Total Collected" value={formatRWF(data?.kpis.total_collected ?? 0)} icon={<DollarSign className="w-5 h-5" />} color="green" loading={skeleton} />
        <StatCard label="Collection Rate" value={`${data?.kpis.collection_rate ?? 0}%`} icon={<TrendingUp className="w-5 h-5" />} color={data?.kpis.collection_rate != null && data.kpis.collection_rate >= 70 ? "green" : "red"} loading={skeleton} />
        <StatCard label="Still Outstanding" value={formatRWF(data?.kpis.still_outstanding ?? 0)} icon={<CreditCard className="w-5 h-5" />} color="red" loading={skeleton} />
        <StatCard label="Avg Days to Pay" value={`${data?.kpis.avg_days_to_pay ?? 0} days`} icon={<Clock className="w-5 h-5" />} color="amber" loading={skeleton} />
      </div>

      {mounted && data && (
        <>
          {/* Monthly chart + Status pie */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h2 className="font-semibold text-white mb-4">Credits Given vs Collected</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.monthly_chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }} formatter={(v: number) => [formatRWF(v)]} />
                  <Legend formatter={(v) => <span className="text-slate-300 text-xs capitalize">{v}</span>} />
                  <Bar dataKey="given" name="Given" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="collected" name="Collected" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h2 className="font-semibold text-white mb-4">Credit Status Distribution</h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={data.status_dist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={3}>
                    {data.status_dist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }} />
                  <Legend formatter={(v) => <span className="text-slate-300 text-xs capitalize">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top debtors */}
          {data.top_debtors.length > 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h2 className="font-semibold text-white mb-4">Top Outstanding Debtors</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.top_debtors} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <YAxis dataKey="name" type="category" tick={{ fill: "#94a3b8", fontSize: 9 }} width={110} />
                  <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }} formatter={(v: number) => [formatRWF(v), "Owed"]} />
                  <Bar dataKey="amount" fill="#ef4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Aging Table */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="p-5 border-b border-slate-700">
              <h2 className="font-semibold text-white">Aging Report</h2>
              <p className="text-xs text-slate-400 mt-0.5">Unpaid credits sorted by oldest first</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900/50">
                    {["Customer", "Phone", "Amount Owed", "Due Date", "Days Overdue", "Aging", "Status"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-slate-400 font-medium text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {data.aging_table.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-10 text-slate-500">No outstanding credits</td></tr>
                  ) : (
                    data.aging_table.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-700/20 transition-colors">
                        <td className="px-4 py-3 font-medium text-white">{row.customer_name}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{row.customer_phone}</td>
                        <td className="px-4 py-3 font-semibold text-red-400">{formatRWF(row.total_owed)}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{formatDate(row.due_date)}</td>
                        <td className="px-4 py-3 font-medium" style={{ color: row.days_overdue > 30 ? "#ef4444" : row.days_overdue > 7 ? "#f97316" : "#94a3b8" }}>
                          {row.days_overdue > 0 ? `${row.days_overdue}d` : "—"}
                        </td>
                        <td className={cn("px-4 py-3 text-xs font-medium", BUCKET_COLOR[row.bucket] ?? "text-slate-400")}>{row.bucket}</td>
                        <td className="px-4 py-3">
                          <span className={cn("px-2 py-0.5 rounded-full border text-xs capitalize",
                            row.status === "overdue" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                            row.status === "partial" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                            "bg-orange-500/10 text-orange-400 border-orange-500/20"
                          )}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
