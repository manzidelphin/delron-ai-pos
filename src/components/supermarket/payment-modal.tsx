"use client";

import { useState } from "react";
import { formatRWF, formatRwandaPhone } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { X, Loader2, Banknote, Smartphone } from "lucide-react";
import type { PaymentMethod } from "@/types";

interface PaymentModalProps {
  total: number;
  paymentMethod: PaymentMethod;
  onConfirm: (details: PaymentDetails) => Promise<void>;
  onClose: () => void;
}

export interface PaymentDetails {
  payment_method: PaymentMethod;
  amount_paid?: number;
  change?: number;
  phone?: string;
  reference?: string;
}

export function PaymentModal({ total, paymentMethod, onConfirm, onClose }: PaymentModalProps) {
  const [amountReceived, setAmountReceived] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const numericAmount = parseFloat(amountReceived.replace(/,/g, "")) || 0;
  const change = Math.max(0, numericAmount - total);

  const handleConfirm = async () => {
    if (paymentMethod === "cash" && numericAmount < total) return;
    setIsLoading(true);
    try {
      await onConfirm({
        payment_method: paymentMethod,
        amount_paid: paymentMethod === "cash" ? numericAmount : total,
        change: paymentMethod === "cash" ? change : 0,
        phone: phone ? formatRwandaPhone(phone) : undefined,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const quickAmounts = [total, Math.ceil(total / 1000) * 1000, Math.ceil(total / 5000) * 5000, Math.ceil(total / 10000) * 10000];
  const uniqueQuick = [...new Set(quickAmounts)].slice(0, 4);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <div className="flex items-center gap-2">
            {paymentMethod === "cash" && <Banknote className="w-5 h-5 text-green-400" />}
            {(paymentMethod === "mtn_momo" || paymentMethod === "airtel_money") && <Smartphone className="w-5 h-5 text-blue-400" />}
            <h2 className="text-lg font-bold text-white">
              {paymentMethod === "cash" && "Cash Payment"}
              {paymentMethod === "mtn_momo" && "MTN MoMo Payment"}
              {paymentMethod === "airtel_money" && "Airtel Money Payment"}
              {paymentMethod === "bank_transfer" && "Bank Transfer"}
            </h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-400 hover:text-white transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Total */}
          <div className="bg-slate-900/50 rounded-xl p-4 text-center border border-slate-700/50">
            <p className="text-sm text-slate-400 mb-1">Amount Due</p>
            <p className="text-4xl font-black text-white">{formatRWF(total)}</p>
          </div>

          {/* Cash: amount received */}
          {paymentMethod === "cash" && (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-1.5">Amount Received (RWF)</label>
                <input
                  type="number"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  placeholder="Enter amount..."
                  autoFocus
                  className="w-full h-14 px-4 bg-slate-900 border border-slate-600 rounded-xl text-white text-xl font-bold placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Quick amounts */}
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

              {/* Change */}
              {numericAmount >= total && (
                <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
                  <span className="text-sm font-medium text-green-400">Change to give back</span>
                  <span className="text-xl font-black text-green-400">{formatRWF(change)}</span>
                </div>
              )}
            </div>
          )}

          {/* MoMo / Airtel: phone number */}
          {(paymentMethod === "mtn_momo" || paymentMethod === "airtel_money") && (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-1.5">Customer Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={paymentMethod === "mtn_momo" ? "078 or 079..." : "073 or 072..."}
                  autoFocus
                  className="w-full h-12 px-4 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className={cn(
                "flex items-center justify-between rounded-xl px-4 py-3 border",
                paymentMethod === "mtn_momo" ? "bg-yellow-500/10 border-yellow-500/20" : "bg-red-500/10 border-red-500/20"
              )}>
                <span className={cn("text-sm font-medium", paymentMethod === "mtn_momo" ? "text-yellow-400" : "text-red-400")}>
                  {paymentMethod === "mtn_momo" ? "📱 MTN MoMo" : "📱 Airtel Money"}
                </span>
                <span className="text-sm font-bold text-white">{formatRWF(total)}</span>
              </div>
              <p className="text-xs text-slate-500 text-center">
                Ask customer to approve payment on their phone
              </p>
            </div>
          )}

          {/* Bank transfer */}
          {paymentMethod === "bank_transfer" && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 space-y-2 text-sm">
              <p className="text-blue-400 font-semibold">Bank Transfer Details</p>
              <p className="text-slate-300">Ask customer to confirm transfer of {formatRWF(total)} to your business account.</p>
              <p className="text-slate-400 text-xs">Get the transaction reference from the customer.</p>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Transfer reference (optional)"
                className="w-full h-10 px-3 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 mt-2"
              />
            </div>
          )}

          {/* Confirm button */}
          <button
            onClick={handleConfirm}
            disabled={isLoading || (paymentMethod === "cash" && numericAmount < total)}
            className={cn(
              "w-full h-14 rounded-xl font-bold text-lg text-white transition-all flex items-center justify-center gap-2",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "bg-green-600 hover:bg-green-700 active:scale-[0.98]"
            )}
          >
            {isLoading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
            ) : (
              <>✓ Confirm Payment — {formatRWF(total)}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
