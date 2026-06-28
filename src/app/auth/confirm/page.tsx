"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, Loader2, Mail, XCircle, Zap } from "lucide-react";
import type { EmailOtpType } from "@supabase/supabase-js";

type State = "idle" | "loading" | "success" | "expired" | "failed";

function ConfirmContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const [state, setState] = useState<State>("idle");

  const tokenHash = searchParams.get("token_hash");
  const type      = (searchParams.get("type") ?? "signup") as EmailOtpType;

  // Missing params means the link was malformed
  if (!tokenHash) {
    return (
      <Shell>
        <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">Invalid link</h1>
        <p className="text-slate-400 text-sm mb-6">
          This confirmation link is missing required parameters. Please try signing up again.
        </p>
        <Btn onClick={() => router.push("/onboarding")}>Back to signup</Btn>
      </Shell>
    );
  }

  const handleConfirm = async () => {
    setState("loading");
    try {
      const { error } = await createClient().auth.verifyOtp({ token_hash: tokenHash, type });
      if (!error) {
        setState("success");
        // Full-page navigation so the middleware sees the new session cookies.
        setTimeout(() => { window.location.href = "/dashboard"; }, 800);
      } else if (
        error.message.toLowerCase().includes("expired") ||
        error.message.toLowerCase().includes("invalid") ||
        error.message.toLowerCase().includes("already")
      ) {
        setState("expired");
      } else {
        console.error("[auth/confirm] verifyOtp error:", error.message);
        setState("failed");
      }
    } catch (e) {
      console.error("[auth/confirm] unexpected:", e);
      setState("failed");
    }
  };

  if (state === "success") {
    return (
      <Shell>
        <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">Email confirmed!</h1>
        <p className="text-slate-400 text-sm mb-4">Taking you to your dashboard…</p>
        <Loader2 className="w-5 h-5 text-blue-400 animate-spin mx-auto" />
      </Shell>
    );
  }

  if (state === "expired") {
    return (
      <Shell>
        <XCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">Link already used</h1>
        <p className="text-slate-400 text-sm mb-6">
          This link has already been used or has expired. If you verified your email earlier,
          just log in. Otherwise, request a new link.
        </p>
        <div className="space-y-3">
          <Btn onClick={() => router.push("/login")}>Log in now</Btn>
          <BtnOutline onClick={() => router.push("/verify-email")}>Resend verification email</BtnOutline>
        </div>
      </Shell>
    );
  }

  if (state === "failed") {
    return (
      <Shell>
        <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">Verification failed</h1>
        <p className="text-slate-400 text-sm mb-6">Something went wrong. Please try again or request a new link.</p>
        <div className="space-y-3">
          <Btn onClick={() => setState("idle")}>Try again</Btn>
          <BtnOutline onClick={() => router.push("/verify-email")}>Request new link</BtnOutline>
        </div>
      </Shell>
    );
  }

  // idle or loading — render the confirm button (never auto-triggers on GET)
  return (
    <Shell>
      <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto border-2 border-blue-500/30 mb-4">
        <Mail className="w-8 h-8 text-blue-400" />
      </div>
      <h1 className="text-xl font-bold text-white mb-2">Confirm your email</h1>
      <p className="text-slate-400 text-sm mb-6">
        Click the button below to verify your email address and activate your DELRON AI POS account.
      </p>
      <Btn onClick={handleConfirm} disabled={state === "loading"}>
        {state === "loading"
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Confirming…</>
          : "Confirm my email address"}
      </Btn>
    </Shell>
  );
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-3xl" />
      </div>
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" fill="white" />
            </div>
            <span className="text-xl font-bold text-white">DELRON AI POS</span>
          </div>
        </div>
        <div className="bg-[#1E293B]/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 shadow-2xl text-center">
          {children}
        </div>
      </div>
    </div>
  );
}

function Btn({
  onClick, disabled = false, children,
}: {
  onClick: () => void; disabled?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full h-11 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
    >
      {children}
    </button>
  );
}

function BtnOutline({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="w-full h-11 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 rounded-xl transition-all"
    >
      {children}
    </button>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense>
      <ConfirmContent />
    </Suspense>
  );
}
