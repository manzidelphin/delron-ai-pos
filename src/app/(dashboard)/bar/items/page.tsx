"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/auth-store";
import { PageHeader } from "@/components/ui/page-header";
import { formatRWF } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X, Loader2, Beer, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BarItem {
  id: string;
  name: string;
  category: string;
  barcode: string | null;
  price_per_bottle: number;
  price_per_shot: number | null;
  shots_per_bottle: number | null;
  quantity_bottles: number;
  shots_remaining: number;
  min_quantity: number;
  is_active: boolean;
}

interface BarItemForm {
  name: string;
  category: string;
  barcode: string;
  price_per_bottle: string;
  shots_per_bottle: string;
  price_per_shot: string;
  quantity_bottles: string;
  min_quantity: string;
  is_active: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: "beer",       label: "Beer",       icon: "🍺" },
  { value: "spirits",    label: "Spirits",    icon: "🥃" },
  { value: "wine",       label: "Wine",       icon: "🍷" },
  { value: "cocktail",   label: "Cocktail",   icon: "🍹" },
  { value: "soft_drink", label: "Soft Drink", icon: "🥤" },
  { value: "juice",      label: "Juice",      icon: "🧃" },
  { value: "other",      label: "Other",      icon: "🫙" },
];

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.value, c]));

const EMPTY_FORM: BarItemForm = {
  name: "", category: "beer", barcode: "",
  price_per_bottle: "", shots_per_bottle: "", price_per_shot: "",
  quantity_bottles: "0", min_quantity: "2", is_active: true,
};

// ── Modal ─────────────────────────────────────────────────────────────────────

