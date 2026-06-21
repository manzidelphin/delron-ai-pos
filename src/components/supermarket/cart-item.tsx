"use client";

import { useState, useRef } from "react";
import { formatRWF } from "@/lib/utils";
import { Minus, Plus, X, Edit2 } from "lucide-react";
import type { CartItem } from "@/types";

const WEIGHT_UNITS = new Set(["kg", "g", "litre", "l", "ml", "gram", "grams", "liter", "liters"]);

function isWeightUnit(unit?: string) {
  return WEIGHT_UNITS.has((unit ?? "").toLowerCase());
}

function fmtQty(qty: number, unit?: string): string {
  if (isWeightUnit(unit)) {
    return `${parseFloat(qty.toFixed(3))} ${unit}`;
  }
  return String(Math.round(qty));
}

interface CartItemRowProps {
  item: CartItem;
  onUpdateQty: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
}

export function CartItemRow({ item, onUpdateQty, onRemove }: CartItemRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const weightMode = isWeightUnit(item.unit);

  const startEdit = () => {
    setDraft(parseFloat(item.quantity.toFixed(3)).toString());
    setEditing(true);
  };

  const commitDraft = () => {
    const val = parseFloat(draft);
    if (!isNaN(val) && val > 0) {
      onUpdateQty(item.product_id, val);
    }
    setEditing(false);
  };

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-700/50 last:border-0 group">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white leading-tight truncate">{item.item_name}</p>
        <p className="text-xs text-slate-400 mt-0.5">
          {formatRWF(item.unit_price)}{item.unit ? `/${item.unit}` : " each"}
        </p>
      </div>

      {/* Qty controls */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {weightMode ? (
          editing ? (
            <input
              ref={inputRef}
              type="number"
              step="0.01"
              min="0.01"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitDraft}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); commitDraft(); }
                if (e.key === "Escape") setEditing(false);
              }}
              autoFocus
              className="w-24 h-7 px-2 bg-slate-700 border border-blue-500 rounded-lg text-white text-sm text-center focus:outline-none"
            />
          ) : (
            <button
              onClick={startEdit}
              className="flex items-center gap-1.5 px-2.5 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 border border-slate-600 hover:border-blue-500 text-white text-sm font-bold transition-colors"
            >
              <span>{fmtQty(item.quantity, item.unit)}</span>
              <Edit2 className="w-3 h-3 text-slate-400" />
            </button>
          )
        ) : (
          <>
            <button
              onClick={() => onUpdateQty(item.product_id, item.quantity - 1)}
              className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center transition-colors active:scale-90"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="w-8 text-center text-sm font-bold text-white">{item.quantity}</span>
            <button
              onClick={() => onUpdateQty(item.product_id, item.quantity + 1)}
              className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center transition-colors active:scale-90"
            >
              <Plus className="w-3 h-3" />
            </button>
          </>
        )}
      </div>

      {/* Line total */}
      <div className="text-right flex-shrink-0 min-w-[80px]">
        <p className="text-sm font-bold text-white">{formatRWF(item.total_price)}</p>
        <button
          onClick={() => onRemove(item.product_id)}
          className="mt-0.5 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
