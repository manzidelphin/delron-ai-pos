"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Zap,
  Store,
  ChefHat,
  Beer,
  UtensilsCrossed,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Building2,
  Users,
  Globe,
} from "lucide-react";
import type { BusinessModule, OnboardingData } from "@/types";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Account" },
  { id: 2, label: "Modules" },
  { id: 3, label: "Setup" },
  { id: 4, label: "Products" },
  { id: 5, label: "Go Live" },
];

const MODULE_OPTIONS: {
  id: BusinessModule;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "supermarket",
    label: "Supermarket / Shop",
    description: "Products, barcode scanning, inventory & cashier POS",
    icon: <Store className="w-7 h-7" />,
  },
  {
    id: "bakery",
    label: "Bakery & Pastry",
    description: "Recipes, production logging, label printing & waste tracking",
    icon: <ChefHat className="w-7 h-7" />,
  },
  {
    id: "bar",
    label: "Bar",
    description: "Bottles, shots, table management & open tabs",
    icon: <Beer className="w-7 h-7" />,
  },
  {
    id: "restaurant",
    label: "Restaurant",
    description: "Menu, table ordering, kitchen display & billing",
    icon: <UtensilsCrossed className="w-7 h-7" />,
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [data, setData] = useState<OnboardingData>({
    full_name: "",
    business_name: "",
    phone: "",
    email: "",
    location: "",
    password: "",
    modules: [],
    branch_count: 1,
    staff_count: 1,
    language: "en",
    products_method: "skip",
  });

  const set = (field: keyof OnboardingData, value: string) =>
    setData((prev) => ({ ...prev, [field]: value } as OnboardingData));

  const toggleModule = (module: BusinessModule) => {
    setData((prev) => ({
      ...prev,
      modules: prev.modules.includes(module)
        ? prev.modules.filter((m) => m !== module)
        : [...prev.modules, module],
    }));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: { full_name: data.full_name },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError || !authData.user) {
        toast.error(authError?.message ?? "Failed to create account");
        return;
      }

      const res = await fetch("/api/auth/complete-onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: authData.user.id,
          full_name: data.full_name,
          business_name: data.business_name,
          phone: data.phone,
          email: data.email,
          location: data.location,
          modules: data.modules,
          language: data.language,
        }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        toast.error(error ?? "Failed to create business. Please try again.");
        return;
      }

      toast.success("Account created! Welcome to DELRON AI POS");
      setStep(5);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    if (!data.full_name.trim()) newErrors.full_name = "Full name is required";
    if (!data.business_name.trim()) newErrors.business_name = "Business name is required";
    if (!data.phone.trim()) newErrors.phone = "Phone number is required";
    if (!data.email.trim()) newErrors.email = "Email address is required";
    if (!data.password) newErrors.password = "Password is required";
    else if (data.password.length < 8) newErrors.password = "Password must be at least 8 characters";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" fill="white" />
            </div>
            <span className="text-xl font-bold text-white">DELRON AI POS</span>
          </div>
          <p className="text-slate-400 text-sm">Set up your business in 5 minutes</p>
        </div>

        {/* Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex items-center gap-1.5",
                  step === s.id && "text-blue-400",
                  step > s.id && "text-green-400",
                  step < s.id && "text-slate-600"
                )}
              >
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all",
                    step === s.id && "border-blue-500 bg-blue-500/20 text-blue-400",
                    step > s.id && "border-green-500 bg-green-500/20 text-green-400",
                    step < s.id && "border-slate-700 bg-transparent text-slate-600"
                  )}
                >
                  {step > s.id ? <CheckCircle2 className="w-4 h-4" /> : s.id}
                </div>
                <span className="text-xs hidden sm:block">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "w-8 h-px",
                    step > s.id ? "bg-green-500/50" : "bg-slate-700"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-[#1E293B]/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-white mb-1">Create your account</h2>
                <p className="text-slate-400 text-sm">You&apos;re the owner of this business</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Your full name" error={errors.full_name}>
                  <Input
                    value={data.full_name}
                    onChange={(v) => { set("full_name", v); if (errors.full_name) setErrors((e) => ({ ...e, full_name: "" })); }}
                    placeholder="Uwimana Jean"
                    hasError={!!errors.full_name}
                  />
                </Field>
                <Field label="Business name" error={errors.business_name}>
                  <Input
                    value={data.business_name}
                    onChange={(v) => { set("business_name", v); if (errors.business_name) setErrors((e) => ({ ...e, business_name: "" })); }}
                    placeholder="Kigali Supermarket"
                    hasError={!!errors.business_name}
                  />
                </Field>
                <Field label="Phone number" error={errors.phone}>
                  <Input
                    value={data.phone}
                    onChange={(v) => { set("phone", v); if (errors.phone) setErrors((e) => ({ ...e, phone: "" })); }}
                    placeholder="0781234567"
                    hasError={!!errors.phone}
                  />
                </Field>
                <Field label="Business location">
                  <Input
                    value={data.location}
                    onChange={(v) => set("location", v)}
                    placeholder="Kigali, Rwanda"
                  />
                </Field>
                <Field label="Email address" error={errors.email}>
                  <Input
                    type="email"
                    value={data.email}
                    onChange={(v) => { set("email", v); if (errors.email) setErrors((e) => ({ ...e, email: "" })); }}
                    placeholder="you@business.com"
                    hasError={!!errors.email}
                  />
                </Field>
                <Field label="Password" error={errors.password}>
                  <Input
                    type="password"
                    value={data.password}
                    onChange={(v) => { set("password", v); if (errors.password) setErrors((e) => ({ ...e, password: "" })); }}
                    placeholder="Min. 8 characters"
                    hasError={!!errors.password}
                  />
                </Field>
              </div>
              <NavButtons
                onNext={() => {
                  if (validateStep1()) setStep(2);
                }}
                showBack={false}
              />
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-white mb-1">Choose your modules</h2>
                <p className="text-slate-400 text-sm">Select everything that applies. You can add more later.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {MODULE_OPTIONS.map((mod) => {
                  const selected = data.modules.includes(mod.id);
                  return (
                    <button
                      key={mod.id}
                      onClick={() => toggleModule(mod.id)}
                      className={cn(
                        "relative p-4 rounded-xl border text-left transition-all duration-200 hover:border-blue-500/50 hover:bg-blue-500/5",
                        selected ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10" : "border-slate-700 bg-slate-800/30"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn("p-2 rounded-lg", selected ? "bg-blue-500/20 text-blue-400" : "bg-slate-700/50 text-slate-400")}>
                          {mod.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-white">{mod.label}</span>
                            {selected && <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{mod.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Always included for free</p>
                <div className="flex flex-wrap gap-2">
                  {["DELRON AI Assistant", "Credit & Debt", "Staff Management", "Reports", "SMS Alerts", "RRA/EBM Receipts", "Multi-branch"].map((f) => (
                    <span key={f} className="text-xs px-2.5 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full">✓ {f}</span>
                  ))}
                </div>
              </div>
              <NavButtons
                onNext={() => {
                  if (data.modules.length === 0) { toast.error("Please select at least one module"); return; }
                  setStep(3);
                }}
                onBack={() => setStep(1)}
              />
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-white mb-1">Business setup</h2>
                <p className="text-slate-400 text-sm">Tell us more about your business structure</p>
              </div>
              <div className="space-y-4">
                <Field label="Number of branches">
                  <Counter
                    value={data.branch_count}
                    onDecrement={() => setData((p) => ({ ...p, branch_count: Math.max(1, p.branch_count - 1) }))}
                    onIncrement={() => setData((p) => ({ ...p, branch_count: p.branch_count + 1 }))}
                    label={data.branch_count === 1 ? "branch" : "branches"}
                    icon={<Building2 className="w-4 h-4 text-slate-400" />}
                  />
                </Field>
                <Field label="Number of staff">
                  <Counter
                    value={data.staff_count}
                    onDecrement={() => setData((p) => ({ ...p, staff_count: Math.max(1, p.staff_count - 1) }))}
                    onIncrement={() => setData((p) => ({ ...p, staff_count: p.staff_count + 1 }))}
                    label={data.staff_count === 1 ? "staff member" : "staff members"}
                    icon={<Users className="w-4 h-4 text-slate-400" />}
                  />
                </Field>
                <Field label="Preferred language">
                  <div className="grid grid-cols-2 gap-3">
                    {[{ id: "en" as const, label: "English", emoji: "🇬🇧" }, { id: "rw" as const, label: "Kinyarwanda", emoji: "🇷🇼" }].map((lang) => (
                      <button
                        key={lang.id}
                        onClick={() => setData((p) => ({ ...p, language: lang.id }))}
                        className={cn(
                          "h-12 rounded-xl border font-medium text-sm transition-all flex items-center justify-center gap-2",
                          data.language === lang.id ? "border-blue-500 bg-blue-500/10 text-blue-400" : "border-slate-700 bg-slate-800/30 text-slate-400 hover:border-slate-600"
                        )}
                      >
                        <Globe className="w-4 h-4" />
                        {lang.emoji} {lang.label}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
              <NavButtons onNext={() => setStep(4)} onBack={() => setStep(2)} />
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-white mb-1">Add your products</h2>
                <p className="text-slate-400 text-sm">How would you like to add your inventory?</p>
              </div>
              <div className="space-y-3">
                {[
                  { id: "scan" as const, label: "Scan barcodes", desc: "Scan products one by one with your camera", icon: "📷" },
                  { id: "excel" as const, label: "Upload Excel / CSV", desc: "Import all products at once from a spreadsheet", icon: "📊" },
                  { id: "manual" as const, label: "Add manually", desc: "Type in each product by hand", icon: "✏️" },
                  { id: "skip" as const, label: "Skip for now", desc: "Add products after setup is complete", icon: "⏭️" },
                ].map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setData((p) => ({ ...p, products_method: method.id }))}
                    className={cn(
                      "w-full p-4 rounded-xl border text-left transition-all flex items-center gap-4",
                      data.products_method === method.id ? "border-blue-500 bg-blue-500/10" : "border-slate-700 bg-slate-800/30 hover:border-slate-600"
                    )}
                  >
                    <span className="text-2xl">{method.icon}</span>
                    <div>
                      <div className="text-sm font-semibold text-white">{method.label}</div>
                      <div className="text-xs text-slate-400">{method.desc}</div>
                    </div>
                    {data.products_method === method.id && <CheckCircle2 className="w-5 h-5 text-blue-400 ml-auto flex-shrink-0" />}
                  </button>
                ))}
              </div>
              <NavButtons onNext={handleSubmit} onBack={() => setStep(3)} nextLabel="Create my account" isLoading={isLoading} />
            </div>
          )}

          {/* STEP 5 — verify email */}
          {step === 5 && (
            <div className="text-center space-y-6 py-4">
              <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto border-2 border-blue-500/30">
                <CheckCircle2 className="w-10 h-10 text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Almost there!</h2>
                <p className="text-slate-400 text-sm">
                  We&apos;ve sent a verification link to{" "}
                  <span className="text-white font-semibold">{data.email}</span>.
                  Click it to confirm your account and access your dashboard.
                </p>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 text-left space-y-2">
                <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-3">Your setup summary</p>
                <SummaryRow label="Business" value={data.business_name} />
                <SummaryRow label="Modules" value={data.modules.join(", ") || "None"} />
                <SummaryRow label="Language" value={data.language === "en" ? "English" : "Kinyarwanda"} />
                <SummaryRow label="Branches" value={data.branch_count.toString()} />
              </div>
              <p className="text-slate-500 text-xs">
                Didn&apos;t get the email? Check your spam folder, or go back to{" "}
                <button
                  onClick={() => { window.location.href = `/verify-email?email=${encodeURIComponent(data.email)}`; }}
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  resend the verification email
                </button>
                .
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Helper components ───────────────────────────

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-300">{label}</label>
      {children}
      {error && <p className="text-xs text-red-400 mt-0.5">{error}</p>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", hasError = false }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; hasError?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        "w-full h-11 px-4 bg-[#0F172A] border rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all",
        hasError
          ? "border-red-500 focus:ring-red-500"
          : "border-slate-700 focus:ring-blue-500"
      )}
    />
  );
}

