"use client";

import { useAuthStore } from "@/store/auth-store";
import { useAIStore } from "@/store/ai-store";
import { formatRWF, formatTime } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";
import {
  TrendingUp, TrendingDown, ShoppingCart, CreditCard, AlertTriangle, Zap,
  Store, ChefHat, Beer, UtensilsCrossed, ArrowRight, Users, Activity,
  Loader2, Package, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { useRouter } from "next/navigation";

interface Briefing {
  greeting: string; revenue_summary: string; top_alert: string;
  stock_alerts: string[]; credit_alerts: string[]; tip: string;
  raw_data?: { yesterday_revenue: number; low_stock_count: number; overdue_count: number; open_tabs: number };
}

interface DashboardData {
  revenue: {
    today: number; today_change: number;
    week: number; week_change: number;
    month: number; month_change: number;
    by_module: Record<string, number>;
    transactions_today: number;
  };
  credits: { outstanding: number; count: number; overdue_count: number };
  alerts: { low_stock: number; overdue_credits: number; open_tabs: number };
  recent_transactions: {id: string; total: number; payment_method: string; module_source: string | null; created_at: string; cashier_name: string}[];
  hourly_today: {hour: string; revenue: number}[];
  last_7_days: {date: string; revenue: number}[];
  top_sellers_today: {name: string; module: string; quantity: number; revenue: number}[];
  staff_on_duty: {id: string; name: string; role: string; transactions: number; revenue: number}[];
}

function AIBriefingCard() {
  const { setOpen } = useAIStore();
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ai/briefing").then(r => r.ok ? r.json() : null).then(d => { setBriefing(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="bg-gradient-to-r from-blue-500/10 via-blue-600/5 to-transparent border border-blue-500/20 rounded-xl p-4 flex items-center gap-3">
      <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
      <p className="text-sm text-slate-400">DELRON AI is preparing your briefing...</p>
    </div>
  );
  if (!briefing) return null;
  return (
    <div className="bg-gradient-to-r from-blue-500/10 via-blue-600/5 to-transparent border border-blue-500/20 rounded-xl p-5">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-blue-400" />
        </div>
        <p className="text-sm font-bold text-white">DELRON AI — Daily Briefing</p>
      </div>
      <p className="text-white font-semibold mb-1">{briefing.greeting}</p>
      <p className="text-sm text-slate-400 mb-3">{briefing.revenue_summary}</p>
      <div className="space-y-1.5 mb-3">
        {briefing.top_alert && <div className="flex items-center gap-2 text-sm"><span className="text-amber-400">⚠</span><span className="text-white">{briefing.top_alert}</span></div>}
        {briefing.stock_alerts?.map((a, i) => <div key={i} className="flex items-center gap-2 text-sm text-slate-400"><span>📦</span><span>{a}</span></div>)}
        {briefing.credit_alerts?.map((a, i) => <div key={i} className="flex items-center gap-2 text-sm text-slate-400"><span>💳</span><span>{a}</span></div>)}
        {briefing.raw_data?.open_tabs ? <div className="flex items-center gap-2 text-sm text-slate-400"><span>🍺</span><span>Bar has {briefing.raw_data.open_tabs} open tabs</span></div> : null}
      </div>
      {briefing.tip && <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg px-3 py-2 mb-3"><p className="text-xs text-blue-400"><span className="font-semibold">💡 Tip: </span>{briefing.tip}</p></div>}
      <button onClick={() => setOpen(true)} className="flex items-center gap-1 text-blue-400 text-xs font-medium hover:text-blue-300 transition-colors">
        Ask DELRON AI anything <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  );
}

function RevCard({ label, value, change, icon, color = "blue" }: { label: string; value: string; change?: number; icon: React.ReactNode; color?: "blue"|"green"|"amber"|"red" }) {
  const colors = { blue: "bg-blue-500/10 text-blue-400 border-blue-500/20", green: "bg-green-500/10 text-green-400 border-green-500/20", amber: "bg-amber-500/10 text-amber-400 border-amber-500/20", red: "bg-red-500/10 text-red-400 border-red-500/20" };
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 hover:border-slate-600 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className={cn("w-10 h-10 rounded-lg border flex items-center justify-center", colors[color])}>{icon}</div>
        {change !== undefined && (
          <div className={cn("flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full", change >= 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400")}>
            {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}

const MODULE_ICON: Record<string, React.ReactNode> = {
  supermarket: <Store className="w-4 h-4 text-blue-400" />,
  bakery: <ChefHat className="w-4 h-4 text-amber-400" />,
  bar: <Beer className="w-4 h-4 text-green-400" />,
  restaurant: <UtensilsCrossed className="w-4 h-4 text-purple-400" />,
};
const MODULE_COLOR: Record<string, string> = { supermarket: "bg-blue-500/10", bakery: "bg-amber-500/10", bar: "bg-green-500/10", restaurant: "bg-purple-500/10" };
const MODULE_LABEL: Record<string, string> = { supermarket: "Supermarket", bakery: "Bakery", bar: "Bar", restaurant: "Restaurant" };

export default function DashboardPage() {
  const router = useRouter();
  const { business, staff, activeOperator, hasModule } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) setData(await res.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const activeModules = (["supermarket", "bakery", "bar", "restaurant"] as const).filter((m) => hasModule(m));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          {greeting()}, {(activeOperator?.name ?? staff?.name)?.split(" ")[0] ?? "there"} 👋
        </h1>
        <p className="text-slate-400 text-sm mt-0.5">
          {business?.name ?? "Your business"} · {new Date().toLocaleDateString("en-RW", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* AI Briefing */}
      <AIBriefingCard />

      {/* Revenue Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <RevCard label="Revenue today" value={formatRWF(data?.revenue.today ?? 0)} change={data?.revenue.today_change} icon={<TrendingUp className="w-5 h-5" />} color="blue" />
        <RevCard label="This week" value={formatRWF(data?.revenue.week ?? 0)} change={data?.revenue.week_change} icon={<ShoppingCart className="w-5 h-5" />} color="green" />
        <RevCard label="This month" value={formatRWF(data?.revenue.month ?? 0)} change={data?.revenue.month_change} icon={<Activity className="w-5 h-5" />} color="amber" />
        <RevCard label={`Outstanding (${data?.credits.count ?? 0} customers)`} value={formatRWF(data?.credits.outstanding ?? 0)} icon={<CreditCard className="w-5 h-5" />} color="red" />
      </div>

      {/* Module Breakdown */}
      {activeModules.length > 1 && (
        <div>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Today by Module</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {activeModules.map((m) => (
              <div key={m} className="flex items-center gap-3 p-4 bg-slate-800 border border-slate-700 rounded-xl">
                <div className={cn("p-2 rounded-lg", MODULE_COLOR[m])}>{MODULE_ICON[m]}</div>
                <div>
                  <p className="text-xs text-slate-400">{MODULE_LABEL[m]}</p>
                  <p className="font-bold text-white text-sm">{formatRWF(data?.revenue.by_module[m] ?? 0)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerts + Live Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Live Activity Feed */}
        <div className="lg:col-span-2 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" /> Live Transactions
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              {data?.revenue.transactions_today ?? 0} today
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
            </div>
          ) : !data?.recent_transactions.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShoppingCart className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-sm text-slate-400">No transactions yet today</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {data.recent_transactions.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-700/20 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                    {MODULE_ICON[tx.module_source ?? ""] ?? <ShoppingCart className="w-4 h-4 text-slate-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white capitalize">{MODULE_LABEL[tx.module_source ?? ""] ?? "Sale"}</p>
                    <p className="text-xs text-slate-400">{tx.cashier_name} · {tx.payment_method.replace("_", " ")}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-green-400">{formatRWF(tx.total)}</p>
                    <p className="text-xs text-slate-500">{formatTime(tx.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alerts Panel */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Needs Attention</h2>
          {[
            { icon: <AlertTriangle className="w-4 h-4" />, label: "Low stock items", value: data?.alerts.low_stock ?? 0, color: "amber", href: "/reports/stock" },
            { icon: <CreditCard className="w-4 h-4" />, label: "Overdue credits", value: data?.alerts.overdue_credits ?? 0, color: "red", href: "/credits" },
            { icon: <Beer className="w-4 h-4" />, label: "Open bar tabs", value: data?.alerts.open_tabs ?? 0, color: "blue", href: "/bar/tables", show: hasModule("bar") },
          ].filter((a) => a.show !== false).map((alert) => (
            <button
              key={alert.label}
              onClick={() => router.push(alert.href)}
              className={cn(
                "w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left hover:scale-[1.01]",
                alert.value > 0
                  ? alert.color === "red" ? "bg-red-500/5 border-red-500/20 hover:bg-red-500/10" : alert.color === "amber" ? "bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10" : "bg-blue-500/5 border-blue-500/20 hover:bg-blue-500/10"
                  : "bg-slate-800 border-slate-700 hover:bg-slate-700/50"
              )}
            >
              <div className={cn("p-2 rounded-lg",
                alert.value > 0
                  ? alert.color === "red" ? "bg-red-500/10 text-red-400" : alert.color === "amber" ? "bg-amber-500/10 text-amber-400" : "bg-blue-500/10 text-blue-400"
                  : "bg-slate-700 text-slate-400"
              )}>
                {alert.icon}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{alert.label}</p>
              </div>
              <span className={cn("text-xl font-bold", alert.value > 0 ? alert.color === "red" ? "text-red-400" : alert.color === "amber" ? "text-amber-400" : "text-blue-400" : "text-slate-500")}>
                {alert.value}
              </span>
            </button>
          ))}

          {/* Quick Actions */}
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest pt-1">Quick Actions</h2>
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            {[
              { label: "New Sale", href: "/supermarket/pos", icon: <ShoppingCart className="w-4 h-4" />, show: hasModule("supermarket") },
              { label: "Log Production", href: "/bakery/production", icon: <ChefHat className="w-4 h-4" />, show: hasModule("bakery") },
              { label: "View Reports", href: "/reports", icon: <TrendingUp className="w-4 h-4" />, show: true },
              { label: "Add Credit", href: "/credits", icon: <CreditCard className="w-4 h-4" />, show: true },
            ].filter((a) => a.show).map((action, i) => (
              <button
                key={action.href}
                onClick={() => router.push(action.href)}
                className={cn("w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-white hover:bg-slate-700/40 transition-colors text-left", i > 0 && "border-t border-slate-700/60")}
              >
                <span className="text-slate-400">{action.icon}</span>
                {action.label}
                <ArrowRight className="w-3.5 h-3.5 text-slate-600 ml-auto" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Charts */}
      {mounted && data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Last 7 days */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" /> Revenue Last 7 Days
            </h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data.last_7_days}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }} formatter={(v: number) => [formatRWF(v), "Revenue"]} />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6", r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Today hourly */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-green-400" /> Today by Hour
            </h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.hourly_today.filter((_, i) => i % 2 === 0 || data.hourly_today[i].revenue > 0)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="hour" tick={{ fill: "#94a3b8", fontSize: 9 }} interval={3} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }} formatter={(v: number) => [formatRWF(v), "Revenue"]} />
                <Bar dataKey="revenue" fill="#22c55e" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Bottom grid: top sellers + staff on duty */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top sellers */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700">
            <h2 className="font-semibold text-white flex items-center gap-2"><Package className="w-4 h-4 text-amber-400" /> Top Sellers Today</h2>
          </div>
          {!data?.top_sellers_today.length ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-500 text-sm">
              <Package className="w-6 h-6 mb-2 text-slate-600" />No sales yet
            </div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {data.top_sellers_today.map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <span className="text-slate-500 text-xs w-5 text-center font-bold">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{item.name}</p>
                    <p className="text-xs text-slate-400 capitalize">{item.module} · {item.quantity} units</p>
                  </div>
                  <p className="text-sm font-bold text-green-400">{formatRWF(item.revenue)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Staff on duty */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700">
            <h2 className="font-semibold text-white flex items-center gap-2"><Users className="w-4 h-4 text-purple-400" /> Staff Activity Today</h2>
          </div>
          {!data?.staff_on_duty.length ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-500 text-sm">
              <Users className="w-6 h-6 mb-2 text-slate-600" />No staff activity yet
            </div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {data.staff_on_duty.map((s) => (
                <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-blue-400">{s.name[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{s.name}</p>
                    <p className="text-xs text-slate-400 capitalize">{s.role} · {s.transactions} transactions</p>
                  </div>
                  <p className="text-sm font-semibold text-white">{formatRWF(s.revenue)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
