"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface BusinessRow {
  id: string;
  name: string;
  owner_email: string | null;
  modules: string[];
  plan: string;
  created_at: string;
  staff_count: number;
  last_activity: string | null;
}

const MODULE_COLORS: Record<string, string> = {
  supermarket: "bg-blue-500/20 text-blue-300",
  bakery: "bg-amber-500/20 text-amber-300",
  bar: "bg-purple-500/20 text-purple-300",
  restaurant: "bg-green-500/20 text-green-300",
};

function statusFromBusiness(b: BusinessRow): { label: string; color: string } {
  const nameLower = b.name.toLowerCase();
  if (nameLower.includes("test")) return { label: "test", color: "bg-yellow-500/20 text-yellow-300" };
  if (b.plan === "free" && !b.last_activity) return { label: "trial", color: "bg-zinc-600/40 text-zinc-400" };
  return { label: "active", color: "bg-green-500/20 text-green-300" };
}

export default function BusinessesTable({ businesses }: { businesses: BusinessRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = businesses.filter((b) => {
    const q = search.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      (b.owner_email ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search by business name or owner email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md pl-9 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/60">
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Business</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Owner</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Modules</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Staff</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Last Activity</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Created</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                  {search ? "No businesses match your search." : "No businesses found."}
                </td>
              </tr>
            )}
            {filtered.map((b) => {
              const status = statusFromBusiness(b);
              return (
                <tr
                  key={b.id}
                  onClick={() => router.push(`/admin/businesses/${b.id}`)}
                  className="border-b border-zinc-800/60 last:border-0 hover:bg-zinc-800/40 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-white">{b.name}</td>
                  <td className="px-4 py-3 text-zinc-400">{b.owner_email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {b.modules.length === 0 && <span className="text-zinc-600">—</span>}
                      {b.modules.map((m) => (
                        <span
                          key={m}
                          className={cn("px-1.5 py-0.5 rounded text-xs font-medium", MODULE_COLORS[m] ?? "bg-zinc-700 text-zinc-300")}
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{b.staff_count}</td>
                  <td className="px-4 py-3 text-zinc-400">
                    {b.last_activity ? format(new Date(b.last_activity), "dd MMM yyyy") : "No activity"}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {format(new Date(b.created_at), "dd MMM yyyy")}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", status.color)}>
                      {status.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-zinc-600">
        {filtered.length} of {businesses.length} businesses
      </p>
    </div>
  );
}
