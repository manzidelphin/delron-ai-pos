"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/auth-store";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { formatRWF } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  ChefHat, Package, TrendingUp, AlertTriangle, Loader2, RotateCcw,
} from "lucide-react";
import Link from "next/link";

interface DashboardData {
  stats: {
    produced_today: number;
    sold_today: number;
    remaining_stock: number;
    wasted_today: number;
    revenue_today: number;
    profit_today: number;
  };
  chart_data: Array<{ label: string; produced: number; sold: number; wasted: number }>;
  top_items: Array<{ id: string; name: string; produced: number; sold: number; remaining: number; wasted: number }>;
  low_materials: Array<{ id: string; name: string; quantity: number; min_quantity: number; unit: string }>;
  today_logs: Array<{ quantity_produced: number; finished_goods?: { name: string } | null; staff?: { name: string } | null; production_time: string }>;
}

export default function BakeryDashboard() {
  const { isLoaded } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [finishedGoods, setFinishedGoods] = useState<Array<{ id: string; name: string; quantity: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [dashRes, itemsRes] = await Promise.all([
        fetch("/api/bakery/dashboard"),
        fetch("/api/bakery/finished-goods"),
      ]);
      if (dashRes.ok) setData(await dashRes.json());
      if (itemsRes.ok) {
        const json = await itemsRes.json();
        setFinishedGoods(json.items ?? []);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { if (isLoaded) load(); }, [isLoaded, load]);

  const stats = data?.stats;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Bakery Dashboard"
        description="Today's production overview for your bakery"
        actions={
          <div className="flex gap-2">
            <button onClick={load} className="flex items-center gap-2 h-10 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-all">
              <RotateCcw className="w-4 h-4" />
              Refresh
            </button>
            <Link href="/bakery/production" className="flex items-center gap-2 h-10 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold transition-all">
              <ChefHat className="w-4 h-4" />
              Log Production
            </Link>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard label="Produced Today" value={stats?.produced_today ?? 0} icon={<ChefHat className="w-5 h-5" />} color="blue" loading={isLoading} />
        <StatCard label="Sold Today" value={stats?.sold_today ?? 0} icon={<TrendingUp className="w-5 h-5" />} color="green" loading={isLoading} />
        <StatCard label="Remaining Stock" value={stats?.remaining_stock ?? 0} icon={<Package className="w-5 h-5" />} color="purple" loading={isLoading} />
        <StatCard label="Wasted Today" value={stats?.wasted_today ?? 0} icon={<AlertTriangle className="w-5 h-5" />} color="red" loading={isLoading} />
        <StatCard label="Revenue Today" value={formatRWF(stats?.revenue_today ?? 0)} icon={<TrendingUp className="w-5 h-5" />} color="green" loading={isLoading} />
        <StatCard label="Profit Today" value={formatRWF(stats?.profit_today ?? 0)} icon={<TrendingUp className="w-5 h-5" />} color={stats && stats.profit_today >= 0 ? "green" : "red"} loading={isLoading} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="xl:col-span-2 bg-slate-800 border border-slate-700 rounded-2xl p-5">
          <h3 className="font-semibold text-white mb-4">Production vs Sales — Last 7 Days</h3>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-slate-600 animate-spin" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data?.chart_data ?? []} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: 12 }}
                  labelStyle={{ color: "#f8fafc" }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="produced" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Produced" />
                <Bar dataKey="sold" fill="#10b981" radius={[4, 4, 0, 0]} name="Sold" />
                <Bar dataKey="wasted" fill="#ef4444" radius={[4, 4, 0, 0]} name="Wasted" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Low materials */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="font-semibold text-white">Low Ingredients</h3>
            </div>
            <Link href="/bakery/materials" className="text-xs text-blue-400 hover:underline">Manage →</Link>
          </div>
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-slate-700/50 rounded-xl animate-pulse" />)}
            </div>
          ) : (data?.low_materials ?? []).length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">All ingredients stocked ✓</div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {(data?.low_materials ?? []).map((m) => (
                <div key={m.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{m.name}</p>
                    <p className="text-xs text-red-400">{m.quantity} {m.unit} left</p>
                  </div>
                  <Link href="/bakery/materials" className="h-7 px-3 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 text-xs font-medium rounded-lg">
                    Restock
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top items + Today's log */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Top items */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700">
            <h3 className="font-semibold text-white">Today&apos;s Items</h3>
          </div>
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-slate-700/50 rounded-xl animate-pulse" />)}
            </div>
          ) : finishedGoods.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">No baked items set up yet</div>
          ) : (() => {
            const statsMap = new Map((data?.top_items ?? []).map((t) => [t.id, t]));
            return (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th className="text-left px-5 py-2 text-xs font-semibold text-slate-500 uppercase">Item</th>
                      <th className="text-center px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Baked</th>
                      <th className="text-center px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Sold</th>
                      <th className="text-center px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Left</th>
                      <th className="text-center px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Waste</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finishedGoods.map((fg) => {
                      const s = statsMap.get(fg.id);
                      return (
                        <tr key={fg.id} className="border-b border-slate-700/30 last:border-0 hover:bg-slate-700/20">
                          <td className="px-5 py-2.5 font-medium text-white">{fg.name}</td>
                          <td className="px-3 py-2.5 text-center text-blue-400">{s?.produced ?? 0}</td>
                          <td className="px-3 py-2.5 text-center text-green-400">{s?.sold ?? 0}</td>
                          <td className="px-3 py-2.5 text-center text-white">{fg.quantity}</td>
                          <td className="px-3 py-2.5 text-center text-red-400">{s?.wasted ?? 0}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>

        {/* Today's production log timeline */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
            <h3 className="font-semibold text-white">Production Timeline</h3>
            <Link href="/bakery/production" className="text-xs text-amber-400 hover:underline">+ Log now →</Link>
          </div>
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-slate-700/50 rounded-xl animate-pulse" />)}
            </div>
          ) : (data?.today_logs ?? []).length === 0 ? (
            <div className="p-8 text-center">
              <ChefHat className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No production logged today</p>
            </div>
          ) : (
            <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
              {(data?.today_logs ?? []).map((log, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-slate-700/30 last:border-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium">
                      {log.quantity_produced}× {(log.finished_goods as { name?: string } | null)?.name ?? "Item"}
                    </p>
                    <p className="text-xs text-slate-500">
                      by {(log.staff as { name?: string } | null)?.name ?? "Baker"} ·{" "}
                      {new Date(log.production_time).toLocaleTimeString("en-RW", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
