import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  color?: "blue" | "green" | "amber" | "red" | "purple";
  loading?: boolean;
}

const colorMap = {
  blue:   "bg-blue-500/10 text-blue-400 border-blue-500/20",
  green:  "bg-green-500/10 text-green-400 border-green-500/20",
  amber:  "bg-amber-500/10 text-amber-400 border-amber-500/20",
  red:    "bg-red-500/10 text-red-400 border-red-500/20",
  purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

export function StatCard({
  label,
  value,
  change,
  changeLabel,
  icon,
  color = "blue",
  loading = false,
}: StatCardProps) {
  if (loading) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 animate-pulse">
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 rounded-lg bg-slate-700" />
          <div className="w-16 h-6 rounded-full bg-slate-700" />
        </div>
        <div className="w-24 h-7 bg-slate-700 rounded mb-2" />
        <div className="w-32 h-4 bg-slate-700/60 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 hover:border-slate-600 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className={cn("w-10 h-10 rounded-lg border flex items-center justify-center", colorMap[color])}>
          {icon}
        </div>
        {change !== undefined && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full",
              change >= 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
            )}
          >
            {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm text-slate-400 mt-0.5">{label}</p>
      {changeLabel && (
        <p className="text-xs text-slate-500 mt-1">{changeLabel}</p>
      )}
    </div>
  );
}
