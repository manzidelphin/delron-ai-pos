"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatRWF, formatDate, formatDateTime } from "@/lib/utils";
import { ArrowLeft, CreditCard, CheckCircle, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Credit } from "@/types";

export default function CustomerCreditHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = decodeURIComponent(params.customerId as string);

  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/credits?limit=100`);
        const data = await res.json();
        const all: Credit[] = data.credits ?? [];
        // Filter by phone number (customerId is phone)
        const customerCredits = all.filter(
          (c) => c.customer_phone === customerId || c.customer_name === customerId
        );
        setCredits(customerCredits);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [customerId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  const customerName = credits[0]?.customer_name ?? customerId;
  const customerPhone = credits[0]?.customer_phone ?? customerId;
  const totalBorrowed = credits.reduce((sum, c) => sum + c.total_amount, 0);
  const totalPaid = credits.reduce((sum, c) => sum + c.amount_paid, 0);
  const totalOutstanding = credits.reduce(
    (sum, c) => sum + (c.status !== "paid" ? c.balance : 0),
    0
  );

  const sorted = [...credits].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Credits
      </button>

      {/* Customer Summary */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-bold text-blue-400">
              {customerName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">{customerName}</h1>
            <p className="text-muted-foreground text-sm">{customerPhone}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {credits.length} credit {credits.length === 1 ? "record" : "records"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Total Borrowed
            </p>
            <p className="text-xl font-bold text-foreground">{formatRWF(totalBorrowed)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Total Paid
            </p>
            <p className="text-xl font-bold text-green-400">{formatRWF(totalPaid)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Outstanding
            </p>
            <p
              className={cn(
                "text-xl font-bold",
                totalOutstanding > 0 ? "text-red-400" : "text-green-400"
              )}
            >
              {formatRWF(totalOutstanding)}
            </p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          Credit History
        </h2>

        {sorted.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
            No credit history found for this customer
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((credit) => (
              <div
                key={credit.id}
                className="bg-card border border-border rounded-xl p-5 space-y-3"
              >
                {/* Credit header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        credit.status === "paid"
                          ? "bg-green-500/10"
                          : credit.status === "overdue"
                          ? "bg-red-500/10"
                          : "bg-amber-500/10"
                      )}
                    >
                      {credit.status === "paid" ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : credit.status === "overdue" ? (
                        <CreditCard className="w-4 h-4 text-red-400" />
                      ) : (
                        <Clock className="w-4 h-4 text-amber-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Credit — {formatRWF(credit.total_amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(credit.created_at)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full border text-xs font-medium",
                      credit.status === "paid"
                        ? "bg-green-500/10 text-green-400 border-green-500/20"
                        : credit.status === "overdue"
                        ? "bg-red-500/10 text-red-400 border-red-500/20"
                        : credit.status === "partial"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        : "bg-orange-500/10 text-orange-400 border-orange-500/20"
                    )}
                  >
                    {credit.status}
                  </span>
                </div>

                {/* Items */}
                {credit.items_description && (
                  <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
                    {credit.items_description}
                  </p>
                )}

                {/* Amounts */}
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="font-semibold text-foreground">
                      {formatRWF(credit.total_amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Paid</p>
                    <p className="font-semibold text-green-400">
                      {formatRWF(credit.amount_paid)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Balance</p>
                    <p
                      className={cn(
                        "font-semibold",
                        credit.balance > 0 ? "text-red-400" : "text-green-400"
                      )}
                    >
                      {formatRWF(credit.balance)}
                    </p>
                  </div>
                </div>

                {/* Due & Paid dates */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 border-t border-border">
                  <span>Due: {formatDate(credit.due_date)}</span>
                  {credit.paid_at && (
                    <span className="text-green-400">
                      ✓ Paid: {formatDate(credit.paid_at)}
                    </span>
                  )}
                  {credit.notes && <span className="italic">{credit.notes}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
