"use client";

import { useEffect, useState } from "react";
import { GrowBar, CHART_MOTION } from "@/components/ui/chart-motion";
import { useApi } from "@/lib/use-api";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { StatCard } from "@/components/ui/stat-card";
import { DateRangeFilter } from "@/components/reports/date-range-filter";
import { formatRWF, cn } from "@/lib/utils";
import { UtensilsCrossed, TrendingUp, DollarSign, Clock, FileDown, TableProperties, Loader2, Receipt, PieChart as PieIcon, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const COLORS = ["#f97316", "#22c55e", "#3b82f6", "#a855f7", "#f59e0b", "#ef4444", "#14b8a6"];
const tooltipStyle = { background: "#1e293b", border: "1px solid #334155", borderRadius: 8 };

const kigaliToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Kigali" });
const defaultFrom = () => { const [y, m] = kigaliToday().split("-"); return `${y}-${m}-01`; };

interface RestaurantData {
  kpis: {
    food_revenue: number; dishes_sold: number; food_orders: number; avg_food_per_order: number;
    food_cost: number; gross_profit: number; margin_pct: number; dishes_without_cost: number; peak_hour: string;
  };
  daily_revenue: { date: string; revenue: number }[];
  hourly: { hour: string; revenue: number }[];
  by_category: { name: string; value: number }[];
  dishes: { name: string; category: string; qty: number; revenue: number; cost: number | null; profit: number | null; margin_pct: number | null }[];
  not_sold: { name: string; category: string; price: number }[];
  waiters: { name: string; orders: number; dishes: number; revenue: number }[];
  tables: { table_number: number; orders: number; revenue: number; avg_spend: number }[];
}

const Th = ({ children }: { children: React.ReactNode }) => (
  <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs whitespace-nowrap">{children}</th>
);

export default function RestaurantReportPage() {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(kigaliToday);
  const [exporting, setExporting] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Cached per date range: returning to a range shows it instantly, then refreshes.
  const { data: swrData, isLoading } = useApi<RestaurantData>(`/api/reports/restaurant?from=${from}&to=${to}`, {
    onError: () => toast.error("Failed to load restaurant report"),
  });
  const data = swrData ?? null;
  const skeleton = isLoading || !data;
  const k = data?.kpis;

  const dishExportRows = (d: RestaurantData) => d.dishes.map((x) => ({
    dish: x.name, category: x.category, qty: String(x.qty), revenue: formatRWF(x.revenue),
    cost: x.cost === null ? "No cost set" : formatRWF(x.cost),
    profit: x.profit === null ? "—" : formatRWF(x.profit),
    margin: x.margin_pct === null ? "—" : `${x.margin_pct}%`,
  }));
  const dishColumns = [
    { header: "Dish", key: "dish" }, { header: "Category", key: "category" }, { header: "Qty", key: "qty" },
    { header: "Revenue", key: "revenue" }, { header: "Cost", key: "cost" }, { header: "Profit", key: "profit" }, { header: "Margin", key: "margin" },
  ];

  const handleExportPDF = async () => {
    if (!data) return;
    setExporting(true);
    try {
      const { exportToPDF } = await import("@/lib/export");
      await exportToPDF("Restaurant Report", dishExportRows(data), dishColumns, undefined, `Period: ${from} → ${to}`, [
        { label: "Food Revenue", value: formatRWF(data.kpis.food_revenue) },
        { label: "Dishes Sold", value: String(data.kpis.dishes_sold) },
        { label: "Food Orders", value: String(data.kpis.food_orders) },
        { label: "Gross Profit", value: `${formatRWF(data.kpis.gross_profit)} (${data.kpis.margin_pct}%)` },
      ]);
    } finally { setExporting(false); }
  };

  const handleExportExcel = async () => {
    if (!data) return;
    setExporting(true);
    try {
      const { exportToExcel } = await import("@/lib/export");
      await exportToExcel("Restaurant Report", [
        { name: "Dishes", data: dishExportRows(data), columns: dishColumns },
        { name: "Waiters", data: data.waiters.map((w) => ({ waiter: w.name, orders: w.orders, dishes: w.dishes, revenue: w.revenue })),
          columns: [{ header: "Waiter", key: "waiter" }, { header: "Orders", key: "orders" }, { header: "Dishes", key: "dishes" }, { header: "Revenue (RWF)", key: "revenue" }] },
        { name: "Tables", data: data.tables.map((t) => ({ table: `Table ${t.table_number}`, orders: t.orders, avg: t.avg_spend, revenue: t.revenue })),
          columns: [{ header: "Table", key: "table" }, { header: "Orders", key: "orders" }, { header: "Avg Spend (RWF)", key: "avg" }, { header: "Revenue (RWF)", key: "revenue" }] },
        { name: "Not Sold", data: data.not_sold.map((n) => ({ dish: n.name, category: n.category, price: n.price })),
          columns: [{ header: "Dish", key: "dish" }, { header: "Category", key: "category" }, { header: "Price (RWF)", key: "price" }] },
        { name: "Daily", data: data.daily_revenue, columns: [{ header: "Date", key: "date" }, { header: "Revenue (RWF)", key: "revenue" }] },
      ]);
    } finally { setExporting(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <UtensilsCrossed className="w-6 h-6 text-orange-400" />
            Restaurant Report
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Food sales, dish profit, waiters and tables (paid orders only)</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportPDF} disabled={exporting || skeleton} className="flex items-center gap-2 px-3 py-2 rounded-lg glass-card text-slate-300 hover:border-blue-500/50 text-sm disabled:opacity-40">
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
        <StatCard label="Food Revenue" value={formatRWF(k?.food_revenue ?? 0)} icon={<DollarSign className="w-5 h-5" />} color="green" loading={skeleton} />
        <StatCard label="Dishes Sold" value={k?.dishes_sold ?? 0} icon={<UtensilsCrossed className="w-5 h-5" />} color="amber" loading={skeleton} />
        <StatCard label="Food Orders" value={k?.food_orders ?? 0} icon={<Receipt className="w-5 h-5" />} color="blue" loading={skeleton} />
        <StatCard label="Avg Food per Order" value={formatRWF(k?.avg_food_per_order ?? 0)} icon={<TrendingUp className="w-5 h-5" />} color="purple" loading={skeleton} />
        <StatCard label={`Gross Profit (${k?.margin_pct ?? 0}% margin)`} value={formatRWF(k?.gross_profit ?? 0)} icon={<PieIcon className="w-5 h-5" />} color="green" loading={skeleton} />
        <StatCard label="Peak Hour" value={k?.peak_hour ?? "—"} icon={<Clock className="w-5 h-5" />} color="amber" loading={skeleton} />
      </div>

      {k && k.dishes_without_cost > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm text-amber-200">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-400" />
          <span>
            {k.dishes_without_cost} {k.dishes_without_cost === 1 ? "dish has" : "dishes have"} no cost price or recipe, so {k.dishes_without_cost === 1 ? "it is" : "they are"} left
            out of profit and margin. Add a cost price or recipe in <span className="font-semibold">Restaurant → Menu</span>.
          </span>
        </div>
      )}

      {mounted && data && (
        <>
          {data.dishes.length === 0 && (
            <div className="glass-card rounded-xl p-8 text-center text-slate-400 text-sm">
              No paid food orders between {from} and {to}.
            </div>
          )}

          {data.dishes.length > 0 && (
            <>
              {/* Revenue by day + Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass-card rounded-xl p-5">
                  <h2 className="font-semibold text-white mb-4">Food Revenue by Day</h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={data.daily_revenue}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatRWF(v), "Revenue"]} />
                      <Line {...CHART_MOTION} type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="glass-card rounded-xl p-5">
                  <h2 className="font-semibold text-white mb-4">Revenue by Category</h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie {...CHART_MOTION} data={data.by_category} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={3}>
                        {data.by_category.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatRWF(v), "Revenue"]} />
                      <Legend formatter={(v) => <span className="text-slate-300 text-xs">{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top dishes + Hourly */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass-card rounded-xl p-5">
                  <h2 className="font-semibold text-white mb-4">Top 10 Dishes by Revenue</h2>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={data.dishes.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                      <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                      <YAxis dataKey="name" type="category" tick={{ fill: "#94a3b8", fontSize: 9 }} width={110} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatRWF(v), "Revenue"]} />
                      <Bar dataKey="revenue" fill="#f97316" radius={[0, 4, 4, 0]} isAnimationActive={false} shape={<GrowBar horizontal />} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="glass-card rounded-xl p-5">
                  <h2 className="font-semibold text-white mb-4">Food Revenue by Hour</h2>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={data.hourly.filter((h) => h.revenue > 0)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="hour" tick={{ fill: "#94a3b8", fontSize: 9 }} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatRWF(v), "Revenue"]} />
                      <Bar dataKey="revenue" fill="#a855f7" radius={[4, 4, 0, 0]} isAnimationActive={false} shape={<GrowBar />} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Dish profitability */}
              <div className="glass-card rounded-xl overflow-hidden">
                <div className="p-5 border-b border-slate-700">
                  <h2 className="font-semibold text-white">Dish Sales &amp; Profit</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Cost uses the dish&apos;s cost price, or its recipe ingredients if no cost price is set. Margins under 30% are highlighted.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-slate-700 bg-slate-900/50">
                      <Th>Dish</Th><Th>Category</Th><Th>Qty</Th><Th>Revenue</Th><Th>Cost</Th><Th>Profit</Th><Th>Margin</Th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {data.dishes.map((d, i) => {
                        const low = d.margin_pct !== null && d.margin_pct < 30;
                        return (
                          <tr key={i} className={cn("transition-colors", low ? "bg-red-500/5 hover:bg-red-500/10" : "hover:bg-slate-700/20")}>
                            <td className="px-4 py-3 font-medium text-white">{d.name}</td>
                            <td className="px-4 py-3 text-slate-400 capitalize">{d.category}</td>
                            <td className="px-4 py-3 text-slate-300 tabular-nums">{d.qty}</td>
                            <td className="px-4 py-3 text-slate-200 tabular-nums">{formatRWF(d.revenue)}</td>
                            <td className="px-4 py-3 tabular-nums">{d.cost === null ? <span className="text-amber-400 text-xs">No cost set</span> : <span className="text-slate-300">{formatRWF(d.cost)}</span>}</td>
                            <td className="px-4 py-3 tabular-nums font-semibold text-green-400">{d.profit === null ? "—" : formatRWF(d.profit)}</td>
                            <td className={cn("px-4 py-3 tabular-nums text-xs font-bold", d.margin_pct === null ? "text-slate-500" : low ? "text-red-400" : "text-green-400")}>
                              {d.margin_pct === null ? "—" : `${d.margin_pct}%`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Waiters + Tables */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="glass-card rounded-xl overflow-hidden">
                  <div className="p-5 border-b border-slate-700"><h2 className="font-semibold text-white">Waiters</h2></div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-slate-700 bg-slate-900/50"><Th>Waiter</Th><Th>Orders</Th><Th>Dishes</Th><Th>Food Revenue</Th></tr></thead>
                      <tbody className="divide-y divide-slate-700/50">
                        {data.waiters.map((w, i) => (
                          <tr key={i} className="hover:bg-slate-700/20 transition-colors">
                            <td className={cn("px-4 py-3 font-medium", w.name === "No waiter assigned" ? "text-slate-400 italic" : "text-white")}>{w.name}</td>
                            <td className="px-4 py-3 text-slate-300 tabular-nums">{w.orders}</td>
                            <td className="px-4 py-3 text-slate-300 tabular-nums">{w.dishes}</td>
                            <td className="px-4 py-3 font-semibold text-green-400 tabular-nums">{formatRWF(w.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="glass-card rounded-xl overflow-hidden">
                  <div className="p-5 border-b border-slate-700"><h2 className="font-semibold text-white">Tables</h2></div>
                  {data.tables.length === 0 ? (
                    <p className="p-5 text-sm text-slate-400">No food orders were linked to a table in this period.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b border-slate-700 bg-slate-900/50"><Th>Table</Th><Th>Orders</Th><Th>Avg Spend</Th><Th>Food Revenue</Th></tr></thead>
                        <tbody className="divide-y divide-slate-700/50">
                          {data.tables.map((t, i) => (
                            <tr key={i} className="hover:bg-slate-700/20 transition-colors">
                              <td className="px-4 py-3 font-medium text-white">Table {t.table_number}</td>
                              <td className="px-4 py-3 text-slate-300 tabular-nums">{t.orders}</td>
                              <td className="px-4 py-3 text-slate-300 tabular-nums">{formatRWF(t.avg_spend)}</td>
                              <td className="px-4 py-3 font-semibold text-green-400 tabular-nums">{formatRWF(t.revenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Menu items that didn't sell */}
          {data.not_sold.length > 0 && (
            <div className="glass-card rounded-xl p-5">
              <h2 className="font-semibold text-white">Not Sold in This Period</h2>
              <p className="text-xs text-slate-400 mt-0.5 mb-4">Active menu items with no paid orders between {from} and {to}.</p>
              <div className="flex flex-wrap gap-2">
                {data.not_sold.map((n, i) => (
                  <span key={i} className="rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-1.5 text-xs text-slate-300">
                    {n.name} <span className="text-slate-500">· {n.category} · {formatRWF(n.price)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
