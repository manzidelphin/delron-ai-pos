"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuthStore } from "@/store/auth-store";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { formatRWF } from "@/lib/utils";
import { toast } from "sonner";
import {
  Plus, Search, X, Loader2, Package, AlertTriangle,
  TrendingDown, DollarSign, Pencil, Trash2, Plus as PlusIcon,
} from "lucide-react";

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  min_quantity: number;
  cost_per_unit: number;
  supplier_id: string | null;
  suppliers?: { name: string } | null;
  created_at: string;
  updated_at: string;
}

interface MaterialForm {
  name: string;
  unit: string;
  quantity: string;
  min_quantity: string;
  cost_per_unit: string;
  supplier_id: string;
}

const UNITS = ["kg", "litre", "piece", "pack", "dozen", "gram", "ml", "bag"];
const EMPTY_FORM: MaterialForm = { name: "", unit: "kg", quantity: "", min_quantity: "1", cost_per_unit: "", supplier_id: "" };

function MaterialModal({
  material,
  suppliers,
  onClose,
  onSave,
}: {
  material: RawMaterial | null;
  suppliers: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSave: () => void;
}) {
  const isEdit = !!material;
  const [form, setForm] = useState<MaterialForm>(
    material
      ? { name: material.name, unit: material.unit, quantity: String(material.quantity), min_quantity: String(material.min_quantity), cost_per_unit: String(material.cost_per_unit), supplier_id: material.supplier_id || "" }
      : EMPTY_FORM
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: keyof MaterialForm, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name required";
    if (!form.unit) e.unit = "Unit required";
    if (form.quantity === "" || isNaN(parseFloat(form.quantity))) e.quantity = "Quantity required";
    if (!form.cost_per_unit || isNaN(parseFloat(form.cost_per_unit))) e.cost_per_unit = "Cost required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setIsLoading(true);
    try {
      const url = isEdit ? `/api/bakery/materials/${material!.id}` : "/api/bakery/materials";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success(isEdit ? "Material updated" : "Material added");
      onSave();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h2 className="text-lg font-bold text-white">{isEdit ? "Edit Ingredient" : "Add Ingredient"}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {[
            { key: "name" as const, label: "Ingredient Name *", placeholder: "e.g. Wheat Flour", type: "text" },
            { key: "quantity" as const, label: "Current Quantity *", placeholder: "0", type: "number" },
            { key: "min_quantity" as const, label: "Minimum Stock (alert threshold) *", placeholder: "1", type: "number" },
            { key: "cost_per_unit" as const, label: "Cost per Unit (RWF) *", placeholder: "0", type: "number" },
          ].map(({ key, label, placeholder, type }) => (
            <div key={key}>
              <label className="text-sm font-medium text-slate-300 block mb-1.5">{label}</label>
              <input type={type} value={form[key]} onChange={(e) => set(key, e.target.value)} placeholder={placeholder} autoFocus={key === "name"}
                className="w-full h-11 px-4 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {errors[key] && <p className="text-red-400 text-xs mt-1">{errors[key]}</p>}
            </div>
          ))}

          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1.5">Unit *</label>
            <select value={form.unit} onChange={(e) => set("unit", e.target.value)}
              className="w-full h-11 px-3 bg-slate-900 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>

          {suppliers.length > 0 && (
            <div>
              <label className="text-sm font-medium text-slate-300 block mb-1.5">Supplier (optional)</label>
              <select value={form.supplier_id} onChange={(e) => set("supplier_id", e.target.value)}
                className="w-full h-11 px-3 bg-slate-900 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">-- No supplier --</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-slate-600 text-slate-300 font-medium">Cancel</button>
            <button onClick={handleSave} disabled={isLoading}
              className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2">
              {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : isEdit ? "Save Changes" : "Add Ingredient"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RestockModal({ material, onClose, onDone }: { material: RawMaterial; onClose: () => void; onDone: () => void }) {
  const [qty, setQty] = useState("");
  const [cost, setCost] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isLoading, setIsLoading] = useState(false);

  const handleRestock = async () => {
    if (!qty || parseFloat(qty) <= 0) { toast.error("Enter a valid quantity"); return; }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/bakery/materials/${material.id}/restock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity_to_add: qty, cost_paid: cost, date_received: date }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success(`Added ${qty} ${material.unit} to ${material.name}`);
      onDone();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h2 className="font-bold text-white">Restock: {material.name}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-slate-900/50 rounded-xl p-3 text-sm">
            <div className="flex justify-between text-slate-400">
              <span>Current stock</span>
              <span className="text-white font-bold">{material.quantity} {material.unit}</span>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1.5">Quantity to Add ({material.unit}) *</label>
            <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" min="0" autoFocus
              className="w-full h-14 px-4 bg-slate-900 border border-slate-600 rounded-xl text-white text-2xl font-black text-center placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1.5">Total Cost Paid (RWF)</label>
            <input type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="Optional"
              className="w-full h-11 px-4 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {cost && qty && <p className="text-xs text-slate-400 mt-1">Cost per unit: {formatRWF(parseFloat(cost) / parseFloat(qty))}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1.5">Date Received</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={new Date().toISOString().split("T")[0]}
              className="w-full h-11 px-4 bg-slate-900 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-slate-600 text-slate-300 font-medium">Cancel</button>
            <button onClick={handleRestock} disabled={isLoading || !qty}
              className="flex-1 h-11 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusIcon className="w-4 h-4" />}
              Add Stock
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MaterialsPage() {
  const { isLoaded } = useAuthStore();
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);
  const [stats, setStats] = useState({ total: 0, totalValue: 0, lowCount: 0, outCount: 0 });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal] = useState<"add" | "edit" | "restock" | null>(null);
  const [target, setTarget] = useState<RawMaterial | null>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout>>();

  const load = useCallback(async (q = "", s = statusFilter) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ ...(q && { search: q }), status: s });
      const [matRes, supRes] = await Promise.all([
        fetch(`/api/bakery/materials?${params}`),
        fetch("/api/suppliers"),
      ]);
      const matJson = await matRes.json();
      const supJson = await supRes.json();
      if (matRes.ok) {
        setMaterials(matJson.materials ?? []);
        setStats({ total: matJson.total ?? 0, totalValue: matJson.totalValue ?? 0, lowCount: matJson.lowCount ?? 0, outCount: matJson.outCount ?? 0 });
      }
      if (supRes.ok) setSuppliers(supJson.suppliers ?? []);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { if (isLoaded) load(); }, [isLoaded, load]);

  const handleSearch = (val: string) => {
    setSearch(val);
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => load(val, statusFilter), 300);
  };

  const handleStatusChange = (s: string) => {
    setStatusFilter(s);
    load(search, s);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    const res = await fetch(`/api/bakery/materials/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Deleted"); load(search); }
    else toast.error("Failed to delete");
  };

  const getStatus = (m: RawMaterial) => {
    if (m.quantity <= 0) return { label: "Out of Stock", color: "text-red-400 bg-red-500/10 border-red-500/20" };
    if (m.quantity <= m.min_quantity) return { label: "Low Stock", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
    return { label: "Good Stock", color: "text-green-400 bg-green-500/10 border-green-500/20" };
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Raw Materials"
        badge={stats.total}
        description="Bakery ingredients inventory"
        actions={
          <button onClick={() => { setTarget(null); setModal("add"); }}
            className="flex items-center gap-2 h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all">
            <Plus className="w-4 h-4" /> Add Ingredient
          </button>
        }
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Ingredients" value={stats.total} icon={<Package className="w-5 h-5" />} color="blue" loading={isLoading} />
        <StatCard label="Total Value" value={formatRWF(stats.totalValue)} icon={<DollarSign className="w-5 h-5" />} color="green" loading={isLoading} />
        <StatCard label="Low Stock" value={stats.lowCount} icon={<AlertTriangle className="w-5 h-5" />} color="amber" loading={isLoading} />
        <StatCard label="Out of Stock" value={stats.outCount} icon={<TrendingDown className="w-5 h-5" />} color="red" loading={isLoading} />
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={search} onChange={(e) => handleSearch(e.target.value)} placeholder="Search ingredients..."
            className="w-full h-10 pl-10 pr-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
          {search && <button onClick={() => { setSearch(""); load(""); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>}
        </div>
        {["all", "low", "out"].map((s) => (
          <button key={s} onClick={() => handleStatusChange(s)}
            className={`h-10 px-4 rounded-xl text-sm font-medium border transition-all ${statusFilter === s ? "bg-blue-600 border-blue-600 text-white" : "border-slate-700 text-slate-400 hover:border-slate-600 hover:text-white"}`}>
            {s === "all" ? "All" : s === "low" ? "Low Stock" : "Out of Stock"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-900/50">
                {["Ingredient", "Unit", "Stock", "Min Stock", "Cost/Unit", "Total Value", "Status", "Actions"].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-5 py-4"><div className="h-4 bg-slate-700/60 rounded w-3/4" /></td>
                      ))}
                    </tr>
                  ))
                : materials.length === 0
                ? (
                  <tr><td colSpan={8} className="px-5 py-16 text-center text-slate-500">No ingredients found</td></tr>
                )
                : materials.map((m) => {
                    const status = getStatus(m);
                    return (
                      <tr key={m.id} className="hover:bg-slate-700/20 transition-colors group">
                        <td className="px-5 py-4">
                          <p className="font-medium text-white">{m.name}</p>
                          {m.suppliers && <p className="text-xs text-slate-500">{m.suppliers.name}</p>}
                        </td>
                        <td className="px-5 py-4 text-slate-300">{m.unit}</td>
                        <td className="px-5 py-4">
                          <span className={`font-bold ${m.quantity <= 0 ? "text-red-400" : m.quantity <= m.min_quantity ? "text-amber-400" : "text-white"}`}>
                            {m.quantity} {m.unit}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-400">{m.min_quantity} {m.unit}</td>
                        <td className="px-5 py-4 text-slate-300">{formatRWF(m.cost_per_unit)}</td>
                        <td className="px-5 py-4 text-slate-300">{formatRWF(m.quantity * m.cost_per_unit)}</td>
                        <td className="px-5 py-4">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-lg border ${status.color}`}>{status.label}</span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setTarget(m); setModal("restock"); }}
                              className="h-7 px-2.5 bg-green-600/20 hover:bg-green-600/40 text-green-400 text-xs rounded-lg font-medium transition-all">
                              + Stock
                            </button>
                            <button onClick={() => { setTarget(m); setModal("edit"); }}
                              className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-400 hover:text-white">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(m.id, m.name)}
                              className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-red-500/20 flex items-center justify-center text-slate-400 hover:text-red-400">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </div>

      {(modal === "add" || modal === "edit") && (
        <MaterialModal material={modal === "edit" ? target : null} suppliers={suppliers} onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(search); }} />
      )}
      {modal === "restock" && target && (
        <RestockModal material={target} onClose={() => setModal(null)} onDone={() => { setModal(null); load(search); }} />
      )}
    </div>
  );
}
