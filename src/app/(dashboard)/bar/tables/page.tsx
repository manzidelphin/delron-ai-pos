"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { TableCard } from "@/components/bar/table-card";
import { TableFormModal, type FloorTableRow } from "@/components/bar/table-form-modal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = ["empty", "occupied", "bill_requested", "reserved"] as const;
const STATUS_LABELS: Record<string, string> = {
  empty: "Empty",
  occupied: "Occupied",
  bill_requested: "Bill Requested",
  reserved: "Reserved",
};

export default function BarTablesPage() {
  const [tables, setTables] = useState<FloorTableRow[]>([]);
  const [nextNumber, setNextNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<{ table: FloorTableRow | null } | null>(null);
  const [statusModal, setStatusModal] = useState<FloorTableRow | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bar/tables");
      const json = await res.json();
      setTables(json.tables ?? []);
      setNextNumber(json.next_number ?? 1);
    } catch {
      toast.error("Failed to load tables");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (table: FloorTableRow, status: string) => {
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

  const removeTable = async (table: FloorTableRow) => {
    try {
      const res = await fetch(`/api/bar/tables/${table.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(`Table ${table.table_number} removed`);
      setStatusModal(null);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to remove");
    }
  };

  const stats = {
    empty: tables.filter((t) => t.status === "empty").length,
    occupied: tables.filter((t) => t.status === "occupied").length,
    bill_requested: tables.filter((t) => t.status === "bill_requested").length,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Table Management</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {stats.occupied} occupied · {stats.empty} empty · {stats.bill_requested} need bill.
            Tables disappear once their bill is paid, except pinned ones.
          </p>
        </div>
        <button
          onClick={() => setForm({ table: null })}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors flex-shrink-0"
        >
          <Plus className="w-4 h-4" /> New Table
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-32 glass-card rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : tables.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg font-medium">No tables open</p>
          <p className="text-sm mt-1">Create a table when customers sit down. It disappears once the bill is paid.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {tables.map((table) => (
            <TableCard key={table.id} table={table} onClick={() => setStatusModal(table)} />
          ))}
        </div>
      )}

      {/* Status and actions */}
      {statusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card rounded-2xl shadow-2xl w-full max-w-xs">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">
                Table {statusModal.table_number}{statusModal.section ? ` · ${statusModal.section}` : ""}
              </h2>
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
                onClick={() => { setForm({ table: statusModal }); setStatusModal(null); }}
                className="w-full h-11 rounded-xl text-sm font-semibold bg-accent text-foreground hover:bg-accent/80 transition-all mt-2"
              >
                Edit Table Details
              </button>
              <button
                onClick={() => removeTable(statusModal)}
                className="w-full h-11 rounded-xl text-sm font-semibold border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Remove Table
              </button>
            </div>
          </div>
        </div>
      )}

      {form && (
        <TableFormModal
          table={form.table}
          nextNumber={nextNumber}
          onSaved={() => { setForm(null); load(); }}
          onClose={() => setForm(null)}
        />
      )}
    </div>
  );
}
