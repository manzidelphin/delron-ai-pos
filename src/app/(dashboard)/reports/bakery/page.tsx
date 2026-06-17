"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts";
import { StatCard } from "@/components/ui/stat-card";
import { DateRangeFilter } from "@/components/reports/date-range-filter";
import { formatRWF } from "@/lib/utils";
import { ChefHat, TrendingUp, AlertTriangle, DollarSign, FileDown, TableProperties, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const defaultFrom = () => {
  const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0];
};
const defaultTo = () => new Date().toISOString().split("T")[0];

interface BakeryData {
  kpis: {
    total_produced: number;
    total_sold: number;
    total_wasted: number;
    waste_cost: number;
    efficiency_rate: number;
    bakery_revenue: number;
    bakery_profit: number;
  };
  daily_chart: { date: string; produced: number; wasted: number }[];
  items_breakdown: {
    id: string; name: string; produced: number; sold: number;
    wasted: number; waste_percent: number; revenue: number;
    cost: number; profit: number; margin: number;
  }[];
  baker_performance: { name: string; batches: number; units: number; wasted: number; waste_rate: number }[];
  materials: { id: string; name: string; unit: string; quantity: number; min_quantity: number; cost_per_unit: number }[];
}

export default function BakeryReportPage() {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [data, setData] = useState<BakeryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/bakery?from=${from}&to=${to}`);
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      toast.error("Failed to load bakery report");
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
        "Bakery Report",
        data.items_breakdown.map((i) => ({
          item: i.name, produced: String(i.produced), sold: String(i.sold),
          wasted: String(i.wasted), waste_pct: `${i.waste_percent}%`,
          revenue: formatRWF(i.revenue), profit: formatRWF(i.profit), margin: `${i.margin}%`,
        })),
        [
          { header: "Item", key: "item" }, { header: "Produced", key: "produced" },
          { header: "Sold", key: "sold" }, { header: "Wasted", key: "wasted" },
          { header: "Waste %", key: "waste_pct" }, { header: "Revenue", key: "revenue" },
          { header: "Profit", key: "profit" }, { header: "Margin %", key: "margin" },
        ],
        undefined,
        `Period: ${from} → ${to}`,
        [
          { label: "Total Produced", value: String(data.kpis.total_produced) },
          { label: "Total Sold", value: String(data.kpis.total_sold) },
          { label: "Total Wasted", value: String(data.kpis.total_wasted) },
          { label: "Bakery Revenue", value: formatRWF(data.kpis.bakery_revenue) },
          { label: "Efficiency Rate", value: `${data.kpis.efficiency_rate}%` },
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
      await exportToExcel("Bakery Report", [
        {
          name: "Item Breakdown",
          data: data.items_breakdown.map((i) => ({
            item: i.name,
            produced: i.produced,
            sold: i.sold,
            wasted: i.wasted,
            waste_pct: `${i.waste_percent}%`,
            revenue: i.revenue,
            profit: i.profit,
            margin: `${i.margin}%`,
          })),
          columns: [
            { header: "Item", key: "item" },
            { header: "Produced", key: "produced" },
            { header: "Sold", key: "sold" },
            { header: "Wasted", key: "wasted" },
            { header: "Waste %", key: "waste_pct" },
            { header: "Revenue (RWF)", key: "revenue" },
            { header: "Profit (RWF)", key: "profit" },
            { header: "Margin %", key: "margin" },
          ],
        },
        {
          name: "Baker Performance",
          data: data.baker_performance.map((b) => ({
            baker: b.name,
            batches: b.batches,
            units: b.units,
            wasted: b.wasted,
            waste_rate: `${b.waste_rate}%`,
          })),
          columns: [
            { header: "Baker", key: "baker" },
            { header: "Batches", key: "batches" },
            { header: "Units Produced", key: "units" },
            { header: "Units Wasted", key: "wasted" },
            { header: "Waste Rate", key: "waste_rate" },
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
            <ChefHat className="w-6 h-6 text-orange-400" />
            Bakery Report
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Production, sales, waste, and baker performance</p>
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
        <StatCard label="Total Produced" value={`${data?.kpis.total_produced ?? 0} units`} icon={<ChefHat className="w-5 h-5" />} color="blue" loading={skeleton} />
        <StatCard label="Total Sold" value={`${data?.kpis.total_sold ?? 0} units`} icon={<TrendingUp className="w-5 h-5" />} color="green" loading={skeleton} changeLabel={formatRWF(data?.kpis.bakery_revenue ?? 0)} />
        <StatCard label="Total Wasted" value={`${data?.kpis.total_wasted ?? 0} units`} icon={<AlertTriangle className="w-5 h-5" />} color="red" loading={skeleton} changeLabel={formatRWF(data?.kpis.waste_cost ?? 0)} />
        <StatCard label="Efficiency Rate" value={`${data?.kpis.efficiency_rate ?? 0}%`} icon={<TrendingUp className="w-5 h-5" />} color={data?.kpis.efficiency_rate != null && data.kpis.efficiency_rate >= 70 ? "green" : "amber"} loading={skeleton} />
        <StatCard label="Bakery Revenue" value={formatRWF(data?.kpis.bakery_revenue ?? 0)} icon={<DollarSign className="w-5 h-5" />} color="purple" loading={skeleton} />
        <StatCard label="Bakery Profit" value={formatRWF(data?.kpis.bakery_profit ?? 0)} icon={<DollarSign className="w-5 h-5" />} color={data?.kpis.bakery_profit != null && data.kpis.bakery_profit >= 0 ? "green" : "red"} loading={skeleton} />
      </div>

      {/* Charts */}
      {mounted && data && (
        <>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h2 className="font-semibold text-white mb-4">Production vs Waste by Day</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.daily_chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
                  labelStyle={{ color: "#e2e8f0" }}
                />
                <Legend formatter={(v) => <span className="text-slate-300 text-xs capitalize">{v}</span>} />
                <Bar dataKey="produced" name="Produced" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="wasted" name="Wasted" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Item Breakdown */}
          {data.items_breakdown.length > 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <div className="p-5 border-b border-slate-700">
                <h2 className="font-semibold text-white">Item Breakdown</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-900/50">
                      {["Item", "Produced", "Sold", "Wasted", "Waste %", "Revenue", "Cost", "Profit", "Margin"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-slate-400 font-medium text-xs">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {data.items_breakdown.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-700/20 transition-colors">
                        <td className="px-4 py-3 font-medium text-white">{item.name}</td>
                        <td className="px-4 py-3 text-slate-300">{item.produced}</td>
                        <td className="px-4 py-3 text-green-400">{item.sold}</td>
                        <td className="px-4 py-3 text-red-400">{item.wasted}</td>
                        <td className="px-4 py-3">
                          <span className={cn("text-xs font-medium", item.waste_percent > 20 ? "text-red-400" : item.waste_percent > 10 ? "text-amber-400" : "text-green-400")}>
                            {item.waste_percent}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300">{formatRWF(item.revenue)}</td>
                        <td className="px-4 py-3 text-slate-400">{formatRWF(item.cost)}</td>
                        <td className="px-4 py-3 font-semibold" style={{ color: item.profit >= 0 ? "#22c55e" : "#ef4444" }}>{formatRWF(item.profit)}</td>
                        <td className="px-4 py-3 text-slate-300">{item.margin}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Baker Performance */}
          {data.baker_performance.length > 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <div className="p-5 border-b border-slate-700">
                <h2 className="font-semibold text-white">Baker Performance</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-900/50">
                      {["Baker", "Batches", "Units Produced", "Units Wasted", "Waste Rate"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-slate-400 font-medium text-xs">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {data.baker_performance.map((b, i) => (
                      <tr key={i} className="hover:bg-slate-700/20 transition-colors">
                        <td className="px-4 py-3 font-medium text-white flex items-center gap-2">
                          {i === 0 && <span className="text-amber-400">🏆</span>}
                          {b.name}
                        </td>
                        <td className="px-4 py-3 text-slate-300">{b.batches}</td>
                        <td className="px-4 py-3 text-blue-400">{b.units}</td>
                        <td className="px-4 py-3 text-red-400">{b.wasted}</td>
                        <td className="px-4 py-3">
                          <span className={cn("text-xs font-medium", b.waste_rate > 15 ? "text-red-400" : b.waste_rate > 8 ? "text-amber-400" : "text-green-400")}>
                            {b.waste_rate}%
                          </span>
                        </td>
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
