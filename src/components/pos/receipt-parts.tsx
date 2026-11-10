/**
 * Shared building blocks for printed receipts (bar/restaurant and supermarket).
 * Compact on purpose, to save thermal paper: business name big at the top, one
 * line per item with its full name, and a small DELRON logo at the bottom.
 */
import type { ReactNode } from "react";

/**
 * Branch line under the business name, without repeating the name:
 * "BROS LOUNGE - Main Branch" under "BROS LOUNGE" becomes "Main Branch".
 */
export function branchLabel(businessName: string, branchName: string | null | undefined): string {
  const branch = (branchName ?? "").trim();
  const name = businessName.trim();
  if (!branch || branch.toLowerCase() === name.toLowerCase()) return "";
  if (name && branch.toLowerCase().startsWith(name.toLowerCase())) {
    return branch.slice(name.length).replace(/^[\s\-–—:|,]+/, "");
  }
  return branch;
}

/** Amounts without the "RWF" prefix: the column header says RWF once. */
export const amount = (n: number) =>
  Math.round(Number(n) || 0).toLocaleString("en-US");

const formatDate = (d: Date) =>
  `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;

export function ReceiptPaper({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <div
      id={id}
      className="receipt-print bg-white text-black px-3 py-3 rounded-lg max-w-[300px] mx-auto text-[12px] leading-snug font-mono"
    >
      {children}
    </div>
  );
}

export function ReceiptHeader({ businessName, subtitle, date }: { businessName: string; subtitle?: string; date: Date }) {
  return (
    <div className="text-center pb-1.5 mb-1.5 border-b border-dashed border-gray-500">
      <p className="text-[17px] font-black uppercase leading-tight break-words">{businessName}</p>
      {subtitle && <p className="text-[11px]">{subtitle}</p>}
      <p className="text-[11px]">{formatDate(date)}</p>
    </div>
  );
}

/** Label/value rows, two per line where possible (Receipt # · Cashier · Table…). */
export function ReceiptInfo({ rows }: { rows: [string, string | number | undefined | null][] }) {
  const shown = rows.filter(([, v]) => v !== undefined && v !== null && v !== "");
  return (
    <div className="text-[11px] pb-1.5 mb-1.5 border-b border-dashed border-gray-500">
      {shown.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-2">
          <span>{label}</span>
          <span className="font-bold text-right break-all">{value}</span>
        </div>
      ))}
    </div>
  );
}

export interface ReceiptLine {
  name: string;
  qty: string | number;
  unitPrice: number;
  total: number;
}

/** Items as a table: full name, "qty x price", line total. */
export function ReceiptItems({ lines }: { lines: ReceiptLine[] }) {
  return (
    <div className="pb-1.5 mb-1.5 border-b border-dashed border-gray-500">
      <div className="flex justify-between text-[10px] font-bold uppercase border-b border-gray-300 pb-0.5 mb-0.5">
        <span>Item</span>
        <span>RWF</span>
      </div>
      {lines.map((l, i) => (
        <div key={i} className="py-[1px]">
          <div className="flex justify-between gap-2">
            <span className="font-semibold break-words min-w-0">{l.name}</span>
            <span className="font-bold whitespace-nowrap">{amount(l.total)}</span>
          </div>
          {Number(l.qty) !== 1 && (
            <div className="text-[10px] pl-2">{l.qty} x {amount(l.unitPrice)}</div>
          )}
        </div>
      ))}
    </div>
  );
}

export function ReceiptRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? "flex justify-between text-[16px] font-black" : "flex justify-between text-[11px]"}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export function ReceiptFooter({ message }: { message: string }) {
  return (
    <div className="text-center pt-1.5 mt-1.5 border-t border-dashed border-gray-500">
      <p className="text-[11px] font-semibold">{message}</p>
      <div className="flex items-center justify-center gap-1.5 mt-1.5">
        {/* Plain img (not next/image) so it is loaded before the print dialog opens */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-receipt.png" alt="DELRON AI POS" width={28} height={27} className="w-7 h-auto" />
        <span className="text-[9px] text-left leading-tight">Powered by<br /><b>DELRON AI POS</b></span>
      </div>
    </div>
  );
}
