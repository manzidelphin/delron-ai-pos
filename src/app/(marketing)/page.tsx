import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  Brain,
  BarChart3,
  ShoppingCart,
  CreditCard,
  Users,
  MessageSquare,
  Check,
  X as XIcon,
  ArrowRight,
  Zap,
  Cake,
  Beer,
} from "lucide-react";

export const metadata = {
  title: "DELRON AI POS — Rwanda's First AI-Powered Point-of-Sale System",
  description:
    "Manage your supermarket, bakery, and bar with AI-powered daily briefings, real-time analytics, and smart inventory management. Built for Rwandan businesses.",
};

export default async function MarketingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <>
      {/* ─── Hero ─── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/30 via-[#0f172a] to-[#0f172a]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-blue-600/8 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-medium mb-8">
            <Zap className="w-3 h-3" />
            Powered by Claude AI · Made for Rwanda
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-6 tracking-tight">
            Rwanda&apos;s First
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-sky-400 to-cyan-400 bg-clip-text text-transparent">
              AI-Powered POS System
            </span>
          </h1>

          <p className="text-slate-400 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Manage your supermarket, bakery, and bar from one platform. Get AI-powered daily
            briefings, real-time analytics, and smart inventory — all built for how Rwandan
            businesses actually work.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/onboarding"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 hover:-translate-y-0.5"
            >
              Start Free Trial
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-semibold text-base transition-colors"
            >
              Sign In
            </Link>
          </div>

          <p className="text-slate-600 text-sm mt-6">
            No credit card required · 14-day free trial · Cancel anytime
          </p>
        </div>
      </section>

      {/* ─── Stats Bar ─── */}
      <section className="border-y border-slate-800 bg-slate-900/40 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "10+", label: "Business Modules" },
              { value: "73", label: "Dashboard Pages" },
              { value: "AI", label: "Powered Insights" },
              { value: "🇷🇼", label: "Built in Rwanda" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-slate-400 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-3">
              Features
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Everything You Need to Run Your Business
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Designed specifically for Rwandan businesses — from AI briefings to SMS notifications,
              all in one platform.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: <Brain className="w-5 h-5 text-purple-400" />,
                border: "border-purple-500/20 hover:border-purple-500/40",
                bg: "bg-purple-500/5",
                title: "AI Daily Briefings",
                desc: "Start every morning with a personalized AI summary — yesterday's performance, top sellers, low stock alerts, and recommended actions.",
              },
              {
                icon: <BarChart3 className="w-5 h-5 text-blue-400" />,
                border: "border-blue-500/20 hover:border-blue-500/40",
                bg: "bg-blue-500/5",
                title: "Real-Time Analytics",
                desc: "Live sales tracking, revenue trends, and performance metrics that update the moment a transaction is recorded.",
              },
              {
                icon: <ShoppingCart className="w-5 h-5 text-green-400" />,
                border: "border-green-500/20 hover:border-green-500/40",
                bg: "bg-green-500/5",
                title: "Multi-Module POS",
                desc: "One login for your supermarket, bakery, and bar. Switch between modules instantly without logging out.",
              },
              {
                icon: <CreditCard className="w-5 h-5 text-amber-400" />,
                border: "border-amber-500/20 hover:border-amber-500/40",
                bg: "bg-amber-500/5",
                title: "Credit Management",
                desc: "Track customers who buy on credit, view aging reports, and send automatic SMS payment reminders.",
              },
              {
                icon: <Users className="w-5 h-5 text-cyan-400" />,
                border: "border-cyan-500/20 hover:border-cyan-500/40",
                bg: "bg-cyan-500/5",
                title: "Staff Performance",
                desc: "See which cashiers generate the most revenue. Track transactions, credits, and discounts per staff member.",
              },
              {
                icon: <MessageSquare className="w-5 h-5 text-rose-400" />,
                border: "border-rose-500/20 hover:border-rose-500/40",
                bg: "bg-rose-500/5",
                title: "SMS Notifications",
                desc: "Automatic SMS for credit reminders, low stock alerts, daily summaries, and new staff onboarding.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className={`border rounded-xl p-6 ${f.border} ${f.bg} transition-all hover:-translate-y-0.5`}
              >
                <div className="mb-4">{f.icon}</div>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Modules ─── */}
      <section id="modules" className="py-24 px-4 bg-slate-900/40 border-y border-slate-800">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-3">
              Modules
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Three Businesses, One Platform
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Whether you run a supermarket, bakery, or bar — DELRON AI POS handles everything in a
              single unified system.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <ShoppingCart className="w-7 h-7 text-blue-400" />,
                gradient: "from-blue-600/20 to-blue-900/5",
                border: "border-blue-500/20",
                accent: "text-blue-400",
                title: "Supermarket",
                subtitle: "Full retail POS system",
                features: [
                  "Barcode scanning & product lookup",
                  "Real-time stock level tracking",
                  "Automated low stock alerts",
                  "Supplier & purchase management",
                  "Multi-branch support",
                  "Full sales & revenue reports",
                ],
              },
              {
                icon: <Cake className="w-7 h-7 text-amber-400" />,
                gradient: "from-amber-600/20 to-amber-900/5",
                border: "border-amber-500/20",
                accent: "text-amber-400",
                title: "Bakery",
                subtitle: "Production & recipe management",
                features: [
                  "Recipe & ingredient management",
                  "Daily production planning",
                  "Raw material cost tracking",
                  "Waste & loss analytics",
                  "Bake vs. sell efficiency",
                  "Bakery revenue reports",
                ],
              },
              {
                icon: <Beer className="w-7 h-7 text-green-400" />,
                gradient: "from-green-600/20 to-green-900/5",
                border: "border-green-500/20",
                accent: "text-green-400",
                title: "Bar",
                subtitle: "Tab & table management",
                features: [
                  "Table & tab management",
                  "Open/close tabs per table",
                  "Bottle tracking & shot variance",
                  "Hourly revenue heatmaps",
                  "Bar menu display mode",
                  "Bartender performance stats",
                ],
              },
            ].map((mod) => (
              <div
                key={mod.title}
                className={`border ${mod.border} rounded-2xl overflow-hidden`}
              >
                <div className={`bg-gradient-to-b ${mod.gradient} p-7`}>
                  {mod.icon}
                  <h3 className="text-xl font-bold text-white mt-4 mb-1">{mod.title}</h3>
                  <p className={`text-sm ${mod.accent}`}>{mod.subtitle}</p>
                </div>
                <div className="p-6 space-y-3 bg-slate-900/30">
                  {mod.features.map((f) => (
                    <div key={f} className="flex items-center gap-2.5 text-sm text-slate-300">
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Comparison ─── */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-3">
              Why DELRON?
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">How We Compare</h2>
            <p className="text-slate-400">See why growing Rwandan businesses choose DELRON AI POS.</p>
          </div>

          <div className="rounded-2xl border border-slate-700 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-800/80">
                  <th className="text-left px-6 py-4 text-slate-400 font-medium text-sm w-1/2">
                    Feature
                  </th>
                  <th className="px-4 py-4 text-center">
                    <span className="text-blue-400 font-semibold text-sm">DELRON AI POS</span>
                  </th>
                  <th className="px-4 py-4 text-center text-slate-500 font-medium text-xs">
                    Traditional POS
                  </th>
                  <th className="px-4 py-4 text-center text-slate-500 font-medium text-xs">
                    Spreadsheets
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {(
                  [
                    ["AI-Powered Daily Insights", true, false, false],
                    ["Supermarket + Bakery + Bar", true, false, false],
                    ["SMS Alerts & Notifications", true, false, false],
                    ["Credit Customer Tracking", true, "Partial", false],
                    ["Real-Time Analytics", true, "Partial", false],
                    ["Staff Performance Tracking", true, false, false],
                    ["Rwanda MoMo Integration", true, false, false],
                    ["PIN-Based Staff Login", true, false, true],
                  ] as [string, boolean | string, boolean | string, boolean | string][]
                ).map(([feature, delron, traditional, sheets]) => (
                  <tr key={feature} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 text-slate-300 text-sm">{feature}</td>
                    {[delron, traditional, sheets].map((val, i) => (
                      <td key={i} className="px-4 py-4 text-center">
                        {val === true ? (
                          <Check className="w-5 h-5 text-green-400 mx-auto" />
                        ) : val === false ? (
                          <XIcon className="w-4 h-4 text-slate-700 mx-auto" />
                        ) : (
                          <span className="text-amber-400 text-xs">{val}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section className="py-24 px-4 bg-slate-900/40 border-y border-slate-800">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-3">
              Testimonials
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Trusted by Rwandan Business Owners
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "Jean-Pierre Habimana",
                role: "Supermarket Owner, Kigali",
                quote:
                  "DELRON AI POS transformed how I run my shop. The daily AI briefing tells me exactly what to restock before I even open. I've cut wastage by over 30%.",
                initials: "JH",
                color: "bg-blue-600",
              },
              {
                name: "Marie Uwimana",
                role: "Bakery Owner, Butare",
                quote:
                  "Managing recipes and daily production used to take me hours every morning. Now the system tracks everything automatically and tells me exactly what to bake each day.",
                initials: "MU",
                color: "bg-amber-600",
              },
              {
                name: "David Nkurunziza",
                role: "Bar & Restaurant, Gisenyi",
                quote:
                  "The shot variance feature caught a 15% discrepancy I had no idea about. Within one week, DELRON AI POS paid for itself many times over.",
                initials: "DN",
                color: "bg-green-700",
              },
            ].map((t) => (
              <div
                key={t.name}
                className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 flex flex-col"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-10 h-10 rounded-full ${t.color} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{t.name}</p>
                    <p className="text-slate-400 text-xs">{t.role}</p>
                  </div>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed flex-1">&quot;{t.quote}&quot;</p>
                <div className="flex gap-0.5 mt-5">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-amber-400 text-sm">
                      ★
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-3">
              Pricing
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-slate-400">
              Start free. Upgrade when you&apos;re ready. All prices in Rwandan Francs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "Starter",
                price: "RWF 15,000",
                period: "per month",
                desc: "Perfect for single-location businesses getting started with a digital POS.",
                features: [
                  "1 module (Supermarket, Bakery, or Bar)",
                  "Up to 3 staff accounts",
                  "AI daily briefings",
                  "SMS notifications",
                  "PDF & Excel reports",
                ],
                cta: "Get Started",
                href: "/onboarding",
                highlight: false,
              },
              {
                name: "Professional",
                price: "RWF 35,000",
                period: "per month",
                desc: "For growing businesses that need all modules with full AI capabilities.",
                features: [
                  "All 3 modules included",
                  "Up to 20 staff accounts",
                  "AI daily briefings",
                  "Unlimited SMS notifications",
                  "Full reports & exports",
                  "Priority support",
                  "Multiple branch support",
                ],
                cta: "Get Professional",
                href: "/onboarding",
                highlight: true,
              },
              {
                name: "Enterprise",
                price: "Custom",
                period: "tailored quote",
                desc: "For large businesses, chains, and franchises with advanced requirements.",
                features: [
                  "Unlimited modules & staff",
                  "Custom integrations",
                  "Dedicated account manager",
                  "On-site training",
                  "Custom report design",
                  "SLA guarantee",
                ],
                cta: "Contact Us",
                href: "mailto:info@delronpos.rw",
                highlight: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-7 flex flex-col ${
                  plan.highlight
                    ? "border-blue-500 bg-blue-600/5 ring-1 ring-blue-500/20"
                    : "border-slate-700 bg-slate-800/30"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg shadow-blue-600/40">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-5">
                  <p className="text-slate-400 text-sm font-medium mb-1">{plan.name}</p>
                  <div className="flex items-end gap-1.5">
                    <span
                      className={`text-2xl font-bold ${plan.highlight ? "text-blue-400" : "text-white"}`}
                    >
                      {plan.price}
                    </span>
                    <span className="text-slate-500 text-sm mb-0.5">/ {plan.period}</span>
                  </div>
                  <p className="text-slate-400 text-xs mt-2 leading-relaxed">{plan.desc}</p>
                </div>

                <ul className="space-y-2.5 mb-7 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={`block w-full text-center py-3 rounded-xl font-semibold text-sm transition-colors ${
                    plan.highlight
                      ? "bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/25"
                      : "border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-slate-400 text-sm mt-10 max-w-2xl mx-auto">
            All plans include{" "}
            <span className="text-white font-medium">AI assistant, PDF reports, and SMS notifications</span>
            {" "}— features competitors charge extra for or don&apos;t offer at all.
          </p>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="py-24 px-4 bg-gradient-to-b from-blue-950/20 to-[#0f172a] border-t border-slate-800">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-5">
            Ready to Transform Your Business?
          </h2>
          <p className="text-slate-400 text-lg mb-10 leading-relaxed max-w-2xl mx-auto">
            Join forward-thinking Rwandan businesses using DELRON AI POS to grow smarter, faster,
            and more profitably.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/onboarding"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base transition-all shadow-lg shadow-blue-600/30 hover:-translate-y-0.5"
            >
              Start Free Trial Today
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-8 py-4 rounded-xl border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-semibold text-base transition-colors"
            >
              Sign In
            </Link>
          </div>
          <p className="text-slate-600 text-sm mt-6">
            No credit card required · 14-day free trial · 🇷🇼 Built in Rwanda
          </p>
        </div>
      </section>
    </>
  );
}
