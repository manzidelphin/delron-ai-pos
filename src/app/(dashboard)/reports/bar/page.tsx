"use client";

import { useCallback, useEffect, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { StatCard } from "@/components/ui/stat-card";
import { DateRangeFilter } from "@/components/reports/date-range-filter";
import { formatRWF } from "@/lib/utils";
import { Beer, TrendingUp, DollarSign, Clock, FileDown, TableProperties, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#f97316"];

const defaultFrom = () => {
  const kigaliToday = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Kigali" });
  const [y, m] = kigaliToday.split("-");
  return `${y}-${m}-01`;
};
const defaultTo = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Kigali" });

interface BarData {
  kpis: {
    bar_revenue: number; bottles_sold: number; shots_sold: number;
    tables_served: number; avg_tab_value: number; peak_hour: string;
  };
  daily_revenue: { date: string; revenue: number }[];
  top_drinks: { name: string; qty: number; revenue: number }[];
  by_category: { name: string; value: number }[];
  hourly: { hour: string; revenue: number }[];
  variance_table: {
    item_name: string; bottles_in_stock: number; shots_remaining: number;
    shots_sold: number; shots_expected: number; variance: number;
    variance_pct: number; revenue_impact: number;
  }[];
  tables_report: {
    table_number: number; times_used: number; total_revenue: number; avg_spend: number;
  }[];
}

export default function BarReportPage() {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [data, setData] = useState<BarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/bar?from=${from}&to=${to}`);
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      toast.error("Failed to load bar report");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  const handleExportPDF = async () => {
    if (!data) return;
    setExporting(true);
    try {
      const { exportToPDF } = await import("@/lib/export");
      await exportToPDF(
        "Bar Report",
        data.top_drinks.map((d) => ({
          drink: d.name, qty: String(d.qty), revenue: formatRWF(d.revenue),
        })),
        [
          { header: "Drink", key: "drink" },
          { header: "Qty Sold", key: "qty" },
          { header: "Revenue (RWF)", key: "revenue" },
        ],
        undefined,
        `Period: ${from} → ${to}`,
        [
          { label: "Bar Revenue", value: formatRWF(data.kpis.bar_revenue) },
          { label: "Bottles Sold", value: String(data.kpis.bottles_sold) },
          { label: "Shots Sold", value: String(data.kpis.shots_sold) },
          { label: "Tables Served", value: String(data.kpis.tables_served) },
        ]
      );
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    if (!data) return;
    setExporting(true);
    try {
      const { exportToExcel } = await import("@/lib/export");
      await exportToExcel("Bar Report", [
        {
          name: "Top Drinks",
          data: data.top_drinks.map((d) => ({ drink: d.name, qty: d.qty, revenue: d.revenue })),
          columns: [
            { header: "Drink", key: "drink" },
            { header: "Qty Sold", key: "qty" },
            { header: "Revenue (RWF)", key: "revenue" },
          ],
        },
        {
          name: "Shot Variance",
          data: data.variance_table.map((v) => ({
            item: v.item_name,
            shots_sold: v.shots_sold,
            shots_expected: v.shots_expected,
            variance: v.variance,
            pct: `${v.variance_pct}%`,
            impact: v.revenue_impact,
          })),
          columns: [
            { header: "Item", key: "item" },
            { header: "Shots Sold", key: "shots_sold" },
            { header: "Shots Expected", key: "shots_expected" },
            { header: "Variance", key: "variance" },
            { header: "Variance %", key: "pct" },
            { header: "Revenue Impact (RWF)", key: "impact" },
          ],
        },
        {
          name: "Tables",
          data: data.tables_report.map((t) => ({
            table: `Table ${t.table_number}`,
            times: t.times_used,
            avg: t.avg_spend,
            total: t.total_revenue,
          })),
          columns: [
            { header: "Table", key: "table" },
            { header: "Times Used", key: "times" },
            { header: "Avg Spend (RWF)", key: "avg" },
            { header: "Total Revenue (RWF)", key: "total" },
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
            <Beer className="w-6 h-6 text-green-400" />
            Bar Report
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Bottles, shots, tabs, and shot variance analysis</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportPDF} disabled={exporting || skeleton} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:border-blue-500/50 text-sm disabled:opacity-40">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            PDF
          </button>
          <button onClick={handleExportExcel} disabled={exporting || skeleton} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm disabled:opacity-40">
            <TableProperties className="w-4 h-4" />
            Excel
          </button>
        </div>
      </div>

      <DateRangeFilter from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Bar Revenue" value={formatRWF(data?.kpis.bar_revenue ?? 0)} icon={<DollarSign className="w-5 h-5" />} color="green" loading={skeleton} />
        <StatCard label="Bottles Sold" value={data?.kpis.bottles_sold ?? 0} icon={<Beer className="w-5 h-5" />} color="blue" loading={skeleton} />
        <StatCard label="Shots Sold" value={data?.kpis.shots_sold ?? 0} icon={<Beer className="w-5 h-5" />} color="amber" loading={skeleton} />
        <StatCard label="Tables Served" value={data?.kpis.tables_served ?? 0} icon={<TrendingUp className="w-5 h-5" />} color="purple" loading={skeleton} />
        <StatCard label="Avg Tab Value" value={formatRWF(data?.kpis.avg_tab_value ?? 0)} icon={<DollarSign className="w-5 h-5" />} color="blue" loading={skeleton} />
        <StatCard label="Peak Hour" value={data?.kpis.peak_hour ?? "—"} icon={<Clock className="w-5 h-5" />} color="amber" loading={skeleton} />
      </div>

      {mounted && data && (
        <>
          {/* Revenue by day + Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h2 className="font-semibold text-white mb-4">Bar Revenue by Day</h2>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.daily_revenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }} formatter={(v: number) => [formatRWF(v), "Revenue"]} />
                  <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h2 className="font-semibold text-white mb-4">Revenue by Category</h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={data.by_category} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={3}>
                    {data.by_category.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }} formatter={(v: number) => [formatRWF(v), "Revenue"]} />
                  <Legend formatter={(v) => <span className="text-slate-300 text-xs">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Drinks + Hourly */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h2 className="font-semibold text-white mb-4">Top 10 Drinks by Revenue</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.top_drinks} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <YAxis dataKey="name" type="category" tick={{ fill: "#94a3b8", fontSize: 9 }} width={100} />
                  <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }} formatter={(v: number) => [formatRWF(v), "Revenue"]} />
                  <Bar dataKey="revenue" fill="#22c55e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h2 className="font-semibold text-white mb-4">Hourly Revenue</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.hourly.filter((h) => h.revenue > 0)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="hour" tick={{ fill: "#94a3b8", fontSize: 9 }} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }} formatter={(v: number) => [formatRWF(v), "Revenue"]} />
                  <Bar dataKey="revenue" fill="#a855f7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Shot Variance */}
          {data.variance_table.length > 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <div className="p-5 border-b border-slate-700">
                <h2 className="font-semibold text-white">Shot Variance Report</h2>
                <p className="text-xs text-slate-400 mt-0.5">Rows in red = possible variance &gt; 10%</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-900/50">
                      {["Item", "Shots Sold", "Shots Expected", "Variance", "Variance %", "Revenue Impact"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-slate-400 font-medium text-xs">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {data.variance_table.map((row, i) => (
                      <tr key={i} className={cn("transition-colors", Math.abs(row.variance_pct) > 10 ? "bg-red-500/5 hover:bg-red-500/10" : "hover:bg-slate-700/20")}>
                        <td className="px-4 py-3 font-medium text-white">{row.item_name}</td>
                        <td className="px-4 py-3 text-slate-300">{row.shots_sold}</td>
                        <td className="px-4 py-3 text-slate-300">{row.shots_expected}</td>
                        <td className="px-4 py-3" style={{ color: row.variance > 0 ? "#22c55e" : "#ef4444" }}>{row.variance > 0 ? "+" : ""}{row.variance}</td>
                        <td className="px-4 py-3">
                          <span className={cn("text-xs font-bold", Math.abs(row.variance_pct) > 10 ? "text-red-400" : "text-slate-300")}>
                            {row.variance_pct}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300">{formatRWF(Math.abs(row.revenue_impact))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tables Report */}
          {data.tables_report.some((t) => t.times_used > 0) && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <div className="p-5 border-b border-slate-700">
                <h2 className="font-semibold text-white">Tables Report</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-900/50">
                      {["Table", "Times Used", "Avg Spend", "Total Revenue"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-slate-400 font-medium text-xs">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {data.tables_report.filter((t) => t.times_used > 0).sort((a, b) => b.total_revenue - a.total_revenue).map((t) => (
                      <tr key={t.table_number} className="hover:bg-slate-700/20 transition-colors">
                        <td className="px-4 py-3 font-medium text-white">Table {t.table_number}</td>
                        <td className="px-4 py-3 text-slate-300">{t.times_used}</td>
                        <td className="px-4 py-3 text-slate-300">{formatRWF(t.avg_spend)}</td>
                        <td className="px-4 py-3 font-semibold text-green-400">{formatRWF(t.total_revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
