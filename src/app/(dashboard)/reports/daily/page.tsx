"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatRWF } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import type { DailyReportData } from "@/lib/daily-report";
import {
  Calendar, FileDown, TableProperties, Loader2, RefreshCw,
  CheckCircle2, Clock, DollarSign, ShoppingCart, Users,
  Eye, AlertCircle, FileText, Activity,
} from "lucide-react";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Snapshot {
  id: string;
  report_date: string;
  generated_by: string | null;
  generated_by_name: string | null;
  generated_at: string;
  generation_type: "manual" | "auto";
  snapshot_data?: DailyReportData;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const MODULE_COLORS: Record<string, string> = {
  supermarket: "bg-blue-500/10 text-blue-400",
  bakery:      "bg-amber-500/10 text-amber-400",
  bar:         "bg-purple-500/10 text-purple-400",
  restaurant:  "bg-green-500/10 text-green-400",
};

function fmtNum(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return parseFloat(n.toFixed(3)).toString();
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, j) => (
        <td key={j} className="px-4 py-3">
          <div className="h-4 bg-slate-700 rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DailyReportPage() {
  const { business } = useAuthStore();

  const [date, setDate]                       = useState(todayStr);
  const [liveData, setLiveData]               = useState<DailyReportData | null>(null);
  const [loading, setLoading]                 = useState(true);
  const [snapshots, setSnapshots]             = useState<Snapshot[]>([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(true);
  const [generating, setGenerating]           = useState(false);
  const [exporting, setExporting]             = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);
  const [confirmOpen, setConfirmOpen]         = useState(false);

  const isToday    = date === todayStr();
  const viewData   = selectedSnapshot?.snapshot_data ?? liveData;
  const isSnapshot = !!selectedSnapshot;
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Data loading ─────────────────────────────────────────────────────────────

  const loadLive = useCallback(async (d: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/daily?date=${d}`);
      if (!res.ok) throw new Error("Failed to load");
      setLiveData(await res.json());
    } catch {
      toast.error("Failed to load daily report data");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSnapshots = useCallback(async (d: string) => {
    setSnapshotsLoading(true);
    try {
      const res = await fetch(`/api/reports/daily/snapshots?date=${d}`);
      if (res.ok) setSnapshots((await res.json()).snapshots ?? []);
    } catch { /* silent */ } finally {
      setSnapshotsLoading(false);
    }
  }, []);

  useEffect(() => {
    setSelectedSnapshot(null);
    loadLive(date);
    loadSnapshots(date);
  }, [date, loadLive, loadSnapshots]);

  // Auto-refresh every 30s for today
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (isToday) timerRef.current = setInterval(() => loadLive(date), 30000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isToday, date, loadLive]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const doGenerate = async () => {
    setConfirmOpen(false);
    setGenerating(true);
    try {
      const res = await fetch("/api/reports/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Generation failed");
      }
      toast.success("Report snapshot saved successfully");
      await loadSnapshots(date);
    } catch (err) {
      toast.error((err as Error).message || "Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerate = () => {
    if (snapshots.length > 0) { setConfirmOpen(true); return; }
    doGenerate();
  };

  const handleViewSnapshot = async (snap: Snapshot) => {
    if (snap.snapshot_data) { setSelectedSnapshot(snap); return; }
    try {
      const res = await fetch(`/api/reports/daily/snapshots?date=${snap.report_date}&include_data=true`);
      if (res.ok) {
        const json = await res.json();
        const full = (json.snapshots ?? []).find((s: Snapshot) => s.id === snap.id);
        if (full) setSelectedSnapshot(full);
      }
    } catch {
      toast.error("Failed to load snapshot");
    }
  };

  const handleExportPDF = async () => {
    if (!viewData) return;
    setExporting(true);
    try {
      const { exportToPDF } = await import("@/lib/export");
      const subtitle = isSnapshot
        ? `Snapshot: ${new Date(selectedSnapshot!.generated_at).toLocaleString("en-RW")} — ${selectedSnapshot!.generated_by_name ?? "Auto-generated"}`
        : `Live data as of ${new Date(viewData.as_of).toLocaleString("en-RW")} — not yet locked`;
      await exportToPDF(
        `Daily Report — ${date}`,
        viewData.products_sold.map((p) => ({
          item:    p.item_name,
          module:  p.module,
          opening: fmtNum(p.opening_stock),
          sold:    fmtNum(p.qty_sold),
          closing: fmtNum(p.closing_stock),
          revenue: formatRWF(p.revenue),
          staff:   p.sold_by,
        })),
        [
          { header: "Item",          key: "item" },
          { header: "Module",        key: "module" },
          { header: "Opening Stock", key: "opening" },
          { header: "Qty Sold",      key: "sold" },
          { header: "Closing Stock", key: "closing" },
          { header: "Revenue",       key: "revenue" },
          { header: "Sold By",       key: "staff" },
        ],
        business?.name,
        subtitle,
        [
          { label: "Total Revenue",  value: formatRWF(viewData.kpis.total_revenue) },
          { label: "Transactions",   value: String(viewData.kpis.total_transactions) },
          { label: "Items Sold",     value: String(viewData.kpis.total_items_sold) },
          { label: "Shifts Today",   value: String(viewData.kpis.shifts_today) },
        ]
      );
    } finally { setExporting(false); }
  };

  const handleExportExcel = async () => {
    if (!viewData) return;
    setExporting(true);
    try {
      const { exportToExcel } = await import("@/lib/export");
      await exportToExcel(`Daily Report ${date}`, [
        {
          name: "Products Sold",
          data: viewData.products_sold.map((p) => ({
            item: p.item_name, module: p.module,
            opening: p.opening_stock ?? "",
            sold: p.qty_sold,
            closing: p.closing_stock ?? "",
            revenue: p.revenue,
            sold_by: p.sold_by,
          })),
          columns: [
            { header: "Item",          key: "item" },
            { header: "Module",        key: "module" },
            { header: "Opening Stock", key: "opening" },
            { header: "Qty Sold",      key: "sold" },
            { header: "Closing Stock", key: "closing" },
            { header: "Revenue (RWF)", key: "revenue" },
            { header: "Sold By",       key: "sold_by" },
          ],
        },
        {
          name: "Staff Breakdown",
          data: viewData.staff_breakdown.map((s) => ({
            name: s.staff_name, role: s.role,
            transactions: s.transactions,
            revenue: s.total_revenue,
            items: s.items_sold,
          })),
          columns: [
            { header: "Staff",          key: "name" },
            { header: "Role",           key: "role" },
            { header: "Transactions",   key: "transactions" },
            { header: "Revenue (RWF)",  key: "revenue" },
            { header: "Items Sold",     key: "items" },
          ],
        },
        {
          name: "Summary",
          data: [
            { metric: "Date",                value: date },
            { metric: "Total Revenue",       value: formatRWF(viewData.kpis.total_revenue) },
            { metric: "Total Transactions",  value: viewData.kpis.total_transactions },
            { metric: "Total Items Sold",    value: viewData.kpis.total_items_sold },
            { metric: "Shifts Today",        value: viewData.kpis.shifts_today },
          ],
          columns: [
            { header: "Metric", key: "metric" },
            { header: "Value",  key: "value" },
          ],
        },
      ]);
    } finally { setExporting(false); }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-400" />
            Daily Report
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Combined report across all active modules</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleExportPDF}
            disabled={exporting || loading || !viewData}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:border-blue-500/50 text-sm disabled:opacity-40"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            PDF
          </button>
          <button
            onClick={handleExportExcel}
            disabled={exporting || loading || !viewData}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm disabled:opacity-40"
          >
            <TableProperties className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating || loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-40 transition-all active:scale-95"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Generate Now
          </button>
        </div>
      </div>

      {/* Date picker + live indicator */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input
            type="date"
            value={date}
            max={todayStr()}
            onChange={(e) => setDate(e.target.value)}
            className="bg-transparent text-white text-sm focus:outline-none"
          />
        </div>
        {isToday ? (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live — auto-refreshes every 30s
          </div>
        ) : (
          <span className="text-xs text-slate-500">Historical view for {date}</span>
        )}
      </div>

      {/* Snapshot view banner */}
      {isSnapshot && selectedSnapshot && (
        <div className="flex items-center justify-between p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <div className="flex items-center gap-2 text-amber-400 text-sm">
            <Eye className="w-4 h-4" />
            Viewing frozen snapshot from {new Date(selectedSnapshot.generated_at).toLocaleString("en-RW")}
            {selectedSnapshot.generated_by_name
              ? ` — by ${selectedSnapshot.generated_by_name}`
              : selectedSnapshot.generation_type === "auto" ? " — Auto-generated" : ""}
          </div>
          <button
            onClick={() => setSelectedSnapshot(null)}
            className="text-xs text-amber-400 hover:text-amber-300 underline"
          >
            Back to Live View
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue",  value: formatRWF(viewData?.kpis.total_revenue ?? 0), icon: <DollarSign className="w-5 h-5" />, color: "text-blue-400" },
          { label: "Items Sold",     value: String(viewData?.kpis.total_items_sold ?? 0),  icon: <ShoppingCart className="w-5 h-5" />, color: "text-green-400" },
          { label: "Transactions",   value: String(viewData?.kpis.total_transactions ?? 0), icon: <Activity className="w-5 h-5" />, color: "text-purple-400" },
          { label: "Shifts Today",   value: String(viewData?.kpis.shifts_today ?? 0),       icon: <Clock className="w-5 h-5" />, color: "text-amber-400" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            {loading ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-3 bg-slate-700 rounded w-2/3" />
                <div className="h-8 bg-slate-700 rounded w-1/2" />
              </div>
            ) : (
              <>
                <div className={`flex items-center gap-2 mb-2 ${kpi.color}`}>
                  {kpi.icon}
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">{kpi.label}</span>
                </div>
                <p className="text-2xl font-black text-white">{kpi.value}</p>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Products Sold Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-white">Products Sold</h2>
            <p className="text-xs text-slate-400 mt-0.5">All active modules combined</p>
          </div>
          {!loading && viewData && (
            <span className="text-xs text-slate-500">{viewData.products_sold.length} item{viewData.products_sold.length !== 1 ? "s" : ""}</span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-900/50">
                {["Item", "Module", "Opening Stock", "Qty Sold", "Closing Stock", "Revenue", "Sold By"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-slate-400 font-medium text-xs whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading
                ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={7} />)
                : !viewData || viewData.products_sold.length === 0
                ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-500">
                      <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                      No sales recorded for {date}
                    </td>
                  </tr>
                )
                : viewData.products_sold.map((p, i) => (
                  <tr key={i} className="hover:bg-slate-700/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-white whitespace-nowrap">{p.item_name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${MODULE_COLORS[p.module] ?? "bg-slate-700 text-slate-300"}`}>
                        {p.module}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-right font-mono text-xs">{fmtNum(p.opening_stock)}</td>
                    <td className="px-4 py-3 text-white font-bold text-right font-mono text-xs">{fmtNum(p.qty_sold)}</td>
                    <td className="px-4 py-3 text-slate-400 text-right font-mono text-xs">{fmtNum(p.closing_stock)}</td>
                    <td className="px-4 py-3 font-semibold text-blue-400 whitespace-nowrap">{formatRWF(p.revenue)}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{p.sold_by}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* Staff Breakdown */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-700">
          <h2 className="font-semibold text-white">Staff Breakdown</h2>
          <p className="text-xs text-slate-400 mt-0.5">Revenue and transactions per staff member</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-900/50">
                {["Staff Member", "Role", "Transactions", "Total Revenue", "Items Sold"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-slate-400 font-medium text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading
                ? Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
                : !viewData || viewData.staff_breakdown.length === 0
                ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-500">
                      <Users className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                      No staff activity for {date}
                    </td>
                  </tr>
                )
                : viewData.staff_breakdown.map((s, i) => (
                  <tr key={i} className="hover:bg-slate-700/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{s.staff_name}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-400 capitalize">{s.role}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{s.transactions}</td>
                    <td className="px-4 py-3 font-semibold text-blue-400">{formatRWF(s.total_revenue)}</td>
                    <td className="px-4 py-3 text-slate-300">{fmtNum(s.items_sold)}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* Previously Generated Reports */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-white">Previously Generated Reports</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {snapshots.length > 0
                ? `${snapshots.length} snapshot${snapshots.length !== 1 ? "s" : ""} for ${date}`
                : `No snapshots generated for ${date}`}
            </p>
          </div>
        </div>
        {snapshotsLoading ? (
          <div className="p-5 space-y-3 animate-pulse">
            {[1, 2].map((i) => <div key={i} className="h-14 bg-slate-700 rounded-lg" />)}
          </div>
        ) : snapshots.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-sm">
            <FileText className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            No snapshots yet for {date}
            <br />
            <span className="text-xs mt-1 block">Click &quot;Generate Now&quot; to create a permanent frozen record</span>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {snapshots.map((snap) => (
              <div key={snap.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-700/20 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${snap.generation_type === "auto" ? "bg-slate-700" : "bg-blue-500/10"}`}>
                    {snap.generation_type === "auto"
                      ? <RefreshCw className="w-4 h-4 text-slate-400" />
                      : <CheckCircle2 className="w-4 h-4 text-blue-400" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {snap.generation_type === "auto"
                        ? "Auto-generated"
                        : `Manual — by ${snap.generated_by_name ?? "Owner"}`}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(snap.generated_at).toLocaleString("en-RW")}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleViewSnapshot(snap)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedSnapshot?.id === snap.id
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : "bg-slate-700 hover:bg-slate-600 text-slate-300"
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  {selectedSnapshot?.id === snap.id ? "Viewing" : "View"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-white">Report already exists</h3>
                <p className="text-sm text-slate-400 mt-1">
                  {snapshots.length} snapshot{snapshots.length !== 1 ? "s" : ""} already exist for {date}. Generate a new one anyway? The existing snapshots will be kept.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={doGenerate}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
              >
                Generate Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
