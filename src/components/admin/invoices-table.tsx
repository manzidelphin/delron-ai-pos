"use client";

import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { FileText } from "lucide-react";

export interface InvoiceRow {
  id: string;
  invoice_number: string;
  amount: number;
  due_date: string;
  status: "pending" | "paid" | "overdue";
  momo_request_id: string | null;
  created_at: string;
  paid_at: string | null;
}

const STATUS_COLORS = {
  pending:  "bg-amber-500/20 text-amber-300",
  paid:     "bg-green-500/20 text-green-300",
  overdue:  "bg-red-500/20 text-red-400",
};

function fmtRwf(n: number) { return `RWF ${n.toLocaleString()}`; }
function fmtDate(d: string | null) {
  if (!d) return "—";
  try { return format(parseISO(d), "dd MMM yyyy"); } catch { return d; }
}

export default function InvoicesTable({ invoices }: { invoices: InvoiceRow[] }) {
  if (invoices.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-8 text-center text-zinc-600 text-sm flex flex-col items-center gap-2">
        <FileText className="w-6 h-6 text-zinc-700" />
        No invoices generated yet.
      </div>
    );
  }

  const totalPaid    = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const totalPending = invoices.filter((i) => i.status !== "paid").reduce((s, i) => s + i.amount, 0);

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Total Invoiced</p>
          <p className="font-semibold text-white text-sm">{fmtRwf(invoices.reduce((s, i) => s + i.amount, 0))}</p>
        </div>
        <div className="bg-zinc-900 border border-green-500/20 rounded-xl p-3">
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Collected</p>
          <p className="font-semibold text-green-300 text-sm">{fmtRwf(totalPaid)}</p>
        </div>
        <div className="bg-zinc-900 border border-amber-500/20 rounded-xl p-3">
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Outstanding</p>
          <p className="font-semibold text-amber-300 text-sm">{fmtRwf(totalPending)}</p>
        </div>
      </div>

      {/* Invoice table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Invoice</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Amount</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Due Date</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Status</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Paid At</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">MoMo Ref</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-zinc-800/60 last:border-0">
                <td className="px-4 py-3 font-mono text-xs text-white">{inv.invoice_number}</td>
                <td className="px-4 py-3 font-semibold text-white">{fmtRwf(inv.amount)}</td>
                <td className="px-4 py-3 text-zinc-400">{fmtDate(inv.due_date)}</td>
                <td className="px-4 py-3">
                  <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", STATUS_COLORS[inv.status])}>
                    {inv.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-400">{fmtDate(inv.paid_at)}</td>
                <td className="px-4 py-3 font-mono text-xs text-zinc-600 max-w-[120px] truncate" title={inv.momo_request_id ?? ""}>
                  {inv.momo_request_id ? inv.momo_request_id.slice(0, 8) + "…" : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
