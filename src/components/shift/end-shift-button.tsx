"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { LogOut, Loader2, CheckCircle2, AlertTriangle, X, DollarSign, ChefHat, Beer, ShoppingCart } from "lucide-react";
import { formatRWF } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ShiftSummary {
  staff_name: string;
  role: string;
  duration: string;
  total_sales: number;
  total_orders: number;
  total_items_sold: number;
  opening_cash: number | null;
  closing_cash: number | null;
  expected_cash: number | null;
  cash_variance: number | null;
  variance_items: { name: string; variance: number }[];
  batches_produced: number;
}

type ModalState = "idle" | "confirm" | "cash" | "loading" | "success" | "error";

const SHIFT_ROLES = ["cashier", "baker", "bartender", "waiter"];

const ROLE_ICON: Record<string, React.ReactNode> = {
  cashier:   <ShoppingCart className="w-5 h-5" />,
  baker:     <ChefHat className="w-5 h-5" />,
  bartender: <Beer className="w-5 h-5" />,
  waiter:    <LogOut className="w-5 h-5" />,
};

const ROLE_ACTIONS: Record<string, string[]> = {
  cashier:   ["💰 Count your cash and record closing amount", "📩 Notify the owner with your shift summary", "🔒 Lock this terminal back to PIN login"],
  baker:     ["📊 Save your production summary for today", "📩 Notify the owner with your shift summary", "🔒 Lock this terminal back to PIN login"],
  bartender: ["📦 Save a stock snapshot for all bar items", "💰 Record cash in till if applicable", "📩 Notify the owner via SMS", "🔒 Lock this terminal back to PIN login"],
  waiter:    ["📊 Save your orders summary", "📩 Notify the owner with your shift summary", "🔒 Lock this terminal back to PIN login"],
};

const CASH_ROLES = ["cashier", "bartender"];

export function EndShiftButton({ isOpen }: { isOpen: boolean }) {
  const { activeOperator, staff, clearOperator } = useAuthStore();

  const role = activeOperator?.role ?? staff?.role;
  const name = activeOperator?.name ?? staff?.name ?? "Staff";

  if (!role || !SHIFT_ROLES.includes(role)) return null;

  return <EndShiftButtonInner role={role} name={name} isOpen={isOpen} clearOperator={clearOperator} />;
}

function EndShiftButtonInner({
  role, name, isOpen, clearOperator,
}: {
  role: string; name: string; isOpen: boolean; clearOperator: () => void;
}) {
  const [state,     setState]     = useState<ModalState>("idle");
  const [summary,   setSummary]   = useState<ShiftSummary | null>(null);
  const [errorMsg,  setError]     = useState("");
  const [countdown, setCountdown] = useState(5);
  const [closingCash, setClosingCash] = useState("");

  const needsCash = CASH_ROLES.includes(role);

  const doEndShift = async (cash?: number) => {
    setState("loading");
    try {
      const body: Record<string, unknown> = {};
      if (typeof cash === "number") body.closing_cash = cash;

      const res  = await fetch("/api/shifts/end", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to end shift");

      setSummary(json.summary);
      setState("success");

      let n = 5;
      setCountdown(n);
      const iv = setInterval(() => {
        n -= 1;
        setCountdown(n);
        if (n <= 0) {
          clearInterval(iv);
          clearOperator();
          fetch("/api/auth/pin-login", { method: "DELETE" }).finally(() => {
            window.location.href = "/pos-login";
          });
        }
      }, 1000);
    } catch (err) {
      setError((err as Error).message || "Something went wrong");
      setState("error");
    }
  };

  const handleConfirm = () => {
    if (needsCash) {
      setState("cash");
    } else {
      doEndShift();
    }
  };

  const handleCashSubmit = () => {
    const amount = parseFloat(closingCash);
    if (isNaN(amount) || amount < 0) {
      setError("Enter a valid cash amount (0 or more)");
      return;
    }
    setError("");
    doEndShift(amount);
  };

  return (
    <>
      <button
        onClick={() => state === "idle" && setState("confirm")}
        disabled={state !== "idle"}
        title={!isOpen ? "End Shift" : undefined}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all text-sm font-medium disabled:opacity-40"
      >
        <LogOut className="w-4 h-4 flex-shrink-0" />
        {isOpen && <span>End Shift</span>}
      </button>

      {state !== "idle" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          {state === "confirm" && (
            <ConfirmModal name={name} role={role} onConfirm={handleConfirm} onClose={() => setState("idle")} />
          )}
          {state === "cash" && (
            <CashModal
              name={name}
              closingCash={closingCash}
              setClosingCash={setClosingCash}
              errorMsg={errorMsg}
              onSubmit={handleCashSubmit}
              onClose={() => setState("idle")}
            />
          )}
          {state === "loading" && <LoadingScreen />}
          {state === "success" && summary && (
            <SuccessScreen summary={summary} countdown={countdown} />
          )}
          {state === "error" && (
            <ErrorScreen message={errorMsg} onClose={() => setState("idle")} />
          )}
        </div>
      )}
    </>
  );
}

