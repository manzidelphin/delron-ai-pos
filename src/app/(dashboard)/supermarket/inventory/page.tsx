"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { formatRWF } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Package,
  AlertTriangle,
  DollarSign,
  TrendingDown,
  Plus,
  Minus,
  RotateCcw,
  X,
  Loader2,
  Search,
} from "lucide-react";

interface InventoryStats {
  total_products: number;
  total_value: number;
  low_stock_count: number;
  out_of_stock_count: number;
}

interface LowStockItem {
  id: string;
  name: string;
  quantity_in_stock: number;
  min_quantity: number;
  category: string;
  unit: string;
  unit_price: number;
}

interface CategoryData {
  category: string;
  count: number;
  value: number;
}

interface AdjustModalState {
  productId: string;
  productName: string;
  currentStock: number;
  unit: string;
}

const BAR_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1",
];

export default function InventoryPage() {
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [categoryChart, setCategoryChart] = useState<CategoryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [adjustModal, setAdjustModal] = useState<AdjustModalState | null>(null);
  const [adjustMode, setAdjustMode] = useState<"set" | "add" | "subtract">("add");
  const [adjustValue, setAdjustValue] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadInventory = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/inventory");
      const json = await res.json();
      if (res.ok) {
        setStats(json.stats);
        setLowStock(json.low_stock ?? []);
        setCategoryChart(json.category_chart ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const handleAdjust = async () => {
    if (!adjustModal || !adjustValue) return;
    const val = parseFloat(adjustValue);
    if (isNaN(val) || val < 0) return;

    setIsAdjusting(true);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: adjustModal.productId,
          mode: adjustMode,
          quantity: val,
          note: adjustNote.trim() || undefined,
        }),
      });
      if (res.ok) {
        setAdjustModal(null);
        setAdjustValue("");
        setAdjustNote("");
        await loadInventory();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to adjust stock");
      }
    } catch {
      alert("Network error");
    } finally {
      setIsAdjusting(false);
    }
  };

  const filteredLowStock = lowStock.filter(
    (item) =>
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-xl p-3 shadow-xl">
          <p className="font-semibold text-white text-sm">{label}</p>
          <p className="text-blue-400 text-sm">{payload[0].value} products</p>
          {payload[1] && (
            <p className="text-green-400 text-xs">{formatRWF(payload[1].value)}</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Inventory Dashboard"
        description="Stock levels, low stock alerts, and category overview"
        actions={
          <button
            onClick={loadInventory}
            className="flex items-center gap-2 h-10 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Refresh
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Products"
          value={stats?.total_products ?? 0}
          icon={<Package className="w-5 h-5" />}
          color="blue"
          loading={isLoading}
        />
        <StatCard
          label="Inventory Value"
          value={formatRWF(stats?.total_value ?? 0)}
          icon={<DollarSign className="w-5 h-5" />}
          color="green"
          loading={isLoading}
        />
        <StatCard
          label="Low Stock"
          value={stats?.low_stock_count ?? 0}
          icon={<AlertTriangle className="w-5 h-5" />}
          color="amber"
          loading={isLoading}
        />
        <StatCard
          label="Out of Stock"
          value={stats?.out_of_stock_count ?? 0}
          icon={<TrendingDown className="w-5 h-5" />}
          color="red"
          loading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Low Stock Alert Table */}
        <div className="xl:col-span-2 bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="font-semibold text-white">Low & Out of Stock</h3>
              {lowStock.length > 0 && (
                <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-medium">
                  {lowStock.length} items
                </span>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter..."
                className="h-8 pl-8 pr-3 w-40 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-slate-700/50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredLowStock.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Package className="w-6 h-6 text-green-400" />
              </div>
              <p className="text-slate-400 font-medium">All stock levels look good!</p>
              <p className="text-slate-500 text-xs mt-1">No products below minimum quantity</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50 bg-slate-900/30">
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Min</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLowStock.map((item) => {
                    const isOut = item.quantity_in_stock <= 0;
                    return (
                      <tr key={item.id} className="border-b border-slate-700/30 last:border-0 hover:bg-slate-700/20">
                        <td className="px-5 py-3">
                          <p className="font-medium text-white truncate max-w-[200px]">{item.name}</p>
                          <p className="text-xs text-slate-500">{formatRWF(item.unit_price)}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{item.category}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-bold text-sm ${isOut ? "text-red-400" : "text-amber-400"}`}>
                            {item.quantity_in_stock} {item.unit}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-slate-500 text-xs">{item.min_quantity}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() =>
                              setAdjustModal({
                                productId: item.id,
                                productName: item.name,
                                currentStock: item.quantity_in_stock,
                                unit: item.unit,
                              })
                            }
                            className="h-7 px-3 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 text-xs font-medium rounded-lg transition-all"
                          >
                            Restock
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Category Chart */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700">
            <h3 className="font-semibold text-white">Stock by Category</h3>
            <p className="text-xs text-slate-500 mt-0.5">Product count per category</p>
          </div>

          {isLoading ? (
            <div className="p-4 h-64 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-slate-600 animate-spin" />
            </div>
          ) : categoryChart.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">No data yet</div>
          ) : (
            <div className="p-4">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={categoryChart} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="category"
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={90}
                    tickFormatter={(v: string) => v.length > 12 ? v.slice(0, 12) + "…" : v}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {categoryChart.map((_entry, index) => (
                      <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Legend */}
              <div className="mt-2 space-y-1">
                {categoryChart.slice(0, 5).map((cat, i) => (
                  <div key={cat.category} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }} />
                      <span className="text-slate-400 truncate max-w-[120px]">{cat.category}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-500">
                      <span>{cat.count} items</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {adjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-slate-700">
              <h2 className="font-bold text-white">Adjust Stock</h2>
              <button onClick={() => setAdjustModal(null)} className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-slate-900/50 rounded-xl p-3">
                <p className="font-semibold text-white">{adjustModal.productName}</p>
                <p className="text-sm text-slate-400 mt-0.5">
                  Current stock: <span className="text-white font-bold">{adjustModal.currentStock} {adjustModal.unit}</span>
                </p>
              </div>

              {/* Mode selector */}
              <div className="flex gap-2">
                {([
                  { key: "add", label: "Add Stock", icon: <Plus className="w-3.5 h-3.5" />, color: "green" },
                  { key: "subtract", label: "Remove", icon: <Minus className="w-3.5 h-3.5" />, color: "red" },
                  { key: "set", label: "Set to", icon: <RotateCcw className="w-3.5 h-3.5" />, color: "blue" },
                ] as const).map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setAdjustMode(m.key)}
                    className={`flex-1 h-9 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                      adjustMode === m.key
                        ? m.color === "green"
                          ? "bg-green-600 border-green-600 text-white"
                          : m.color === "red"
                          ? "bg-red-600 border-red-600 text-white"
                          : "bg-blue-600 border-blue-600 text-white"
                        : "border-slate-600 text-slate-400 hover:border-slate-500"
                    }`}
                  >
                    {m.icon}
                    {m.label}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300 block mb-1.5">
                  Quantity ({adjustModal.unit})
                </label>
                <input
                  type="number"
                  value={adjustValue}
                  onChange={(e) => setAdjustValue(e.target.value)}
                  placeholder="Enter quantity"
                  min="0"
                  autoFocus
                  className="w-full h-12 px-4 bg-slate-900 border border-slate-600 rounded-xl text-white text-lg font-bold placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {adjustValue && !isNaN(parseFloat(adjustValue)) && (
                  <p className="text-xs text-slate-500 mt-1">
                    New stock will be:{" "}
                    <span className="text-white font-medium">
                      {adjustMode === "set"
                        ? parseFloat(adjustValue)
                        : adjustMode === "add"
                        ? adjustModal.currentStock + parseFloat(adjustValue)
                        : Math.max(0, adjustModal.currentStock - parseFloat(adjustValue))}{" "}
                      {adjustModal.unit}
                    </span>
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300 block mb-1.5">Note (optional)</label>
                <input
                  type="text"
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  placeholder="e.g. Received from supplier, Damaged goods..."
                  className="w-full h-10 px-3 bg-slate-900 border border-slate-600 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={handleAdjust}
                disabled={isAdjusting || !adjustValue}
                className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isAdjusting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</>
                ) : (
                  "Update Stock"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
