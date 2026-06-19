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
  quantity: number;
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

export default function SupermarketStockPage() {
  const router = useRouter();
  const [items, setItems] = useState<StockItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [recentRestocks, setRecentRestocks] = useState<RecentRestock[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/supermarket/stock");
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setItems(data.items ?? []);
      setSummary(data.summary ?? null);
      setRecentRestocks(data.recent_restocks ?? []);
    } catch {
      toast.error("Failed to load stock data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const today = new Date().toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-400" />
            Supermarket Stock
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">{today}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground text-sm transition-colors">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={() => router.push("/supermarket/stock/restock")} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Restock
          </button>
          <button onClick={() => router.push("/supermarket/stock/closing")} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition-colors">
            <ClipboardList className="w-4 h-4" /> Closing Count
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Products"    value={summary?.total_items ?? 0}      icon={<Package className="w-5 h-5" />}       color="blue"  loading={loading} />
        <StatCard label="Low Stock Alerts"  value={summary?.low_stock ?? 0}        icon={<AlertTriangle className="w-5 h-5" />}  color="amber" loading={loading} />
        <StatCard label="Out of Stock"      value={summary?.out_of_stock ?? 0}     icon={<TrendingDown className="w-5 h-5" />}   color="red"   loading={loading} />
        <StatCard label="Restocked Today"   value={summary?.restocked_today ?? 0}  icon={<RefreshCw className="w-5 h-5" />}      color="green" loading={loading} />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Stock Movement — Today</h2>
          <span className="text-xs text-muted-foreground">{items.length} products</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Product", "Category", "Opening", "Restocked", "Sold", "Current", "Status"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-muted-foreground font-medium text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12"><Loader2 className="w-5 h-5 animate-spin text-blue-400 mx-auto" /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">No active products found.</td></tr>
              ) : items.map((item) => {
                const movement = item.sold_today > 0 || item.restocked_today > 0;
                return (
                  <tr key={item.id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{item.name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground capitalize">{item.category}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.opening} pcs</td>
                    <td className="px-4 py-3">
                      {item.restocked_today > 0 ? <span className="text-green-400 font-medium">+{item.restocked_today}</span> : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {item.sold_today > 0 ? <span className="text-red-400">-{item.sold_today}</span> : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("font-semibold", movement ? "text-foreground" : "text-muted-foreground")}>{item.current} pcs</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2 py-0.5 rounded-full border text-xs font-medium", STATUS_BADGE[item.status])}>{STATUS_LABEL[item.status]}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {recentRestocks.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Recent Restocks</h2>
          </div>
          <div className="divide-y divide-border/50">
            {recentRestocks.map((r) => (
              <div key={r.id} className="px-4 py-3 flex items-center justify-between text-sm">
                <div>
                  <span className="text-foreground font-medium">{r.item_name}</span>
                  {r.supplier_name && <span className="text-muted-foreground text-xs ml-2">from {r.supplier_name}</span>}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-green-400 font-medium">+{r.quantity_received} pcs</span>
                  <span className="text-muted-foreground text-xs">
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
