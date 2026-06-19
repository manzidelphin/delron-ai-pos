"use client";

import { useEffect, useState } from "react";
import { StatCard } from "@/components/ui/stat-card";
import { formatRWF } from "@/lib/utils";
import { Package, AlertTriangle, DollarSign, FileDown, TableProperties, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";

const STATUS_BADGE: Record<string, string> = {
  ok: "bg-green-500/10 text-green-400 border-green-500/20",
  low_stock: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  out_of_stock: "bg-red-500/10 text-red-400 border-red-500/20",
  overstocked: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

const STATUS_LABEL: Record<string, string> = {
  ok: "OK",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
  overstocked: "Overstocked",
};

type Tab = "supermarket" | "bar" | "materials" | "kitchen";

interface StockData {
  supermarket: {id: string; name: string; category: string; quantity: number; min_quantity: number; unit: string; cost_price: number; price: number; status: string}[];
  bar: {id: string; name: string; category: string; quantity_bottles: number; shots_remaining: number; min_quantity: number; price_per_bottle: number; price_per_shot: number; shots_per_bottle: number; status: string}[];
  materials: {id: string; name: string; unit: string; quantity: number; min_quantity: number; cost_per_unit: number; status: string}[];
  valuation: { supermarket: number; bar: number; materials: number; total: number };
  summary: {
    supermarket_total: number;
    supermarket_low: number;
    supermarket_out: number;
    bar_total: number;
    bar_low: number;
    materials_total: number;
    materials_low: number;
  };
}

interface KitchenMaterial {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  min_quantity: number;
  cost_per_unit: number;
  status: string;
  used_in: string[];
}

export default function StockReportPage() {
  const { hasModule } = useAuthStore();
  const [data,           setData]          = useState<StockData | null>(null);
  const [kitchenMats,    setKitchenMats]   = useState<KitchenMaterial[]>([]);
  const [kitchenValue,   setKitchenValue]  = useState(0);
  const [loading,        setLoading]       = useState(true);
  const [tab,            setTab]           = useState<Tab>("supermarket");
  const [statusFilter,   setStatusFilter]  = useState("all");
  const [exporting,      setExporting]     = useState(false);

  // Auto-select first available tab on mount
  useEffect(() => {
    if (!hasModule("supermarket")) {
      if (hasModule("bar"))          setTab("bar");
      else if (hasModule("bakery"))  setTab("materials");
      else if (hasModule("restaurant")) setTab("kitchen");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const fetches: Promise<Response>[] = [fetch("/api/reports/stock")];
        if (hasModule("restaurant")) fetches.push(fetch("/api/restaurant/stock"));

        const responses = await Promise.all(fetches);
        const jsons     = await Promise.all(responses.map((r) => r.json()));

        setData(jsons[0]);
        if (hasModule("restaurant") && jsons[1]) {
          setKitchenMats(jsons[1].materials ?? []);
          setKitchenValue(jsons[1].valuation ?? 0);
        }
      } catch {
        toast.error("Failed to load stock report");
      } finally {
        setLoading(false);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExportPDF = async () => {
    if (!data) return;
    setExporting(true);
    try {
      const { exportToPDF } = await import("@/lib/export");
      if (tab === "supermarket") {
        await exportToPDF(
          "Stock Report — Supermarket",
          data.supermarket.map((p) => ({
            name: p.name, category: p.category ?? "—",
            stock: `${p.quantity} ${p.unit}`, min: `${p.min_quantity} ${p.unit}`,
            status: STATUS_LABEL[p.status] ?? p.status,
            value: formatRWF(p.quantity * p.cost_price),
          })),
          [
            { header: "Product", key: "name" }, { header: "Category", key: "category" },
            { header: "In Stock", key: "stock" }, { header: "Min Stock", key: "min" },
            { header: "Status", key: "status" }, { header: "Stock Value", key: "value" },
          ],
          undefined,
          undefined,
          [
            { label: "Total Products", value: String(data.supermarket.length) },
            { label: "Low Stock", value: String(data.summary.supermarket_low) },
            { label: "Out of Stock", value: String(data.summary.supermarket_out) },
            { label: "Total Value", value: formatRWF(data.valuation.supermarket) },
          ]
        );
      } else if (tab === "bar") {
        await exportToPDF(
          "Stock Report — Bar",
          data.bar.map((i) => ({
            name: i.name, category: i.category ?? "—",
            bottles: String(i.quantity_bottles),
            shots: i.shots_per_bottle > 1 ? String(i.shots_remaining) : "—",
            min: String(i.min_quantity),
            status: STATUS_LABEL[i.status] ?? i.status,
            value: formatRWF(i.quantity_bottles * i.price_per_bottle),
          })),
          [
            { header: "Item", key: "name" }, { header: "Category", key: "category" },
            { header: "Bottles", key: "bottles" }, { header: "Shots Left", key: "shots" },
            { header: "Min Bottles", key: "min" }, { header: "Status", key: "status" },
            { header: "Stock Value", key: "value" },
          ],
          undefined,
          undefined,
          [
            { label: "Bar Items", value: String(data.bar.length) },
            { label: "Low Stock", value: String(data.summary.bar_low) },
            { label: "Total Value", value: formatRWF(data.valuation.bar) },
          ]
        );
      } else if (tab === "kitchen") {
        await exportToPDF(
          "Stock Report — Kitchen Ingredients",
          kitchenMats.map((m) => ({
            name: m.name, unit: m.unit,
            stock: String(m.quantity), min: String(m.min_quantity),
            used_in: m.used_in.join(", ") || "—",
            status: STATUS_LABEL[m.status] ?? m.status,
            value: formatRWF(m.quantity * m.cost_per_unit),
          })),
          [
            { header: "Ingredient", key: "name" }, { header: "Unit", key: "unit" },
            { header: "In Stock", key: "stock" }, { header: "Min Stock", key: "min" },
            { header: "Used In", key: "used_in" }, { header: "Status", key: "status" },
            { header: "Cost Value", key: "value" },
          ],
          undefined, undefined,
          [
            { label: "Ingredients", value: String(kitchenMats.length) },
            { label: "Low Stock", value: String(kitchenMats.filter((m) => m.status !== "ok").length) },
            { label: "Total Value", value: formatRWF(kitchenValue) },
          ]
        );
      } else {
        await exportToPDF(
          "Stock Report — Bakery Ingredients",
          data.materials.map((m) => ({
            name: m.name, unit: m.unit,
            stock: String(m.quantity), min: String(m.min_quantity),
            status: STATUS_LABEL[m.status] ?? m.status,
            value: formatRWF(m.quantity * m.cost_per_unit),
          })),
          [
            { header: "Ingredient", key: "name" }, { header: "Unit", key: "unit" },
            { header: "In Stock", key: "stock" }, { header: "Min Stock", key: "min" },
            { header: "Status", key: "status" }, { header: "Cost Value", key: "value" },
          ],
          undefined,
          undefined,
          [
            { label: "Ingredients", value: String(data.materials.length) },
            { label: "Low Stock", value: String(data.summary.materials_low) },
            { label: "Total Value", value: formatRWF(data.valuation.materials) },
          ]
        );
      }
    } finally {
      setExporting(false);
    }
  };

  const handleExport = async () => {
    if (!data) return;
    setExporting(true);
    try {
      const { exportToExcel } = await import("@/lib/export");
      await exportToExcel("Stock Report", [
        {
          name: "Supermarket",
          data: data.supermarket.map((p) => ({
            name: p.name,
            category: p.category ?? "",
            quantity: p.quantity,
            min_quantity: p.min_quantity,
            unit: p.unit,
            value: p.quantity * p.cost_price,
            status: STATUS_LABEL[p.status] ?? p.status,
          })),
          columns: [
            { header: "Product", key: "name" },
            { header: "Category", key: "category" },
            { header: "In Stock", key: "quantity" },
            { header: "Min Stock", key: "min_quantity" },
            { header: "Unit", key: "unit" },
            { header: "Stock Value (RWF)", key: "value" },
            { header: "Status", key: "status" },
          ],
        },
        {
          name: "Bar",
          data: data.bar.map((i) => ({
            name: i.name,
            category: i.category ?? "",
            bottles: i.quantity_bottles,
            shots: i.shots_remaining,
            min: i.min_quantity,
            value: i.quantity_bottles * i.price_per_bottle,
            status: STATUS_LABEL[i.status] ?? i.status,
          })),
          columns: [
            { header: "Item", key: "name" },
            { header: "Category", key: "category" },
            { header: "Bottles", key: "bottles" },
            { header: "Shots Left", key: "shots" },
            { header: "Min Bottles", key: "min" },
            { header: "Stock Value (RWF)", key: "value" },
            { header: "Status", key: "status" },
          ],
        },
        {
          name: "Bakery Ingredients",
          data: data.materials.map((m) => ({
            name: m.name,
            unit: m.unit,
            quantity: m.quantity,
            min_quantity: m.min_quantity,
            value: m.quantity * m.cost_per_unit,
            status: STATUS_LABEL[m.status] ?? m.status,
          })),
          columns: [
            { header: "Ingredient", key: "name" },
            { header: "Unit", key: "unit" },
            { header: "In Stock", key: "quantity" },
            { header: "Min Stock", key: "min_quantity" },
            { header: "Cost Value (RWF)", key: "value" },
            { header: "Status", key: "status" },
          ],
        },
      ]);
    } finally {
      setExporting(false);
    }
  };

  const getFilteredItems = () => {
    const items = tab === "supermarket" ? data?.supermarket ?? [] :
                  tab === "bar"         ? data?.bar ?? []          :
                  tab === "materials"   ? data?.materials ?? []    : kitchenMats;
    if (statusFilter === "all") return items;
    return items.filter((i) => (i as { status: string }).status === statusFilter);
  };

  const TABS: { key: Tab; label: string }[] = [
    ...(hasModule("supermarket")  ? [{ key: "supermarket" as Tab, label: "Supermarket" }] : []),
    ...(hasModule("bar")          ? [{ key: "bar"         as Tab, label: "Bar Stock" }] : []),
    ...(hasModule("bakery")       ? [{ key: "materials"   as Tab, label: "Bakery Ingredients" }] : []),
    ...(hasModule("restaurant")   ? [{ key: "kitchen"     as Tab, label: "Kitchen Stock" }] : []),
  ];

  const filteredItems = getFilteredItems();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-amber-400" />
            Stock Report
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Current inventory levels and valuation</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportPDF}
            disabled={exporting || loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:border-blue-500/50 text-sm disabled:opacity-40"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            PDF
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm disabled:opacity-40"
          >
            <TableProperties className="w-4 h-4" />
            Excel
          </button>
        </div>
      </div>

      {/* Valuation KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Stock Value" value={formatRWF(data?.valuation.total ?? 0)} icon={<DollarSign className="w-5 h-5" />} color="blue" loading={loading} />
        {hasModule("supermarket") && (
          <StatCard label="Supermarket Value" value={formatRWF(data?.valuation.supermarket ?? 0)} icon={<Package className="w-5 h-5" />} color="green" loading={loading} changeLabel={`${data?.summary.supermarket_total ?? 0} products`} />
        )}
        {hasModule("bar") && (
          <StatCard label="Bar Value" value={formatRWF(data?.valuation.bar ?? 0)} icon={<Package className="w-5 h-5" />} color="amber" loading={loading} changeLabel={`${data?.summary.bar_total ?? 0} items`} />
        )}
        <StatCard label="Low Stock Alerts" value={(data?.summary.supermarket_low ?? 0) + (data?.summary.bar_low ?? 0) + (data?.summary.materials_low ?? 0)} icon={<AlertTriangle className="w-5 h-5" />} color="red" loading={loading} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 p-1 rounded-xl border border-slate-700 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              tab === t.key ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Status filter */}
      <div className="flex gap-2">
        {["all", "ok", "low_stock", "out_of_stock", "overstocked"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border capitalize",
              statusFilter === s
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-slate-800 text-slate-400 border-slate-700 hover:border-blue-500/50"
            )}
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-900/50">
                {tab === "supermarket" && ["Product", "Category", "In Stock", "Min Stock", "Status", "Stock Value"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-slate-400 font-medium text-xs">{h}</th>
                ))}
                {tab === "bar" && ["Item", "Category", "Bottles", "Shots Left", "Min Bottles", "Status", "Value"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-slate-400 font-medium text-xs">{h}</th>
                ))}
                {tab === "materials" && ["Ingredient", "Unit", "In Stock", "Min Stock", "Status", "Cost Value"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-slate-400 font-medium text-xs">{h}</th>
                ))}
                {tab === "kitchen" && ["Ingredient", "Unit", "In Stock", "Min Stock", "Used In (Menu Items)", "Status", "Cost Value"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-slate-400 font-medium text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading ? (
                <tr>
                  <td colSpan={tab === "kitchen" ? 7 : 6} className="text-center py-10">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-400 mx-auto" />
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={tab === "kitchen" ? 7 : 6} className="text-center py-10 text-slate-500">No items found</td>
                </tr>
              ) : tab === "supermarket" ? (
                (filteredItems as NonNullable<typeof data>["supermarket"]).map((p) => (
                  <tr key={p.id} className="hover:bg-slate-700/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{p.name}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs capitalize">{p.category ?? "—"}</td>
                    <td className="px-4 py-3 text-white">{p.quantity} {p.unit}</td>
                    <td className="px-4 py-3 text-slate-400">{p.min_quantity} {p.unit}</td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2 py-0.5 rounded-full border text-xs font-medium", STATUS_BADGE[p.status] ?? STATUS_BADGE.ok)}>
                        {STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{formatRWF(p.quantity * p.cost_price)}</td>
                  </tr>
                ))
              ) : tab === "bar" ? (
                (filteredItems as NonNullable<typeof data>["bar"]).map((i) => (
                  <tr key={i.id} className="hover:bg-slate-700/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{i.name}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{i.category ?? "—"}</td>
                    <td className="px-4 py-3 text-white">{i.quantity_bottles}</td>
                    <td className="px-4 py-3 text-slate-300">{i.shots_per_bottle > 1 ? i.shots_remaining : "—"}</td>
                    <td className="px-4 py-3 text-slate-400">{i.min_quantity}</td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2 py-0.5 rounded-full border text-xs font-medium", STATUS_BADGE[i.status] ?? STATUS_BADGE.ok)}>
                        {STATUS_LABEL[i.status] ?? i.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{formatRWF(i.quantity_bottles * i.price_per_bottle)}</td>
                  </tr>
                ))
              ) : tab === "materials" ? (
                (filteredItems as NonNullable<typeof data>["materials"]).map((m) => (
                  <tr key={m.id} className="hover:bg-slate-700/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{m.name}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{m.unit}</td>
                    <td className="px-4 py-3 text-white">{m.quantity}</td>
                    <td className="px-4 py-3 text-slate-400">{m.min_quantity}</td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2 py-0.5 rounded-full border text-xs font-medium", STATUS_BADGE[m.status] ?? STATUS_BADGE.ok)}>
                        {STATUS_LABEL[m.status] ?? m.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{formatRWF(m.quantity * m.cost_per_unit)}</td>
                  </tr>
                ))
              ) : (
                // Kitchen Stock tab
                (filteredItems as KitchenMaterial[]).map((m) => (
                  <tr key={m.id} className="hover:bg-slate-700/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{m.name}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{m.unit}</td>
                    <td className="px-4 py-3 text-white">{m.quantity}</td>
                    <td className="px-4 py-3 text-slate-400">{m.min_quantity}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{m.used_in.join(", ") || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2 py-0.5 rounded-full border text-xs font-medium", STATUS_BADGE[m.status] ?? STATUS_BADGE.ok)}>
                        {STATUS_LABEL[m.status] ?? m.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{formatRWF(m.quantity * m.cost_per_unit)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {data && (
          <div className="px-4 py-3 border-t border-slate-700 bg-slate-900/30 text-xs text-slate-400 flex items-center justify-between">
            <span>{filteredItems.length} items shown</span>
            <span>
              Total stock value:{" "}
              <strong className="text-white">
                {formatRWF(
                  tab === "supermarket" ? data.valuation.supermarket :
                  tab === "bar"         ? data.valuation.bar          :
                  tab === "materials"   ? data.valuation.materials    : kitchenValue
                )}
              </strong>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
