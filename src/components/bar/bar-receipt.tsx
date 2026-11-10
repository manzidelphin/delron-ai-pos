"use client";

import { formatRWF } from "@/lib/utils";
import { PrintPortal } from "@/components/print-portal";
import { MomoPayLine } from "@/components/pos/momo-pay-line";
import { groupTabLines } from "@/lib/tab-lines";

interface BarOrderItem {
  id: string;
  item_type?: string;
  notes?: string | null;
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
  /** MoMo Pay till code, printed under the total */
  momoPayCode?: string | null;
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash",
  mtn_momo: "MTN MoMo",
  airtel_money: "Airtel Money",
  bank_transfer: "Bank Transfer",
};

// On-screen receipt plus a print-only copy (window.print() only shows #print-root).
export function BarReceipt(props: BarReceiptProps) {
  return (
    <>
      <BarReceiptContent {...props} id="bar-receipt" />
      <PrintPortal>
        <BarReceiptContent {...props} />
      </PrintPortal>
    </>
  );
}

function BarReceiptContent({
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
  momoPayCode,
  id,
}: BarReceiptProps & { id?: string }) {
  const date = timestamp ? new Date(timestamp) : new Date();

  return (
    <div
      id={id}
      className="receipt-print bg-white text-black p-6 rounded-lg max-w-[300px] mx-auto text-sm font-mono"
    >
      <div className="text-center border-b border-dashed border-gray-400 pb-3 mb-3">
        {/* Plain img (not next/image) so it is loaded before the print dialog opens */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-receipt.png" alt="DELRON AI POS" width={120} height={117} className="mx-auto mb-2 w-[120px] h-auto" />
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
        {groupTabLines(items).map((item, i) => (
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

      <MomoPayLine code={momoPayCode} />

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
