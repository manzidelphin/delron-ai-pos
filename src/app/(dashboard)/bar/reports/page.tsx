"use client";

import { useEffect, useState, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, ShoppingBag, AlertTriangle } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { formatRWF } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ReportData {
  stats: { total_revenue: number; total_orders: number };
  daily_chart: Array<{ date: string; revenue: number }>;
  top_items: Array<{ id: string; name: string; bottles_sold: number; shots_sold: number; revenue: number }>;
  variance: Array<{
    item_name: string;
    bottles_sold: number;
    shots_sold: number;
    expected_bottles_from_shots: number;
    total_bottles_consumed: number;
    revenue: number;
  }>;
}

export default function BarReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bar/reports?from=${from}T00:00:00Z&to=${to}T23:59:59Z`);
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bar Reports</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Sales, variance & theft detection</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="h-10 px-3 bg-card border border-border rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <span className="text-muted-foreground text-sm">to</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="h-10 px-3 bg-card border border-border rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={loading ? "..." : formatRWF(data?.stats.total_revenue ?? 0)} icon={<TrendingUp className="w-5 h-5" />} loading={loading} color="green" />
        <StatCard label="Total Orders" value={data?.stats.total_orders ?? 0} icon={<ShoppingBag className="w-5 h-5" />} loading={loading} />
        <StatCard label="Avg. Order" value={loading || !data?.stats.total_orders ? "..." : formatRWF((data.stats.total_revenue) / data.stats.total_orders)} icon={<TrendingUp className="w-5 h-5" />} loading={loading} color="blue" />
        <StatCard label="Items Tracked" value={data?.variance.length ?? 0} icon={<AlertTriangle className="w-5 h-5" />} loading={loading} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily chart */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="text-base font-bold text-foreground mb-4">Daily Revenue</h2>
          {loading ? (
            <div className="h-48 bg-muted/30 rounded-xl animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data?.daily_chart ?? []}>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip
                  contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
                  formatter={(v: number) => [formatRWF(v), "Revenue"]}
                />
                <Bar dataKey="revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top items */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="text-base font-bold text-foreground mb-4">Top Selling Items</h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-10 bg-muted/30 rounded-xl animate-pulse" />)}
            </div>
          ) : (data?.top_items ?? []).length === 0 ? (
            <p className="text-muted-foreground text-sm">No sales in this period.</p>
          ) : (
            <div className="space-y-2">
              {(data?.top_items ?? []).map((item, i) => (
                <div key={item.id} className="flex items-center gap-3 py-2">
                  <span className="text-sm font-black text-muted-foreground w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.bottles_sold} btl · {item.shots_sold} shots</p>
                  </div>
                  <span className="text-sm font-bold text-foreground">{formatRWF(item.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottle vs Shot Variance — Theft Detection */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-yellow-400" />
          <h2 className="text-base font-bold text-foreground">Bottle vs Shot Variance (Theft Detection)</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Compares bottles sold directly vs. bottles consumed through shots. Large discrepancies may indicate theft or waste.
        </p>
        {loading ? (
          <div className="h-32 bg-muted/30 rounded-xl animate-pulse" />
        ) : (data?.variance ?? []).length === 0 ? (
          <p className="text-muted-foreground text-sm">No shot-tracked items sold in this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Item</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Bottles Sold</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Shots Sold</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Btl Equiv.</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Total Consumed</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {(data?.variance ?? []).map((v, i) => {
                  const discrepancy = v.total_bottles_consumed - v.bottles_sold;
                  const hasWarning = discrepancy > 0.5;
                  return (
                    <tr key={i} className={cn("border-b border-border", hasWarning && "bg-yellow-500/5")}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{v.item_name}</p>
                          {hasWarning && <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-foreground">{v.bottles_sold}</td>
                      <td className="px-4 py-3 text-right text-sm text-foreground">{v.shots_sold}</td>
                      <td className="px-4 py-3 text-right text-sm text-muted-foreground">{v.expected_bottles_from_shots}</td>
                      <td className={cn("px-4 py-3 text-right text-sm font-bold", hasWarning ? "text-yellow-400" : "text-foreground")}>
                        {v.total_bottles_consumed}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-foreground">{formatRWF(v.revenue)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
