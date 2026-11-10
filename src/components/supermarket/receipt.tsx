"use client";

import type { CartItem } from "@/types";
import { PrintPortal } from "@/components/print-portal";
import { MomoPayLine } from "@/components/pos/momo-pay-line";
import { ReceiptPaper, ReceiptHeader, ReceiptInfo, ReceiptItems, ReceiptRow, ReceiptFooter, amount, branchLabel } from "@/components/pos/receipt-parts";

interface ReceiptProps {
  receiptNumber: string;
  businessName: string;
  branchName: string;
  cashierName: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod?: string;
  amountPaid?: number;
  change?: number;
  timestamp?: string;
  /** MoMo Pay till code, printed under the total */
  momoPayCode?: string | null;
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash",
  mtn_momo: "MTN MoMo",
  airtel_money: "Airtel Money",
  bank_transfer: "Bank Transfer",
  bank: "Bank",
  credit: "Credit (Pay Later)",
};

const WEIGHT_UNITS = new Set(["kg", "g", "litre", "l", "ml", "gram", "grams", "liter", "liters"]);
const fmtQty = (qty: number, unit?: string): string | number =>
  WEIGHT_UNITS.has((unit ?? "").toLowerCase()) ? `${parseFloat(qty.toFixed(3))} ${unit}` : Math.round(qty);

// On-screen receipt plus a print-only copy (window.print() only shows #print-root).
export function Receipt(props: ReceiptProps) {
  return (
    <>
      <ReceiptContent {...props} id="delron-receipt" />
      <PrintPortal>
        <ReceiptContent {...props} />
      </PrintPortal>
    </>
  );
}

function ReceiptContent({
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
  momoPayCode,
  id,
}: ReceiptProps & { id?: string }) {
  const date = timestamp ? new Date(timestamp) : new Date();
  // Business name already on top: the branch line must not repeat it.
  const branch = branchLabel(businessName, branchName);

  return (
    <ReceiptPaper id={id}>
      <ReceiptHeader businessName={businessName} subtitle={branch || undefined} date={date} />

      <ReceiptInfo rows={[["Receipt", receiptNumber], ["Cashier", cashierName]]} />

      <ReceiptItems
        lines={items.map((item) => ({
          name: item.item_name,
          qty: fmtQty(item.quantity, item.unit),
          unitPrice: item.unit_price,
          total: item.total_price,
        }))}
      />

      {discount > 0 && (
        <>
          <ReceiptRow label="Subtotal" value={amount(subtotal)} />
          <ReceiptRow label="Discount" value={`-${amount(discount)}`} />
        </>
      )}
      <ReceiptRow label="TOTAL" value={`RWF ${amount(total)}`} strong />

      <MomoPayLine code={momoPayCode} />

      {/* Payment: only known once the customer has selected and confirmed a method */}
      {paymentMethod && (
        <div className="pt-1">
          <ReceiptRow label="Payment" value={PAYMENT_LABELS[paymentMethod] ?? paymentMethod} />
          {amountPaid !== undefined && amountPaid > 0 && <ReceiptRow label="Paid" value={amount(amountPaid)} />}
          {change !== undefined && change > 0 && <ReceiptRow label="Change" value={amount(change)} />}
        </div>
      )}

      <ReceiptFooter message="Thank you for shopping with us!" />
    </ReceiptPaper>
  );
}