function ItemModal({ item, onClose, onSave }: {
  item: BarItem | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const isEdit = !!item;

  const [form, setForm] = useState<BarItemForm>(
    item
      ? {
          name:             item.name,
          category:         item.category,
          barcode:          item.barcode ?? "",
          price_per_bottle: String(item.price_per_bottle),
          shots_per_bottle: item.shots_per_bottle ? String(item.shots_per_bottle) : "",
          price_per_shot:   item.price_per_shot   ? String(item.price_per_shot)   : "",
          quantity_bottles: String(item.quantity_bottles),
          min_quantity:     String(item.min_quantity),
          is_active:        item.is_active,
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isShotItem = parseInt(form.shots_per_bottle) > 0;

  const set = <K extends keyof BarItemForm>(k: K, v: BarItemForm[K]) => {
    setForm((p) => {
      const next = { ...p, [k]: v };
      // Auto-calculate price_per_shot when bottle price or shots change
      if ((k === "price_per_bottle" || k === "shots_per_bottle") && !item?.price_per_shot) {
        const ppb   = parseFloat(k === "price_per_bottle" ? String(v) : next.price_per_bottle);
        const shots = parseInt(k === "shots_per_bottle"   ? String(v) : next.shots_per_bottle);
        if (ppb > 0 && shots > 0) {
          next.price_per_shot = String(Math.round(ppb / shots));
        } else {
          next.price_per_shot = "";
        }
      }
      return next;
    });
    setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim())        e.name             = "Item name is required";
    if (!form.price_per_bottle || isNaN(parseFloat(form.price_per_bottle)))
                                   e.price_per_bottle = "Bottle price is required";
    if (form.shots_per_bottle && isNaN(parseInt(form.shots_per_bottle)))
                                   e.shots_per_bottle = "Must be a whole number";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const method = isEdit ? "PUT" : "POST";
      const url    = isEdit ? `/api/bar/items/${item!.id}` : "/api/bar/items";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:             form.name.trim(),
          category:         form.category,
          barcode:          form.barcode.trim() || null,
          price_per_bottle: form.price_per_bottle,
          shots_per_bottle: form.shots_per_bottle || null,
          price_per_shot:   isShotItem && form.price_per_shot ? form.price_per_shot : null,
          quantity_bottles: form.quantity_bottles,
          min_quantity:     form.min_quantity,
          is_active:        form.is_active,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success(isEdit ? "Item updated" : "Item added");
      onSave();
    } catch (err) {
      toast.error((err as Error).message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700 flex-shrink-0">
          <h2 className="text-lg font-bold text-white">
            {isEdit ? `Edit — ${item!.name}` : "New Bar Item"}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Name */}
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1.5">Item Name *</label>
            <input
              type="text" value={form.name} onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Jameson, Heineken, Fanta..."
              autoFocus
              className="w-full h-11 px-4 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Category */}
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-2">Category</label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => set("category", cat.value)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2.5 rounded-xl border text-center transition-all",
                    form.category === cat.value
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-slate-600 hover:border-slate-500"
                  )}
                >
                  <span className="text-lg">{cat.icon}</span>
                  <span className="text-xs text-slate-300 leading-tight">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-300 block mb-1.5">Price per Bottle (RWF) *</label>
              <input
                type="number" min="0" value={form.price_per_bottle}
                onChange={(e) => set("price_per_bottle", e.target.value)}
                placeholder="0"
                className="w-full h-11 px-4 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.price_per_bottle && <p className="text-red-400 text-xs mt-1">{errors.price_per_bottle}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 block mb-1.5">Barcode (optional)</label>
              <input
                type="text" value={form.barcode}
                onChange={(e) => set("barcode", e.target.value)}
                placeholder="Scan or type..."
                className="w-full h-11 px-4 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          {/* Shot tracking */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-base">🥃</span>
              <span className="text-sm font-medium text-amber-300">Shot Tracking</span>
              <span className="text-xs text-slate-500 ml-auto">Optional — for spirits sold by the shot</span>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 block mb-1.5">Shots per Bottle</label>
              <input
                type="number" min="0" step="1" value={form.shots_per_bottle}
                onChange={(e) => set("shots_per_bottle", e.target.value)}
                placeholder="e.g. 20 (leave 0 for bottle-only items)"
                className="w-full h-11 px-4 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              {errors.shots_per_bottle && <p className="text-red-400 text-xs mt-1">{errors.shots_per_bottle}</p>}
            </div>
            {isShotItem && (
              <>
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-1.5">
                    Price per Shot (RWF)
                    {form.price_per_bottle && form.shots_per_bottle && (
                      <span className="text-xs text-slate-500 ml-2 font-normal">
                        auto: {formatRWF(Math.round(parseFloat(form.price_per_bottle) / parseInt(form.shots_per_bottle)))}
                      </span>
                    )}
                  </label>
                  <input
                    type="number" min="0" value={form.price_per_shot}
                    onChange={(e) => set("price_per_shot", e.target.value)}
                    placeholder="Auto-calculated"
                    className="w-full h-11 px-4 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div className="flex items-start gap-2 text-xs text-amber-400/80">
                  <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  This item can be sold as a full bottle OR individual shots at the bar POS.
                </div>
              </>
            )}
          </div>

          {/* Stock levels */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-300 block mb-1.5">
                {isEdit ? "Current Stock" : "Opening Stock"} (bottles)
              </label>
              <input
                type="number" min="0" step="0.5" value={form.quantity_bottles}
                onChange={(e) => set("quantity_bottles", e.target.value)}
                placeholder="0"
                className="w-full h-11 px-4 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 block mb-1.5">Min Stock Alert (bottles)</label>
              <input
                type="number" min="0" step="1" value={form.min_quantity}
                onChange={(e) => set("min_quantity", e.target.value)}
                placeholder="2"
                className="w-full h-11 px-4 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => set("is_active", !form.is_active)}
              className={cn("relative w-11 h-6 rounded-full transition-colors", form.is_active ? "bg-blue-600" : "bg-slate-600")}
            >
              <div className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform", form.is_active ? "translate-x-5" : "translate-x-0.5")} />
            </button>
            <span className="text-sm text-slate-300">{form.is_active ? "Active — visible on POS" : "Inactive — hidden from POS"}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-slate-700 flex-shrink-0">
          <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-slate-600 text-slate-300 font-medium hover:bg-slate-700 transition-colors text-sm">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2 transition-colors text-sm"
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : isEdit ? "Save Changes" : "Add Item"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete confirmation ───────────────────────────────────────────────────────

function DeleteModal({ item, onClose, onDeleted }: {
  item: BarItem;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const confirm = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/bar/items/${item.id}`, { method: "DELETE" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success(`${item.name} removed`);
      onDeleted();
    } catch (err) {
      toast.error((err as Error).message ?? "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6 text-red-400" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-bold text-white">Remove Item?</h3>
          <p className="text-slate-400 text-sm mt-1">
            <span className="text-white font-medium">{item.name}</span> will be deactivated and hidden from the POS. This won't delete historical sales data.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-slate-600 text-slate-300 font-medium hover:bg-slate-700 transition-colors text-sm">
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={deleting}
            className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2 transition-colors text-sm"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BarItemsPage() {
  const { isLoaded } = useAuthStore();
  const [items, setItems]           = useState<BarItem[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [modal, setModal]           = useState<"add" | "edit" | "delete" | null>(null);
  const [target, setTarget]         = useState<BarItem | null>(null);
  const [search, setSearch]         = useState("");
  const [catFilter, setCatFilter]   = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search)    params.set("search",   search);
      if (catFilter) params.set("category", catFilter);
      if (showInactive) params.set("include_inactive", "true");
      const res  = await fetch(`/api/bar/items?${params}`);
      const json = await res.json();
      // include_inactive not yet in API — filter client-side for now
      const all = json.items ?? [];
      setItems(showInactive ? all : all.filter((i: BarItem) => i.is_active !== false));
    } catch {
      toast.error("Failed to load bar items");
    } finally {
      setIsLoading(false);
    }
  }, [search, catFilter, showInactive]);

  useEffect(() => { if (isLoaded) load(); }, [isLoaded, load]);

  const openAdd    = () => { setTarget(null);  setModal("add"); };
  const openEdit   = (i: BarItem) => { setTarget(i); setModal("edit"); };
  const openDelete = (i: BarItem) => { setTarget(i); setModal("delete"); };
  const closeModal = () => { setModal(null); setTarget(null); };

  const stockColor = (item: BarItem) => {
    if (item.quantity_bottles === 0) return "text-red-400";
    if (item.quantity_bottles <= item.min_quantity) return "text-amber-400";
    return "text-green-400";
  };

  const filteredItems = catFilter
    ? items.filter((i) => i.category === catFilter)
    : items;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Bar Items"
        badge={filteredItems.length}
        description="Manage bottles, shots & pricing for your bar"
        actions={
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowInactive(!showInactive)}
              className={cn(
                "h-10 px-4 rounded-xl border text-sm font-medium transition-all",
                showInactive ? "border-blue-500 bg-blue-500/10 text-blue-400" : "border-slate-700 text-slate-400 hover:border-slate-600"
              )}
            >
              {showInactive ? "Hide Inactive" : "Show Inactive"}
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all"
            >
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-40">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items..."
            className="w-full h-10 pl-4 pr-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="h-10 px-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
          ))}
        </select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-56 bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-16 text-center">
          <Beer className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">
            {search || catFilter ? "No items match your filters" : "No bar items yet"}
          </p>
          {!search && !catFilter && (
            <button
              onClick={openAdd}
              className="mt-4 h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all"
            >
              Add First Item
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const cat   = CATEGORY_MAP[item.category];
            const isShot = (item.shots_per_bottle ?? 0) > 0;
            const isLow  = item.quantity_bottles > 0 && item.quantity_bottles <= item.min_quantity;
            const isOut  = item.quantity_bottles === 0;
            return (
              <div
                key={item.id}
                className={cn(
                  "bg-slate-800 border rounded-2xl p-5 group transition-all",
                  item.is_active ? "border-slate-700 hover:border-slate-600" : "border-slate-700/40 opacity-60"
                )}
              >
                {/* Card header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-2xl flex-shrink-0">
                    {cat?.icon ?? "🫙"}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(item)}
                      className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openDelete(item)}
                      className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-red-600 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="font-bold text-white">{item.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5 capitalize">{cat?.label ?? item.category}</p>

                {/* Pricing */}
                <div className="mt-3 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Bottle price</span>
                    <span className="text-white font-bold">{formatRWF(item.price_per_bottle)}</span>
                  </div>
                  {isShot && item.price_per_shot && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Shot price</span>
                      <span className="text-amber-400">{formatRWF(item.price_per_shot)}</span>
                    </div>
                  )}
                  {isShot && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Shots/bottle</span>
                      <span className="text-slate-300">{item.shots_per_bottle}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">In stock</span>
                    <span className={cn("font-bold", stockColor(item))}>
                      {item.quantity_bottles % 1 === 0 ? item.quantity_bottles : item.quantity_bottles.toFixed(1)} btl
                    </span>
                  </div>
                  {isShot && item.shots_remaining > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Shots left</span>
                      <span className="text-amber-400/80 text-xs">{item.shots_remaining}</span>
                    </div>
                  )}
                </div>

                {/* Footer badges */}
                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  {isOut ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20">OUT</span>
                  ) : isLow ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">LOW</span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-green-500/10 text-green-400 border border-green-500/20">OK</span>
                  )}
                  {isShot && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      🥃 SHOTS
                    </span>
                  )}
                  {item.barcode && (
                    <span className="text-[10px] text-slate-600 font-mono ml-auto truncate max-w-24">{item.barcode}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {(modal === "add" || modal === "edit") && (
        <ItemModal item={modal === "edit" ? target : null} onClose={closeModal} onSave={() => { closeModal(); load(); }} />
      )}
      {modal === "delete" && target && (
        <DeleteModal item={target} onClose={closeModal} onDeleted={() => { closeModal(); load(); }} />
      )}
    </div>
  );
}
