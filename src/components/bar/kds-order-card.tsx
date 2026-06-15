"use client";

import { cn } from "@/lib/utils";

interface KDSItem {
  id: string;
  item_name: string;
  quantity: number;
  serve_as: "bottle" | "shot";
  status: "pending" | "preparing" | "ready";
  created_at: string;
  orders?: {
    floor_tables?: {
      table_number: number;
    } | null;
  } | null;
}

interface KDSOrderCardProps {
  item: KDSItem;
  onStatusChange: (id: string, status: string) => void;
}

const NEXT_STATUS: Record<string, { label: string; status: string; color: string }> = {
  pending: { label: "Start Preparing", status: "preparing", color: "bg-blue-600 hover:bg-blue-700" },
  preparing: { label: "Mark Ready", status: "ready", color: "bg-green-600 hover:bg-green-700" },
  ready: { label: "Mark Served", status: "served", color: "bg-purple-600 hover:bg-purple-700" },
};

function timeAgo(ts: string) {
  const seconds = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.floor(seconds / 60)}m ago`;
}

export function KDSOrderCard({ item, onStatusChange }: KDSOrderCardProps) {
  const next = NEXT_STATUS[item.status];
  const tableNum = item.orders?.floor_tables?.table_number;
  const ageMs = Date.now() - new Date(item.created_at).getTime();
  const isUrgent = item.status === "pending" && ageMs > 5 * 60 * 1000;

  return (
    <div className={cn(
      "bg-slate-800 rounded-2xl p-4 border-2 transition-all",
      item.status === "pending" && isUrgent && "border-red-500/60 bg-red-500/5",
      item.status === "pending" && !isUrgent && "border-yellow-500/40",
      item.status === "preparing" && "border-blue-500/40",
      item.status === "ready" && "border-green-500/40 bg-green-500/5",
    )}>
      <div className="flex items-start justify-between mb-3">
        <div>
          {tableNum && (
            <span className="text-xs font-bold text-slate-400">TABLE {tableNum}</span>
          )}
          <p className="text-xl font-black text-white mt-0.5">{item.item_name}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-black text-white">×{item.quantity}</span>
            <span className={cn(
              "text-xs font-bold px-2 py-0.5 rounded-full",
              item.serve_as === "shot"
                ? "bg-amber-500/20 text-amber-400"
                : "bg-green-500/20 text-green-400"
            )}>
              {item.serve_as === "shot" ? "SHOT" : "BOTTLE"}
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className={cn(
            "text-xs font-bold",
            isUrgent ? "text-red-400" : "text-slate-500"
          )}>
            {timeAgo(item.created_at)}
          </span>
          {isUrgent && <p className="text-[10px] text-red-400 font-bold">URGENT</p>}
        </div>
      </div>

      {next && (
        <button
          onClick={() => onStatusChange(item.id, next.status)}
          className={cn(
            "w-full h-10 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.98]",
            next.color
          )}
        >
          {next.label}
        </button>
      )}
    </div>
  );
}