function ConfirmModal({ name, role, onConfirm, onClose }: {
  name: string; role: string;
  onConfirm: () => void; onClose: () => void;
}) {
  const actions = ROLE_ACTIONS[role] ?? ROLE_ACTIONS.cashier;
  const icon = ROLE_ICON[role] ?? <LogOut className="w-7 h-7" />;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto text-red-400">
          {icon}
        </div>
        <h2 className="text-xl font-bold text-white">End your shift?</h2>
        <p className="text-slate-400 text-sm">
          Hi <span className="text-white font-medium">{name}</span> — this will lock your session.
        </p>
      </div>
      <ul className="space-y-2 text-sm text-slate-300">
        {actions.map((a) => <li key={a}>{a}</li>)}
      </ul>
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-slate-600 text-slate-300 font-medium hover:bg-slate-700 transition-colors text-sm">Cancel</button>
        <button onClick={onConfirm} className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold flex items-center justify-center gap-2 transition-colors text-sm">
          <LogOut className="w-4 h-4" /> End Shift
        </button>
      </div>
    </div>
  );
}

function CashModal({ name, closingCash, setClosingCash, errorMsg, onSubmit, onClose }: {
  name: string; closingCash: string; setClosingCash: (v: string) => void;
  errorMsg: string; onSubmit: () => void; onClose: () => void;
}) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto text-green-400">
          <DollarSign className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-white">Count Your Cash</h2>
        <p className="text-slate-400 text-sm">
          {name}, count all notes and coins in the till, then enter the total below.
        </p>
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-2">Closing Cash Amount (RWF)</label>
        <input
          type="number" min="0" step="100"
          value={closingCash}
          onChange={(e) => setClosingCash(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          placeholder="e.g. 45000"
          autoFocus
          className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-600 text-white text-lg font-bold text-center placeholder-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
        />
        {errorMsg && <p className="text-red-400 text-xs mt-1.5 text-center">{errorMsg}</p>}
      </div>

      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-slate-600 text-slate-300 font-medium hover:bg-slate-700 transition-colors text-sm">Back</button>
        <button onClick={onSubmit} className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-2 transition-colors text-sm">
          <CheckCircle2 className="w-4 h-4" /> Confirm & End
        </button>
      </div>

      <p className="text-xs text-slate-500 text-center">
        The system will calculate your cash variance automatically.
      </p>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm p-10 flex flex-col items-center gap-4">
      <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
      <div className="text-center">
        <p className="text-white font-bold text-lg">Closing shift...</p>
        <p className="text-slate-400 text-sm mt-1">Saving summary · Notifying owner</p>
      </div>
    </div>
  );
}

