"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import BillingSection from "./billing-section";
import InvoicesTable, { type InvoiceRow } from "./invoices-table";

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
  invoices: InvoiceRow[];
}

type Tab = "billing" | "invoices";

const TABS: { key: Tab; label: (inv: number) => string }[] = [
  { key: "billing",  label: () => "Billing" },
  { key: "invoices", label: (n) => `Invoices (${n})` },
];

export default function BillingTabs({ businessId, initialBilling, payments, invoices }: Props) {
  const [tab, setTab] = useState<Tab>("billing");

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 bg-zinc-800/60 border border-zinc-700 rounded-lg p-0.5 w-fit mb-6">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
              tab === key
                ? "bg-violet-600 text-white shadow"
                : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            {label(invoices.length)}
          </button>
        ))}
      </div>

      {tab === "billing" && (
        <BillingSection
          businessId={businessId}
          initialBilling={initialBilling}
          payments={payments}
        />
      )}
      {tab === "invoices" && (
        <InvoicesTable invoices={invoices} />
      )}
    </div>
  );
}
