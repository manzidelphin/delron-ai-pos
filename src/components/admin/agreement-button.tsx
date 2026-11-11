"use client";

import { useState } from "react";
import { FileSignature, Loader2 } from "lucide-react";
import { toast } from "sonner";

/** Admin: download the business's signed Terms of Service agreement as a PDF. */
export default function AgreementButton({ businessId, businessName }: { businessId: string; businessName: string }) {
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/businesses/${businessId}/agreement`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load the agreement");
      const { buildAgreementPdf } = await import("@/lib/agreement-pdf");
      const doc = await buildAgreementPdf(data);
      const safe = businessName.replace(/[^\w\- ]+/g, "").trim() || "business";
      doc.save(`Agreement - ${safe}.pdf`);
      if (!data.acceptance) toast.warning("No signed acceptance on record yet: the PDF says “Not yet signed”.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not create the PDF");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={download}
      disabled={busy}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-100 text-sm font-medium transition-colors disabled:opacity-50"
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSignature className="w-4 h-4" />}
      Download agreement (PDF)
    </button>
  );
}
