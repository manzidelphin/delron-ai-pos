"use client";

import { Trash2 } from "lucide-react";
import { formatRWF } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface OrderItem {
  id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  serve_as: "bottle" | "shot";
  item_type: string;
  notes?: string | null;
  status: string;
}

interface TabItemProps {
  item: OrderItem;
  onRemove?: (id: string) => void;
}

export function TabItem({ item, onRemove }: TabItemProps) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-700/50 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-white truncate">{item.item_name}</p>
          {item.item_type === "bar_item" && (
            <span className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
              item.notes === "served as shot"
                ? "bg-amber-500/20 text-amber-400"
                : "bg-green-500/20 text-green-400"
            )}>
              {item.notes === "served as shot" ? "SHOT" : "BTL"}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500">{item.quantity} × {formatRWF(item.unit_price)}</p>
      </div>
      <span className="text-sm font-bold text-white">{formatRWF(item.total_price)}</span>
      {onRemove && (
        <button
          onClick={() => onRemove(item.id)}
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-700 hover:bg-red-500/20 hover:text-red-400 text-slate-400 transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
