"use client";

import { formatRWF } from "@/lib/utils";
import type { CartItem } from "@/types";

interface ReceiptProps {
  receiptNumber: string;
  businessName: string;
  branchName: string;
  cashierName: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  amountPaid?: number;
  change?: number;
  timestamp?: string;
}

export function Receipt({
  receiptNumber,
  businessName,
  branchName,
  cashierName,
  items,
  subtotal,
  discount,
  total,
  paymentMethod,
  amountPaid,
  change,
  timestamp,
}: ReceiptProps) {
  const date = timestamp ? new Date(timestamp) : new Date();

  const WEIGHT_UNITS = new Set(["kg", "g", "litre", "l", "ml", "gram", "grams", "liter", "liters"]);
  const fmtQty = (qty: number, unit?: string) => {
    if (WEIGHT_UNITS.has((unit ?? "").toLowerCase())) {
      return parseFloat(qty.toFixed(3)) + " " + unit;
    }
    return String(Math.round(qty));
  };

  const paymentLabel: Record<string, string> = {
    cash: "Cash",
    mtn_momo: "MTN MoMo",
    airtel_money: "Airtel Money",
    bank_transfer: "Bank Transfer",
    credit: "Credit (Pay Later)",
  };

  return (
    <div
      id="delron-receipt"
      className="receipt-print bg-white text-black p-6 rounded-lg max-w-[300px] mx-auto text-sm font-mono"
    >
      {/* Header */}
      <div className="text-center border-b border-dashed border-gray-400 pb-3 mb-3">
        <p className="font-black text-lg tracking-widest">DELRON AI POS</p>
        <p className="font-bold">{businessName}</p>
        <p className="text-xs text-gray-600">{branchName}</p>
        <p className="text-xs text-gray-500 mt-1">
          {date.toLocaleDateString("en-RW", {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
          })}{" "}
          {date.toLocaleTimeString("en-RW", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>

      {/* Receipt info */}
      <div className="text-xs space-y-0.5 mb-3 border-b border-dashed border-gray-400 pb-3">
        <div className="flex justify-between">
          <span className="text-gray-500">Receipt #</span>
          <span className="font-bold">{receiptNumber}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Cashier</span>
          <span>{cashierName}</span>
        </div>
      </div>

      {/* Items */}
      <div className="mb-3 border-b border-dashed border-gray-400 pb-3">
        {items.map((item, i) => (
          <div key={i} className="mb-1.5">
            <div className="flex justify-between">
              <span className="font-medium truncate pr-2 max-w-[160px]">{item.item_name}</span>
              <span className="font-bold">{formatRWF(item.total_price)}</span>
            </div>
            <div className="text-xs text-gray-500 pl-2">
              {fmtQty(item.quantity, item.unit)} × {formatRWF(item.unit_price)}
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="space-y-1 mb-3 border-b border-dashed border-gray-400 pb-3 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-500">Subtotal</span>
          <span>{formatRWF(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-green-700">
            <span>Discount</span>
            <span>-{formatRWF(discount)}</span>
          </div>
        )}
        <div className="flex justify-between font-black text-base mt-1">
          <span>TOTAL</span>
          <span>{formatRWF(total)}</span>
        </div>
      </div>

      {/* Payment */}
      <div className="text-xs space-y-0.5 mb-3 border-b border-dashed border-gray-400 pb-3">
        <div className="flex justify-between">
          <span className="text-gray-500">Payment</span>
          <span>{paymentLabel[paymentMethod] ?? paymentMethod}</span>
        </div>
        {amountPaid !== undefined && amountPaid > 0 && (
          <>
            <div className="flex justify-between">
              <span className="text-gray-500">Paid</span>
              <span>{formatRWF(amountPaid)}</span>
            </div>
            {change !== undefined && change > 0 && (
              <div className="flex justify-between font-bold">
                <span>Change</span>
                <span>{formatRWF(change)}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* EBM */}
      <div className="text-xs text-gray-500 mb-3 space-y-0.5">
        <div className="flex justify-between">
          <span>EBM #</span>
          <span>— (Coming Soon)</span>
        </div>
        <div className="flex justify-between">
          <span>VAT</span>
          <span>0.00 RWF</span>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-500 border-t border-dashed border-gray-400 pt-3">
        <p className="font-medium">Thank you for shopping with us!</p>
        <p className="mt-0.5">Powered by DELRON AI POS</p>
        <p className="text-[10px] mt-1 text-gray-400">
          This receipt is valid for returns within 7 days
        </p>
      </div>
    </div>
  );
}
