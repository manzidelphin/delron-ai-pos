"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { KDSOrderCard } from "@/components/bar/kds-order-card";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface KDSItem {
  id: string;
  item_name: string;
  quantity: number;
  serve_as: "bottle" | "shot";
  status: "pending" | "preparing" | "ready";
  created_at: string;
  orders?: { floor_tables?: { table_number: number } | null } | null;
}

export default function BarDisplayPage() {
  const [items, setItems] = useState<KDSItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/bar/display");
      const json = await res.json();
      const all = [...(json.pending ?? []), ...(json.preparing ?? []), ...(json.ready ?? [])];
      setItems(all);
      setLastUpdated(new Date());
    } catch {
      // KDS should be silent on errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    // Supabase realtime subscription
    const supabase = createClient();
    const channel = supabase
      .channel("kds-order-items")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        () => { load(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch("/api/bar/display", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_item_id: id, status }),
      });
      if (!res.ok) return toast.error("Failed to update");
      setItems((prev) => status === "served" ? prev.filter((i) => i.id !== id) : prev.map((i) => i.id === id ? { ...i, status: status as KDSItem["status"] } : i));
    } catch {
      toast.error("Update failed");
    }
  };

  const pending = items.filter((i) => i.status === "pending");
  const preparing = items.filter((i) => i.status === "preparing");
  const ready = items.filter((i) => i.status === "ready");

  return (
    <div className="min-h-screen bg-slate-900 p-4">
      {/* KDS Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-black text-white tracking-widest">🍹 BAR KDS</h1>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-slate-400">Live</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            Updated {lastUpdated.toLocaleTimeString("en-RW", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
          <button
            onClick={load}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-6">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {/* Pending */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-3 h-3 rounded-full bg-yellow-500" />
              <h2 className="text-sm font-bold text-yellow-400 uppercase tracking-wider">
                New Orders ({pending.length})
              </h2>
            </div>
            <div className="space-y-3">
              {pending.length === 0 ? (
                <p className="text-center py-8 text-slate-600 text-sm">No new orders</p>
              ) : (
                pending.map((item) => (
                  <KDSOrderCard key={item.id} item={item} onStatusChange={updateStatus} />
                ))
              )}
            </div>
          </div>

          {/* Preparing */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
              <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider">
                Preparing ({preparing.length})
              </h2>
            </div>
            <div className="space-y-3">
              {preparing.length === 0 ? (
                <p className="text-center py-8 text-slate-600 text-sm">Nothing in progress</p>
              ) : (
                preparing.map((item) => (
                  <KDSOrderCard key={item.id} item={item} onStatusChange={updateStatus} />
                ))
              )}
            </div>
          </div>

          {/* Ready */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-3 h-3 rounded-full bg-green-500" />
              <h2 className="text-sm font-bold text-green-400 uppercase tracking-wider">
                Ready to Serve ({ready.length})
              </h2>
            </div>
            <div className="space-y-3">
              {ready.length === 0 ? (
                <p className="text-center py-8 text-slate-600 text-sm">Nothing ready yet</p>
              ) : (
                ready.map((item) => (
                  <KDSOrderCard key={item.id} item={item} onStatusChange={updateStatus} />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
