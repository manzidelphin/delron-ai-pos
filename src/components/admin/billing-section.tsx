"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { CreditCard, Plus, ChevronDown, AlertTriangle, CheckCircle, XCircle, Ban } from "lucide-react";
import { cn } from "@/lib/utils";

interface BillingInfo {
  subscription_plan: string;
  subscription_status: string;
  billing_cycle: string;
  next_payment_due: string | null;
  last_payment_date: string | null;
  monthly_amount: number;
}

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  notes: string | null;
  created_at: string;
}

interface Props {
  businessId: string;
  initialBilling: BillingInfo;
  payments: Payment[];
}

const PLAN_COLORS: Record<string, string> = {
  trial: "bg-zinc-700/60 text-zinc-300",
  starter: "bg-blue-500/20 text-blue-300",
  professional: "bg-violet-500/20 text-violet-300",
  enterprise: "bg-amber-500/20 text-amber-300",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/20 text-green-300",
  overdue: "bg-amber-500/20 text-amber-300",
  suspended: "bg-red-500/20 text-red-400",
  cancelled: "bg-zinc-700/60 text-zinc-500",
};

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  momo: "MTN MoMo",
  airtel: "Airtel Money",
  bank: "Bank Transfer",
};

function fmtRwf(n: number) {
  return `RWF ${n.toLocaleString()}`;
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  try { return format(parseISO(d), "dd MMM yyyy"); } catch { return d; }
}

