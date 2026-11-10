"use client";

import { useState } from "react";
import { X, Minus, Plus } from "lucide-react";
import { formatRWF } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { serveOptions, servePrice, maxServings, shotsPerServe, SERVE_LABELS, type ServeSize } from "@/lib/bar";
import type { BarItem } from "@/types";

interface ShotModalProps {
  item: BarItem;
  onConfirm: (item: BarItem, quantity: number, serveAs: ServeSize) => void;
  onClose: () => void;
}

const ICONS: Record<ServeSize, string> = { single: "🥃", double: "🥃🥃", quarter: "🍶", bottle: "🍾" };

export function ShotModal({ item, onConfirm, onClose }: ShotModalProps) {
  const options = serveOptions(item);
  const [serveAs, setServeAs] = useState<ServeSize>(options[0]);
  const [quantity, setQuantity] = useState(1);

  const unitPrice = servePrice(item, serveAs);
  const total = unitPrice * quantity;
  const maxQty = maxServings(item, serveAs);
  const perBottle = Number(item.shots_per_bottle ?? 0);
  const shotsLeft = Number(item.shots_remaining ?? 0);

  const hint = (size: ServeSize) =>
    size === "single" ? "1 shot" : size === "double" ? "2 shots" : size === "quarter" ? `¼ bottle · ${shotsPerServe("quarter", perBottle)} shots` : "Whole bottle";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="glass-card rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-white">{item.name}</h2>
            <p className="text-xs text-slate-400 capitalize">{item.category}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-400 hover:text-white transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Serve as: only the sizes the owner has priced */}
          {options.length > 1 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Serve As</p>
              <div className="grid grid-cols-2 gap-2">
                {options.map((size) => {
                  const out = maxServings(item, size) < 1;
                  return (
                    <button
                      key={size}
                      onClick={() => { setServeAs(size); setQuantity(1); }}
                      disabled={out}
                      className={cn(
                        "min-h-14 py-2 px-2 rounded-xl font-semibold text-sm border transition-all flex flex-col items-center justify-center leading-tight disabled:opacity-40",
                        serveAs === size
                          ? "bg-blue-500 border-blue-500 text-white"
                          : "bg-slate-700 border-slate-600 text-slate-300"
                      )}
                    >
                      <span>{ICONS[size]} {SERVE_LABELS[size]} — {formatRWF(servePrice(item, size))}</span>
                      <span className={cn("text-[11px] font-normal", serveAs === size ? "text-blue-100" : "text-slate-400")}>{out ? "Not enough stock" : hint(size)}</span>
                    </button>
                  );
                })}
              </div>
              {perBottle > 1 && (
                <p className="text-xs text-slate-500 mt-2 text-center">
                  {Math.round(shotsLeft * 100) / 100} shots remaining ({(shotsLeft / perBottle).toFixed(1)} bottles)
                </p>
              )}
            </div>
          )}

          {/* Quantity */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Quantity</p>
            <div className="flex items-center justify-center gap-5">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-12 h-12 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-white transition-all"
              >
                <Minus className="w-5 h-5" />
              </button>
              <span className="text-4xl font-black text-white w-16 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(maxQty, quantity + 1))}
                className="w-12 h-12 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-white transition-all"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Total */}
          <div className="bg-slate-900/50 rounded-xl p-4 text-center border border-slate-700/50">
            <p className="text-xs text-slate-400 mb-1">{quantity} × {SERVE_LABELS[serveAs]} {formatRWF(unitPrice)}</p>
            <p className="text-3xl font-black text-white">{formatRWF(total)}</p>
          </div>

          <button
            onClick={() => onConfirm(item, quantity, serveAs)}
            disabled={quantity < 1 || quantity > maxQty}
            className="w-full h-14 rounded-xl font-bold text-lg text-white bg-green-600 hover:bg-green-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Add to Tab
          </button>
        </div>
      </div>
    </div>
  );
}
