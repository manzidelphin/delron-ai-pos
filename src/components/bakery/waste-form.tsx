"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface FinishedGoodOption {
  id: string;
  name: string;
  quantity: number;
}

interface WasteFormProps {
  items: FinishedGoodOption[];
  onSubmit: () => void;
}

const WASTE_REASONS = [
  "Expired",
  "Unsold end of day",
  "Damaged",
  "Burned during baking",
  "Quality issue",
  "Other",
];

export function WasteForm({ items, onSubmit }: WasteFormProps) {
  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isLoading, setIsLoading] = useState(false);

  const selectedItem = items.find((i) => i.id === itemId);

  const handleSubmit = async () => {
    if (!itemId || !qty || !reason) {
      toast.error("Please fill all required fields");
      return;
    }
    const quantity = parseFloat(qty);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error("Quantity must be a positive number");
      return;
    }
    if (selectedItem && quantity > selectedItem.quantity) {
      toast.error(`Only ${selectedItem.quantity} in stock`);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/bakery/waste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: itemId,
          item_name: selectedItem?.name,
          quantity_wasted: quantity,
          reason,
          date,
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to log waste");
      }
      toast.success("Waste logged successfully");
      setItemId("");
      setQty("");
      setReason("");
      setNotes("");
      onSubmit();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-4">
      <h3 className="font-bold text-white flex items-center gap-2">
        <span className="text-lg">🗑️</span> Log Waste
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="text-sm font-medium text-slate-300 block mb-1.5">Select Item *</label>
          <select
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            className="w-full h-11 px-3 bg-slate-900 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Select baked item --</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} (Stock: {i.quantity})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-300 block mb-1.5">Quantity Wasted *</label>
          <input
            type="number"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="0"
            min="0"
            className="w-full h-11 px-4 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {selectedItem && qty && parseFloat(qty) > selectedItem.quantity && (
            <p className="text-xs text-red-400 mt-1">Exceeds stock ({selectedItem.quantity})</p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-slate-300 block mb-1.5">Date *</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            className="w-full h-11 px-4 bg-slate-900 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="col-span-2">
          <label className="text-sm font-medium text-slate-300 block mb-1.5">Reason *</label>
          <div className="grid grid-cols-3 gap-2">
            {WASTE_REASONS.map((r) => (
              <button
                key={r}
                onClick={() => setReason(r)}
                className={`h-9 px-2 rounded-lg text-xs font-medium border transition-all ${
                  reason === r
                    ? "bg-red-600/30 border-red-500/50 text-red-300"
                    : "border-slate-600 text-slate-400 hover:border-slate-500 hover:text-white"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="col-span-2">
          <label className="text-sm font-medium text-slate-300 block mb-1.5">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional details..."
            rows={2}
            className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
          />
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={isLoading || !itemId || !qty || !reason}
        className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Logging...</>
        ) : (
          "🗑️ Log Waste"
        )}
      </button>
    </div>
  );
}
