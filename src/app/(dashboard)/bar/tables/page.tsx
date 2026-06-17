"use client";

import { useEffect, useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { TableCard } from "@/components/bar/table-card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FloorTable {
  id: string;
  table_number: number;
  capacity: number;
  section: string | null;
  status: "empty" | "occupied" | "bill_requested" | "reserved";
}

const STATUS_OPTIONS = ["empty", "occupied", "bill_requested", "reserved"] as const;
const STATUS_LABELS: Record<string, string> = {
  empty: "Empty",
  occupied: "Occupied",
  bill_requested: "Bill Requested",
  reserved: "Reserved",
};

export default function BarTablesPage() {
  const [tables, setTables] = useState<FloorTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTable, setEditTable] = useState<FloorTable | null>(null);
  const [form, setForm] = useState({ table_number: "", capacity: "4", section: "" });
  const [saving, setSaving] = useState(false);
  const [statusModal, setStatusModal] = useState<FloorTable | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bar/tables");
      const json = await res.json();
      setTables(json.tables ?? []);
    } catch {
      toast.error("Failed to load tables");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditTable(null);
    setForm({ table_number: "", capacity: "4", section: "" });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.table_number) return toast.error("Table number required");
    setSaving(true);
    try {
      const url = editTable ? `/api/bar/tables/${editTable.id}` : "/api/bar/tables";
      const method = editTable ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(editTable ? "Table updated" : "Table created");
      setShowModal(false);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (table: FloorTable, status: string) => {
    try {
      const res = await fetch(`/api/bar/tables/${table.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setStatusModal(null);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    }
  };

  const stats = {
    total: tables.length,
    empty: tables.filter((t) => t.status === "empty").length,
    occupied: tables.filter((t) => t.status === "occupied").length,
    bill_requested: tables.filter((t) => t.status === "bill_requested").length,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Table Management</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {stats.occupied} occupied · {stats.empty} empty · {stats.bill_requested} need bill
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Table
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-32 bg-card border border-border rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : tables.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg font-medium">No tables yet</p>
          <p className="text-sm mt-1">Add your first table to start managing the floor.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {tables.map((table) => (
            <TableCard key={table.id} table={table} onClick={() => setStatusModal(table)} />
          ))}
        </div>
      )}

      {/* Status change modal */}
      {statusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-xs">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">Table {statusModal.table_number}</h2>
              <button onClick={() => setStatusModal(null)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-5 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Change Status</p>
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => updateStatus(statusModal, s)}
                  className={cn(
                    "w-full h-11 rounded-xl text-sm font-semibold border transition-all",
                    statusModal.status === s
                      ? "bg-blue-500/20 border-blue-500/40 text-blue-400"
                      : "bg-card border-border text-foreground hover:bg-accent"
                  )}
                >
                  {STATUS_LABELS[s]}
                  {statusModal.status === s && " ✓"}
                </button>
              ))}
              <button
                onClick={() => { setEditTable(statusModal); setForm({ table_number: String(statusModal.table_number), capacity: String(statusModal.capacity), section: statusModal.section ?? "" }); setStatusModal(null); setShowModal(true); }}
                className="w-full h-11 rounded-xl text-sm font-semibold bg-accent text-foreground hover:bg-accent/80 transition-all mt-2"
              >
                Edit Table Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">{editTable ? "Edit Table" : "Add Table"}</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Table Number *</label>
                <input type="number" value={form.table_number} onChange={(e) => setForm({ ...form, table_number: e.target.value })}
                  autoFocus
                  className="w-full h-10 px-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Capacity (seats)</label>
                <input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  className="w-full h-10 px-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Location / Section</label>
                <input value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })}
                  placeholder="e.g. Terrace, VIP Room"
                  className="w-full h-10 px-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 h-11 rounded-xl border border-border text-foreground hover:bg-accent transition-colors font-medium text-sm">
                  Cancel
                </button>
                <button onClick={save} disabled={saving} className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editTable ? "Update" : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
