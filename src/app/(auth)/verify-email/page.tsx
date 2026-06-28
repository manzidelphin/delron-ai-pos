"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Mail, Zap, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [resent, setResent]     = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
      return;
    }
    // Fallback: pull from live Supabase session
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user?.email_confirmed_at) {
        // Already verified — send to dashboard
        router.replace("/dashboard");
        return;
      }
      if (user?.email) setEmail(user.email);
    });
  }, [searchParams, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || isSending || !email) return;
    setIsSending(true);
    try {
      const { error } = await createClient().auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        toast.error(error.message);
      } else {
        setResent(true);
        setCooldown(60);
        toast.success("Verification email sent!");
      }
    } catch {
      toast.error("Failed to resend. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

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

        <div className="bg-[#1E293B]/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 shadow-2xl text-center space-y-5">
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto border-2 border-blue-500/30">
            <Mail className="w-8 h-8 text-blue-400" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Check your inbox</h1>
            <p className="text-slate-400 text-sm">We sent a verification link to:</p>
            {email && (
              <p className="mt-2 text-white font-semibold text-sm bg-slate-800/60 rounded-lg px-4 py-2 inline-block">
                {email}
              </p>
            )}
          </div>

          <p className="text-slate-400 text-sm">
            Click the link in that email to confirm your account and access your dashboard.
            Didn&apos;t get it? Check your spam folder, then try resending below.
          </p>

          {resent && (
            <div className="flex items-center justify-center gap-2 text-green-400 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>Verification email resent</span>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleResend}
              disabled={cooldown > 0 || isSending || !email}
              className="w-full h-11 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/30 disabled:text-blue-300 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {isSending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
              ) : cooldown > 0 ? (
                `Resend in ${cooldown}s`
              ) : (
                "Resend verification email"
              )}
            </button>

            <button
              onClick={() => router.push("/login")}
              className="w-full h-11 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back to login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
