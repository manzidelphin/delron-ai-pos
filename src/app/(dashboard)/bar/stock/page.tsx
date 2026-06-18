"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Package, AlertTriangle, RefreshCw, TrendingDown, Plus, ClipboardList, Loader2 } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface StockItem {
  id: string;
  name: string;
  category: string;
  opening: number;
  restocked_today: number;
  sold_today: number;
  current: number;
  quantity_bottles: number;
  min_quantity: number;
  status: "ok" | "low_stock" | "out_of_stock";
}

interface RecentRestock {
  id: string;
  item_name: string;
  quantity_received: number;
  supplier_name: string | null;
  created_at: string;
}

interface Summary {
  total_items: number;
  low_stock: number;
  out_of_stock: number;
  restocked_today: number;
}

const STATUS_BADGE = {
  ok:           "bg-green-500/10 text-green-400 border-green-500/20",
  low_stock:    "bg-amber-500/10 text-amber-400 border-amber-500/20",
  out_of_stock: "bg-red-500/10 text-red-400 border-red-500/20",
};
const STATUS_LABEL = { ok: "OK", low_stock: "Low Stock", out_of_stock: "Out of Stock" };

const CATEGORY_COLORS: Record<string, string> = {
  spirits:    "text-purple-400",
  wine:       "text-rose-400",
  beer:       "text-amber-400",
  cocktail:   "text-pink-400",
  soft_drink: "text-cyan-400",
  juice:      "text-orange-400",
  other:      "text-slate-400",
};

export default function BarStockPage() {
  const router = useRouter();
  const [items, setItems] = useState<StockItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [recentRestocks, setRecentRestocks] = useState<RecentRestock[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bar/stock");
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setItems(data.items ?? []);
      setSummary(data.summary ?? null);
      setRecentRestocks(data.recent_restocks ?? []);
    } catch (e) {
      toast.error("Failed to load stock data");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const today = new Date().toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-amber-400" />
            Bar Stock
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">{today}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={load}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white text-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => router.push("/bar/stock/restock")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Restock
          </button>
          <button
            onClick={() => router.push("/bar/stock/closing")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition-colors"
          >
            <ClipboardList className="w-4 h-4" />
            Closing Count
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Items"       value={summary?.total_items ?? 0}     icon={<Package className="w-5 h-5" />}       color="blue"  loading={loading} />
        <StatCard label="Low Stock Alerts"  value={summary?.low_stock ?? 0}       icon={<AlertTriangle className="w-5 h-5" />}  color="amber" loading={loading} />
        <StatCard label="Out of Stock"      value={summary?.out_of_stock ?? 0}    icon={<TrendingDown className="w-5 h-5" />}   color="red"   loading={loading} />
        <StatCard label="Restocked Today"   value={summary?.restocked_today ?? 0} icon={<RefreshCw className="w-5 h-5" />}      color="green" loading={loading} />
      </div>

      {/* Stock Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Stock Movement — Today</h2>
          <span className="text-xs text-slate-500">{items.length} items</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-900/50">
                {["Item", "Category", "Opening", "Restocked", "Sold", "Current", "Status"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-slate-400 font-medium text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-400 mx-auto" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    No bar items found. Add items in Bar → Bar Stock (inventory).
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const movement = item.sold_today > 0 || item.restocked_today > 0;
                  return (
                    <tr key={item.id} className="hover:bg-slate-700/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-white">{item.name}</td>
                      <td className={cn("px-4 py-3 text-xs capitalize", CATEGORY_COLORS[item.category] ?? "text-slate-400")}>
                        {item.category}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {item.opening % 1 === 0 ? item.opening : item.opening.toFixed(1)} btl
                      </td>
                      <td className="px-4 py-3">
                        {item.restocked_today > 0 ? (
                          <span className="text-green-400 font-medium">+{item.restocked_today}</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {item.sold_today > 0 ? (
                          <span className="text-red-400">-{item.sold_today % 1 === 0 ? item.sold_today : item.sold_today.toFixed(1)}</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("font-semibold", movement ? "text-white" : "text-slate-400")}>
                          {item.current % 1 === 0 ? item.current : item.current.toFixed(1)} btl
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("px-2 py-0.5 rounded-full border text-xs font-medium", STATUS_BADGE[item.status])}>
                          {STATUS_LABEL[item.status]}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Restocks */}
      {recentRestocks.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700">
            <h2 className="text-sm font-semibold text-white">Recent Restocks</h2>
          </div>
          <div className="divide-y divide-slate-700/50">
            {recentRestocks.map((r) => (
              <div key={r.id} className="px-4 py-3 flex items-center justify-between text-sm">
                <div>
                  <span className="text-white font-medium">{r.item_name}</span>
                  {r.supplier_name && (
                    <span className="text-slate-500 text-xs ml-2">from {r.supplier_name}</span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-green-400 font-medium">+{r.quantity_received} btl</span>
                  <span className="text-slate-500 text-xs">
                    {new Date(r.created_at).toLocaleDateString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
