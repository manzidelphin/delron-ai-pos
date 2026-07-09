"use client";

import { formatRWF } from "@/lib/utils";

interface BarOrderItem {
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  serve_as: "bottle" | "shot";
}

interface BarReceiptProps {
  receiptNumber: string;
  businessName: string;
  branchName: string;
  cashierName: string;
  waiterName?: string;
  tableNumber?: number;
  items: BarOrderItem[];
  total: number;
  paymentMethod?: string;
  amountPaid?: number;
  change?: number;
  splitCount?: number;
  timestamp?: string;
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash",
  mtn_momo: "MTN MoMo",
  airtel_money: "Airtel Money",
  bank_transfer: "Bank Transfer",
};

export function BarReceipt({
  receiptNumber,
  businessName,
  branchName,
  cashierName,
  waiterName,
  tableNumber,
  items,
  total,
  paymentMethod,
  amountPaid,
  change,
  splitCount,
  timestamp,
}: BarReceiptProps) {
  const date = timestamp ? new Date(timestamp) : new Date();

  return (
    <div
      id="bar-receipt"
      className="receipt-print bg-white text-black p-6 rounded-lg max-w-[300px] mx-auto text-sm font-mono"
    >
      <div className="text-center border-b border-dashed border-gray-400 pb-3 mb-3">
        <p className="font-black text-lg tracking-widest">DELRON AI POS</p>
        <p className="font-bold">{businessName}</p>
        <p className="text-xs text-gray-600">{branchName} — BAR</p>
        {tableNumber && <p className="text-xs font-bold mt-1">TABLE {tableNumber}</p>}
        <p className="text-xs text-gray-500 mt-1">
          {date.toLocaleDateString("en-RW", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}{" "}
          {date.toLocaleTimeString("en-RW", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>

      <div className="text-xs space-y-0.5 mb-3 border-b border-dashed border-gray-400 pb-3">
        <div className="flex justify-between">
          <span className="text-gray-500">Receipt #</span>
          <span className="font-bold">{receiptNumber}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Cashier</span>
          <span>{cashierName}</span>
        </div>
        {waiterName && (
          <div className="flex justify-between">
            <span className="text-gray-500">Served by</span>
            <span>{waiterName}</span>
          </div>
        )}
      </div>

      <div className="mb-3 border-b border-dashed border-gray-400 pb-3">
        {items.map((item, i) => (
          <div key={i} className="mb-1.5">
            <div className="flex justify-between">
              <span className="font-medium truncate pr-2 max-w-[160px]">
                {item.item_name}{item.serve_as === "shot" ? " (shot)" : ""}
              </span>
              <span className="font-bold">{formatRWF(item.total_price)}</span>
            </div>
            <div className="text-xs text-gray-500 pl-2">
              {item.quantity} × {formatRWF(item.unit_price)}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-1 mb-3 border-b border-dashed border-gray-400 pb-3 text-xs">
        <div className="flex justify-between font-black text-base">
          <span>TOTAL</span>
          <span>{formatRWF(total)}</span>
        </div>
        {splitCount && splitCount > 1 && (
          <div className="flex justify-between text-gray-600">
            <span>Per person (÷{splitCount})</span>
            <span>{formatRWF(Math.ceil(total / splitCount))}</span>
          </div>
        )}
      </div>

      {paymentMethod && (
        <div className="text-xs space-y-0.5 mb-3">
          <div className="flex justify-between">
            <span className="text-gray-500">Payment</span>
            <span>{PAYMENT_LABELS[paymentMethod] ?? paymentMethod}</span>
          </div>
          {amountPaid !== undefined && amountPaid > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Paid</span>
              <span>{formatRWF(amountPaid)}</span>
            </div>
          )}
          {change !== undefined && change > 0 && (
            <div className="flex justify-between font-bold">
              <span>Change</span>
              <span>{formatRWF(change)}</span>
            </div>
          )}
        </div>
      )}

      <div className="text-center text-xs text-gray-500 border-t border-dashed border-gray-400 pt-3">
        <p className="font-medium">Thank you! Enjoy your evening!</p>
        <p className="mt-0.5">Powered by DELRON AI POS</p>
      </div>
    </div>
  );
}
