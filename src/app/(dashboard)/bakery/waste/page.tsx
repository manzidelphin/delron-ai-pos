"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { WasteForm } from "@/components/bakery/waste-form";
import { formatRWF } from "@/lib/utils";
import { AlertTriangle, RotateCcw, Trash2 } from "lucide-react";

interface WasteLog {
  id: string;
  item_name: string;
  quantity_wasted: number;
  reason: string;
  cost_of_waste: number;
  date: string;
  created_at: string;
  staff?: { name: string } | null;
}

interface FinishedGoodOption {
  id: string;
  name: string;
  quantity: number;
}

export default function WastePage() {
  const [logs, setLogs] = useState<WasteLog[]>([]);
  const [finishedGoods, setFinishedGoods] = useState<FinishedGoodOption[]>([]);
  const [stats, setStats] = useState({ totalToday: 0, totalTodayQty: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0]);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [wasteRes, fgRes] = await Promise.all([
        fetch(`/api/bakery/waste?from=${dateFrom}&to=${dateTo}`),
        fetch("/api/bakery/finished-goods"),
      ]);
      const [wasteJson, fgJson] = await Promise.all([wasteRes.json(), fgRes.json()]);
      if (wasteRes.ok) {
        setLogs(wasteJson.logs ?? []);
        setStats({ totalToday: wasteJson.total_today ?? 0, totalTodayQty: wasteJson.total_today_qty ?? 0 });
      }
      if (fgRes.ok) setFinishedGoods(fgJson.items ?? []);
    } finally {
      setIsLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const totalCostPeriod = logs.reduce((s, l) => s + l.cost_of_waste, 0);
  const totalQtyPeriod = logs.reduce((s, l) => s + l.quantity_wasted, 0);

  const mostWasted = logs.reduce((acc, l) => {
    acc[l.item_name] = (acc[l.item_name] || 0) + l.quantity_wasted;
    return acc;
  }, {} as Record<string, number>);
  const topItem = Object.entries(mostWasted).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Waste Logging"
        description="Track and reduce bakery waste"
        actions={
          <button onClick={load} className="flex items-center gap-2 h-10 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-all">
            <RotateCcw className="w-4 h-4" />
            Refresh
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Wasted Today (qty)" value={stats.totalTodayQty} icon={<Trash2 className="w-5 h-5" />} color="red" loading={isLoading} />
        <StatCard label="Wasted Today (value)" value={formatRWF(stats.totalToday)} icon={<AlertTriangle className="w-5 h-5" />} color="red" loading={isLoading} />
        <StatCard label="This Period (qty)" value={totalQtyPeriod} icon={<Trash2 className="w-5 h-5" />} color="amber" loading={isLoading} />
        <StatCard label="Most Wasted" value={topItem?.[0] ?? "—"} icon={<AlertTriangle className="w-5 h-5" />} color="amber" loading={isLoading} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Log waste form */}
        <div className="xl:col-span-1">
          <WasteForm items={finishedGoods} onSubmit={load} />
        </div>

        {/* History table */}
        <div className="xl:col-span-2 space-y-4">
          {/* Date filters */}
          <div className="flex gap-3 items-center flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-400">From</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 px-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-400">To</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                className="h-9 px-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="ml-auto text-sm text-slate-400">
              Period loss: <span className="text-red-400 font-bold">{formatRWF(totalCostPeriod)}</span>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900/50">
                    {["Date", "Item", "Qty", "Reason", "Cost Lost", "By"].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {isLoading
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          {Array.from({ length: 6 }).map((_, j) => (
                            <td key={j} className="px-5 py-4"><div className="h-4 bg-slate-700/60 rounded w-3/4" /></td>
                          ))}
                        </tr>
                      ))
                    : logs.length === 0
                    ? (
                      <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-500">No waste logged in this period</td></tr>
                    )
                    : logs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-700/20 transition-colors">
                          <td className="px-5 py-3.5 text-slate-400 text-xs whitespace-nowrap">{log.date}</td>
                          <td className="px-5 py-3.5 font-medium text-white">{log.item_name}</td>
                          <td className="px-5 py-3.5 text-red-400 font-bold">{log.quantity_wasted}</td>
                          <td className="px-5 py-3.5">
                            <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-lg">{log.reason}</span>
                          </td>
                          <td className="px-5 py-3.5 text-red-400 font-medium">{formatRWF(log.cost_of_waste)}</td>
                          <td className="px-5 py-3.5 text-slate-400 text-xs">{(log.staff as { name?: string } | null)?.name ?? "—"}</td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
