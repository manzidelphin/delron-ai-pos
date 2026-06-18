"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { LogOut, Loader2, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { formatRWF } from "@/lib/utils";

interface ShiftSummary {
  bartender_name: string;
  revenue: number;
  orders: number;
  bottles_sold: number;
  variance_items: { name: string; variance: number }[];
}

type ModalState = "idle" | "confirm" | "loading" | "success" | "error";

export function EndShiftButton() {
  const { activeOperator, staff, clearOperator } = useAuthStore();
  const [state, setState]     = useState<ModalState>("idle");
  const [summary, setSummary] = useState<ShiftSummary | null>(null);
  const [errorMsg, setError]  = useState("");
  const [countdown, setCountdown] = useState(3);

  // Only visible when the active operator (or session user) is a bartender
  const role = activeOperator?.role ?? staff?.role;
  if (role !== "bartender") return null;

  const name = activeOperator?.name ?? staff?.name ?? "Bartender";

  const handleConfirm = async () => {
    setState("loading");
    try {
      const res  = await fetch("/api/bar/shift/end", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to end shift");
      setSummary(json.summary);
      setState("success");

      // Countdown then lock
      let n = 3;
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

  return (
    <>
      {/* The trigger button */}
      <div className="p-3 border-t border-border">
        <button
          onClick={() => state === "idle" && setState("confirm")}
          disabled={state !== "idle"}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all text-sm font-medium disabled:opacity-40"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span>End Shift</span>
        </button>
      </div>

      {/* Modals */}
      {state !== "idle" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          {state === "confirm" && (
            <ConfirmModal name={name} onConfirm={handleConfirm} onClose={() => setState("idle")} />
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

// ── Sub-screens ───────────────────────────────────────────────────────────────

function ConfirmModal({ name, onConfirm, onClose }: {
  name: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto">
          <LogOut className="w-7 h-7 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-white">End your shift?</h2>
        <p className="text-slate-400 text-sm">
          Hi <span className="text-white font-medium">{name}</span> — this will lock your session and notify the owner.
        </p>
      </div>

      <ul className="space-y-2.5 text-sm text-slate-300">
        {[
          "📊 Save a stock snapshot for all bar items",
          "📩 Notify the owner via SMS with your summary",
          "🔒 Lock this terminal back to PIN login screen",
        ].map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>

      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 h-11 rounded-xl border border-slate-600 text-slate-300 font-medium hover:bg-slate-700 transition-colors text-sm"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold flex items-center justify-center gap-2 transition-colors text-sm"
        >
          <LogOut className="w-4 h-4" />
          End Shift
        </button>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm p-10 flex flex-col items-center gap-4">
      <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
      <div className="text-center">
        <p className="text-white font-bold text-lg">Closing shift...</p>
        <p className="text-slate-400 text-sm mt-1">Saving stock snapshot · Notifying owner</p>
      </div>
    </div>
  );
}

function SuccessScreen({ summary, countdown }: { summary: ShiftSummary; countdown: number }) {
  const hasVariance = summary.variance_items.length > 0;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-green-400" />
        </div>
        <h2 className="text-xl font-bold text-white">Shift Ended!</h2>
        <p className="text-slate-400 text-sm">Owner has been notified via SMS</p>
      </div>

      <div className="bg-slate-900/60 rounded-xl p-4 space-y-2">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
          {summary.bartender_name}&apos;s Shift Summary
        </p>
        <div className="space-y-1.5">
          <Row label="Revenue"      value={formatRWF(summary.revenue)} bold />
          <Row label="Orders"       value={String(summary.orders)} />
          <Row label="Bottles sold" value={`${summary.bottles_sold.toFixed(1)} btl`} />
        </div>
      </div>

      {hasVariance && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 space-y-1.5">
          <p className="text-xs text-amber-400 font-semibold flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Stock variance detected
          </p>
          {summary.variance_items.map((v) => (
            <p key={v.name} className="text-xs text-slate-300">
              {v.name}:{" "}
              <span className={v.variance > 0 ? "text-red-400" : "text-green-400"}>
                {v.variance > 0 ? "-" : "+"}{Math.abs(v.variance).toFixed(1)} btl {v.variance > 0 ? "missing" : "extra"}
              </span>
            </p>
          ))}
        </div>
      )}

      <div className="bg-slate-700/40 rounded-xl px-4 py-3 text-center">
        <p className="text-slate-300 text-sm">
          Returning to PIN login in{" "}
          <span className="text-white font-bold text-base">{countdown}</span>s...
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
      <button
        onClick={onClose}
        className="w-full h-11 rounded-xl border border-slate-600 text-slate-300 font-medium hover:bg-slate-700 transition-colors text-sm flex items-center justify-center gap-2"
      >
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
