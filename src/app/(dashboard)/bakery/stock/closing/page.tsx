"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ClipboardList, Save, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CountItem {
  id: string;
  name: string;
  unit: string;
  opening: number;
  restocked_today: number;
  consumed_today: number;
  expected_quantity: number;
  quantity: number;
}

const VARIANCE_THRESHOLD = 5;

function varianceClass(pct: number) {
  if (Math.abs(pct) > VARIANCE_THRESHOLD) return "text-red-400";
  if (Math.abs(pct) > 2) return "text-amber-400";
  return "text-green-400";
}

function fmt(n: number) {
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}

export default function BakeryClosingPage() {
  const router = useRouter();
  const [items, setItems] = useState<CountItem[]>([]);
  const [countDate, setCountDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [entries, setEntries] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bakery/stock/closing");
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setItems(data.items ?? []);
      setCountDate(data.count_date ?? new Date().toISOString().split("T")[0]);
    } catch {
      toast.error("Failed to load ingredients");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setActual = (id: string, val: string) => {
    if (val === "" || /^\d*\.?\d*$/.test(val)) {
      setEntries((prev) => ({ ...prev, [id]: val }));
    }
  };

  const getVariance = (item: CountItem) => {
    const str = entries[item.id] ?? "";
    if (str === "") return null;
    const actual = parseFloat(str);
    if (isNaN(actual)) return null;
    const variance = item.expected_quantity - actual;
    const pct = item.expected_quantity > 0 ? (variance / item.expected_quantity) * 100 : 0;
    return { actual, variance, pct };
  };

  const allFilled = items.length > 0 && items.every((i) => (entries[i.id] ?? "") !== "");
  const flaggedItems = items.filter((i) => { const v = getVariance(i); return v && Math.abs(v.pct) > VARIANCE_THRESHOLD; });

  const handleSubmit = async () => {
    if (!allFilled) { toast.error("Please enter counts for all ingredients"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/bakery/stock/closing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count_date: countDate,
          entries: items.map((item) => ({
            item_id: item.id,
            actual_quantity: parseFloat(entries[item.id]),
            expected_quantity: item.expected_quantity,
            opening_quantity: item.opening,
            consumed_today: item.consumed_today,
            restocked_today: item.restocked_today,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      if (data.flagged_items > 0) {
        toast.warning(`Saved. ${data.flagged_items} ingredient${data.flagged_items !== 1 ? "s" : ""} flagged for variance > ${VARIANCE_THRESHOLD}%`);
      } else {
        toast.success("Closing count saved. Ingredient stock reconciled.");
      }
      router.push("/bakery/stock");
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
      <div className="flex items-center gap-4">
        <button onClick={() => router.push("/bakery/stock")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-amber-400" />
            Ingredient Closing Count
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">{displayDate}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-sm text-foreground font-medium mb-2">How this works</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Physically weigh or measure every ingredient and enter the actual quantity.
          The system compares against expected stock (opening + restocked − used in production).
          <span className="text-red-400 font-medium"> Variance &gt; {VARIANCE_THRESHOLD}%</span> is flagged as possible waste or theft.
          Your counts will update the live ingredient stock immediately.
        </p>
        {flaggedItems.length > 0 && (
          <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-2 text-red-400 text-sm font-medium">
              <AlertTriangle className="w-4 h-4" />
              {flaggedItems.length} ingredient{flaggedItems.length !== 1 ? "s" : ""} with variance &gt; {VARIANCE_THRESHOLD}%:
              {" "}{flaggedItems.map((i) => i.name).join(", ")}
            </div>
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Ingredient Counts</h2>
          <span className="text-xs text-muted-foreground">{items.filter((i) => (entries[i.id] ?? "") !== "").length} / {items.length} filled</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-blue-400" /></div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">No ingredients found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Ingredient", "Unit", "Opening", "Restocked", "Used Today", "Expected", "Actual Count", "Variance"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-muted-foreground font-medium text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {items.map((item) => {
                  const v = getVariance(item);
                  const str = entries[item.id] ?? "";
                  const isFilled = str !== "";
                  return (
                    <tr key={item.id} className={cn("transition-colors",
                      v && Math.abs(v.pct) > VARIANCE_THRESHOLD ? "bg-red-500/5" : isFilled ? "bg-green-500/5" : "hover:bg-accent/20")}>
                      <td className="px-4 py-3 font-medium text-foreground">{item.name}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{item.unit}</td>
                      <td className="px-4 py-3 text-muted-foreground">{fmt(item.opening)}</td>
                      <td className="px-4 py-3">
                        {item.restocked_today > 0 ? <span className="text-green-400">+{fmt(item.restocked_today)}</span> : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {item.consumed_today > 0 ? <span className="text-orange-400">-{fmt(item.consumed_today)}</span> : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-4 py-3 text-foreground font-medium">{fmt(item.expected_quantity)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <input type="number" min="0" step="0.1" value={str} onChange={(e) => setActual(item.id, e.target.value)}
                            placeholder={fmt(item.expected_quantity)}
                            className={cn("w-20 px-2 py-1.5 rounded-lg text-sm text-center font-medium border transition-colors bg-background text-foreground placeholder-muted-foreground focus:outline-none",
                              v && Math.abs(v.pct) > VARIANCE_THRESHOLD ? "border-red-500 ring-1 ring-red-500/30"
                                : isFilled ? "border-green-500 ring-1 ring-green-500/20"
                                : "border-border focus:border-blue-500")} />
                          <span className="text-xs text-muted-foreground w-8 truncate">{item.unit}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {v === null ? <span className="text-muted-foreground/40 text-xs">—</span> : (
                          <div className="flex items-center gap-1.5">
                            {Math.abs(v.pct) > VARIANCE_THRESHOLD
                              ? <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                              : <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />}
                            <span className={cn("text-xs font-medium", varianceClass(v.pct))}>
                              {v.variance === 0 ? "0" : v.variance > 0 ? `-${fmt(v.variance)}` : `+${fmt(Math.abs(v.variance))}`}
                              {" "}<span className="opacity-70">({Math.abs(v.pct).toFixed(1)}%)</span>
                            </span>
                            {Math.abs(v.pct) > VARIANCE_THRESHOLD && <span className="ml-1 text-xs text-red-400 font-bold">WASTE?</span>}
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

      <div className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3 gap-4 flex-wrap">
        <div className="text-sm">
          {flaggedItems.length > 0 ? (
            <span className="text-red-400 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" />{flaggedItems.length} ingredient{flaggedItems.length !== 1 ? "s" : ""} flagged — review before saving</span>
          ) : allFilled ? (
            <span className="text-green-400 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" />All counts entered — ready to save</span>
          ) : (
            <span className="text-muted-foreground">{items.filter((i) => (entries[i.id] ?? "") !== "").length} of {items.length} ingredients counted</span>
          )}
        </div>
        <button onClick={handleSubmit} disabled={saving || !allFilled}
          className={cn("flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all",
            allFilled ? flaggedItems.length > 0 ? "bg-red-600 hover:bg-red-700 text-white" : "bg-amber-600 hover:bg-amber-700 text-white" : "bg-muted text-muted-foreground cursor-not-allowed",
            saving && "opacity-60")}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {flaggedItems.length > 0 ? "Save (Variances Flagged)" : "Save Closing Count"}
        </button>
      </div>
    </div>
  );
}