function isDueSoon(d: string | null): boolean {
  if (!d) return false;
  const diff = (new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return diff <= 7 && diff >= 0;
}

function isOverdue(d: string | null): boolean {
  if (!d) return false;
  return new Date(d) < new Date();
}

export default function BillingSection({ businessId, initialBilling, payments: initialPayments }: Props) {
  const router = useRouter();
  const [billing, setBilling] = useState(initialBilling);
  const [payments, setPayments] = useState(initialPayments);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Payment form state
  const today = format(new Date(), "yyyy-MM-dd");
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(today);
  const [payMethod, setPayMethod] = useState("momo");
  const [payNotes, setPayNotes] = useState("");

  // Plan form state
  const [newPlan, setNewPlan] = useState(billing.subscription_plan);
  const [newCycle, setNewCycle] = useState(billing.billing_cycle);
  const [newAmount, setNewAmount] = useState(String(billing.monthly_amount));

  async function patchBilling(fields: Partial<BillingInfo>) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/businesses/${businessId}/billing`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setBilling((b) => ({ ...b, ...data }));
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function recordPayment(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/businesses/${businessId}/billing/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseInt(payAmount, 10),
          payment_date: payDate,
          payment_method: payMethod,
          notes: payNotes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }

      // Optimistically update billing dates and status
      setBilling((b) => ({
        ...b,
        last_payment_date: payDate,
        next_payment_due: data.next_payment_due,
        subscription_status: b.subscription_status === "overdue" ? "active" : b.subscription_status,
      }));

      // Refresh payment list from server
      const paymentsRes = await fetch(`/api/admin/businesses/${businessId}/billing/payments`);
      if (paymentsRes.ok) setPayments(await paymentsRes.json());

      setShowPaymentForm(false);
      setPayAmount("");
      setPayNotes("");
      setPayDate(today);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function savePlan(e: React.FormEvent) {
    e.preventDefault();
    await patchBilling({
      subscription_plan: newPlan as BillingInfo["subscription_plan"],
      billing_cycle: newCycle as BillingInfo["billing_cycle"],
      monthly_amount: parseInt(newAmount, 10) || 0,
    });
    setShowPlanForm(false);
  }

  const nextDueSoon = isDueSoon(billing.next_payment_due);
  const nextDueOver = isOverdue(billing.next_payment_due);

  return (
    <div className="space-y-6">
      <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
        <CreditCard className="w-4 h-4" />
        Billing
      </h2>

      {/* Current billing info */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Plan</p>
            <span className={cn("px-2.5 py-1 rounded-lg text-xs font-semibold", PLAN_COLORS[billing.subscription_plan] ?? "bg-zinc-700 text-zinc-300")}>
              {billing.subscription_plan}
            </span>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Status</p>
            <span className={cn("px-2.5 py-1 rounded-lg text-xs font-semibold", STATUS_COLORS[billing.subscription_status] ?? "bg-zinc-700 text-zinc-300")}>
              {billing.subscription_status}
            </span>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Cycle</p>
            <p className="text-sm font-medium text-white capitalize">{billing.billing_cycle}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Monthly Fee</p>
            <p className="text-sm font-medium text-white">{fmtRwf(billing.monthly_amount)}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Last Payment</p>
            <p className="text-sm font-medium text-white">{fmtDate(billing.last_payment_date)}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Next Due</p>
            <p className={cn("text-sm font-medium",
              nextDueOver ? "text-red-400" : nextDueSoon ? "text-amber-300" : "text-white"
            )}>
              {fmtDate(billing.next_payment_due)}
              {nextDueSoon && !nextDueOver && <span className="ml-1 text-xs text-amber-400">(soon)</span>}
              {nextDueOver && <span className="ml-1 text-xs text-red-400">(overdue)</span>}
            </p>
          </div>
        </div>

        {error && <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-800">
          <button
            onClick={() => { setShowPaymentForm(!showPaymentForm); setShowPlanForm(false); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Record Payment
          </button>
          <button
            onClick={() => { setShowPlanForm(!showPlanForm); setShowPaymentForm(false); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-xs font-medium transition-colors"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            Change Plan
          </button>

          <div className="flex-1" />

          {billing.subscription_status === "active" && (
            <button
              disabled={saving}
              onClick={() => patchBilling({ subscription_status: "overdue" })}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Mark Overdue
            </button>
          )}
          {billing.subscription_status !== "active" && billing.subscription_status !== "cancelled" && (
            <button
              disabled={saving}
              onClick={() => patchBilling({ subscription_status: "active" })}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Reactivate
            </button>
          )}
          {billing.subscription_status !== "suspended" && (
            <button
              disabled={saving}
              onClick={() => patchBilling({ subscription_status: "suspended" })}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              <XCircle className="w-3.5 h-3.5" />
              Suspend
            </button>
          )}
          {billing.subscription_status !== "cancelled" && (
            <button
              disabled={saving}
              onClick={() => { if (confirm("Cancel this subscription? This cannot be undone easily.")) patchBilling({ subscription_status: "cancelled" }); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-700/60 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-300 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              <Ban className="w-3.5 h-3.5" />
              Cancel
            </button>
          )}
        </div>

        {/* Record Payment inline form */}
        {showPaymentForm && (
          <form onSubmit={recordPayment} className="border-t border-zinc-800 pt-4 space-y-3">
            <p className="text-sm font-semibold text-white">Record Payment</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Amount (RWF)</label>
                <input
                  type="number" required min="1"
                  value={payAmount} onChange={(e) => setPayAmount(e.target.value)}
                  placeholder={String(billing.monthly_amount || 0)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Payment Date</label>
                <input
                  type="date" required
                  value={payDate} onChange={(e) => setPayDate(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Payment Method</label>
                <select
                  value={payMethod} onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-violet-500"
                >
                  {Object.entries(METHOD_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={payNotes} onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. June payment"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                {saving ? "Saving…" : "Save Payment"}
              </button>
              <button type="button" onClick={() => setShowPaymentForm(false)}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm font-medium transition-colors">
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Change Plan inline form */}
        {showPlanForm && (
          <form onSubmit={savePlan} className="border-t border-zinc-800 pt-4 space-y-3">
            <p className="text-sm font-semibold text-white">Change Plan</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Plan</label>
                <select
                  value={newPlan} onChange={(e) => setNewPlan(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-violet-500"
                >
                  {["trial", "starter", "professional", "enterprise"].map((p) => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Billing Cycle</label>
                <select
                  value={newCycle} onChange={(e) => setNewCycle(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-violet-500"
                >
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Monthly Fee (RWF)</label>
                <input
                  type="number" min="0"
                  value={newAmount} onChange={(e) => setNewAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                {saving ? "Saving…" : "Save Plan"}
              </button>
              <button type="button" onClick={() => setShowPlanForm(false)}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm font-medium transition-colors">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Payment history */}
      <div>
        <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-3">
          Payment History ({payments.length})
        </p>
        {payments.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-6 text-center text-zinc-600 text-sm">
            No payments recorded yet.
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">Date</th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">Amount</th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">Method</th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-zinc-800/60 last:border-0">
                    <td className="px-4 py-3 text-white">{fmtDate(p.payment_date)}</td>
                    <td className="px-4 py-3 font-semibold text-green-300">{fmtRwf(p.amount)}</td>
                    <td className="px-4 py-3 text-zinc-400">{METHOD_LABELS[p.payment_method] ?? p.payment_method}</td>
                    <td className="px-4 py-3 text-zinc-500">{p.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
