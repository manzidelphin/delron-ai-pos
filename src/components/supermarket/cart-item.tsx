"use client";

import { formatRWF } from "@/lib/utils";
import { Minus, Plus, X } from "lucide-react";
import type { CartItem } from "@/types";

interface CartItemRowProps {
  item: CartItem;
  onUpdateQty: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
}

export function CartItemRow({ item, onUpdateQty, onRemove }: CartItemRowProps) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-700/50 last:border-0 group">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white leading-tight truncate">{item.item_name}</p>
        <p className="text-xs text-slate-400 mt-0.5">{formatRWF(item.unit_price)} each</p>
      </div>

      {/* Qty controls */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
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
