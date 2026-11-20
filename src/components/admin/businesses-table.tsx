"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { Search, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BusinessRow {
  id: string;
  name: string;
  owner_email: string | null;
  modules: string[];
  plan: string;
  created_at: string;
  staff_count: number;
  last_activity: string | null;
  // billing fields
  subscription_plan: string;
  subscription_status: string;
  next_payment_due: string | null;
  monthly_amount: number;
}

const MODULE_COLORS: Record<string, string> = {
  supermarket: "bg-blue-500/20 text-blue-300",
  bakery: "bg-amber-500/20 text-amber-300",
  bar: "bg-purple-500/20 text-purple-300",
  restaurant: "bg-green-500/20 text-green-300",
};

const PLAN_COLORS: Record<string, string> = {
  trial: "bg-zinc-700/60 text-zinc-400",
  starter: "bg-blue-500/20 text-blue-300",
  professional: "bg-violet-500/20 text-violet-300",
  enterprise: "bg-amber-500/20 text-amber-300",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/20 text-green-300",
  overdue: "bg-amber-500/20 text-amber-300",
  suspended: "bg-red-500/20 text-red-400",
  cancelled: "bg-zinc-700/60 text-zinc-500",
};

type FilterType = "all" | "active" | "overdue" | "trial" | "suspended";
type SortType = "created" | "next_due";

const FILTER_TABS: { key: FilterType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "overdue", label: "Overdue" },
  { key: "trial", label: "Trial" },
  { key: "suspended", label: "Suspended" },
];

function fmtDate(d: string | null) {
  if (!d) return "—";
  try { return format(parseISO(d), "dd MMM yyyy"); } catch { return d; }
}

function isOverdueSoon(d: string | null, status: string): boolean {
  if (!d || status !== "active") return false;
  const diff = (new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return diff <= 7;
}

export default function BusinessesTable({ businesses }: { businesses: BusinessRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [sort, setSort] = useState<SortType>("created");

  const processed = useMemo(() => {
    let list = businesses;

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          (b.owner_email ?? "").toLowerCase().includes(q)
      );
    }

    // Filter
    if (filter !== "all") {
      list = list.filter((b) => {
        if (filter === "trial") return b.subscription_plan === "trial";
        if (filter === "overdue") return b.subscription_status === "overdue";
        if (filter === "suspended") return b.subscription_status === "suspended";
        if (filter === "active") return b.subscription_status === "active" && b.subscription_plan !== "trial";
        return true;
      });
    }

    // Sort
    if (sort === "next_due") {
      list = [...list].sort((a, b) => {
        if (!a.next_payment_due) return 1;
        if (!b.next_payment_due) return -1;
        return new Date(a.next_payment_due).getTime() - new Date(b.next_payment_due).getTime();
      });
    }

    return list;
  }, [businesses, search, filter, sort]);

  return (
    <div className="space-y-4">
      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search name or owner email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 w-64"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex bg-zinc-800/60 border border-zinc-700 rounded-lg p-0.5 gap-0.5">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                filter === tab.key
                  ? "bg-violet-600 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Sort */}
        <button
          onClick={() => setSort(sort === "created" ? "next_due" : "created")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
            sort === "next_due"
              ? "bg-violet-600/20 border-violet-500/40 text-violet-300"
              : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200"
          )}
        >
          <ArrowUpDown className="w-3 h-3" />
          {sort === "next_due" ? "Sorted: Next Due" : "Sort by Next Due"}
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-800 overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/60">
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Business</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Owner</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Modules</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Staff</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Plan</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Status</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Next Due</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {processed.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                  No businesses match.
                </td>
              </tr>
            )}
            {processed.map((b) => {
              const dueSoon = isOverdueSoon(b.next_payment_due, b.subscription_status);
              return (
                <tr
                  key={b.id}
                  onClick={() => router.push(`/admin/businesses/${b.id}`)}
                  className="border-b border-zinc-800/60 last:border-0 hover:bg-zinc-800/40 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-white">{b.name}</td>
                  <td className="px-4 py-3 text-zinc-400 max-w-[180px] truncate">{b.owner_email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {b.modules.length === 0
                        ? <span className="text-zinc-600">—</span>
                        : b.modules.map((m) => (
                            <span key={m} className={cn("px-1.5 py-0.5 rounded text-xs font-medium", MODULE_COLORS[m] ?? "bg-zinc-700 text-zinc-300")}>
                              {m}
                            </span>
                          ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{b.staff_count}</td>
                  <td className="px-4 py-3">
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", PLAN_COLORS[b.subscription_plan] ?? "bg-zinc-700 text-zinc-300")}>
                      {b.subscription_plan}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", STATUS_COLORS[b.subscription_status] ?? "bg-zinc-700 text-zinc-300")}>
                      {b.subscription_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("text-sm", dueSoon ? "text-amber-300 font-medium" : "text-zinc-400")}>
                      {fmtDate(b.next_payment_due)}
                      {dueSoon && <span className="ml-1 text-xs text-amber-500">!</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{fmtDate(b.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-zinc-600">
        {processed.length} of {businesses.length} businesses
      </p>
    </div>
  );
}
