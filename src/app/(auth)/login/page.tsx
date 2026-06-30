"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Shield, Zap } from "lucide-react";

type Step = "credentials" | "otp";

export default function LoginPage() {
  const router = useRouter();

  // Credentials step
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]       = useState(false);

  // Forgot password
  const [resetLoading, setResetLoading] = useState(false);

  // OTP step
  const [step, setStep]               = useState<Step>("credentials");
  const [otpDigits, setOtpDigits]     = useState(["", "", "", "", "", ""]);
  const [otpLoading, setOtpLoading]   = useState(false);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [cooldown, setCooldown]       = useState(0);
  const inputRefs                     = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.toLowerCase().includes("email not confirmed")) {
          router.push(`/verify-email?email=${encodeURIComponent(email)}`);
          return;
        }
        toast.error(error.message);
        return;
      }

      // Check if 2FA is enabled for this account
      const checkRes = await fetch("/api/auth/2fa/check");
      const check    = await checkRes.json() as { enabled: boolean; masked_email?: string };

      if (!check.enabled) {
        // Full-page navigation ensures Supabase session cookie is fully committed
        window.location.href = "/dashboard";
        return;
      }

      // 2FA enabled — send OTP and show verification screen
      const sendRes = await fetch("/api/auth/2fa/send", { method: "POST" });
      if (!sendRes.ok) {
        toast.error("Failed to send verification code. Please try again.");
        await supabase.auth.signOut();
        return;
      }
      const sent = await sendRes.json() as { masked_email: string };
      setMaskedEmail(sent.masked_email);
      setStep("otp");
      setCooldown(30);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpInput = (idx: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next  = [...otpDigits];
    next[idx]   = digit;
    setOtpDigits(next);
    if (digit && idx < 5) inputRefs.current[idx + 1]?.focus();
    if (digit && idx === 5 && next.every(d => d)) verifyOTP(next.join(""));
  };

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otpDigits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const verifyOTP = async (code?: string) => {
    const otp = code ?? otpDigits.join("");
    if (otp.length !== 6) { toast.error("Enter all 6 digits"); return; }
    setOtpLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: otp }),
      });
      if (!res.ok) {
        const data = await res.json() as { error: string };
        toast.error(data.error ?? "Invalid code");
        setOtpDigits(["", "", "", "", "", ""]);
        setTimeout(() => inputRefs.current[0]?.focus(), 50);
        return;
      }
      toast.success("Verified! Welcome back.");
      window.location.href = "/dashboard";
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const resendOTP = async () => {
    if (cooldown > 0) return;
    const res = await fetch("/api/auth/2fa/send", { method: "POST" });
    if (res.ok) {
      setCooldown(30);
      setOtpDigits(["", "", "", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
      toast.success("New code sent");
    } else {
      toast.error("Failed to resend. Try again shortly.");
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast.error("Enter your email address first");
      return;
    }
    setResetLoading(true);
    try {
      const { error } = await createClient().auth.resetPasswordForEmail(email.trim());
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Check your email for a password reset link");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setResetLoading(false);
    }
  };

  const goBack = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setStep("credentials");
    setOtpDigits(["", "", "", "", "", ""]);
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" fill="white" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">DELRON</span>
          </div>
          <p className="text-slate-400 text-sm">Rwanda&apos;s AI-powered business platform</p>
        </div>

        <div className="bg-[#1E293B]/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
          {step === "credentials" ? (
            <>
              <h1 className="text-xl font-semibold text-white mb-1">Sign in to your account</h1>
              <p className="text-slate-400 text-sm mb-6">Enter your credentials to access your dashboard</p>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-300">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@business.com"
                    required
                    className="w-full h-11 px-4 bg-[#0F172A] border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-300">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full h-11 px-4 pr-12 bg-[#0F172A] border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button type="button" onClick={handleForgotPassword} disabled={resetLoading} className="text-sm text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50">
                    {resetLoading ? "Sending..." : "Forgot password?"}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white font-semibold rounded-xl transition-all duration-150 flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  {isLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Signing in...</>
                  ) : "Sign in"}
                </button>
              </form>

              <p className="text-center text-sm text-slate-400 mt-6">
                New business?{" "}
                <button onClick={() => router.push("/onboarding")} className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                  Create your account
                </button>
              </p>
              <div className="text-center mt-3">
                <button type="button" onClick={() => router.push("/pos-login")} className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
                  Staff PIN Login →
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6 text-blue-400" />
                </div>
                <h1 className="text-xl font-semibold text-white mb-1">Check your email</h1>
                <p className="text-slate-400 text-sm">
                  We sent a 6-digit code to{" "}
                  <span className="text-white font-medium">{maskedEmail}</span>
                </p>
              </div>

              <div className="flex gap-2 justify-center">
                {otpDigits.map((d, i) => (
                  <input
                    key={i}
                    ref={el => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={e => handleOtpInput(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    className="w-11 h-14 text-center text-xl font-bold bg-[#0F172A] border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                ))}
              </div>

              <button
                onClick={() => verifyOTP()}
                disabled={otpLoading || otpDigits.some(d => !d)}
                className="w-full h-11 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white font-semibold rounded-xl transition-all duration-150 flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {otpLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Verifying...</> : "Verify Code"}
              </button>

              <div className="text-center space-y-2">
                <p className="text-slate-400 text-sm">
                  Didn&apos;t receive it?{" "}
                  <button
                    onClick={resendOTP}
                    disabled={cooldown > 0}
                    className="text-blue-400 hover:text-blue-300 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                  </button>
                </p>
                <button onClick={goBack} className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
                  ← Back to login
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">© 2026 DELRON AI POS · Built for Rwanda</p>
      </div>
    </div>
  );
}
