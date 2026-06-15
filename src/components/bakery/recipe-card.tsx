"use client";

import { formatRWF } from "@/lib/utils";
import { Pencil, Trash2, ChefHat, TrendingUp } from "lucide-react";

interface RecipeCardProps {
  recipe: {
    id: string;
    name: string;
    yield_quantity: number;
    yield_unit: string;
    ingredient_count: number;
    batch_cost: number;
    cost_per_piece: number;
    profit_per_piece: number;
    finished_goods?: {
      name: string;
      selling_price: number;
      barcode_type: string;
    } | null;
  };
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function RecipeCard({ recipe, onEdit, onDelete }: RecipeCardProps) {
  const isProfit = recipe.profit_per_piece > 0;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 hover:border-slate-600 transition-all group flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
          <ChefHat className="w-6 h-6 text-amber-400" />
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(recipe.id)}
            className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-400 hover:text-white"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(recipe.id)}
            className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-red-500/20 flex items-center justify-center text-slate-400 hover:text-red-400"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <h3 className="font-bold text-white text-base leading-tight">{recipe.name}</h3>
      {recipe.finished_goods && (
        <p className="text-xs text-slate-400 mt-0.5">{recipe.finished_goods.name}</p>
      )}

      <div className="mt-4 space-y-2 flex-1">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Yields</span>
          <span className="text-white font-medium">{recipe.yield_quantity} {recipe.yield_unit}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Ingredients</span>
          <span className="text-white font-medium">{recipe.ingredient_count} items</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Batch cost</span>
          <span className="text-amber-400 font-medium">{formatRWF(recipe.batch_cost)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Cost per piece</span>
          <span className="text-white font-medium">{formatRWF(recipe.cost_per_piece)}</span>
        </div>
      </div>

      {/* Profit badge */}
      <div className={`mt-4 flex items-center justify-between px-3 py-2 rounded-xl border ${
        isProfit
          ? "bg-green-500/10 border-green-500/20"
          : "bg-red-500/10 border-red-500/20"
      }`}>
        <div className="flex items-center gap-1.5">
          <TrendingUp className={`w-3.5 h-3.5 ${isProfit ? "text-green-400" : "text-red-400"}`} />
          <span className={`text-xs font-semibold ${isProfit ? "text-green-400" : "text-red-400"}`}>
            {isProfit ? "Profit" : "Loss"} per piece
          </span>
        </div>
        <span className={`font-black text-sm ${isProfit ? "text-green-400" : "text-red-400"}`}>
          {isProfit ? "+" : ""}{formatRWF(recipe.profit_per_piece)}
        </span>
      </div>
    </div>
  );
}