function Counter({ value, onDecrement, onIncrement, label, icon }: {
  value: number; onDecrement: () => void; onIncrement: () => void; label: string; icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={onDecrement} className="w-10 h-10 rounded-lg bg-slate-700 text-white font-bold hover:bg-slate-600 transition-colors flex items-center justify-center">−</button>
      <div className="flex-1 h-10 bg-[#0F172A] border border-slate-700 rounded-xl text-white text-center flex items-center justify-center font-semibold">
        {icon}<span className="ml-2">{value} {label}</span>
      </div>
      <button onClick={onIncrement} className="w-10 h-10 rounded-lg bg-slate-700 text-white font-bold hover:bg-slate-600 transition-colors flex items-center justify-center">+</button>
    </div>
  );
}

function NavButtons({ onNext, onBack, nextLabel = "Continue", showBack = true, isLoading = false }: {
  onNext: () => void; onBack?: () => void; nextLabel?: string; showBack?: boolean; isLoading?: boolean;
}) {
  return (
    <div className="flex gap-3 pt-2">
      {showBack && onBack && (
        <button onClick={onBack} className="h-11 px-5 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 rounded-xl transition-all flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      )}
      <button
        onClick={onNext}
        disabled={isLoading}
        className="flex-1 h-11 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
      >
        {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</> : <>{nextLabel} <ArrowRight className="w-4 h-4" /></>}
      </button>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="text-white font-medium capitalize">{value}</span>
    </div>
  );
}
