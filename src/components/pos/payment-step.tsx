"use client";

import { useState } from "react";
import { formatRWF, cn } from "@/lib/utils";
import { Loader2, ChevronLeft } from "lucide-react";
import type { PaymentMethod } from "@/types";

export type SimplePaymentMethod = Exclude<PaymentMethod, "credit">;

interface PaymentStepProps {
  total: number;
  momoNumber?: string | null;
  processing: boolean;
  onConfirm: (method: SimplePaymentMethod, details: { amount_paid: number; change: number }) => void;
  onCredit: () => void;
}

const METHODS: { key: SimplePaymentMethod; label: string; icon: string; color: string }[] = [
  { key: "cash", label: "Cash", icon: "💵", color: "bg-green-600 hover:bg-green-700" },
  { key: "mtn_momo", label: "MTN MoMo", icon: "📱", color: "bg-yellow-500 hover:bg-yellow-600" },
  { key: "airtel_money", label: "Airtel", icon: "📱", color: "bg-red-600 hover:bg-red-700" },
  { key: "bank_transfer", label: "Bank", icon: "🏦", color: "bg-blue-600 hover:bg-blue-700" },
];

/**
 * Payment method selection + confirmation UI, meant to be rendered below an
 * already-visible receipt (receipt-first checkout flow). Shared between the
 * supermarket and bar POS pages; the "credit" path is handed off to the
 * caller since each page keeps its own credit sale flow.
 */
export function PaymentStep({ total, momoNumber, processing, onConfirm, onCredit }: PaymentStepProps) {
  const [method, setMethod] = useState<SimplePaymentMethod | null>(null);
  const [amountReceived, setAmountReceived] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const numericAmount = parseFloat(amountReceived.replace(/,/g, "")) || 0;
  const change = Math.max(0, numericAmount - total);

  const back = () => {
    setMethod(null);
    setAmountReceived("");
    setConfirmed(false);
  };

  if (method === null) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-semibold text-slate-300 text-center">How is the customer paying?</p>
        <div className="grid grid-cols-2 gap-2">
          {METHODS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMethod(m.key)}
              className={cn(
                "h-14 rounded-xl font-bold text-white text-sm transition-all active:scale-95 flex flex-col items-center justify-center",
                m.color
              )}
            >
              <span className="text-lg">{m.icon}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>
        <button
          onClick={onCredit}
          className="w-full h-12 rounded-xl border-2 border-amber-500/40 bg-amber-500/10 text-amber-400 font-bold text-sm hover:bg-amber-500/20 transition-all active:scale-[0.98]"
        >
          📋 Credit (Pay Later)
        </button>
      </div>
    );
  }

  const quickAmounts = [total, Math.ceil(total / 1000) * 1000, Math.ceil(total / 5000) * 5000, Math.ceil(total / 10000) * 10000];
  const uniqueQuick = [...new Set(quickAmounts)].slice(0, 4);

  const confirmButton = (label: string, disabled: boolean, onClick: () => void) => (
    <button
      onClick={onClick}
      disabled={processing || disabled}
      className="w-full h-14 rounded-xl font-bold text-lg text-white bg-green-600 hover:bg-green-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
    >
      {processing ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" /> Processing...
        </>
      ) : (
        <>✅ {label}</>
      )}
    </button>
  );

  return (
    <div className="space-y-3">
      <button onClick={back} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors">
        <ChevronLeft className="w-3.5 h-3.5" /> Back
      </button>

      {method === "cash" && (
        <div className="space-y-3">
          <label className="text-sm font-medium text-slate-300 block">Amount Received (RWF)</label>
          <input
            type="number"
            value={amountReceived}
            onChange={(e) => setAmountReceived(e.target.value)}
            placeholder="Enter amount..."
            autoFocus
            className="w-full h-14 px-4 bg-slate-900 border border-slate-600 rounded-xl text-white text-xl font-bold placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="grid grid-cols-4 gap-2">
            {uniqueQuick.map((amt) => (
              <button
                key={amt}
                onClick={() => setAmountReceived(String(amt))}
                className={cn(
                  "h-10 rounded-lg border text-xs font-semibold transition-all",
                  numericAmount === amt
                    ? "border-blue-500 bg-blue-500/20 text-blue-400"
                    : "border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500"
                )}
              >
                {(amt / 1000).toFixed(0)}K
              </button>
            ))}
          </div>
          {numericAmount >= total && total > 0 && (
            <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
              <span className="text-sm font-medium text-green-400">Change to give back</span>
              <span className="text-xl font-black text-green-400">{formatRWF(change)}</span>
            </div>
          )}
          {confirmButton("Confirm Payment", numericAmount < total, () =>
            onConfirm("cash", { amount_paid: numericAmount, change })
          )}
        </div>
      )}

      {(method === "mtn_momo" || method === "airtel_money") && (
        <div className="space-y-3">
          <div
            className={cn(
              "rounded-xl p-4 border text-sm",
              method === "mtn_momo" ? "bg-yellow-500/10 border-yellow-500/20" : "bg-red-500/10 border-red-500/20"
            )}
          >
            <p className={cn("font-semibold", method === "mtn_momo" ? "text-yellow-400" : "text-red-400")}>
              {method === "mtn_momo" ? "📱 MTN MoMo" : "📱 Airtel Money"}
            </p>
            <p className="text-slate-300 mt-1">
              Ask customer to send {formatRWF(total)}
              {momoNumber ? ` to ${momoNumber}` : ""}
            </p>
          </div>
          <label className="flex items-center gap-2.5 text-sm text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="w-4 h-4 rounded accent-green-600"
            />
            I have received the {method === "mtn_momo" ? "MoMo" : "Airtel"} payment notification
          </label>
          {confirmButton("Confirm Payment", !confirmed, () => onConfirm(method, { amount_paid: total, change: 0 }))}
        </div>
      )}

      {method === "bank_transfer" && (
        <div className="space-y-3">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-sm">
            <p className="text-blue-400 font-semibold">Bank Transfer</p>
            <p className="text-slate-300 mt-1">Ask customer to confirm transfer of {formatRWF(total)} to your business account.</p>
          </div>
          <label className="flex items-center gap-2.5 text-sm text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="w-4 h-4 rounded accent-green-600"
            />
            Bank transfer confirmed
          </label>
          {confirmButton("Confirm Payment", !confirmed, () => onConfirm("bank_transfer", { amount_paid: total, change: 0 }))}
        </div>
      )}
    </div>
  );
}
