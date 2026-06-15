"use client";

import { formatRWF } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Package, AlertTriangle } from "lucide-react";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
}

export function ProductCard({ product, onAdd }: ProductCardProps) {
  const isLow = product.quantity > 0 && product.quantity <= product.min_quantity;
  const isOut = product.quantity === 0;

  return (
    <button
      onClick={() => !isOut && onAdd(product)}
      disabled={isOut}
      className={cn(
        "relative w-full flex flex-col p-3 bg-slate-800 border rounded-xl text-left transition-all duration-150",
        "hover:border-blue-500/50 hover:bg-slate-700/80 hover:shadow-lg active:scale-[0.97]",
        isOut
          ? "border-slate-700 opacity-50 cursor-not-allowed"
          : isLow
          ? "border-amber-500/30 bg-amber-500/5"
          : "border-slate-700"
      )}
    >
      {/* Status badge */}
      {(isLow || isOut) && (
        <span
          className={cn(
            "absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full",
            isOut ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"
          )}
        >
          {isOut ? "OUT" : "LOW"}
        </span>
      )}

      {/* Product image / placeholder */}
      <div className="w-full aspect-square bg-slate-700/50 rounded-lg flex items-center justify-center mb-2 overflow-hidden">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover rounded-lg" />
        ) : (
          <Package className="w-8 h-8 text-slate-500" />
        )}
      </div>

      {/* Name */}
      <p className="text-sm font-semibold text-white leading-tight line-clamp-2 min-h-[2.5rem]">
        {product.name}
      </p>

      {/* Price */}
      <p className="text-base font-bold text-blue-400 mt-1">{formatRWF(product.price)}</p>

      {/* Stock */}
      <p className={cn("text-xs mt-0.5", isLow ? "text-amber-400" : "text-slate-500")}>
        {isLow && <AlertTriangle className="inline w-3 h-3 mr-0.5" />}
        Stock: {product.quantity} {product.unit}
      </p>
    </button>
  );
}
