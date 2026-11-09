"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Wine, Users, TrendingUp, AlertTriangle, RefreshCw } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { formatRWF } from "@/lib/utils";
import { toast } from "sonner";

interface DashboardData {
  stats: {
    open_tabs: number;
    today_revenue: number;
    today_orders: number;
    low_stock_count: number;
  };
  open_tabs: Array<{ id: string; total_amount: number; created_at: string }>;
  low_stock: Array<{ id: string; name: string; quantity_bottles: number; reorder_point: number }>;
  hourly_chart: Array<{ hour: string; revenue: number }>;
}

export default function BarDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bar/dashboard");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const stats = data?.stats;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bar Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Real-time bar overview</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-foreground hover:bg-accent/80 transition-colors text-sm font-medium"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Open Tabs"
          value={stats?.open_tabs ?? 0}
          icon={<Users className="w-5 h-5" />}
          loading={loading}
          color="blue"
        />
        <StatCard
          label="Today&apos;s Revenue"
          value={loading ? "..." : formatRWF(stats?.today_revenue ?? 0)}
          icon={<TrendingUp className="w-5 h-5" />}
          loading={loading}
          color="green"
        />
        <StatCard
          label="Today&apos;s Orders"
          value={stats?.today_orders ?? 0}
          icon={<Wine className="w-5 h-5" />}
          loading={loading}
          color="purple"
        />
        <StatCard
          label="Low Stock Items"
          value={stats?.low_stock_count ?? 0}
          icon={<AlertTriangle className="w-5 h-5" />}
          loading={loading}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hourly chart */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5">
          <h2 className="text-base font-bold text-foreground mb-4">Hourly Revenue (Today)</h2>
          {loading ? (
            <div className="h-48 bg-muted/30 rounded-xl animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data?.hourly_chart ?? []} barSize={8}>
                <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip
                  contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
                  labelStyle={{ color: "#94a3b8" }}
                  formatter={(v: number) => [formatRWF(v), "Revenue"]}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Low stock */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="text-base font-bold text-foreground mb-4">Low Stock Alert</h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-muted/30 rounded-xl animate-pulse" />)}
            </div>
          ) : (data?.low_stock ?? []).length === 0 ? (
            <p className="text-muted-foreground text-sm">All items well stocked!</p>
          ) : (
            <div className="space-y-2">
              {(data?.low_stock ?? []).map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <p className="text-sm font-medium text-foreground truncate pr-2">{item.name}</p>
                  <span className="text-sm font-bold text-red-400 shrink-0">{item.quantity_bottles} btl</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Open tabs */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h2 className="text-base font-bold text-foreground mb-4">Open Tabs</h2>
        {loading ? (
          <div className="h-24 bg-muted/30 rounded-xl animate-pulse" />
        ) : (data?.open_tabs ?? []).length === 0 ? (
          <p className="text-muted-foreground text-sm">No open tabs right now.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {(data?.open_tabs ?? []).map((tab) => (
              <div key={tab.id} className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Tab</p>
                <p className="text-base font-bold text-foreground">{formatRWF(tab.total_amount)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(tab.created_at).toLocaleTimeString("en-RW", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
