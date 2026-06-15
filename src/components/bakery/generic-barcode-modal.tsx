"use client";

import { useState } from "react";
import { formatRWF } from "@/lib/utils";
import { X, ShoppingCart } from "lucide-react";

interface GenericBarcodeModalProps {
  itemName: string;
  pricePerPiece: number;
  unit?: string;
  onConfirm: (quantity: number) => void;
  onClose: () => void;
}

export function GenericBarcodeModal({
  itemName,
  pricePerPiece,
  unit = "piece",
  onConfirm,
  onClose,
}: GenericBarcodeModalProps) {
  const [qty, setQty] = useState("");

  const numQty = parseInt(qty) || 0;
  const total = numQty * pricePerPiece;

  const handleConfirm = () => {
    if (numQty <= 0) return;
    onConfirm(numQty);
  };

  const quickQtys = [1, 2, 5, 10, 20, 50];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm animate-fade-in">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <span className="text-lg">🥐</span>
            </div>
            <div>
              <h2 className="font-bold text-white">{itemName} Detected</h2>
              <p className="text-xs text-slate-400">Generic barcode — enter quantity</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-2">
              How many {unit}s in this package?
            </label>
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleConfirm(); }}
              placeholder="Enter quantity..."
              min="1"
              autoFocus
              className="w-full h-16 px-4 bg-slate-900 border border-slate-600 rounded-xl text-white text-3xl font-black text-center placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Quick quantities */}
          <div className="grid grid-cols-6 gap-1.5">
            {quickQtys.map((q) => (
              <button
                key={q}
                onClick={() => setQty(String(q))}
                className={`h-9 rounded-lg text-sm font-bold transition-all ${
                  numQty === q
                    ? "bg-blue-600 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Price breakdown */}
          <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm text-slate-400">
              <span>Price per {unit}</span>
              <span className="text-white">{formatRWF(pricePerPiece)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-400">
              <span>Quantity</span>
              <span className="text-white">{numQty > 0 ? numQty : "—"}</span>
            </div>
            <div className="flex justify-between text-lg font-black text-white border-t border-slate-700 pt-2 mt-2">
              <span>Total</span>
              <span className="text-blue-400">{numQty > 0 ? formatRWF(total) : "—"}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 h-12 rounded-xl border border-slate-600 text-slate-300 hover:text-white font-medium transition-all">
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={numQty <= 0}
              className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
