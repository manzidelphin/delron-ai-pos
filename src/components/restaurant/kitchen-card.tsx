"use client";

import { cn } from "@/lib/utils";

export interface KitchenItem {
  id: string;
  item_name: string;
  quantity: number;
  notes?: string | null;
  status: "pending" | "preparing" | "ready";
  created_at: string;
  orders?: {
    floor_tables?: { table_number: number } | null;
  } | null;
}

interface KitchenCardProps {
  item: KitchenItem;
  onStatusChange: (id: string, status: string) => void;
}

const NEXT: Record<string, { label: string; next: string; color: string }> = {
  pending:   { label: "Start Cooking",   next: "preparing", color: "bg-orange-600 hover:bg-orange-700" },
  preparing: { label: "Ready to Serve",  next: "ready",     color: "bg-green-600 hover:bg-green-700"  },
  ready:     { label: "Mark Served",     next: "served",    color: "bg-purple-600 hover:bg-purple-700" },
};

function elapsed(ts: string): string {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

export function KitchenCard({ item, onStatusChange }: KitchenCardProps) {
  const btn = NEXT[item.status];
  const tableNum = item.orders?.floor_tables?.table_number;
  const ageMs = Date.now() - new Date(item.created_at).getTime();
  const prepMin = item.notes ? parseInt(item.notes) : null;
  const isUrgent   = item.status === "pending"   && ageMs > 5 * 60 * 1000;
  const isOverdue  = item.status === "preparing" && prepMin != null && ageMs > prepMin * 60 * 1000;
  const isAlert    = isUrgent || isOverdue;

  return (
    <div
      className={cn(
        "rounded-2xl p-4 border-2 transition-all space-y-3",
        item.status === "ready"     && "bg-green-500/5 border-green-500/40",
        item.status === "preparing" && !isAlert && "bg-slate-800 border-orange-500/40",
        item.status === "pending"   && !isAlert && "bg-slate-800 border-yellow-500/30",
        isAlert && "bg-red-500/5 border-red-500/60",
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          {tableNum != null && (
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
              Table {tableNum}
            </p>
          )}
          <p className="text-lg font-black text-white leading-tight">{item.item_name}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-black text-white">&times;{item.quantity}</span>
            {prepMin != null && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400">
                {prepMin}m prep
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className={cn("text-xs font-bold", isAlert ? "text-red-400" : "text-slate-500")}>
            {elapsed(item.created_at)}
          </span>
          {isAlert && (
            <p className="text-[10px] font-bold text-red-400 mt-0.5">OVERDUE</p>
          )}
        </div>
      </div>

      {btn && (
        <button
          onClick={() => onStatusChange(item.id, btn.next)}
          className={cn(
            "w-full h-10 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.98]",
            btn.color
          )}
        >
          {btn.label}
        </button>
      )}
    </div>
  );
}
