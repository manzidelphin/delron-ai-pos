"use client";

import { useState, useEffect, useCallback } from "react";
import { ProductionCard } from "@/components/bakery/production-card";
import { IngredientCheckModal } from "@/components/bakery/ingredient-check-modal";
import { LabelPreview } from "@/components/bakery/label-preview";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import {
  ChefHat, Loader2, CheckCircle2, ArrowRight, RotateCcw, X, Plus,
} from "lucide-react";

interface FinishedGood {
  id: string;
  name: string;
  barcode: string | null;
  barcode_type: "pre-packaged" | "generic";
  selling_price: number;
  quantity: number;
  category: string;
}

interface ProductionLog {
  item_name: string;
  barcode: string | null;
  barcode_type: "pre-packaged" | "generic";
  selling_price: number;
  quantity_produced: number;
}

interface Shortage {
  name: string;
  needed: number;
  available: number;
  unit: string;
}

export default function ProductionPage() {
  const router = useRouter();
  const { isLoaded } = useAuthStore();
  const [items, setItems] = useState<FinishedGood[]>([]);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shortages, setShortages] = useState<Shortage[] | null>(null);
  const [productionResult, setProductionResult] = useState<ProductionLog[] | null>(null);
  const businessName = "DELRON Bakery";
  const [customItem, setCustomItem] = useState({ name: "", qty: "" });
  const [showCustomInput, setShowCustomInput] = useState(false);

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const greeting = today.getHours() < 12 ? "Good morning" : today.getHours() < 17 ? "Good afternoon" : "Good evening";

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/bakery/finished-goods");
      const json = await res.json();
      if (res.ok) setItems(json.items ?? []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { if (isLoaded) load(); }, [isLoaded, load]);

  const setQty = (id: string, val: string) => {
    setQuantities((prev) => ({ ...prev, [id]: val }));
  };

  const hasAnyQty = Object.values(quantities).some((v) => parseInt(v) > 0);

  const handleLogProduction = async () => {
    const productionItems = Object.entries(quantities)
      .filter(([, v]) => parseInt(v) > 0)
      .map(([id, v]) => ({ finished_good_id: id, quantity_produced: parseInt(v) }));

    if (productionItems.length === 0) {
      toast.error("Please enter at least one quantity");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/bakery/production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: productionItems }),
      });
      const json = await res.json();

      if (res.status === 422 && json.shortages) {
        setShortages(json.shortages);
        return;
      }
      if (!res.ok) throw new Error(json.error || "Failed to log production");

      setProductionResult(json.production_logs ?? []);
      setQuantities({});
      toast.success(`Production logged! ${productionItems.reduce((s, i) => s + i.quantity_produced, 0)} items added to stock.`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalItems = Object.values(quantities).reduce((s, v) => s + (parseInt(v) || 0), 0);

  if (productionResult) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-2xl p-5">
          <div className="w-12 h-12 rounded-2xl bg-green-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Production Logged!</h2>
            <p className="text-sm text-green-400/80">Stock updated. Print labels for your baked items.</p>
          </div>
        </div>

        <LabelPreview
          items={productionResult.map((l) => ({
            item_name: l.item_name,
            barcode: l.barcode ?? "",
            barcode_type: l.barcode_type,
            selling_price: l.selling_price,
            quantity_produced: l.quantity_produced,
          }))}
          businessName={businessName}
          batchDate={todayStr}
        />

        <div className="flex gap-3">
          <button
            onClick={() => {
              setProductionResult(null);
              load();
            }}
            className="flex-1 h-12 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center justify-center gap-2 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Log More Production
          </button>
          <button
            onClick={() => router.push("/bakery")}
            className="flex-1 h-12 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold flex items-center justify-center gap-2 transition-all"
          >
            Go to Dashboard
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center py-4">
          <p className="text-3xl font-black text-white">{greeting}, Baker! 👋</p>
          <p className="text-slate-400 mt-1">
            {today.toLocaleDateString("en-RW", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
          <p className="text-lg text-amber-400 mt-2 font-semibold">What did you bake today?</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-52 bg-slate-800 rounded-2xl animate-pulse" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-16 text-center">
            <ChefHat className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">No baked items set up yet</p>
            <a href="/bakery/items" className="mt-4 inline-block h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all leading-10">
              Add Baked Items →
            </a>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
              {items.map((item) => (
                <ProductionCard
                  key={item.id}
                  item={item}
                  value={quantities[item.id] ?? ""}
                  onChange={setQty}
                />
              ))}

              {/* Custom item card */}
              {showCustomInput ? (
                <div className="bg-slate-800 border border-blue-500/40 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-300">Quick Add</span>
                    <button onClick={() => setShowCustomInput(false)} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
                  </div>
                  <input type="text" value={customItem.name} onChange={(e) => setCustomItem((p) => ({ ...p, name: e.target.value }))} placeholder="Item name"
                    className="w-full h-10 px-3 bg-slate-900 border border-slate-600 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input type="number" value={customItem.qty} onChange={(e) => setCustomItem((p) => ({ ...p, qty: e.target.value }))} placeholder="Qty baked"
                    className="w-full h-10 px-3 bg-slate-900 border border-slate-600 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <p className="text-xs text-slate-500">This won&apos;t deduct ingredients (no recipe).</p>
                </div>
              ) : (
                <button onClick={() => setShowCustomInput(true)}
                  className="h-52 rounded-2xl border-2 border-dashed border-slate-700 hover:border-blue-500 text-slate-500 hover:text-blue-400 flex flex-col items-center justify-center gap-2 transition-all">
                  <Plus className="w-6 h-6" />
                  <span className="text-sm font-medium">Add More Items</span>
                </button>
              )}
            </div>

            {/* Log button */}
            <div className="sticky bottom-6">
              <button
                onClick={handleLogProduction}
                disabled={!hasAnyQty || isSubmitting}
                className="w-full h-16 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-2xl shadow-amber-900/40"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-6 h-6 animate-spin" /> Logging Production...</>
                ) : (
                  <><ChefHat className="w-6 h-6" /> Log Production & Print Labels {totalItems > 0 && `(${totalItems} items)`}</>
                )}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Ingredient shortage modal */}
      {shortages && (
        <IngredientCheckModal
          shortages={shortages}
          onClose={() => setShortages(null)}
          onGoToMaterials={() => router.push("/bakery/materials")}
        />
      )}
    </>
  );
}
