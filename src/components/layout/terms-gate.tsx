"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileSignature, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";

/**
 * One-time screen asking the business owner to accept the current Terms of
 * Service and Privacy Policy, when no signed acceptance is on record (businesses
 * created before acceptances were saved, or after the Terms change).
 * Owners only; staff and impersonating admins never see it.
 */
export function TermsGate() {
  const { business, effectiveRole } = useAuthStore();
  const isOwner = effectiveRole() === "owner";
  const [needed, setNeeded] = useState(false);
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOwner || !business?.id) return;
    let cancelled = false;
    fetch("/api/agreement")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (!cancelled && j?.needs_acceptance) setNeeded(true); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isOwner, business?.id]);

  if (!needed) return null;

  const accept = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/agreement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accept: true }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Could not save");
      toast.success("Thank you. Your agreement is saved.");
      setNeeded(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="glass-card rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-500/15 flex items-center justify-center">
            <FileSignature className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Please accept our Terms</h2>
            <p className="text-xs text-muted-foreground">{business?.name}</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          To keep using DELRON AI POS, please read and accept our Terms of Service and
          Privacy Policy. Your acceptance is saved as your business&apos;s signed agreement.
        </p>
        <label className="flex items-start gap-3 text-sm text-foreground cursor-pointer select-none">
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-0.5 w-4 h-4 accent-blue-600" />
          <span>
            I have read and agree to the{" "}
            <Link href="/terms" target="_blank" className="text-blue-400 underline">Terms of Service</Link> and{" "}
            <Link href="/privacy" target="_blank" className="text-blue-400 underline">Privacy Policy</Link>{" "}
            on behalf of <b>{business?.name}</b>.
          </span>
        </label>
        <button
          onClick={accept}
          disabled={!checked || saving}
          className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} Accept and continue
        </button>
      </div>
    </div>
  );
}
