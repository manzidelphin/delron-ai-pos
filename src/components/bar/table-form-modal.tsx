"use client";

import { useState } from "react";
import { Loader2, Pin } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";

export interface FloorTableRow {
  id: string;
  table_number: string | number;
  capacity: number;
  section: string | null; // the table's name
  is_fixed?: boolean;
  status: "empty" | "occupied" | "bill_requested" | "reserved";
}

interface TableFormModalProps {
  /** Table to edit; omit to create a new one. */
  table?: FloorTableRow | null;
  /** Suggested number for a new table (next free one). */
  nextNumber?: number;
  onSaved: (table: FloorTableRow) => void;
  onClose: () => void;
}

/**
 * Create or edit a table: number (next free one filled in), a name for the
 * customers or spot, seats, and, for owners/managers, "keep after payment"
 * for real furniture tables. Other tables disappear once their bill is paid.
 */
export function TableFormModal({ table, nextNumber, onSaved, onClose }: TableFormModalProps) {
  const { canAccess } = useAuthStore();
  const canFix = canAccess(["owner", "manager"]);
  const isEdit = !!table;

  const [number, setNumber] = useState(String(table?.table_number ?? nextNumber ?? ""));
  const [name, setName] = useState(table?.section ?? "");
  const [capacity, setCapacity] = useState(String(table?.capacity ?? 4));
  const [isFixed, setIsFixed] = useState(table?.is_fixed ?? false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!(parseInt(number) > 0)) return toast.error("Enter a table number");
    setSaving(true);
    try {
      const res = await fetch(isEdit ? `/api/bar/tables/${table!.id}` : "/api/bar/tables", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table_number: number,
          name,
          capacity,
          ...(canFix ? { is_fixed: isFixed } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save");
      toast.success(isEdit ? "Table updated" : `Table ${json.table.table_number} created`);
      onSaved(json.table);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const input = "w-full h-11 px-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass-card rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">{isEdit ? "Edit Table" : "New Table"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <form className="p-5 space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Number *</label>
              <input type="number" min="1" value={number} onChange={(e) => setNumber(e.target.value)} className={input} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoFocus
                placeholder="e.g. Bruce, Terrace, VIP" className={input} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Seats</label>
            <input type="number" min="1" value={capacity} onChange={(e) => setCapacity(e.target.value)} className={input} />
          </div>

          {canFix ? (
            <button type="button" onClick={() => setIsFixed(!isFixed)}
              className={cn("w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-colors",
                isFixed ? "border-blue-500/50 bg-blue-500/10" : "border-border hover:bg-accent")}>
              <Pin className={cn("w-4 h-4 mt-0.5 flex-shrink-0", isFixed ? "text-blue-400" : "text-muted-foreground")} />
              <span>
                <span className="block text-sm font-semibold text-foreground">Keep after payment {isFixed ? "✓" : ""}</span>
                <span className="block text-xs text-muted-foreground">
                  For real tables in the bar. Others disappear once their bill is paid.
                </span>
              </span>
            </button>
          ) : (
            <p className="text-xs text-muted-foreground">This table disappears once its bill is paid.</p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl border border-border text-foreground hover:bg-accent transition-colors font-medium text-sm">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
