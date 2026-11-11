"use client";

import { useState } from "react";
import { Loader2, Minus, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { cn, formatRWF } from "@/lib/utils";
import { VOID_REASONS } from "@/lib/bar-void";

export type RemoveTarget =
  | { kind: "line"; tabId: string; ids: string[]; name: string; quantity: number; unitPrice: number; poured: boolean }
  | { kind: "table"; tabId: string; label: string; total: number; itemCount: number };

/**
 * Remove some of a line from an open bill, or cancel the whole table.
 * A reason is required; the removal is logged for the owner (Bar Reports).
 */
export function RemoveItemsModal({ target, onDone, onClose }: {
  target: RemoveTarget;
  onDone: (result: { tab_total: number; cancelled: boolean }) => void;
  onClose: () => void;
}) {
  const isTable = target.kind === "table";
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState<string>("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const maxQty = target.kind === "line" ? target.quantity : 0;
  const value = target.kind === "line" ? target.unitPrice * qty : target.total;

  const submit = async () => {
    if (!reason) return toast.error("Choose a reason");
    if (reason === "Other" && !note.trim()) return toast.error("Write the reason");
    setSaving(true);
    try {
      const res = await fetch(`/api/bar/tabs/${target.tabId}/void`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isTable
            ? { cancel_table: true, reason, note }
            : { line_ids: target.ids, quantity: qty, reason, note }
        ),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not remove");
      toast.success(isTable ? "Table cancelled" : `Removed ${qty} × ${target.kind === "line" ? target.name : ""}`);
      onDone({ tab_total: json.tab_total, cancelled: isTable });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not remove");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="glass-card rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground">{isTable ? "Cancel table" : "Remove from bill"}</h2>
            <p className="text-xs text-muted-foreground">
              {target.kind === "table" ? `${target.label} · ${target.itemCount} item(s)` : target.name}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {target.kind === "line" && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">How many to remove</p>
              <div className="flex items-center justify-center gap-5">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-11 h-11 rounded-full bg-accent flex items-center justify-center"><Minus className="w-5 h-5" /></button>
                <span className="text-3xl font-black w-14 text-center">{qty}</span>
                <button onClick={() => setQty(Math.min(maxQty, qty + 1))} className="w-11 h-11 rounded-full bg-accent flex items-center justify-center"><Plus className="w-5 h-5" /></button>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">of {maxQty} on the bill</p>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Reason</p>
            <div className="grid grid-cols-2 gap-2">
              {VOID_REASONS.map((r) => (
                <button key={r} onClick={() => setReason(r)}
                  className={cn("min-h-11 px-2 rounded-xl text-sm font-medium border transition-all",
                    reason === r ? "bg-blue-500 border-blue-500 text-white" : "bg-card border-border text-foreground hover:bg-accent")}>
                  {r}
                </button>
              ))}
            </div>
            {reason === "Other" && (
              <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} autoFocus
                placeholder="Write the reason"
                className="mt-2 w-full h-11 px-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            )}
          </div>

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200/90 space-y-1">
            <p><b>{formatRWF(value)}</b> will be taken off the bill.</p>
            <p>
              {isTable
                ? "Unopened bottles go back to stock; poured drinks and food are counted as waste."
                : target.kind === "line" && target.poured
                  ? "Poured drinks and food don't go back to stock (counted as waste)."
                  : "Unopened bottles go back to stock."}
            </p>
            <p>The owner sees every removal, with your name and the reason.</p>
          </div>

          <button onClick={submit} disabled={saving || !reason}
            className="w-full h-12 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isTable ? "Cancel table" : `Remove ${qty}`}
          </button>
        </div>
      </div>
    </div>
  );
}
