"use client";

import { cn } from "@/lib/utils";
import { Users } from "lucide-react";

interface FloorTable {
  id: string;
  table_number: number;
  capacity: number;
  location: string | null;
  status: "empty" | "occupied" | "bill_requested" | "reserved";
}

interface TableCardProps {
  table: FloorTable;
  activeTabTotal?: number;
  onClick: () => void;
}

const STATUS_CONFIG = {
  empty: { label: "Empty", bg: "bg-slate-700/50", border: "border-slate-600", text: "text-slate-400", dot: "bg-slate-500" },
  occupied: { label: "Occupied", bg: "bg-blue-500/10", border: "border-blue-500/40", text: "text-blue-400", dot: "bg-blue-500" },
  bill_requested: { label: "Bill Requested", bg: "bg-yellow-500/10", border: "border-yellow-500/40", text: "text-yellow-400", dot: "bg-yellow-500" },
  reserved: { label: "Reserved", bg: "bg-purple-500/10", border: "border-purple-500/40", text: "text-purple-400", dot: "bg-purple-500" },
};

export function TableCard({ table, activeTabTotal, onClick }: TableCardProps) {
  const cfg = STATUS_CONFIG[table.status];

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-4 rounded-2xl border-2 text-left transition-all hover:scale-[1.02] active:scale-[0.98]",
        cfg.bg, cfg.border
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-2xl font-black text-white">T{table.table_number}</p>
          {table.location && <p className="text-xs text-slate-500">{table.location}</p>}
        </div>
        <span className={cn("flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full", cfg.text)}>
          <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", cfg.dot)} />
          {cfg.label}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-slate-500">
          <Users className="w-3.5 h-3.5" />
          <span className="text-xs">{table.capacity} seats</span>
        </div>
        {activeTabTotal !== undefined && activeTabTotal > 0 && (
          <span className="text-sm font-bold text-white">
            {activeTabTotal.toLocaleString()} RWF
          </span>
        )}
      </div>
    </button>
  );
}
