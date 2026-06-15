"use client";

import { useState } from "react";
import { X, Minus, Plus } from "lucide-react";
import { formatRWF } from "@/lib/utils";

interface SplitBillModalProps {
  total: number;
  onConfirm: (splitCount: number) => void;
  onClose: () => void;
}

export function SplitBillModal({ total, onConfirm, onClose }: SplitBillModalProps) {
  const [count, setCount] = useState(2);

  const perPerson = Math.ceil(total / count);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h2 className="text-lg font-bold text-white">Split Bill</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-400 hover:text-white transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="bg-slate-900/50 rounded-xl p-4 text-center border border-slate-700/50">
            <p className="text-xs text-slate-400 mb-1">Total Bill</p>
            <p className="text-3xl font-black text-white">{formatRWF(total)}</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Number of People</p>
            <div className="flex items-center justify-center gap-5">
              <button
                onClick={() => setCount(Math.max(2, count - 1))}
                className="w-12 h-12 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-white transition-all"
              >
                <Minus className="w-5 h-5" />
              </button>
              <span className="text-4xl font-black text-white w-16 text-center">{count}</span>
              <button
                onClick={() => setCount(Math.min(20, count + 1))}
                className="w-12 h-12 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-white transition-all"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
            <p className="text-sm text-slate-400 mb-1">Each person pays</p>
            <p className="text-3xl font-black text-green-400">{formatRWF(perPerson)}</p>
          </div>

          <button
            onClick={() => onConfirm(count)}
            className="w-full h-14 rounded-xl font-bold text-lg text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all"
          >
            Confirm Split × {count}
          </button>
        </div>
      </div>
    </div>
  );
}
