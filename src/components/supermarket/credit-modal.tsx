"use client";

import { useState } from "react";
import { formatRWF } from "@/lib/utils";
import { X, Loader2, AlertTriangle } from "lucide-react";

interface CreditModalProps {
  total: number;
  itemsDescription: string;
  onConfirm: (details: CreditDetails) => Promise<void>;
  onClose: () => void;
}

export interface CreditDetails {
  customer_name: string;
  customer_phone: string;
  due_date: string;
  notes?: string;
}

export function CreditModal({ total, itemsDescription, onConfirm, onClose }: CreditModalProps) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!customerName.trim()) e.name = "Customer name is required";
    if (!customerPhone.trim()) e.phone = "Phone number is required";
    if (!dueDate) e.date = "Due date is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleConfirm = async () => {
    if (!validate()) return;
    setIsLoading(true);
    try {
      await onConfirm({ customer_name: customerName.trim(), customer_phone: customerPhone.trim(), due_date: dueDate, notes: notes.trim() || undefined });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <h2 className="text-lg font-bold text-white">Credit Sale</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-400 hover:text-white transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Warning + amount */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
            <p className="text-amber-400 font-bold text-lg">{formatRWF(total)}</p>
            <p className="text-slate-400 text-xs mt-1 line-clamp-2">{itemsDescription}</p>
            <p className="text-amber-400/70 text-xs mt-2">
              ⚠ Stock will be deducted now. Customer pays later.
            </p>
          </div>

          {/* Fields */}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-slate-300 block mb-1.5">Customer Name *</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Uwimana Jean"
                autoFocus
                className="w-full h-11 px-4 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 block mb-1.5">Phone Number *</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="0781234567"
                className="w-full h-11 px-4 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 block mb-1.5">Due Date *</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full h-11 px-4 bg-slate-900 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.date && <p className="text-red-400 text-xs mt-1">{errors.date}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 block mb-1.5">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes..."
                rows={2}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
              />
            </div>
          </div>

          {/* Quick due date buttons */}
          <div className="flex gap-2">
            {[3, 7, 14, 30].map((days) => {
              const d = new Date();
              d.setDate(d.getDate() + days);
              const val = d.toISOString().split("T")[0];
              return (
                <button
                  key={days}
                  onClick={() => setDueDate(val)}
                  className={`flex-1 h-8 rounded-lg border text-xs font-medium transition-all ${
                    dueDate === val ? "border-blue-500 bg-blue-500/20 text-blue-400" : "border-slate-600 bg-slate-700/50 text-slate-400 hover:border-slate-500"
                  }`}
                >
                  +{days}d
                </button>
              );
            })}
          </div>

          {/* Confirm */}
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="w-full h-14 rounded-xl font-bold text-lg text-white bg-amber-600 hover:bg-amber-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
          >
            {isLoading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Saving Credit...</>
            ) : (
              <>📋 Confirm Credit Sale</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
