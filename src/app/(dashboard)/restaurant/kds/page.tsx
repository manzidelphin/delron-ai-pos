"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { KitchenCard, type KitchenItem } from "@/components/restaurant/kitchen-card";
import { Monitor, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface KDSData {
  pending:   KitchenItem[];
  preparing: KitchenItem[];
  ready:     KitchenItem[];
}

const COLUMNS: { key: keyof KDSData; label: string; color: string; dotColor: string }[] = [
  { key: "pending",   label: "New Orders",   color: "border-yellow-500/30", dotColor: "bg-yellow-400" },
  { key: "preparing", label: "Cooking",      color: "border-orange-500/30", dotColor: "bg-orange-400" },
  { key: "ready",     label: "Ready",        color: "border-green-500/30",  dotColor: "bg-green-400"  },
];

export default function RestaurantKDSPage() {
  const [data, setData] = useState<KDSData>({ pending: [], preparing: [], ready: [] });
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    try {
      const res  = await fetch("/api/restaurant/kds");
      const json = await res.json();
      setData({
        pending:   json.pending   ?? [],
        preparing: json.preparing ?? [],
        ready:     json.ready     ?? [],
      });
    } catch {
      // Silent — KDS must stay up even on network hiccups
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Force time-ago updates every 10 seconds
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 10_000);
    return () => clearInterval(t);
  }, []);
  void tick; // suppress unused-var warning

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("restaurant-kds")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        (payload) => {
          const row = payload.new as { item_type?: string };
          if (row?.item_type === "menu_item") load();
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const handleStatusChange = async (id: string, status: string) => {
    // Optimistic update
    setData((prev) => {
      const allItems = [...prev.pending, ...prev.preparing, ...prev.ready];
      const updated  = allItems.map((i) => (i.id === id ? { ...i, status: status as KitchenItem["status"] } : i));
      if (status === "served") {
        return {
          pending:   updated.filter((i) => i.status === "pending"),
          preparing: updated.filter((i) => i.status === "preparing"),
          ready:     updated.filter((i) => i.status === "ready"),
        };
      }
      return {
        pending:   updated.filter((i) => i.status === "pending"),
        preparing: updated.filter((i) => i.status === "preparing"),
        ready:     updated.filter((i) => i.status === "ready"),
      };
    });

    try {
      const res = await fetch("/api/restaurant/kds", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ order_item_id: id, status }),
      });
      if (!res.ok) {
        toast.error("Failed to update status");
        load(); // Revert on error
      }
    } catch {
      toast.error("Network error");
      load();
    }
  };

  const total = data.pending.length + data.preparing.length + data.ready.length;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-3">
          <Monitor className="w-5 h-5 text-orange-400" />
          <h1 className="text-lg font-bold text-white">Kitchen Display</h1>
          {total > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-xs font-bold">
              {total} active
            </span>
          )}
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors text-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />Refresh
        </button>
      </div>

      {/* Columns */}
      <div className="flex-1 grid grid-cols-3 gap-0 overflow-hidden">
        {COLUMNS.map((col) => (
          <div key={col.key} className={cn("flex flex-col border-r border-slate-700 last:border-r-0", loading && "opacity-50")}>
            {/* Column header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700 shrink-0">
              <div className={cn("w-2 h-2 rounded-full", col.dotColor)} />
              <span className="text-sm font-bold text-white">{col.label}</span>
              <span className="ml-auto text-xs font-bold text-slate-500">
                {data[col.key].length}
              </span>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {data[col.key].length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-600">
                  <div className={cn("w-12 h-12 rounded-2xl border-2 flex items-center justify-center mb-3", col.color)}>
                    <Monitor className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-medium">
                    {col.key === "pending" ? "No new orders" : col.key === "preparing" ? "Nothing cooking" : "Nothing ready"}
                  </p>
                </div>
              ) : (
                data[col.key].map((item) => (
                  <KitchenCard
                    key={item.id}
                    item={item}
                    onStatusChange={handleStatusChange}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
