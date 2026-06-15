"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { formatRWF } from "@/lib/utils";
import {
  TrendingUp,
  Package,
  ChefHat,
  Beer,
  CreditCard,
  Users,
  ArrowRight,
  BarChart3,
  ShoppingCart,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickStats {
  revenue_today: number;
  transactions_today: number;
  top_product: string;
  low_stock_count: number;
}

const REPORT_CARDS = [
  {
    key: "sales",
    href: "/reports/sales",
    icon: TrendingUp,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
    title: "Sales Report",
    desc: "Revenue trends, top products, payment methods, peak hours",
  },
  {
    key: "stock",
    href: "/reports/stock",
    icon: Package,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
    title: "Stock Report",
    desc: "Current stock levels, low stock alerts, stock valuation",
  },
  {
    key: "bakery",
    href: "/reports/bakery",
    icon: ChefHat,
    color: "text-orange-400",
    bg: "bg-orange-500/10 border-orange-500/20",
    title: "Bakery Report",
    desc: "Production vs sales vs waste, efficiency, baker performance",
    module: "bakery" as const,
  },
  {
    key: "bar",
    href: "/reports/bar",
    icon: Beer,
    color: "text-green-400",
    bg: "bg-green-500/10 border-green-500/20",
    title: "Bar Report",
    desc: "Bottles & shots, top drinks, shot variance, table revenue",
    module: "bar" as const,
  },
  {
    key: "credits",
    href: "/reports/credits",
    icon: CreditCard,
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
    title: "Credit Report",
    desc: "Outstanding debts, collection rate, aging analysis",
  },
  {
    key: "staff",
    href: "/reports/staff",
    icon: Users,
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/20",
    title: "Staff Report",
    desc: "Revenue per cashier, top performers, transaction breakdown",
  },
];

export default function ReportsHubPage() {
  const router = useRouter();
  const { hasModule, business } = useAuthStore();
  const [stats, setStats] = useState<QuickStats | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [salesRes, stockRes] = await Promise.all([
          fetch(`/api/reports/sales?from=${new Date().toISOString().split("T")[0]}&to=${new Date().toISOString().split("T")[0]}`),
          fetch("/api/reports/stock"),
        ]);
        const salesData = await salesRes.json();
        const stockData = await stockRes.json();

        setStats({
          revenue_today: salesData.kpis?.total_revenue ?? 0,
          transactions_today: salesData.kpis?.total_transactions ?? 0,
          top_product: salesData.top_products?.[0]?.item_name ?? "—",
          low_stock_count: (stockData.summary?.supermarket_low ?? 0) + (stockData.summary?.bar_low ?? 0) + (stockData.summary?.materials_low ?? 0),
        });
      } catch {}
    }
    load();
  }, []);

  const visibleCards = REPORT_CARDS.filter(
    (c) => !c.module || hasModule(c.module)
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-400" />
          Reports & Analytics
        </h1>
        <p className="text-slate-400 text-sm mt-0.5">
          {business?.name} · Full business intelligence
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Revenue Today", value: formatRWF(stats?.revenue_today ?? 0), icon: <TrendingUp className="w-5 h-5 text-blue-400" />, color: "border-blue-500/20" },
          { label: "Transactions Today", value: stats?.transactions_today ?? "—", icon: <ShoppingCart className="w-5 h-5 text-green-400" />, color: "border-green-500/20" },
          { label: "Best Selling Item", value: stats?.top_product ?? "—", icon: <Award className="w-5 h-5 text-amber-400" />, color: "border-amber-500/20", small: true },
          { label: "Low Stock Alerts", value: stats?.low_stock_count ?? "—", icon: <Package className="w-5 h-5 text-red-400" />, color: "border-red-500/20" },
        ].map((stat) => (
          <div
            key={stat.label}
            className={cn("bg-slate-800 border rounded-xl p-5", stat.color)}
          >
            <div className="mb-3">{stat.icon}</div>
            <p className={cn("font-bold text-white", stat.small ? "text-base truncate" : "text-2xl")}>
              {stat.value}
            </p>
            <p className="text-sm text-slate-400 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Report Cards */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
          Available Reports
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.key}
                onClick={() => router.push(card.href)}
                className="group bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl p-6 text-left transition-all hover:shadow-lg hover:shadow-black/20"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={cn("w-11 h-11 rounded-xl border flex items-center justify-center", card.bg)}>
                    <Icon className={cn("w-5 h-5", card.color)} />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="text-base font-bold text-white mb-1.5">{card.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{card.desc}</p>
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <span className="text-xs text-blue-400 font-medium group-hover:underline">
                    View Report →
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
