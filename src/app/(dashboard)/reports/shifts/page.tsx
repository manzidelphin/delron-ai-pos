"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock, Users, DollarSign, AlertTriangle, CheckCircle2, RefreshCw, Loader2 } from "lucide-react";
import { formatRWF } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { StatCard } from "@/components/ui/stat-card";

interface Shift {
  id: string;
  staff_name: string;
  role: string;
  started_at: string;
  ended_at: string | null;
  opening_cash: number | null;
  closing_cash: number | null;
  expected_cash: number | null;
  cash_variance: number | null;
  total_sales: number;
  total_orders: number;
  status: "active" | "ended";
  notes: string | null;
}

interface StaffFilter {
  id: string;
  name: string;
}

const CASH_VARIANCE_THRESHOLD = 0.02;

const ROLE_BADGE: Record<string, string> = {
  cashier:   "bg-green-500/10 text-green-400 border-green-500/20",
  baker:     "bg-amber-500/10 text-amber-400 border-amber-500/20",
  bartender: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  waiter:    "bg-orange-500/10 text-orange-400 border-orange-500/20",
  manager:   "bg-purple-500/10 text-purple-400 border-purple-500/20",
  owner:     "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

function duration(start: string, end: string | null): string {
  const ms = (end ? new Date(end) : new Date()).getTime() - new Date(start).getTime();
  const h  = Math.floor(ms / 3_600_000);
  const m  = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric" });
}

export default function ShiftsReportPage() {
  const [shifts,    setShifts]    = useState<Shift[]>([]);
  const [staffList, setStaffList] = useState<StaffFilter[]>([]);
  const [loading,   setLoading]   = useState(true);

  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().split("T")[0];

  const [dateFrom,  setDateFrom]  = useState(weekAgo);
  const [dateTo,    setDateTo]    = useState(today);
  const [staffId,   setStaffId]   = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });
      if (staffId) params.set("staff_id", staffId);
      const res = await fetch(`/api/shifts?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setShifts(data.shifts ?? []);
      setStaffList(data.staff_list ?? []);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, staffId]);

  useEffect(() => { load(); }, [load]);

  const activeShifts  = shifts.filter((s) => s.status === "active");
  const endedShifts   = shifts.filter((s) => s.status === "ended");
  const flaggedShifts = shifts.filter((s) => {
    if (s.cash_variance === null || s.expected_cash === null || s.expected_cash === 0) return false;
    return Math.abs(s.cash_variance / s.expected_cash) > CASH_VARIANCE_THRESHOLD;
  });
  const totalRevenue  = endedShifts.reduce((s, sh) => s + (Number(sh.total_sales) || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Clock className="w-6 h-6 text-blue-400" />
            Shifts Report
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Track all staff shifts and cash reconciliation</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground text-sm transition-colors">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">From</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:border-blue-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">To</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:border-blue-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Staff Member</label>
          <select value={staffId} onChange={(e) => setStaffId(e.target.value)}
            className="px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:border-blue-500 focus:outline-none">
            <option value="">All Staff</option>
            {staffList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Shifts"   value={activeShifts.length}  icon={<Users className="w-5 h-5" />}        color="green" loading={loading} />
        <StatCard label="Ended Shifts"    value={endedShifts.length}   icon={<Clock className="w-5 h-5" />}         color="blue"  loading={loading} />
        <StatCard label="Total Revenue"   value={formatRWF(totalRevenue)} icon={<DollarSign className="w-5 h-5" />} color="blue"  loading={loading} />
        <StatCard label="Cash Variances"  value={flaggedShifts.length} icon={<AlertTriangle className="w-5 h-5" />} color="red"   loading={loading} />
      </div>

      {/* Active shifts banner */}
      {activeShifts.length > 0 && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400 text-sm font-semibold">{activeShifts.length} staff currently on shift</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeShifts.map((s) => (
              <span key={s.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-300 text-xs">
                <span className="font-medium">{s.staff_name}</span>
                <span className="opacity-60">({s.role})</span>
                <span className="opacity-60">· since {fmtTime(s.started_at)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Shifts table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">All Shifts</h2>
          <span className="text-xs text-muted-foreground">{shifts.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Staff", "Role", "Date", "Start", "End", "Duration", "Sales", "Orders", "Cash Variance", "Status"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-muted-foreground font-medium text-xs whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr><td colSpan={10} className="text-center py-12"><Loader2 className="w-5 h-5 animate-spin text-blue-400 mx-auto" /></td></tr>
              ) : shifts.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-12 text-muted-foreground">No shifts found for this period.</td></tr>
              ) : shifts.map((shift) => {
                const hasVariance     = shift.cash_variance !== null && shift.expected_cash !== null && shift.expected_cash !== 0;
                const variancePct     = hasVariance ? Math.abs(shift.cash_variance! / shift.expected_cash!) : 0;
                const isFlagged       = hasVariance && variancePct > CASH_VARIANCE_THRESHOLD;
                const isActive        = shift.status === "active";

                return (
                  <tr key={shift.id} className={cn("transition-colors", isFlagged ? "bg-red-500/5" : isActive ? "bg-green-500/5" : "hover:bg-accent/20")}>
                    <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{shift.staff_name}</td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2 py-0.5 rounded-full border text-xs font-medium capitalize", ROLE_BADGE[shift.role] ?? ROLE_BADGE.manager)}>
                        {shift.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{fmtDate(shift.started_at)}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{fmtTime(shift.started_at)}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                      {shift.ended_at ? fmtTime(shift.ended_at) : <span className="text-green-400">ongoing</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                      {duration(shift.started_at, shift.ended_at)}
                    </td>
                    <td className="px-4 py-3 text-foreground font-medium whitespace-nowrap">{formatRWF(shift.total_sales)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{shift.total_orders}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {shift.cash_variance === null ? (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          {isFlagged
                            ? <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                            : <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />}
                          <span className={cn("text-xs font-medium", shift.cash_variance >= 0 ? "text-green-400" : "text-red-400")}>
                            {shift.cash_variance >= 0 ? "+" : ""}{formatRWF(shift.cash_variance)}
                          </span>
                          {isFlagged && (
                            <span className="text-xs text-red-400 font-bold">({(variancePct * 100).toFixed(1)}%)</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-muted/50 border border-border text-muted-foreground text-xs">Ended</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {flaggedShifts.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-red-400 text-sm font-semibold">{flaggedShifts.length} shift{flaggedShifts.length !== 1 ? "s" : ""} with cash variance &gt; 2%</span>
          </div>
          <div className="space-y-2">
            {flaggedShifts.map((s) => (
              <div key={s.id} className="text-xs text-slate-300 flex items-center justify-between">
                <span><span className="text-white font-medium">{s.staff_name}</span> · {fmtDate(s.started_at)}</span>
                <span className={cn("font-medium", (s.cash_variance ?? 0) >= 0 ? "text-green-400" : "text-red-400")}>
                  {(s.cash_variance ?? 0) >= 0 ? "+" : ""}{formatRWF(s.cash_variance ?? 0)} variance
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
