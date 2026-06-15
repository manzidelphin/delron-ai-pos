"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateRangeFilterProps {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}

function getPresetRange(preset: string): [string, string] {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  switch (preset) {
    case "today":
      return [fmt(today), fmt(today)];
    case "yesterday": {
      const d = new Date(today);
      d.setDate(d.getDate() - 1);
      return [fmt(d), fmt(d)];
    }
    case "this_week": {
      const d = new Date(today);
      d.setDate(today.getDate() - today.getDay());
      return [fmt(d), fmt(today)];
    }
    case "this_month": {
      const d = new Date(today.getFullYear(), today.getMonth(), 1);
      return [fmt(d), fmt(today)];
    }
    case "last_month": {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return [fmt(start), fmt(end)];
    }
    default:
      return [fmt(today), fmt(today)];
  }
}

const PRESETS = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "this_week", label: "This Week" },
  { key: "this_month", label: "This Month" },
  { key: "last_month", label: "Last Month" },
];

export function DateRangeFilter({ from, to, onChange }: DateRangeFilterProps) {
  const [active, setActive] = useState<string | null>("this_month");

  const handlePreset = (key: string) => {
    setActive(key);
    const [f, t] = getPresetRange(key);
    onChange(f, t);
  };

  const handleCustom = (type: "from" | "to", value: string) => {
    setActive(null);
    onChange(type === "from" ? value : from, type === "to" ? value : to);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((p) => (
        <button
          key={p.key}
          onClick={() => handlePreset(p.key)}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
            active === p.key
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-slate-800 text-slate-400 border-slate-700 hover:border-blue-500/50 hover:text-slate-200"
          )}
        >
          {p.label}
        </button>
      ))}
      <div className="flex items-center gap-2 pl-2 border-l border-slate-700">
        <Calendar className="w-3.5 h-3.5 text-slate-500" />
        <input
          type="date"
          value={from}
          onChange={(e) => handleCustom("from", e.target.value)}
          className="h-8 px-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-slate-600 text-xs">→</span>
        <input
          type="date"
          value={to}
          onChange={(e) => handleCustom("to", e.target.value)}
          className="h-8 px-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}
