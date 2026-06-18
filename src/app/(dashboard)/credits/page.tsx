"use client";

import { useState, useEffect, useCallback } from "react";
import { formatRWF, formatDate } from "@/lib/utils";
import { CreditModal } from "@/components/supermarket/credit-modal";
import type { CreditDetails } from "@/components/supermarket/credit-modal";
import {
  CreditCard,
  AlertTriangle,
  Clock,
  CheckCircle,
  Search,
  Send,
  Plus,
  ChevronRight,
  Loader2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import type { Credit, CreditStatus } from "@/types";

interface DashboardStats {
  total_outstanding: number;
  overdue_count: number;
  overdue_amount: number;
  due_today_count: number;
  due_today_amount: number;
  paid_this_month_count: number;
  paid_this_month_amount: number;
}

interface PartialPaymentModal {
  credit: Credit;
}

function StatusBadge({ status }: { status: CreditStatus }) {
  const map: Record<CreditStatus, { label: string; className: string }> = {
    overdue: { label: "Overdue", className: "bg-red-500/10 text-red-400 border-red-500/20" },
    unpaid: { label: "Upcoming", className: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
    partial: { label: "Partial", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    paid: { label: "Paid", className: "bg-green-500/10 text-green-400 border-green-500/20" },
  };
  const { label, className } = map[status] ?? map.unpaid;
  return (
    <span className={cn("px-2 py-0.5 rounded-full border text-xs font-medium", className)}>
      {label}
    </span>
  );
}

export default function CreditsPage() {
  const router = useRouter();
  const { staff, activeOperator } = useAuthStore();
  // Bartenders can add credits but cannot mark them paid or send reminders
  const effectiveRole = activeOperator?.role ?? staff?.role;
  const isBartender = effectiveRole === "bartender";

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddCredit, setShowAddCredit] = useState(false);
  const [partialModal, setPartialModal] = useState<PartialPaymentModal | null>(null);
  const [partialAmount, setPartialAmount] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [bulkSending, setBulkSending] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, creditsRes] = await Promise.all([
        fetch("/api/credits/dashboard"),
        fetch(`/api/credits?status=${statusFilter}&limit=100`),
      ]);
      const statsData = await statsRes.json();
      const creditsData = await creditsRes.json();
      setStats(statsData);
      setCredits(creditsData.credits ?? []);
    } catch {
      toast.error("Failed to load credits");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = credits.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.customer_name.toLowerCase().includes(q) ||
      c.customer_phone.toLowerCase().includes(q)
    );
  });

  const handleMarkPaid = async (credit: Credit) => {
    setActionLoading(credit.id);
    try {
      const res = await fetch(`/api/credits/${credit.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_paid: credit.balance }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${credit.customer_name} marked as paid`);
      fetchData();
    } catch {
      toast.error("Failed to mark as paid");
    } finally {
      setActionLoading(null);
    }
  };

  const handlePartialPay = async () => {
    if (!partialModal) return;
    const amount = parseFloat(partialAmount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (amount > partialModal.credit.balance) {
      toast.error("Amount exceeds balance");
      return;
    }
    setActionLoading(partialModal.credit.id);
    try {
      const res = await fetch(`/api/credits/${partialModal.credit.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_paid: amount }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Payment of ${formatRWF(amount)} recorded`);
      setPartialModal(null);
      setPartialAmount("");
      fetchData();
    } catch {
      toast.error("Failed to record payment");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemind = async (credit: Credit) => {
    setActionLoading(`remind-${credit.id}`);
    try {
      const res = await fetch(`/api/credits/${credit.id}/remind`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Reminder sent to ${credit.customer_name}`);
      } else {
        toast.error("SMS failed to send");
      }
    } catch {
      toast.error("Failed to send reminder");
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkRemind = async () => {
    setBulkSending(true);
    try {
      const res = await fetch("/api/credits/remind-all", { method: "POST" });
      const data = await res.json();
      toast.success(`Sent ${data.sent} reminders to overdue customers`);
    } catch {
      toast.error("Failed to send bulk reminders");
    } finally {
      setBulkSending(false);
    }
  };

  const handleAddCredit = async (details: CreditDetails) => {
    const res = await fetch("/api/credits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_name: details.customer_name,
        customer_phone: details.customer_phone,
        due_date: details.due_date,
        notes: details.notes,
        total_amount: 0,
        items_description: "Manual credit",
      }),
    });
    if (!res.ok) throw new Error("Failed to create credit");
    toast.success("Credit recorded");
    setShowAddCredit(false);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Credits & Debts</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Track customer credit sales and collect payments
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isBartender && (stats?.overdue_count ?? 0) > 0 && (
            <button
              onClick={handleBulkRemind}
              disabled={bulkSending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all text-sm font-medium disabled:opacity-50"
            >
              {bulkSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Remind All Overdue
            </button>
          )}
          <button
            onClick={() => setShowAddCredit(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Credit
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center mb-3">
            <CreditCard className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-foreground">
            {formatRWF(stats?.total_outstanding ?? 0)}
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">Total Outstanding</p>
        </div>

        <div className="bg-card border border-red-500/30 rounded-xl p-5">
          <div className="w-10 h-10 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-center mb-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-red-400">
            {stats?.overdue_count ?? 0}
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Overdue · {formatRWF(stats?.overdue_amount ?? 0)}
          </p>
        </div>

        <div className="bg-card border border-amber-500/30 rounded-xl p-5">
          <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center justify-center mb-3">
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400">
            {stats?.due_today_count ?? 0}
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Due Today · {formatRWF(stats?.due_today_amount ?? 0)}
          </p>
        </div>

        <div className="bg-card border border-green-500/30 rounded-xl p-5">
          <div className="w-10 h-10 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center justify-center mb-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-green-400">
            {stats?.paid_this_month_count ?? 0}
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Paid This Month · {formatRWF(stats?.paid_this_month_amount ?? 0)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone..."
            className="w-full h-10 pl-9 pr-4 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          {["all", "unpaid", "partial", "overdue", "paid"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-3 py-2 rounded-lg text-xs font-medium capitalize transition-all border",
                statusFilter === s
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-card text-muted-foreground border-border hover:border-blue-500/50"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Customer</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Items</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">Amount</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">Paid</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">Balance</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Due Date</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground">
                    No credits found
                  </td>
                </tr>
              ) : (
                filtered.map((credit) => (
                  <tr key={credit.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{credit.customer_name}</div>
                      <div className="text-xs text-muted-foreground">{credit.customer_phone}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[180px]">
                      <span className="truncate block text-xs">
                        {credit.items_description || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-foreground">
                      {formatRWF(credit.total_amount)}
                    </td>
                    <td className="px-4 py-3 text-right text-green-400">
                      {formatRWF(credit.amount_paid)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-foreground">
                      {formatRWF(credit.balance)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {formatDate(credit.due_date)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={credit.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {!isBartender && credit.status !== "paid" && (
                          <>
                            <button
                              onClick={() => handleMarkPaid(credit)}
                              disabled={actionLoading === credit.id}
                              title="Mark as Fully Paid"
                              className="px-2 py-1 text-xs rounded-md bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all font-medium disabled:opacity-50"
                            >
                              {actionLoading === credit.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                "Paid"
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setPartialModal({ credit });
                                setPartialAmount("");
                              }}
                              title="Partial Payment"
                              className="px-2 py-1 text-xs rounded-md bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all font-medium"
                            >
                              Partial
                            </button>
                            <button
                              onClick={() => handleRemind(credit)}
                              disabled={actionLoading === `remind-${credit.id}`}
                              title="Send SMS Reminder"
                              className="p-1.5 rounded-md bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all disabled:opacity-50"
                            >
                              {actionLoading === `remind-${credit.id}` ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Send className="w-3 h-3" />
                              )}
                            </button>
                          </>
                        )}
                        <button
                          onClick={() =>
                            router.push(
                              `/credits/${encodeURIComponent(credit.customer_phone)}`
                            )
                          }
                          title="View History"
                          className="p-1.5 rounded-md bg-slate-500/10 text-muted-foreground hover:text-foreground hover:bg-slate-500/20 transition-all"
                        >
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Partial Payment Modal */}
      {partialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-slate-700">
              <h2 className="text-lg font-bold text-white">Partial Payment</h2>
              <button
                onClick={() => setPartialModal(null)}
                className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-400 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-slate-900 rounded-xl p-4">
                <p className="text-sm text-slate-400">Customer</p>
                <p className="font-bold text-white">{partialModal.credit.customer_name}</p>
                <p className="text-slate-400 text-xs mt-1">
                  Balance: {formatRWF(partialModal.credit.balance)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-1.5">
                  Amount Paid (RWF)
                </label>
                <input
                  type="number"
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                  placeholder="Enter amount..."
                  autoFocus
                  className="w-full h-11 px-4 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handlePartialPay}
                disabled={!!actionLoading}
                className="w-full h-12 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Record Payment"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Credit Modal */}
      {showAddCredit && (
        <CreditModal
          total={0}
          itemsDescription="Manual credit entry"
          onConfirm={handleAddCredit}
          onClose={() => setShowAddCredit(false)}
        />
      )}
    </div>
  );
}
