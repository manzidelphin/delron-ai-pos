"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/auth-store";
import { PageHeader } from "@/components/ui/page-header";
import { formatRWF } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Pencil, X, Loader2, Package, Info } from "lucide-react";

interface FinishedGood {
  id: string;
  name: string;
  barcode: string | null;
  barcode_type: "pre-packaged" | "generic";
  selling_price: number;
  cost_price: number;
  quantity: number;
  unit: string;
  category: string;
  is_active: boolean;
}

interface ItemForm {
  name: string;
  barcode_type: "pre-packaged" | "generic";
  selling_price: string;
  cost_price: string;
  unit: string;
  category: string;
  is_active: boolean;
}

const CATEGORIES = ["bread", "pastry", "cake", "snack", "other"];
const EMPTY_FORM: ItemForm = { name: "", barcode_type: "generic", selling_price: "", cost_price: "", unit: "piece", category: "bread", is_active: true };

function ItemModal({ item, onClose, onSave }: { item: FinishedGood | null; onClose: () => void; onSave: () => void }) {
  const { effectiveRole } = useAuthStore();
  const role = effectiveRole();
  const canEditPrice = role === "owner" || role === "manager";

  const isEdit = !!item;
  const [form, setForm] = useState<ItemForm>(
    item
      ? { name: item.name, barcode_type: item.barcode_type, selling_price: String(item.selling_price), cost_price: String(item.cost_price), unit: item.unit, category: item.category, is_active: item.is_active }
      : EMPTY_FORM
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: keyof ItemForm, v: string | boolean) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((e) => { const n = { ...e }; delete n[String(k)]; return n; });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name required";
    if (canEditPrice && (!form.selling_price || isNaN(parseFloat(form.selling_price)))) {
      e.selling_price = "Price required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setIsLoading(true);
    try {
      const method = isEdit ? "PUT" : "POST";
      const body = isEdit ? { id: item!.id, ...form } : form;
      const res = await fetch("/api/bakery/finished-goods", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success(isEdit ? "Item updated" : "Item created");
      onSave();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-700 sticky top-0 bg-slate-800">
          <h2 className="text-lg font-bold text-white">{isEdit ? "Edit Baked Item" : "New Baked Item"}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1.5">Item Name *</label>
            <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Mandazi, Croissant" autoFocus
              className="w-full h-11 px-4 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Barcode type */}
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-2">Barcode Type *</label>
            <div className="grid grid-cols-2 gap-3">
              {([
                { val: "generic", title: "Generic", desc: "Cashier enters quantity at POS (Mandazi, Samosa)", icon: "🔖" },
                { val: "pre-packaged", title: "Pre-Packaged", desc: "Full price label per item (Bread loaf, Pain Complet)", icon: "📦" },
              ] as const).map((opt) => (
                <button key={opt.val} onClick={() => set("barcode_type", opt.val)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    form.barcode_type === opt.val ? "border-blue-500 bg-blue-500/10" : "border-slate-600 hover:border-slate-500"
                  }`}>
                  <p className="text-lg mb-1">{opt.icon}</p>
                  <p className="font-semibold text-white text-sm">{opt.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
            {/* Info box */}
            <div className={`mt-2 flex items-start gap-2 p-3 rounded-xl text-xs ${
              form.barcode_type === "generic" ? "bg-blue-500/10 border border-blue-500/20 text-blue-300" : "bg-green-500/10 border border-green-500/20 text-green-300"
            }`}>
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {form.barcode_type === "generic"
                ? "Cashier scans sticker → popup asks 'how many pieces?' → calculates total"
                : "Full label printed per item. Cashier scans → price loaded automatically"}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-300 block mb-1.5">
                Selling Price (RWF){canEditPrice ? " *" : ""}
              </label>
              <input type="number" value={form.selling_price} onChange={(e) => set("selling_price", e.target.value)} placeholder="0"
                disabled={!canEditPrice}
                className={`w-full h-11 px-4 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${!canEditPrice ? "opacity-50 cursor-not-allowed" : ""}`} />
              {!canEditPrice && <p className="text-slate-500 text-xs mt-1">Set by owner</p>}
              {errors.selling_price && <p className="text-red-400 text-xs mt-1">{errors.selling_price}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 block mb-1.5">Cost Price (RWF)</label>
              <input type="number" value={form.cost_price} onChange={(e) => set("cost_price", e.target.value)} placeholder="0"
                disabled={!canEditPrice}
                className={`w-full h-11 px-4 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${!canEditPrice ? "opacity-50 cursor-not-allowed" : ""}`} />
              {!canEditPrice && <p className="text-slate-500 text-xs mt-1">Set by owner</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-300 block mb-1.5">Category</label>
              <select value={form.category} onChange={(e) => set("category", e.target.value)}
                className="w-full h-11 px-3 bg-slate-900 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 capitalize">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 block mb-1.5">Unit</label>
              <select value={form.unit} onChange={(e) => set("unit", e.target.value)}
                className="w-full h-11 px-3 bg-slate-900 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {["piece", "loaf", "pack", "kg", "dozen"].map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => set("is_active", !form.is_active)}
              className={`relative w-11 h-6 rounded-full transition-colors ${form.is_active ? "bg-blue-600" : "bg-slate-600"}`}>
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.is_active ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
            <span className="text-sm text-slate-300">{form.is_active ? "Active" : "Inactive"}</span>
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-slate-600 text-slate-300 font-medium">Cancel</button>
            <button onClick={handleSave} disabled={isLoading}
              className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2">
              {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : isEdit ? "Save" : "Create Item"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BakedItemsPage() {
  const { isLoaded } = useAuthStore();
  const [items, setItems] = useState<FinishedGood[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [target, setTarget] = useState<FinishedGood | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/bakery/finished-goods${showInactive ? "?include_inactive=true" : ""}`);
      const json = await res.json();
      if (res.ok) setItems(json.items ?? []);
    } finally {
      setIsLoading(false);
    }
  }, [showInactive]);

  useEffect(() => { if (isLoaded) load(); }, [isLoaded, load]);

  const CATEGORY_ICONS: Record<string, string> = { bread: "🍞", pastry: "🥐", cake: "🎂", snack: "🥟", other: "🍪" };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Baked Items"
        badge={items.length}
        description="Manage your finished bakery products"
        actions={
          <div className="flex gap-2">
            <button onClick={() => setShowInactive(!showInactive)}
              className={`h-10 px-4 rounded-xl border text-sm font-medium transition-all ${showInactive ? "border-blue-500 bg-blue-500/10 text-blue-400" : "border-slate-700 text-slate-400 hover:border-slate-600"}`}>
              {showInactive ? "Hide Inactive" : "Show All"}
            </button>
            <button onClick={() => { setTarget(null); setModal("add"); }}
              className="flex items-center gap-2 h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all">
              <Plus className="w-4 h-4" /> New Item
            </button>
          </div>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-52 bg-slate-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-16 text-center">
          <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No baked items yet</p>
          <button onClick={() => { setTarget(null); setModal("add"); }}
            className="mt-4 h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all">
            Add First Item
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.id} className={`bg-slate-800 border rounded-2xl p-5 group transition-all ${item.is_active ? "border-slate-700 hover:border-slate-600" : "border-slate-700/40 opacity-60"}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-2xl">
                  {CATEGORY_ICONS[item.category] ?? "🍪"}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setTarget(item); setModal("edit"); }}
                    className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-400 hover:text-white">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h3 className="font-bold text-white">{item.name}</h3>
              <p className="text-xs text-slate-400 mt-0.5 capitalize">{item.category} · {item.unit}</p>

              <div className="mt-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Selling price</span>
                  <span className="text-white font-bold">{formatRWF(item.selling_price)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Cost price</span>
                  <span className="text-slate-300">{formatRWF(item.cost_price)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">In stock</span>
                  <span className={`font-bold ${item.quantity === 0 ? "text-red-400" : "text-white"}`}>{item.quantity} {item.unit}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${
                  item.barcode_type === "generic"
                    ? "text-blue-400 bg-blue-500/10 border-blue-500/20"
                    : "text-green-400 bg-green-500/10 border-green-500/20"
                }`}>
                  {item.barcode_type === "generic" ? "GENERIC" : "PRE-PACKAGED"}
                </span>
                {item.barcode && <span className="text-[10px] text-slate-600 font-mono">{item.barcode}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {(modal === "add" || modal === "edit") && (
        <ItemModal item={modal === "edit" ? target : null} onClose={() => setModal(null)} onSave={() => { setModal(null); load(); }} />
      )}
    </div>
  );
}
