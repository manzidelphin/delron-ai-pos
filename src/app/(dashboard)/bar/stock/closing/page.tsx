"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ClipboardList, Save, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CountItem {
  id: string;
  name: string;
  category: string;
  opening: number;
  restocked_today: number;
  sold_today: number;
  expected_quantity: number;
  quantity_bottles: number;
}

interface EntryState {
  actual: string; // raw input string
}

const VARIANCE_THRESHOLD = 5; // percent

function varianceClass(pct: number): string {
  if (Math.abs(pct) > VARIANCE_THRESHOLD) return "text-red-400";
  if (Math.abs(pct) > 2) return "text-amber-400";
  return "text-green-400";
}

export default function ClosingCountPage() {
  const router = useRouter();
  const [items, setItems] = useState<CountItem[]>([]);
  const [countDate, setCountDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [entries, setEntries] = useState<Record<string, EntryState>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bar/stock/closing");
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setItems(data.items ?? []);
      setCountDate(data.count_date ?? new Date().toISOString().split("T")[0]);
    } catch {
      toast.error("Failed to load bar items");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setActual = (id: string, val: string) => {
    if (val === "" || /^\d*\.?\d*$/.test(val)) {
      setEntries((prev) => ({ ...prev, [id]: { actual: val } }));
    }
  };

  const getVariance = (item: CountItem) => {
    const actualStr = entries[item.id]?.actual ?? "";
    if (actualStr === "") return null;
    const actual = parseFloat(actualStr);
    if (isNaN(actual)) return null;
    const expected = item.expected_quantity;
    const variance = expected - actual;
    const pct = expected > 0 ? (variance / expected) * 100 : 0;
    return { actual, variance, pct };
  };

  const allFilled = items.length > 0 && items.every((i) => (entries[i.id]?.actual ?? "") !== "");
  const flaggedItems = items.filter((i) => {
    const v = getVariance(i);
    return v && Math.abs(v.pct) > VARIANCE_THRESHOLD;
  });

  const handleSubmit = async () => {
    if (!allFilled) {
      toast.error("Please enter actual counts for all items");
      return;
    }
    setSaving(true);
    try {
      const entryPayload = items.map((item) => {
        const actualStr = entries[item.id].actual;
        const actual = parseFloat(actualStr);
        return {
          item_id:          item.id,
          actual_quantity:  actual,
          expected_quantity: item.expected_quantity,
          opening_quantity: item.opening,
          sold_today:       item.sold_today,
          restocked_today:  item.restocked_today,
        };
      });

      const res = await fetch("/api/bar/stock/closing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count_date: countDate, entries: entryPayload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");

      if (data.flagged_items > 0) {
        toast.warning(`Saved. ${data.flagged_items} item${data.flagged_items !== 1 ? "s" : ""} flagged for variance > ${VARIANCE_THRESHOLD}%`);
      } else {
        toast.success("Closing count saved. Stock reconciled.");
      }
      router.push("/bar/stock");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const displayDate = countDate
    ? new Date(countDate + "T12:00:00").toLocaleDateString("en", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : "";

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/bar/stock")}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-amber-400" />
            Closing Stock Count
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">{displayDate}</p>
        </div>
      </div>

      {/* Variance legend */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <p className="text-sm text-slate-300 font-medium mb-2">How this works</p>
        <p className="text-xs text-slate-400 leading-relaxed">
          Physically count every bottle on your shelf and enter the actual count.
          The system compares against expected stock (opening + restocked − sold).
          <span className="text-red-400 font-medium"> Variance &gt; {VARIANCE_THRESHOLD}%</span> is flagged as possible theft or waste.
          Your counts will update the live stock immediately.
        </p>
        {flaggedItems.length > 0 && (
          <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-2 text-red-400 text-sm font-medium">
              <AlertTriangle className="w-4 h-4" />
              {flaggedItems.length} item{flaggedItems.length !== 1 ? "s" : ""} with variance &gt; {VARIANCE_THRESHOLD}%:
              {" "}{flaggedItems.map((i) => i.name).join(", ")}
            </div>
          </div>
        )}
      </div>

      {/* Count Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Item Counts</h2>
          <span className="text-xs text-slate-500">
            {items.filter((i) => (entries[i.id]?.actual ?? "") !== "").length} / {items.length} filled
          </span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">No active bar items found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/50">
                  {["Item", "Opening", "Restocked", "Sold Today", "Expected", "Actual Count", "Variance"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-slate-400 font-medium text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {items.map((item) => {
                  const v = getVariance(item);
                  const actualStr = entries[item.id]?.actual ?? "";
                  const isFilled = actualStr !== "";

                  return (
                    <tr
                      key={item.id}
                      className={cn(
                        "transition-colors",
                        v && Math.abs(v.pct) > VARIANCE_THRESHOLD
                          ? "bg-red-500/5"
                          : isFilled
                          ? "bg-green-500/5"
                          : "hover:bg-slate-700/20"
                      )}
                    >
                      <td className="px-4 py-3 font-medium text-white">{item.name}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {item.opening % 1 === 0 ? item.opening : item.opening.toFixed(1)} btl
                      </td>
                      <td className="px-4 py-3">
                        {item.restocked_today > 0 ? (
                          <span className="text-green-400">+{item.restocked_today}</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {item.sold_today > 0 ? (
                          <span className="text-red-400">-{item.sold_today % 1 === 0 ? item.sold_today : item.sold_today.toFixed(2)}</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-white font-medium">
                        {item.expected_quantity % 1 === 0 ? item.expected_quantity : item.expected_quantity.toFixed(1)} btl
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={actualStr}
                            onChange={(e) => setActual(item.id, e.target.value)}
                            placeholder={String(item.expected_quantity % 1 === 0 ? item.expected_quantity : item.expected_quantity.toFixed(1))}
                            className={cn(
                              "w-20 px-2 py-1.5 rounded-lg text-sm text-center font-medium border transition-colors",
                              "bg-slate-900 text-white placeholder-slate-600 focus:outline-none",
                              v && Math.abs(v.pct) > VARIANCE_THRESHOLD
                                ? "border-red-500 ring-1 ring-red-500/30"
                                : isFilled
                                ? "border-green-500 ring-1 ring-green-500/20"
                                : "border-slate-600 focus:border-blue-500"
                            )}
                          />
                          <span className="text-xs text-slate-500">btl</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {v === null ? (
                          <span className="text-slate-600 text-xs">—</span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {Math.abs(v.pct) > VARIANCE_THRESHOLD ? (
                              <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                            )}
                            <span className={cn("text-xs font-medium", varianceClass(v.pct))}>
                              {v.variance === 0
                                ? "0"
                                : v.variance > 0
                                ? `-${v.variance % 1 === 0 ? v.variance : v.variance.toFixed(1)} btl`
                                : `+${Math.abs(v.variance) % 1 === 0 ? Math.abs(v.variance) : Math.abs(v.variance).toFixed(1)} btl`}
                              {" "}
                              <span className="opacity-70">({Math.abs(v.pct).toFixed(1)}%)</span>
                            </span>
                            {Math.abs(v.pct) > VARIANCE_THRESHOLD && (
                              <span className="ml-1 text-xs text-red-400 font-bold">THEFT?</span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 gap-4 flex-wrap">
        <div className="text-sm">
          {flaggedItems.length > 0 ? (
            <span className="text-red-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              {flaggedItems.length} item{flaggedItems.length !== 1 ? "s" : ""} flagged — review before saving
            </span>
          ) : allFilled ? (
            <span className="text-green-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              All counts entered — ready to save
            </span>
          ) : (
            <span className="text-slate-400">
              {items.filter((i) => (entries[i.id]?.actual ?? "") !== "").length} of {items.length} items counted
            </span>
          )}
        </div>
        <button
          onClick={handleSubmit}
          disabled={saving || !allFilled}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all",
            allFilled
              ? flaggedItems.length > 0
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-amber-600 hover:bg-amber-700 text-white"
              : "bg-slate-700 text-slate-500 cursor-not-allowed",
            saving && "opacity-60"
          )}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {flaggedItems.length > 0 ? "Save (Variances Flagged)" : "Save Closing Count"}
        </button>
      </div>
    </div>
  );
}
