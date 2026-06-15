"use client";

import { useAuthStore } from "@/store/auth-store";
import { useAIStore } from "@/store/ai-store";
import { formatRWF } from "@/lib/utils";
import { useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  CreditCard,
  AlertTriangle,
  Zap,
  Store,
  ChefHat,
  Beer,
  UtensilsCrossed,
  ArrowRight,
  Users,
  Activity,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Briefing {
  greeting: string;
  revenue_summary: string;
  top_alert: string;
  stock_alerts: string[];
  credit_alerts: string[];
  tip: string;
  raw_data?: {
    yesterday_revenue: number;
    low_stock_count: number;
    overdue_count: number;
    open_tabs: number;
  };
}

function AIBriefingCard() {
  const { setOpen } = useAIStore();
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBriefing() {
      try {
        const res = await fetch("/api/ai/briefing");
        if (res.ok) setBriefing(await res.json());
      } catch {}
      setLoading(false);
    }
    fetchBriefing();
  }, []);

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-blue-500/10 via-blue-600/5 to-transparent border border-blue-500/20 rounded-xl p-4 flex items-center gap-3">
        <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
        <p className="text-sm text-muted-foreground">DELRON AI is preparing your briefing...</p>
      </div>
    );
  }

  if (!briefing) return null;

  return (
    <div className="bg-gradient-to-r from-blue-500/10 via-blue-600/5 to-transparent border border-blue-500/20 rounded-xl p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-sm font-bold text-foreground">DELRON AI — Daily Briefing</p>
        </div>
      </div>

      <p className="text-foreground font-semibold mb-1">{briefing.greeting}</p>
      <p className="text-sm text-muted-foreground mb-3">{briefing.revenue_summary}</p>

      <div className="space-y-1.5 mb-3">
        {briefing.top_alert && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-amber-400">⚠</span>
            <span className="text-foreground">{briefing.top_alert}</span>
          </div>
        )}
        {briefing.stock_alerts?.map((alert, i) => (
          <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>📦</span>
            <span>{alert}</span>
          </div>
        ))}
        {briefing.credit_alerts?.map((alert, i) => (
          <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>💳</span>
            <span>{alert}</span>
          </div>
        ))}
        {briefing.raw_data?.open_tabs ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>🍺</span>
            <span>Bar has {briefing.raw_data.open_tabs} open tabs</span>
          </div>
        ) : null}
      </div>

      {briefing.tip && (
        <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg px-3 py-2 mb-3">
          <p className="text-xs text-blue-400">
            <span className="font-semibold">💡 Tip: </span>
            {briefing.tip}
          </p>
        </div>
      )}

      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-blue-400 text-xs font-medium hover:text-blue-300 transition-colors"
      >
        Ask DELRON AI anything <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  );
}

function StatCard({
  label,
  value,
  change,
  icon,
  color = "blue",
}: {
  label: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color?: "blue" | "green" | "amber" | "red";
}) {
  const colors = {
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    green: "bg-green-500/10 text-green-400 border-green-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    red: "bg-red-500/10 text-red-400 border-red-500/20",
  };
  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:border-border/80 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className={cn("w-10 h-10 rounded-lg border flex items-center justify-center", colors[color])}>{icon}</div>
        {change !== undefined && (
          <div className={cn("flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full", change >= 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400")}>
            {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function ModuleCard({ label, amount, icon, color, active }: {
  label: string; amount: number; icon: React.ReactNode; color: string; active: boolean;
}) {
  if (!active) return null;
  return (
    <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
      <div className={cn("p-2 rounded-lg", color)}>{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold text-sm text-foreground">{formatRWF(amount)}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { business, staff, hasModule } = useAuthStore();

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {greeting()}, {staff?.name?.split(" ")[0] ?? "there"} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {business?.name ?? "Your business"} · {new Date().toLocaleDateString("en-RW", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* AI Briefing */}
      <AIBriefingCard />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Revenue today" value={formatRWF(0)} change={0} icon={<TrendingUp className="w-5 h-5" />} color="blue" />
        <StatCard label="Transactions" value="0" change={0} icon={<ShoppingCart className="w-5 h-5" />} color="green" />
        <StatCard label="Outstanding credits" value={formatRWF(0)} icon={<CreditCard className="w-5 h-5" />} color="amber" />
        <StatCard label="Low stock alerts" value="0" icon={<AlertTriangle className="w-5 h-5" />} color="red" />
      </div>

      {/* Module revenue */}
      {(hasModule("supermarket") || hasModule("bakery") || hasModule("bar") || hasModule("restaurant")) && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Revenue by Module</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ModuleCard label="Supermarket" amount={0} icon={<Store className="w-4 h-4 text-blue-400" />} color="bg-blue-500/10" active={hasModule("supermarket")} />
            <ModuleCard label="Bakery" amount={0} icon={<ChefHat className="w-4 h-4 text-amber-400" />} color="bg-amber-500/10" active={hasModule("bakery")} />
            <ModuleCard label="Bar" amount={0} icon={<Beer className="w-4 h-4 text-green-400" />} color="bg-green-500/10" active={hasModule("bar")} />
            <ModuleCard label="Restaurant" amount={0} icon={<UtensilsCrossed className="w-4 h-4 text-purple-400" />} color="bg-purple-500/10" active={hasModule("restaurant")} />
          </div>
        </div>
      )}

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" /> Live Transactions
            </h2>
            <span className="text-xs text-muted-foreground">Today</span>
          </div>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
              <ShoppingCart className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No transactions yet</p>
            <p className="text-xs text-muted-foreground mt-1">Transactions will appear here in real-time</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-400" /> Quick Actions
          </h2>
          <div className="space-y-2">
            {[
              { label: "New Sale", href: "/pos", icon: <ShoppingCart className="w-4 h-4" />, show: hasModule("supermarket") },
              { label: "Log Production", href: "/bakery", icon: <ChefHat className="w-4 h-4" />, show: hasModule("bakery") },
              { label: "Open Bar Tab", href: "/bar", icon: <Beer className="w-4 h-4" />, show: hasModule("bar") },
              { label: "Add Credit Sale", href: "/credits/new", icon: <CreditCard className="w-4 h-4" />, show: true },
              { label: "Manage Staff", href: "/staff", icon: <Users className="w-4 h-4" />, show: staff?.role === "owner" || staff?.role === "manager" },
            ].filter((a) => a.show).map((action) => (
              <a
                key={action.href}
                href={action.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors text-sm font-medium text-foreground group"
              >
                <span className="text-muted-foreground group-hover:text-foreground transition-colors">{action.icon}</span>
                {action.label}
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
