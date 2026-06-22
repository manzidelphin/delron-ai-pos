"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";

export default function ImpersonateButton({ businessId, businessName }: { businessId: string; businessName: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleImpersonate = async () => {
    if (!confirm(`Enter impersonation mode for "${businessName}"?\n\nThis will be logged in the audit trail.`)) return;

    setLoading(true);
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_id: businessId }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(`Failed to start impersonation: ${data.error}`);
        return;
      }

      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleImpersonate}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
    >
      <LogIn className="w-4 h-4" />
      {loading ? "Starting session…" : "Login as this business"}
    </button>
  );
}
