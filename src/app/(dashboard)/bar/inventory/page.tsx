"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Search, Edit2, RefreshCw, Package, Loader2 } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { formatRWF } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface BarItem {
  id: string;
  name: string;
  category: string;
  barcode: string | null;
  price_per_bottle: number;
  price_per_shot: number | null;
  shots_per_bottle: number | null;
  cost_per_bottle: number;
  quantity_bottles: number;
  shots_remaining: number;
  reorder_point: number;
  is_shot_item: boolean;
  is_active: boolean;
}

interface Stats {
  total_items: number;
  low_stock: number;
  out_of_stock: number;
  total_value: number;
}

const CATEGORIES = ["spirits", "wine", "beer", "cocktail", "soft_drink", "juice", "other"];

const EMPTY_FORM = {
  name: "", category: "spirits", barcode: "", price_per_bottle: "",
  price_per_shot: "", shots_per_bottle: "", cost_per_bottle: "",
  quantity_bottles: "", reorder_point: "2", is_shot_item: false,
};

export default function BarInventoryPage() {
  const [items, setItems] = useState<BarItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showRestock, setShowRestock] = useState<BarItem | null>(null);
  const [editing, setEditing] = useState<BarItem | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [restockQty, setRestockQty] = useState("");
  const [restockCost, setRestockCost] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bar/items?search=${encodeURIComponent(search)}&category=${categoryFilter}`);
      const json = await res.json();
      setItems(json.items ?? []);
      setStats(json.stats ?? null);
    } catch {
      toast.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (item: BarItem) => {
    setEditing(item);
    setForm({
      name: item.name, category: item.category, barcode: item.barcode ?? "",
      price_per_bottle: String(item.price_per_bottle),
      price_per_shot: item.price_per_shot ? String(item.price_per_shot) : "",
      shots_per_bottle: item.shots_per_bottle ? String(item.shots_per_bottle) : "",
      cost_per_bottle: String(item.cost_per_bottle),
      quantity_bottles: String(item.quantity_bottles),
      reorder_point: String(item.reorder_point),
      is_shot_item: item.is_shot_item,
    });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name || !form.price_per_bottle) return toast.error("Name and price required");
    setSaving(true);
    try {
      const url = editing ? `/api/bar/items/${editing.id}` : "/api/bar/items";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(editing ? "Item updated" : "Item added");
      setShowModal(false);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const doRestock = async () => {
    if (!showRestock || !restockQty) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/bar/items/${showRestock.id}/restock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bottles_to_add: restockQty, cost_paid: restockCost }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Stock updated");
      setShowRestock(null);
      setRestockQty("");
      setRestockCost("");
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Restock failed");
    } finally {
      setSaving(false);
    }
  };

  const stockStatus = (item: BarItem) => {
    if (item.quantity_bottles === 0) return "text-red-400";
    if (item.quantity_bottles <= item.reorder_point) return "text-yellow-400";
    return "text-green-400";
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bar Inventory</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage bottles, shots & stock levels</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Items" value={stats?.total_items ?? 0} icon={<Package className="w-5 h-5" />} loading={loading} />
        <StatCard label="Low Stock" value={stats?.low_stock ?? 0} icon={<Package className="w-5 h-5" />} loading={loading} color="amber" />
        <StatCard label="Out of Stock" value={stats?.out_of_stock ?? 0} icon={<Package className="w-5 h-5" />} loading={loading} color="red" />
        <StatCard label="Total Value" value={loading ? "..." : formatRWF(stats?.total_value ?? 0)} icon={<Package className="w-5 h-5" />} loading={loading} color="green" />
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items..."
            className="w-full h-10 pl-9 pr-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-10 px-3 bg-card border border-border rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
        </select>
        <button onClick={load} className="h-10 w-10 flex items-center justify-center rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Item</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Category</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Bottle Price</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Shot Price</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Shots/Bottle</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Stock</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-muted/30 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    No items found
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-b border-border hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{item.name}</p>
                      {item.is_shot_item && <span className="text-xs text-amber-400">Shot tracking</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground capitalize">{item.category.replace("_", " ")}</td>
                    <td className="px-4 py-3 text-right text-sm text-foreground">{formatRWF(item.price_per_bottle)}</td>
                    <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                      {item.price_per_shot ? formatRWF(item.price_per_shot) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                      {item.shots_per_bottle ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn("text-sm font-bold", stockStatus(item))}>
                        {item.quantity_bottles} btl
                      </span>
                      {item.is_shot_item && (
                        <p className="text-xs text-muted-foreground">{item.shots_remaining} shots</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setShowRestock(item); setRestockQty(""); setRestockCost(""); }}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 font-medium transition-colors"
                        >
                          + Stock
                        </button>
                        <button
                          onClick={() => openEdit(item)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Item Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">{editing ? "Edit Item" : "Add Bar Item"}</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Name *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full h-10 px-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full h-10 px-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Barcode</label>
                  <input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                    className="w-full h-10 px-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Bottle Price (RWF) *</label>
                  <input type="number" value={form.price_per_bottle} onChange={(e) => setForm({ ...form, price_per_bottle: e.target.value })}
                    className="w-full h-10 px-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Cost/Bottle (RWF)</label>
                  <input type="number" value={form.cost_per_bottle} onChange={(e) => setForm({ ...form, cost_per_bottle: e.target.value })}
                    className="w-full h-10 px-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
              </div>

              {/* Shot tracking toggle */}
              <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <input type="checkbox" id="is_shot" checked={form.is_shot_item}
                  onChange={(e) => setForm({ ...form, is_shot_item: e.target.checked })}
                  className="w-4 h-4 accent-amber-500" />
                <label htmlFor="is_shot" className="text-sm font-medium text-amber-400 cursor-pointer">
                  Enable Shot Tracking (sell by the shot, not just bottle)
                </label>
              </div>

              {form.is_shot_item && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Price per Shot (RWF)</label>
                    <input type="number" value={form.price_per_shot} onChange={(e) => setForm({ ...form, price_per_shot: e.target.value })}
                      className="w-full h-10 px-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Shots per Bottle</label>
                    <input type="number" value={form.shots_per_bottle} onChange={(e) => setForm({ ...form, shots_per_bottle: e.target.value })}
                      placeholder="e.g. 20"
                      className="w-full h-10 px-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Current Stock (bottles)</label>
                  <input type="number" value={form.quantity_bottles} onChange={(e) => setForm({ ...form, quantity_bottles: e.target.value })}
                    className="w-full h-10 px-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Reorder Point (bottles)</label>
                  <input type="number" value={form.reorder_point} onChange={(e) => setForm({ ...form, reorder_point: e.target.value })}
                    className="w-full h-10 px-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 h-11 rounded-xl border border-border text-foreground hover:bg-accent transition-colors font-medium text-sm">
                  Cancel
                </button>
                <button onClick={save} disabled={saving} className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editing ? "Update" : "Add Item"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {showRestock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">Restock: {showRestock.name}</h2>
              <button onClick={() => setShowRestock(null)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Bottles to Add *</label>
                <input type="number" value={restockQty} onChange={(e) => setRestockQty(e.target.value)}
                  placeholder="e.g. 6"
                  autoFocus
                  className="w-full h-14 px-4 bg-background border border-border rounded-xl text-foreground text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Total Cost Paid (RWF, optional)</label>
                <input type="number" value={restockCost} onChange={(e) => setRestockCost(e.target.value)}
                  placeholder="Updates cost per bottle"
                  className="w-full h-10 px-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowRestock(null)} className="flex-1 h-11 rounded-xl border border-border text-foreground hover:bg-accent transition-colors font-medium text-sm">
                  Cancel
                </button>
                <button onClick={doRestock} disabled={saving || !restockQty} className="flex-1 h-11 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm Restock
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
