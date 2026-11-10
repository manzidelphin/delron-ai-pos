"use client";

import { PrintPortal } from "@/components/print-portal";
import { MomoPayLine } from "@/components/pos/momo-pay-line";
import { ReceiptPaper, ReceiptHeader, ReceiptInfo, ReceiptItems, ReceiptRow, ReceiptFooter, amount, branchLabel } from "@/components/pos/receipt-parts";
import { groupTabLines, serveSuffix } from "@/lib/tab-lines";

interface BarOrderItem {
  id: string;
  item_type?: string;
  notes?: string | null;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  serve_as?: string;
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
  bank: "Bank",
  credit: "Credit (Pay Later)",
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
  // Business name already on top: the branch line must not repeat it.
  const branch = branchLabel(businessName, branchName);

  return (
    <ReceiptPaper id={id}>
      <ReceiptHeader businessName={businessName} subtitle={branch || undefined} date={date} />

      <ReceiptInfo
        rows={[
          ["Receipt", receiptNumber],
          ["Table", tableNumber],
          ["Cashier", cashierName],
          ["Served by", waiterName],
        ]}
      />

      <ReceiptItems
        lines={groupTabLines(items).map((item) => ({
          name: `${item.item_name}${serveSuffix(item)}`,
          qty: item.quantity,
          unitPrice: item.unit_price,
          total: item.total_price,
        }))}
      />

      <ReceiptRow label="TOTAL" value={`RWF ${amount(total)}`} strong />
      {splitCount && splitCount > 1 && (
        <ReceiptRow label={`Per person (÷${splitCount})`} value={amount(Math.ceil(total / splitCount))} />
      )}

      <MomoPayLine code={momoPayCode} />

      {paymentMethod && (
        <div className="pt-1">
          <ReceiptRow label="Payment" value={PAYMENT_LABELS[paymentMethod] ?? paymentMethod} />
          {amountPaid !== undefined && amountPaid > 0 && <ReceiptRow label="Paid" value={`RWF ${amount(amountPaid)}`} />}
          {change !== undefined && change > 0 && <ReceiptRow label="Change" value={`RWF ${amount(change)}`} />}
        </div>
      )}

      <ReceiptFooter message="Thank you! Enjoy your evening!" />
    </ReceiptPaper>
  );
}
