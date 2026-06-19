"use client";

import { useEffect, useState, useCallback } from "react";
import { UtensilsCrossed, ChefHat, Monitor, RefreshCw, Clock, TrendingUp } from "lucide-react";
import { formatRWF } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";

interface DashboardData {
  menu_items_count: number;
  pending_orders: number;
  today_revenue: number;
  today_orders: number;
}

export default function RestaurantDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [menuRes, kdsRes] = await Promise.all([
        fetch("/api/restaurant/menu"),
        fetch("/api/restaurant/kds"),
      ]);
      const [menuJson, kdsJson] = await Promise.all([menuRes.json(), kdsRes.json()]);

      const activeItems = (menuJson.items ?? []).filter((i: { is_active: boolean }) => i.is_active).length;
      const pending     = (kdsJson.pending  ?? []).length;
      const preparing   = (kdsJson.preparing ?? []).length;

      setData({
        menu_items_count: activeItems,
        pending_orders:   pending + preparing,
        today_revenue:    0,
        today_orders:     0,
      });
    } catch {
      toast.error("Failed to load restaurant data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const QUICK_LINKS = [
    { href: "/restaurant/menu", icon: <UtensilsCrossed className="w-6 h-6" />, label: "Menu Management", desc: "Add, edit, and manage food items with recipes", color: "bg-orange-500/10 border-orange-500/20 hover:border-orange-500/40" },
    { href: "/restaurant/kds",  icon: <Monitor className="w-6 h-6" />,         label: "Kitchen Display", desc: "Real-time order queue for the kitchen",        color: "bg-green-500/10 border-green-500/20 hover:border-green-500/40"  },
    { href: "/bar/pos",         icon: <ChefHat className="w-6 h-6" />,         label: "Take Orders",     desc: "Use Bar POS — select the Food category",       color: "bg-blue-500/10 border-blue-500/20 hover:border-blue-500/40"   },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Restaurant</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Kitchen operations overview</p>
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
        {[
          { label: "Active Menu Items",    value: loading ? "—" : data?.menu_items_count ?? 0,   icon: <UtensilsCrossed className="w-5 h-5 text-orange-400" />, sub: "on POS" },
          { label: "Orders in Kitchen",    value: loading ? "—" : data?.pending_orders ?? 0,     icon: <Clock className="w-5 h-5 text-yellow-400" />,           sub: "pending + cooking" },
          { label: "Today Revenue",        value: loading ? "—" : formatRWF(data?.today_revenue ?? 0), icon: <TrendingUp className="w-5 h-5 text-green-400" />, sub: "food sales" },
          { label: "Today Orders",         value: loading ? "—" : data?.today_orders ?? 0,       icon: <ChefHat className="w-5 h-5 text-blue-400" />,           sub: "food orders" },
        ].map((stat) => (
          <div key={stat.label} className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-muted-foreground text-xs font-medium">{stat.label}</p>
              {stat.icon}
            </div>
            <p className="text-2xl font-black text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div>
        <h2 className="text-lg font-bold text-foreground mb-4">Quick Access</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-start gap-4 p-5 rounded-2xl border transition-all ${link.color}`}
            >
              <div className="text-foreground mt-0.5">{link.icon}</div>
              <div>
                <p className="font-bold text-foreground">{link.label}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{link.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