function SuccessScreen({ summary, countdown }: { summary: ShiftSummary; countdown: number }) {
  const hasCash     = summary.cash_variance !== null;
  const cashOk      = hasCash && Math.abs((summary.cash_variance ?? 0) / (summary.expected_cash || 1)) <= 0.02;
  const hasVariance = summary.variance_items.length > 0;
  const roleLabel   = summary.role.charAt(0).toUpperCase() + summary.role.slice(1);

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 max-h-[90vh] overflow-y-auto">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-green-400" />
        </div>
        <h2 className="text-xl font-bold text-white">Shift Ended!</h2>
        <p className="text-slate-400 text-sm">Owner has been notified</p>
      </div>

      <div className="bg-slate-900/60 rounded-xl p-4 space-y-2">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
          {summary.staff_name} · {roleLabel} · {summary.duration}
        </p>
        <div className="space-y-1.5">
          <Row label="Total Sales"  value={formatRWF(summary.total_sales)} bold />
          <Row label="Orders"       value={String(summary.total_orders)} />
          {summary.role === "baker"     && <Row label="Units Produced" value={String(summary.batches_produced)} />}
          {summary.role !== "baker"     && <Row label="Items Sold"     value={summary.total_items_sold > 0 ? summary.total_items_sold.toFixed(summary.role === "bartender" ? 1 : 0) : "0"} />}
        </div>
      </div>

      {hasCash && (
        <div className={cn("rounded-xl p-3 space-y-1.5 border", cashOk ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20")}>
          <p className={cn("text-xs font-semibold flex items-center gap-1.5", cashOk ? "text-green-400" : "text-red-400")}>
            {cashOk ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            Cash Reconciliation
          </p>
          {summary.opening_cash !== null  && <Row label="Opening cash"  value={formatRWF(summary.opening_cash)} />}
          {summary.expected_cash !== null && <Row label="Expected cash"  value={formatRWF(summary.expected_cash)} />}
          {summary.closing_cash  !== null && <Row label="Counted cash"   value={formatRWF(summary.closing_cash)} />}
          <div className="flex justify-between text-sm pt-1 border-t border-white/10">
            <span className="text-slate-400">Variance</span>
            <span className={cn("font-bold", (summary.cash_variance ?? 0) >= 0 ? "text-green-400" : "text-red-400")}>
              {(summary.cash_variance ?? 0) >= 0 ? "+" : ""}{formatRWF(summary.cash_variance ?? 0)}
            </span>
          </div>
        </div>
      )}

      {hasVariance && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 space-y-1.5">
          <p className="text-xs text-amber-400 font-semibold flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Stock variance detected
          </p>
          {summary.variance_items.map((v) => (
            <p key={v.name} className="text-xs text-slate-300">
              {v.name}: <span className={v.variance > 0 ? "text-red-400" : "text-green-400"}>
                {v.variance > 0 ? "-" : "+"}{Math.abs(v.variance).toFixed(1)} btl {v.variance > 0 ? "missing" : "extra"}
              </span>
            </p>
          ))}
        </div>
      )}

      <div className="bg-slate-700/40 rounded-xl px-4 py-3 text-center">
        <p className="text-slate-300 text-sm">
          Returning to PIN login in <span className="text-white font-bold text-base">{countdown}</span>s...
        </p>
      </div>
    </div>
  );
}

function ErrorScreen({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-3">
          <AlertTriangle className="w-7 h-7 text-red-400" />
        </div>
        <h2 className="text-lg font-bold text-white">Shift end failed</h2>
        <p className="text-slate-400 text-sm mt-1">{message}</p>
      </div>
      <button onClick={onClose} className="w-full h-11 rounded-xl border border-slate-600 text-slate-300 font-medium hover:bg-slate-700 transition-colors text-sm flex items-center justify-center gap-2">
        <X className="w-4 h-4" /> Dismiss
      </button>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-400">{label}</span>
      <span className={bold ? "text-white font-bold" : "text-white"}>{value}</span>
    </div>
  );
}
