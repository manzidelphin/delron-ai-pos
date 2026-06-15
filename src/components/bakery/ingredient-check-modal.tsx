"use client";

import { AlertTriangle, X, ArrowRight } from "lucide-react";

interface Shortage {
  name: string;
  needed: number;
  available: number;
  unit: string;
}

interface IngredientCheckModalProps {
  shortages: Shortage[];
  onClose: () => void;
  onGoToMaterials: () => void;
}

export function IngredientCheckModal({ shortages, onClose, onGoToMaterials }: IngredientCheckModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-800 border border-red-500/30 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="font-bold text-white">Insufficient Ingredients</h2>
              <p className="text-xs text-slate-400">Cannot log production — restock first</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {shortages.map((s, i) => (
            <div key={i} className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <p className="font-semibold text-white">{s.name}</p>
                <span className="text-xs text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full font-medium">Shortage</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-slate-500 text-xs">You need</p>
                  <p className="text-red-400 font-bold">{s.needed.toFixed(2)} {s.unit}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Available</p>
                  <p className="text-white font-bold">{s.available.toFixed(2)} {s.unit}</p>
                </div>
              </div>
              <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full"
                  style={{ width: `${Math.min(100, (s.available / s.needed) * 100)}%` }}
                />
              </div>
            </div>
          ))}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-slate-600 text-slate-300 font-medium">
              Go Back
            </button>
            <button
              onClick={onGoToMaterials}
              className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-2 transition-all"
            >
              Restock Materials
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
