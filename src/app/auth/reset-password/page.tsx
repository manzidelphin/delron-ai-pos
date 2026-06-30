"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, Eye, EyeOff, Loader2, KeyRound, XCircle, Zap } from "lucide-react";

type State = "idle" | "loading" | "set-password" | "updating" | "success" | "expired" | "failed";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const [state, setState]           = useState<State>("idle");
  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew]                 = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [pwError, setPwError]                 = useState("");

  const tokenHash = searchParams.get("token_hash");

  if (!tokenHash) {
    return (
      <Shell>
        <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">Invalid link</h1>
        <p className="text-slate-400 text-sm mb-6">
          This password reset link is missing required parameters. Go back to the login page and request a new one.
        </p>
        <Btn onClick={() => router.push("/login")}>Back to login</Btn>
      </Shell>
    );
  }

  const handleConfirm = async () => {
    setState("loading");
    try {
      const { error } = await createClient().auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
      if (!error) {
        setState("set-password");
      } else if (
        error.message.toLowerCase().includes("expired") ||
        error.message.toLowerCase().includes("invalid") ||
        error.message.toLowerCase().includes("already")
      ) {
        setState("expired");
      } else {
        console.error("[auth/reset-password] verifyOtp error:", error.message);
        setState("failed");
      }
    } catch (e) {
      console.error("[auth/reset-password] unexpected:", e);
      setState("failed");
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    if (!newPassword) { setPwError("Enter a new password"); return; }
    if (newPassword.length < 8) { setPwError("Password must be at least 8 characters"); return; }
    if (newPassword !== confirmPassword) { setPwError("Passwords do not match"); return; }

    setState("updating");
    try {
      const { error } = await createClient().auth.updateUser({ password: newPassword });
      if (error) {
        setState("set-password");
        setPwError(error.message);
        return;
      }
      setState("success");
      // Full-page navigation so middleware sees committed session cookies.
      setTimeout(() => { window.location.href = "/dashboard"; }, 800);
    } catch (e) {
      console.error("[auth/reset-password] updateUser unexpected:", e);
      setState("set-password");
      setPwError("Something went wrong. Please try again.");
    }
  };

  if (state === "success") {
    return (
      <Shell>
        <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">Password updated!</h1>
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
          This reset link has already been used or has expired. Go back to the login page and click
          &ldquo;Forgot password?&rdquo; to request a new one.
        </p>
        <Btn onClick={() => router.push("/login")}>Back to login</Btn>
      </Shell>
    );
  }

  if (state === "failed") {
    return (
      <Shell>
        <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">Verification failed</h1>
        <p className="text-slate-400 text-sm mb-6">
          Something went wrong verifying your reset link. Please try again or request a new link.
        </p>
        <div className="space-y-3">
          <Btn onClick={() => setState("idle")}>Try again</Btn>
          <BtnOutline onClick={() => router.push("/login")}>Back to login</BtnOutline>
        </div>
      </Shell>
    );
  }

  if (state === "set-password" || state === "updating") {
    return (
      <Shell>
        <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto border-2 border-blue-500/30 mb-4">
          <KeyRound className="w-8 h-8 text-blue-400" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Set a new password</h1>
        <p className="text-slate-400 text-sm mb-6">Choose a strong password of at least 8 characters.</p>
        <form onSubmit={handleSetPassword} className="space-y-4 text-left">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">New password</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                disabled={state === "updating"}
                className="w-full h-11 px-4 pr-12 bg-[#0F172A] border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowNew(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Confirm password</label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                disabled={state === "updating"}
                className="w-full h-11 px-4 pr-12 bg-[#0F172A] border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {pwError && <p className="text-sm text-red-400">{pwError}</p>}
          <Btn onClick={() => {}} disabled={state === "updating"}>
            {state === "updating"
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              : "Save new password"}
          </Btn>
        </form>
      </Shell>
    );
  }

  // idle or loading — click-to-verify, never auto-triggers on GET
  return (
    <Shell>
      <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto border-2 border-blue-500/30 mb-4">
        <KeyRound className="w-8 h-8 text-blue-400" />
      </div>
      <h1 className="text-xl font-bold text-white mb-2">Reset your password</h1>
      <p className="text-slate-400 text-sm mb-6">
        Click the button below to verify your reset link and set a new password for your DELRON AI POS account.
      </p>
      <Btn onClick={handleConfirm} disabled={state === "loading"}>
        {state === "loading"
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</>
          : "Reset my password"}
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

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  );
}
