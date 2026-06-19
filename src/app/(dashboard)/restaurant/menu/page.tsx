"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { formatRWF } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, X, Loader2, UtensilsCrossed, AlertTriangle, ChefHat,
} from "lucide-react";

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  cost_per_unit: number;
}

interface RecipeRow {
  id?: string;
  raw_material_id: string;
  quantity_needed: string;
  unit: string;
}

interface MenuItem {
  id: string;
  name: string;
  category: string;
  selling_price: number;
  cost_price: number;
  is_active: boolean;
  prep_time_minutes: number;
  menu_recipes?: {
    id: string;
    raw_material_id: string;
    quantity_needed: number;
    unit: string;
    raw_materials?: RawMaterial;
  }[];
}

const CATS = [
  { value: "starter",  label: "Starter",  icon: "🥗" },
  { value: "main",     label: "Main",     icon: "🍽️" },
  { value: "dessert",  label: "Dessert",  icon: "🍰" },
  { value: "snack",    label: "Snack",    icon: "🍟" },
  { value: "drink",    label: "Drink",    icon: "🧃" },
  { value: "other",    label: "Other",    icon: "🍴" },
];

function ItemModal({
  item, rawMaterials, onClose, onSave,
}: {
  item: MenuItem | null;
  rawMaterials: RawMaterial[];
  onClose: () => void;
  onSave: () => void;
}) {
  const isEdit = !!item;
  const [name,     setName]     = useState(item?.name ?? "");
  const [category, setCategory] = useState(item?.category ?? "main");
  const [price,    setPrice]    = useState(item ? String(item.selling_price) : "");
  const [prepTime, setPrepTime] = useState(item ? String(item.prep_time_minutes) : "15");
  const [isActive, setIsActive] = useState(item?.is_active ?? true);
  const [rows, setRows] = useState<RecipeRow[]>(
    item?.menu_recipes?.length
      ? item.menu_recipes.map((r) => ({
          id: r.id, raw_material_id: r.raw_material_id,
          quantity_needed: String(r.quantity_needed), unit: r.unit,
        }))
      : []
  );
  const [saving, setSaving] = useState(false);

  const computedCost = rows.reduce((sum, r) => {
    const mat = rawMaterials.find((m) => m.id === r.raw_material_id);
    if (!mat || !r.quantity_needed) return sum;
    return sum + mat.cost_per_unit * parseFloat(r.quantity_needed);
  }, 0);

  const margin = price && computedCost
    ? ((parseFloat(price) - computedCost) / parseFloat(price)) * 100
    : null;

  const addRow = () => setRows((p) => [...p, { raw_material_id: "", quantity_needed: "", unit: "" }]);
  const removeRow = (i: number) => setRows((p) => p.filter((_, j) => j !== i));
  const updateRow = (i: number, field: keyof RecipeRow, val: string) =>
    setRows((p) => {
      const next = [...p];
      next[i] = { ...next[i], [field]: val };
      if (field === "raw_material_id") {
        const mat = rawMaterials.find((m) => m.id === val);
        if (mat) next[i].unit = mat.unit;
      }
      return next;
    });

  const handleSave = async () => {
    if (!name.trim() || !price) { toast.error("Name and price are required"); return; }
    setSaving(true);
    try {
      const validRows = rows.filter((r) => r.raw_material_id && parseFloat(r.quantity_needed) > 0);
      const method = isEdit ? "PUT" : "POST";
      const url    = isEdit ? `/api/restaurant/menu/${item!.id}` : "/api/restaurant/menu";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(), category,
          selling_price: price,
          cost_price: computedCost,
          prep_time_minutes: prepTime,
          is_active: isActive,
          ingredients: validRows.map((r) => ({
            raw_material_id: r.raw_material_id,
            quantity_needed: parseFloat(r.quantity_needed),
            unit: r.unit,
          })),
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success(isEdit ? "Item updated" : "Item added to menu");
      onSave();
    } catch (err) {
      toast.error((err as Error).message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-700 shrink-0">
          <h2 className="text-lg font-bold text-white">
            {isEdit ? `Edit — ${item!.name}` : "New Menu Item"}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-300 block mb-1.5">Item Name *</label>
              <input
                value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Grilled Chicken, Caesar Salad..."
                autoFocus
                className="w-full h-11 px-4 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-1.5">Selling Price (RWF) *</label>
                <input
                  type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)}
                  placeholder="0"
                  className="w-full h-11 px-4 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-1.5">Prep Time (min)</label>
                <input
                  type="number" min="1" value={prepTime} onChange={(e) => setPrepTime(e.target.value)}
                  placeholder="15"
                  className="w-full h-11 px-4 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 block mb-2">Category</label>
              <div className="grid grid-cols-3 gap-2">
                {CATS.map((c) => (
                  <button
                    key={c.value} onClick={() => setCategory(c.value)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all",
                      category === c.value
                        ? "border-orange-500 bg-orange-500/10 text-orange-400"
                        : "border-slate-600 text-slate-400 hover:border-slate-500"
                    )}
                  >
                    <span>{c.icon}</span><span>{c.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Recipe section */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-amber-300 flex items-center gap-2">
                <ChefHat className="w-4 h-4" />Recipe (Ingredients)
              </span>
              <button onClick={addRow} className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-medium">
                <Plus className="w-3.5 h-3.5" />Add Ingredient
              </button>
            </div>

            {rows.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-3">
                No recipe — ingredient stock won&apos;t be deducted when ordered.
              </p>
            ) : (
              <div className="space-y-2">
                {rows.map((row, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <select
                      value={row.raw_material_id}
                      onChange={(e) => updateRow(i, "raw_material_id", e.target.value)}
                      className="flex-1 h-9 px-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      <option value="">Select ingredient...</option>
                      {rawMaterials.map((m) => (
                        <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                      ))}
                    </select>
                    <input
                      type="number" min="0" step="0.01" value={row.quantity_needed}
                      onChange={(e) => updateRow(i, "quantity_needed", e.target.value)}
                      placeholder="Qty"
                      className="w-20 h-9 px-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm text-center focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <span className="text-xs text-slate-500 w-10 text-center">{row.unit || "—"}</span>
                    <button onClick={() => removeRow(i)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-700 hover:bg-red-600 text-slate-400 hover:text-white transition-colors shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {rows.length > 0 && (
              <div className="border-t border-amber-500/20 pt-3 grid grid-cols-3 gap-3 text-center text-sm">
                <div>
                  <p className="text-slate-500 text-xs">Recipe Cost</p>
                  <p className="font-bold text-white">{formatRWF(computedCost)}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Selling Price</p>
                  <p className="font-bold text-white">{price ? formatRWF(parseFloat(price)) : "—"}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Profit Margin</p>
                  <p className={cn("font-bold", margin !== null && margin < 20 ? "text-red-400" : "text-green-400")}>
                    {margin !== null ? `${margin.toFixed(0)}%` : "—"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsActive(!isActive)}
              className={cn("relative w-11 h-6 rounded-full transition-colors", isActive ? "bg-orange-500" : "bg-slate-600")}
            >
              <div className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform", isActive ? "translate-x-5" : "translate-x-0.5")} />
            </button>
            <span className="text-sm text-slate-300">
              {isActive ? "Active — visible on POS" : "Inactive — hidden from POS"}
            </span>
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-slate-700 shrink-0">
          <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors text-sm font-medium">Cancel</button>
          <button
            onClick={handleSave} disabled={saving}
            className="flex-1 h-11 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2 transition-colors text-sm"
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : isEdit ? "Save Changes" : "Add to Menu"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteModal({ item, onClose, onDeleted }: { item: MenuItem; onClose: () => void; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const confirm = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/restaurant/menu/${item.id}`, { method: "DELETE" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success(`${item.name} removed from menu`);
      onDeleted();
    } catch (err) {
      toast.error((err as Error).message ?? "Failed to remove");
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
          <h3 className="text-lg font-bold text-white">Remove from Menu?</h3>
          <p className="text-slate-400 text-sm mt-1">
            <span className="text-white font-medium">{item.name}</span> will be hidden from the POS. Sales history is kept.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors text-sm font-medium">Cancel</button>
          <button
            onClick={confirm} disabled={deleting}
            className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold flex items-center justify-center gap-2 transition-colors text-sm disabled:opacity-50"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RestaurantMenuPage() {
  const [items,        setItems]       = useState<MenuItem[]>([]);
  const [rawMaterials, setRawMats]     = useState<RawMaterial[]>([]);
  const [loading,      setLoading]     = useState(true);
  const [modal,        setModal]       = useState<"add" | "edit" | "delete" | null>(null);
  const [target,       setTarget]      = useState<MenuItem | null>(null);
  const [search,       setSearch]      = useState("");
  const [catFilter,    setCatFilter]   = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [menuRes, matRes] = await Promise.all([
        fetch("/api/restaurant/menu"),
        fetch("/api/bakery/materials"),
      ]);
      const [menuJson, matJson] = await Promise.all([menuRes.json(), matRes.json()]);
      setItems(menuJson.items ?? []);
      setRawMats(matJson.materials ?? []);
    } catch {
      toast.error("Failed to load menu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter((i) => {
    if (catFilter !== "all" && i.category !== catFilter) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const closeModal = () => { setModal(null); setTarget(null); };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Menu"
        badge={filtered.length}
        description="Manage food items and their recipes"
        actions={
          <button
            onClick={() => { setTarget(null); setModal("add"); }}
            className="flex items-center gap-2 h-10 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold transition-all"
          >
            <Plus className="w-4 h-4" />Add Item
          </button>
        }
      />

      <div className="flex gap-3 flex-wrap">
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search menu..."
          className="h-10 px-4 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm flex-1 min-w-40"
        />
        <select
          value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
          className="h-10 px-3 bg-card border border-border rounded-xl text-foreground text-sm focus:outline-none"
        >
          <option value="all">All Categories</option>
          {CATS.map((c) => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-48 bg-card rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-16 text-center">
          <UtensilsCrossed className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">
            {search || catFilter !== "all" ? "No items match your filters" : "No menu items yet"}
          </p>
          {!search && catFilter === "all" && (
            <button onClick={() => setModal("add")} className="mt-4 h-10 px-5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold transition-all">
              Add First Item
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const cat = CATS.find((c) => c.value === item.category);
            const hasRecipe = (item.menu_recipes?.length ?? 0) > 0;
            const margin = item.cost_price > 0 && item.selling_price > 0
              ? ((item.selling_price - item.cost_price) / item.selling_price) * 100
              : null;
            return (
              <div
                key={item.id}
                className={cn(
                  "bg-card border rounded-2xl p-5 group transition-all",
                  item.is_active ? "border-border hover:border-orange-500/30" : "border-border/40 opacity-60"
                )}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-2xl shrink-0">
                    {cat?.icon ?? "🍴"}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setTarget(item); setModal("edit"); }}
                      className="w-8 h-8 rounded-lg bg-accent hover:bg-slate-600 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => { setTarget(item); setModal("delete"); }}
                      className="w-8 h-8 rounded-lg bg-accent hover:bg-red-600 flex items-center justify-center text-muted-foreground hover:text-white transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="font-bold text-foreground">{item.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5 capitalize">{cat?.label ?? item.category}</p>

                <div className="mt-3 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Price</span>
                    <span className="text-foreground font-bold">{formatRWF(item.selling_price)}</span>
                  </div>
                  {item.cost_price > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Cost</span>
                      <span className="text-muted-foreground">{formatRWF(item.cost_price)}</span>
                    </div>
                  )}
                  {margin !== null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Margin</span>
                      <span className={cn("font-bold", margin < 20 ? "text-red-400" : "text-green-400")}>
                        {margin.toFixed(0)}%
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Prep time</span>
                    <span className="text-muted-foreground">⏱ {item.prep_time_minutes}m</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-md border",
                    item.is_active
                      ? "bg-green-500/10 text-green-400 border-green-500/20"
                      : "bg-muted/10 text-muted-foreground border-border"
                  )}>
                    {item.is_active ? "ACTIVE" : "INACTIVE"}
                  </span>
                  {hasRecipe && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      RECIPE
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(modal === "add" || modal === "edit") && (
        <ItemModal
          item={modal === "edit" ? target : null}
          rawMaterials={rawMaterials}
          onClose={closeModal}
          onSave={() => { closeModal(); load(); }}
        />
      )}
      {modal === "delete" && target && (
        <DeleteModal item={target} onClose={closeModal} onDeleted={() => { closeModal(); load(); }} />
      )}
    </div>
  );
}
