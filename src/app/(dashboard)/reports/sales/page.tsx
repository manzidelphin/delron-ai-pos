"use client";

import { useCallback, useEffect, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { StatCard } from "@/components/ui/stat-card";
import { DateRangeFilter } from "@/components/reports/date-range-filter";
import { formatRWF, formatDate, formatDateTime } from "@/lib/utils";
import {
  TrendingUp, ShoppingCart, DollarSign, Calendar,
  FileDown, TableProperties, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#f97316"];

function fmt(from: string, to: string) {
  return `${from} → ${to}`;
}

const defaultFrom = () => {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().split("T")[0];
};
const defaultTo = () => new Date().toISOString().split("T")[0];

interface SalesData {
  kpis: {
    total_revenue: number;
    total_transactions: number;
    avg_transaction: number;
    best_day: { date: string; revenue: number } | null;
    growth: number;
    prev_revenue: number;
  };
  daily_revenue: { date: string; revenue: number }[];
  by_module: { name: string; value: number }[];
  by_payment: { name: string; value: number }[];
  top_products: { item_name: string; quantity: number; revenue: number }[];
  hourly: { hour: string; revenue: number }[];
  transactions: {
    id: string;
    total: number;
    payment_method: string;
    module_source: string;
    created_at: string;
    receipt_number: string;
  }[];
}

export default function SalesReportPage() {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [data, setData] = useState<SalesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/sales?from=${from}&to=${to}`);
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      toast.error("Failed to load sales report");
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
        "Sales Report",
        data.transactions.map((t) => ({
          date: formatDate(t.created_at),
          time: new Date(t.created_at).toLocaleTimeString("en-RW"),
          receipt: t.receipt_number ?? "—",
          module: t.module_source ?? "—",
          payment: t.payment_method ?? "—",
          amount: formatRWF(t.total),
        })),
        [
          { header: "Date", key: "date" },
          { header: "Time", key: "time" },
          { header: "Receipt #", key: "receipt" },
          { header: "Module", key: "module" },
          { header: "Payment", key: "payment" },
          { header: "Amount", key: "amount" },
        ],
        undefined,
        `Period: ${fmt(from, to)}`
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
      await exportToExcel("Sales Report", [
        {
          name: "Summary",
          data: [
            { metric: "Total Revenue", value: formatRWF(data.kpis.total_revenue) },
            { metric: "Total Transactions", value: data.kpis.total_transactions },
            { metric: "Avg Transaction", value: formatRWF(data.kpis.avg_transaction) },
            { metric: "Growth vs Previous", value: `${data.kpis.growth}%` },
          ],
          columns: [{ header: "Metric", key: "metric" }, { header: "Value", key: "value" }],
        },
        {
          name: "Transactions",
          data: data.transactions.map((t) => ({
            date: formatDateTime(t.created_at),
            receipt: t.receipt_number ?? "",
            module: t.module_source ?? "",
            payment: t.payment_method ?? "",
            amount: t.total,
          })),
          columns: [
            { header: "Date", key: "date" },
            { header: "Receipt #", key: "receipt" },
            { header: "Module", key: "module" },
            { header: "Payment", key: "payment" },
            { header: "Amount (RWF)", key: "amount" },
          ],
        },
        {
          name: "Top Products",
          data: data.top_products.map((p) => ({
            product: p.item_name,
            units: p.quantity,
            revenue: p.revenue,
          })),
          columns: [
            { header: "Product", key: "product" },
            { header: "Units Sold", key: "units" },
            { header: "Revenue (RWF)", key: "revenue" },
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
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-400" />
            Sales Report
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Revenue, transactions, and product analysis</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportPDF}
            disabled={exporting || skeleton}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:border-blue-500/50 text-sm disabled:opacity-40"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            PDF
          </button>
          <button
            onClick={handleExportExcel}
            disabled={exporting || skeleton}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm disabled:opacity-40"
          >
            <TableProperties className="w-4 h-4" />
            Excel
          </button>
        </div>
      </div>

      {/* Date Filter */}
      <DateRangeFilter from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total Revenue" value={formatRWF(data?.kpis.total_revenue ?? 0)} icon={<DollarSign className="w-5 h-5" />} color="blue" loading={skeleton} />
        <StatCard label="Transactions" value={data?.kpis.total_transactions ?? 0} icon={<ShoppingCart className="w-5 h-5" />} color="green" loading={skeleton} />
        <StatCard label="Avg Transaction" value={formatRWF(data?.kpis.avg_transaction ?? 0)} icon={<TrendingUp className="w-5 h-5" />} color="purple" loading={skeleton} />
        <StatCard
          label="Best Day"
          value={data?.kpis.best_day ? formatDate(data.kpis.best_day.date) : "—"}
          changeLabel={data?.kpis.best_day ? formatRWF(data.kpis.best_day.revenue) : undefined}
          icon={<Calendar className="w-5 h-5" />}
          color="amber"
          loading={skeleton}
        />
        <StatCard
          label="Growth"
          value={`${data?.kpis.growth ?? 0 > 0 ? "+" : ""}${data?.kpis.growth ?? 0}%`}
          change={data?.kpis.growth}
          changeLabel="vs previous period"
          icon={<TrendingUp className="w-5 h-5" />}
          color={data?.kpis.growth != null && data.kpis.growth >= 0 ? "green" : "red"}
          loading={skeleton}
        />
      </div>

      {mounted && data && (
        <>
          {/* Revenue Trend */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h2 className="font-semibold text-white mb-4">Revenue Over Time</h2>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.daily_revenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip
                  contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
                  labelStyle={{ color: "#e2e8f0" }}
                  formatter={(v: number) => [formatRWF(v), "Revenue"]}
                />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Module + Payment charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h2 className="font-semibold text-white mb-4">Revenue by Module</h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={data.by_module} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={3}>
                    {data.by_module.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
                    formatter={(v: number) => [formatRWF(v), "Revenue"]}
                  />
                  <Legend formatter={(v) => <span className="text-slate-300 text-xs capitalize">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h2 className="font-semibold text-white mb-4">Revenue by Payment Method</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.by_payment} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <YAxis dataKey="name" type="category" tick={{ fill: "#94a3b8", fontSize: 10 }} width={90} />
                  <Tooltip
                    contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
                    formatter={(v: number) => [formatRWF(v), "Revenue"]}
                  />
                  <Bar dataKey="value" fill="#22c55e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Products + Hourly */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h2 className="font-semibold text-white mb-4">Top 10 Products by Revenue</h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.top_products} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <YAxis dataKey="item_name" type="category" tick={{ fill: "#94a3b8", fontSize: 9 }} width={110} />
                  <Tooltip
                    contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
                    formatter={(v: number) => [formatRWF(v), "Revenue"]}
                  />
                  <Bar dataKey="revenue" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h2 className="font-semibold text-white mb-4">Hourly Sales Distribution</h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.hourly.filter((h) => h.revenue > 0)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="hour" tick={{ fill: "#94a3b8", fontSize: 9 }} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip
                    contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
                    formatter={(v: number) => [formatRWF(v), "Revenue"]}
                  />
                  <Bar dataKey="revenue" fill="#a855f7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="p-5 border-b border-slate-700">
              <h2 className="font-semibold text-white">Recent Transactions</h2>
              <p className="text-xs text-slate-400 mt-0.5">Showing up to 100 transactions</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900/50">
                    {["Date & Time", "Receipt #", "Module", "Payment", "Amount"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-slate-400 font-medium text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {data.transactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-slate-500">No transactions in this period</td>
                    </tr>
                  ) : (
                    data.transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-700/20 transition-colors">
                        <td className="px-4 py-3 text-slate-300 text-xs">{formatDateTime(t.created_at)}</td>
                        <td className="px-4 py-3 text-slate-400 font-mono text-xs">{t.receipt_number ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-xs capitalize">
                            {t.module_source ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs capitalize">
                          {(t.payment_method ?? "—").replace("_", " ")}
                        </td>
                        <td className="px-4 py-3 font-semibold text-white text-sm">{formatRWF(t.total)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Loading skeleton for charts */}
      {skeleton && (
        <div className="grid grid-cols-1 gap-4">
          {[300, 220, 260].map((h, i) => (
            <div key={i} className={cn("bg-slate-800 border border-slate-700 rounded-xl animate-pulse")} style={{ height: h }} />
          ))}
        </div>
      )}
    </div>
  );
}
