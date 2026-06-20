import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  ArrowRight, Play, Check, X as XIcon, Zap, Brain,
  BarChart3, ShoppingCart, Cake, Beer, CreditCard,
  MessageSquare, Printer, Receipt, ChevronDown,
  Utensils, Bot, Star, CheckCircle2, Clock, ClipboardCheck,
} from "lucide-react";

export const metadata = {
  title: "DELRON AI POS — Rwanda's First AI-Powered Point-of-Sale System",
  description:
    "Manage your supermarket, bakery, and bar with AI-powered daily briefings, shot variance detection, Kinyarwanda SMS, and real-time analytics. Built for Rwanda.",
};

export default async function MarketingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <>
      {/* ─── Custom animations ─── */}
      <style>{`
        @keyframes gradientShift {
          0%,100% { background-position: 0% 50%; }
          50%      { background-position: 100% 50%; }
        }
        @keyframes floatA {
          0%,100% { transform: translateY(0px); }
          50%     { transform: translateY(-14px); }
        }
        @keyframes floatB {
          0%,100% { transform: translateY(-6px); }
          50%     { transform: translateY(10px); }
        }
        @keyframes floatC {
          0%,100% { transform: translateY(5px); }
          50%     { transform: translateY(-10px); }
        }
        @keyframes orbPulse {
          0%,100% { transform: scale(1);    opacity: 0.5; }
          50%     { transform: scale(1.15); opacity: 0.8; }
        }
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .animate-gradient-bg {
          background: linear-gradient(135deg,#07101f,#0d1b40,#09152e,#050c1c,#07101f);
          background-size: 400% 400%;
          animation: gradientShift 10s ease infinite;
        }
        .float-a { animation: floatA 5s   ease-in-out infinite; }
        .float-b { animation: floatB 6s   ease-in-out infinite; }
        .float-c { animation: floatC 5.5s ease-in-out infinite; }
        .orb     { animation: orbPulse 5s ease-in-out infinite; }
        .reveal {
          opacity: 0;
          transform: translateY(28px);
          transition: opacity .7s ease, transform .7s ease;
        }
        .reveal.in-view       { opacity: 1; transform: translateY(0); }
        .reveal-d1            { transition-delay: .10s; }
        .reveal-d2            { transition-delay: .20s; }
        .reveal-d3            { transition-delay: .30s; }
        .reveal-d4            { transition-delay: .40s; }
        details summary                    { list-style: none; cursor: pointer; user-select: none; }
        details summary::-webkit-details-marker { display: none; }
        details[open] .faq-icon            { transform: rotate(180deg); }
        .faq-icon                          { transition: transform .25s ease; }
        details[open] .faq-body            { animation: fadeDown .2s ease; }
        .card-hover:hover                  { box-shadow: 0 0 32px rgba(59,130,246,.14); }
      `}</style>

      {/* ══════════════ 1. HERO ══════════════ */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        <div className="absolute inset-0 animate-gradient-bg" />
        {/* Glowing orbs */}
        <div className="orb absolute -top-20 -left-32 w-[520px] h-[520px] rounded-full pointer-events-none"
          style={{background:"radial-gradient(circle,rgba(37,99,235,.12),transparent 70%)"}} />
        <div className="orb absolute bottom-0 -right-32 w-[420px] h-[420px] rounded-full pointer-events-none"
          style={{background:"radial-gradient(circle,rgba(99,102,241,.10),transparent 70%)",animationDelay:"2.5s"}} />
        <div className="orb absolute top-2/3 left-1/3  w-[300px] h-[300px] rounded-full pointer-events-none"
          style={{background:"radial-gradient(circle,rgba(16,185,129,.06),transparent 70%)",animationDelay:"4s"}} />

        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
          {/* Live badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/25 bg-blue-500/8 text-blue-300 text-xs font-bold tracking-widest mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            NOW LIVE — AI-POWERED POS FOR RWANDA
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black leading-[1.05] tracking-tight mb-6">
            Rwanda&apos;s First<br />
            <span style={{
              background:"linear-gradient(135deg,#60a5fa 0%,#a78bfa 45%,#34d399 100%)",
              WebkitBackgroundClip:"text", backgroundClip:"text", WebkitTextFillColor:"transparent",
            }}>AI-Powered POS</span>
          </h1>

          <p className="text-slate-300 text-xl sm:text-2xl max-w-3xl mx-auto mb-12 leading-relaxed font-light">
            One system for your supermarket, bakery, and bar.{" "}
            <span className="text-white font-semibold">Powered by Google Gemini AI</span>{" "}
            — daily briefings, theft detection, Kinyarwanda SMS, and real-time analytics.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href="/onboarding"
              className="group inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl font-black text-base text-white transition-all hover:brightness-110"
              style={{background:"linear-gradient(135deg,#2563eb,#1d4ed8)",boxShadow:"0 4px 32px rgba(37,99,235,.45)"}}>
              Start Free Trial
              <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link href="/onboarding"
              className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl font-semibold text-base border border-slate-600 text-slate-200 hover:border-blue-500/50 hover:text-white hover:bg-blue-500/5 transition-all">
              <Play className="w-4 h-4 fill-blue-400 text-blue-400" />
              Watch Demo
            </Link>
          </div>

          {/* Hero stats pill */}
          <div className="inline-flex items-center gap-8 sm:gap-12 border border-slate-700/60 bg-slate-800/30 backdrop-blur-sm rounded-2xl px-8 py-4">
            {[{v:"10+",l:"Modules"},{v:"73",l:"Pages"},{v:"AI",l:"Powered"},{v:"🇷🇼",l:"Rwanda"}].map((s,i) => (
              <div key={i} className="text-center">
                <div className="text-2xl font-black text-white">{s.v}</div>
                <div className="text-slate-500 text-xs mt-0.5">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ 2. TRUST BAR ══════════════ */}
      <section className="border-y border-slate-800/50 bg-slate-900/50 py-5">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-slate-600 text-xs uppercase tracking-widest mb-3">Trusted by businesses across Rwanda</p>
          <div className="flex flex-wrap justify-center items-center gap-x-2 gap-y-2">
            {["🇷🇼 Kigali","Butare","Gisenyi","Musanze","Rubavu","Rwamagana","Nyanza"].map((city, i, arr) => (
              <span key={city} className="flex items-center gap-2">
                <span className="text-slate-400 text-sm font-medium">{city}</span>
                {i < arr.length - 1 && <span className="w-1 h-1 rounded-full bg-slate-700" />}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ 3. PRODUCT SHOWCASE ══════════════ */}
      <section className="py-24 px-4 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 reveal">
            <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-3">The Platform</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">Built Different. Built Better.</h2>
            <p className="text-slate-400 max-w-xl mx-auto">A real system for real Rwandan businesses — supermarket, bakery, and bar, all in one dashboard.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">

            {/* Mockup 1 — Dashboard */}
            <div className="float-a">
              <div className="bg-[#060e1c] border border-slate-700/60 rounded-2xl overflow-hidden shadow-2xl card-hover transition-shadow">
                {/* Browser chrome */}
                <div className="bg-[#0a1525] border-b border-slate-800 px-3 py-2.5 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                  </div>
                  <div className="flex-1 mx-2 bg-slate-800/80 rounded px-2 py-0.5 text-slate-500 text-[10px] text-center">delron.app/dashboard</div>
                </div>
                <div className="p-3 space-y-2.5">
                  <div className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Dashboard · Today</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2">
                      <div className="text-[9px] text-slate-400 mb-0.5">Revenue</div>
                      <div className="text-blue-400 font-bold text-xs">847,200</div>
                      <div className="text-[9px] text-emerald-400">↑ 12%</div>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2">
                      <div className="text-[9px] text-slate-400 mb-0.5">Sales</div>
                      <div className="text-emerald-400 font-bold text-xs">142</div>
                      <div className="text-[9px] text-emerald-400">↑ 8</div>
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
                      <div className="text-[9px] text-slate-400 mb-0.5">Alerts</div>
                      <div className="text-amber-400 font-bold text-xs">3</div>
                      <div className="text-[9px] text-slate-500">low stock</div>
                    </div>
                  </div>
                  {/* Mini bar chart */}
                  <div className="bg-slate-800/40 rounded-lg p-2.5">
                    <div className="text-[9px] text-slate-500 mb-2">Revenue · This Week (RWF)</div>
                    <div className="flex items-end gap-1 h-10">
                      {[38,62,48,78,68,88,100].map((h,i) => (
                        <div key={i} className={`flex-1 rounded-sm ${i===6?"bg-blue-500":"bg-blue-500/30"}`} style={{height:`${h}%`}} />
                      ))}
                    </div>
                  </div>
                  {/* AI snippet */}
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Bot className="w-3 h-3 text-purple-400" />
                      <span className="text-[9px] text-purple-400 font-bold">AI BRIEFING</span>
                    </div>
                    <p className="text-[9px] text-slate-300 leading-relaxed">Revenue ↑12%. Mandazi flour critical — order 50 kg before opening.</p>
                  </div>
                </div>
              </div>
              <p className="text-center text-slate-500 text-xs mt-3 font-semibold">AI Dashboard</p>
            </div>

            {/* Mockup 2 — POS Terminal */}
            <div className="float-b md:mt-8">
              <div className="bg-[#060e1c] border border-slate-700/60 rounded-2xl overflow-hidden shadow-2xl card-hover transition-shadow">
                <div className="bg-[#0a1525] border-b border-slate-800 px-3 py-2.5 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                  </div>
                  <div className="flex-1 mx-2 bg-slate-800/80 rounded px-2 py-0.5 text-slate-500 text-[10px] text-center">POS Terminal</div>
                </div>
                <div className="p-3 space-y-2">
                  <div className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Quick Select</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      {e:"🥛",n:"Milk 1L",p:"600"},
                      {e:"🍺",n:"Primus",p:"800"},
                      {e:"🥖",n:"Bread",p:"400"},
                      {e:"🧴",n:"Soap",p:"350"},
                      {e:"🥤",n:"Fanta",p:"500"},
                      {e:"🍚",n:"Rice 1kg",p:"1,200"},
                    ].map(p => (
                      <div key={p.n} className="bg-slate-800/60 rounded-lg p-1.5 text-center">
                        <div className="text-base leading-none mb-0.5">{p.e}</div>
                        <div className="text-white text-[8px] font-medium truncate">{p.n}</div>
                        <div className="text-blue-400 text-[8px]">{p.p}</div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-slate-700/60 pt-2 space-y-1">
                    {[{n:"Milk 1L × 2",p:"1,200"},{n:"Primus × 3",p:"2,400"}].map(item => (
                      <div key={item.n} className="flex justify-between text-[9px]">
                        <span className="text-slate-400">{item.n}</span>
                        <span className="text-white font-medium">RWF {item.p}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center bg-slate-800/60 rounded-lg px-2.5 py-1.5">
                    <span className="text-slate-400 text-[10px]">Total</span>
                    <span className="text-white font-black text-xs">RWF 3,600</span>
                  </div>
                  <button className="w-full py-2 rounded-lg text-white font-black text-xs"
                    style={{background:"linear-gradient(135deg,#16a34a,#15803d)"}}>
                    Collect Payment
                  </button>
                </div>
              </div>
              <p className="text-center text-slate-500 text-xs mt-3 font-semibold">POS Terminal</p>
            </div>

            {/* Mockup 3 — Bakery Production */}
            <div className="float-c">
              <div className="bg-[#060e1c] border border-slate-700/60 rounded-2xl overflow-hidden shadow-2xl card-hover transition-shadow">
                <div className="bg-[#0a1525] border-b border-slate-800 px-3 py-2.5 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                  </div>
                  <div className="flex-1 mx-2 bg-slate-800/80 rounded px-2 py-0.5 text-slate-500 text-[10px] text-center">Bakery Production</div>
                </div>
                <div className="p-3 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Today&apos;s Plan</span>
                    <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">In Progress</span>
                  </div>
                  {[
                    {name:"Mandazi",done:160,total:200,pct:80,c:"bg-amber-500"},
                    {name:"Cake 6\"",done:32, total:50, pct:64,c:"bg-pink-500"},
                    {name:"White Bread",done:120,total:120,pct:100,c:"bg-blue-500"},
                    {name:"Chapati",done:40, total:80, pct:50,c:"bg-purple-500"},
                  ].map(item => (
                    <div key={item.name} className="space-y-1">
                      <div className="flex justify-between text-[9px]">
                        <span className="text-slate-300 font-medium">{item.name}</span>
                        <span className="text-slate-500">{item.done}/{item.total}</span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full ${item.c} rounded-full`} style={{width:`${item.pct}%`}} />
                      </div>
                    </div>
                  ))}
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 flex justify-between">
                    <span className="text-[9px] text-slate-400">Flour remaining</span>
                    <span className="text-[9px] text-amber-400 font-bold">⚠ 8 kg left</span>
                  </div>
                  <div className="bg-slate-800/40 rounded-lg p-2 flex justify-between">
                    <span className="text-[9px] text-slate-400">Waste today</span>
                    <span className="text-[9px] text-slate-300 font-medium">3 Mandazi (1.5%)</span>
                  </div>
                </div>
              </div>
              <p className="text-center text-slate-500 text-xs mt-3 font-semibold">Bakery Module</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ 4. AI SECTION ══════════════ */}
      <section className="py-24 px-4 relative overflow-hidden border-y border-slate-800"
        style={{background:"linear-gradient(180deg,#09101e 0%,#0c1530 50%,#09101e 100%)"}}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full blur-[80px]"
            style={{background:"radial-gradient(ellipse,rgba(124,58,237,.08),transparent 70%)"}} />
        </div>
        <div className="relative max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Left — text */}
            <div className="reveal">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-400 text-xs font-bold mb-6">
                <Bot className="w-3.5 h-3.5" />
                GEMINI AI · BUILT IN
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-5 leading-tight">
                Meet DELRON AI —<br />
                <span className="text-purple-400">Your Business Advisor</span>
              </h2>
              <p className="text-slate-400 leading-relaxed mb-8">
                Every morning, DELRON AI reads your sales data, inventory, and staff performance — then writes a personalized briefing in plain language. Ask it anything, in English or Kinyarwanda.
              </p>
              <ul className="space-y-3.5">
                {[
                  "Daily briefings auto-generated — no setup required",
                  "Ask about sales, stock, staff in natural language",
                  "Responds in both English and Kinyarwanda",
                  "Flags anomalies: shot variance, unusual discounts, low stock",
                ].map(item => (
                  <li key={item} className="flex items-start gap-3 text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Right — chat mockup */}
            <div className="reveal reveal-d2">
              <div className="bg-[#060e1c] border border-purple-500/20 rounded-2xl overflow-hidden shadow-2xl">
                <div className="bg-[#0a1525] border-b border-slate-800 px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{background:"linear-gradient(135deg,#7c3aed,#2563eb)"}}>
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-white text-sm font-bold">DELRON AI</div>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-emerald-400 text-xs">Online</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 space-y-4 min-h-[320px]">
                  {/* AI morning message */}
                  <div className="flex gap-2.5">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{background:"linear-gradient(135deg,#7c3aed,#2563eb)"}}>
                      <Bot className="w-3 h-3 text-white" />
                    </div>
                    <div className="bg-slate-800/80 rounded-xl rounded-tl-none px-3.5 py-3 max-w-[88%]">
                      <p className="text-xs text-slate-300 leading-relaxed">
                        🌅 <strong className="text-white">Good morning, Jean-Pierre!</strong><br /><br />
                        Yesterday&apos;s revenue: <span className="text-blue-400 font-semibold">RWF 847,200</span> (+12% vs last Tuesday).<br /><br />
                        ⚠️ <span className="text-amber-400">Mandazi flour critically low</span> — order ≥50 kg before opening.<br /><br />
                        🏆 Top seller: <strong className="text-white">Primus Beer</strong> (42 bottles, RWF 33,600).
                      </p>
                    </div>
                  </div>
                  {/* User question in Kinyarwanda */}
                  <div className="flex justify-end">
                    <div className="rounded-xl rounded-tr-none px-3.5 py-2.5 max-w-[80%]"
                      style={{background:"linear-gradient(135deg,rgba(37,99,235,.7),rgba(29,78,216,.7))"}}>
                      <p className="text-xs text-white">Ni nde wakoze akazi neza kuwa wa gatanu?</p>
                      <p className="text-[10px] text-blue-200 mt-0.5 italic">Who performed best on Friday?</p>
                    </div>
                  </div>
                  {/* AI response */}
                  <div className="flex gap-2.5">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{background:"linear-gradient(135deg,#7c3aed,#2563eb)"}}>
                      <Bot className="w-3 h-3 text-white" />
                    </div>
                    <div className="bg-slate-800/80 rounded-xl rounded-tl-none px-3.5 py-3 max-w-[88%]">
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Kuri uwa gatanu, <span className="text-white font-bold">Amina</span> niwe wakoze neza — yakoze{" "}
                        <span className="text-blue-400 font-semibold">RWF 312,400</span> mu bikorwa 38.
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1 italic">Amina led with RWF 312,400 across 38 transactions on Friday.</p>
                    </div>
                  </div>
                  {/* Typing dots */}
                  <div className="flex gap-2.5 items-end">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{background:"linear-gradient(135deg,#7c3aed,#2563eb)"}}>
                      <Bot className="w-3 h-3 text-white" />
                    </div>
                    <div className="bg-slate-800/80 rounded-xl rounded-tl-none px-4 py-3">
                      <div className="flex gap-1">
                        {[0,150,300].map(d => (
                          <span key={d} className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                            style={{animationDelay:`${d}ms`}} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ 5. FEATURES — 9 features ══════════════ */}
      <section id="features" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 reveal">
            <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-3">Features</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">Built for Every Corner of Your Business</h2>
            <p className="text-slate-400 max-w-xl mx-auto">From bakery production to shot variance detection — DELRON covers gaps that generic POS systems ignore entirely.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {icon:<Brain className="w-5 h-5 text-purple-400" />, b:"border-purple-500/20 hover:border-purple-500/40 bg-purple-500/5",
               title:"AI Daily Briefing",
               desc:"Personalized morning report — revenue, top sellers, stock alerts, and staff highlights — generated automatically every day."},
              {icon:<BarChart3 className="w-5 h-5 text-blue-400" />, b:"border-blue-500/20 hover:border-blue-500/40 bg-blue-500/5",
               title:"Real-Time Analytics",
               desc:"Live sales tracking, revenue charts, and KPI dashboards updated the moment a transaction is recorded."},
              {icon:<ShoppingCart className="w-5 h-5 text-emerald-400" />, b:"border-emerald-500/20 hover:border-emerald-500/40 bg-emerald-500/5",
               title:"Multi-Module POS",
               desc:"One login for supermarket, bakery, and bar. Switch modules instantly — your staff stays in their lane."},
              {icon:<Cake className="w-5 h-5 text-amber-400" />, b:"border-amber-500/20 hover:border-amber-500/40 bg-amber-500/5",
               title:"Bakery Production Tracking",
               desc:"Plan daily bakes, track raw materials, monitor waste, and compare production vs. sales in real time."},
              {icon:<Beer className="w-5 h-5 text-rose-400" />, b:"border-rose-500/20 hover:border-rose-500/40 bg-rose-500/5",
               title:"Shot Variance & Theft Detection",
               desc:"Track every bottle opened vs. shots sold. Alerts fire automatically when variance exceeds your threshold — catches theft before it compounds."},
              {icon:<MessageSquare className="w-5 h-5 text-cyan-400" />, b:"border-cyan-500/20 hover:border-cyan-500/40 bg-cyan-500/5",
               title:"Kinyarwanda SMS",
               desc:"Credit reminders, stock alerts, and daily summaries sent via SMS in Kinyarwanda and English — no app required."},
              {icon:<CreditCard className="w-5 h-5 text-indigo-400" />, b:"border-indigo-500/20 hover:border-indigo-500/40 bg-indigo-500/5",
               title:"Credit Management",
               desc:"Log credit sales, track aging debt, view at-risk customers, and trigger automatic SMS payment reminders."},
              {icon:<Printer className="w-5 h-5 text-teal-400" />, b:"border-teal-500/20 hover:border-teal-500/40 bg-teal-500/5",
               title:"Barcode Label Printing",
               desc:"Generate and print product barcodes directly from the system. Scan to add items at the POS — zero manual entry."},
              {icon:<Receipt className="w-5 h-5 text-orange-400" />, b:"border-orange-500/20 hover:border-orange-500/40 bg-orange-500/5",
               title:"RRA/EBM Receipts",
               desc:"Generate RRA-compliant electronic receipts with built-in EBM support — stay tax-compliant automatically."},
              {icon:<Clock className="w-5 h-5 text-violet-400" />, b:"border-violet-500/20 hover:border-violet-500/40 bg-violet-500/5",
               title:"Shift Management & Cash Reconciliation",
               desc:"Every staff member clocks in and out with automatic cash counting, stock variance detection, and SMS alerts to the owner when shortages occur."},
              {icon:<ClipboardCheck className="w-5 h-5 text-sky-400" />, b:"border-sky-500/20 hover:border-sky-500/40 bg-sky-500/5",
               title:"Daily Stock Reconciliation",
               desc:"Restock and closing count workflows across every module — supermarket, bakery, and bar — with automatic theft and waste detection at end of day."},
            ].map((f,i) => (
              <div key={f.title} className={`border rounded-xl p-6 ${f.b} transition-all hover:-translate-y-0.5 reveal reveal-d${(i%3)+1}`}>
                <div className="mb-4">{f.icon}</div>
                <h3 className="font-bold text-white mb-2 text-sm">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ 6. INDUSTRIES ══════════════ */}
      <section id="modules" className="py-24 px-4 border-y border-slate-800"
        style={{background:"linear-gradient(180deg,#080f1c 0%,#0f172a 100%)"}}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 reveal">
            <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-3">Industries</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">Built for Your Type of Business</h2>
            <p className="text-slate-400 max-w-xl mx-auto">DELRON understands the specific problems of each business type — and solves them with precision.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {icon:<ShoppingCart className="w-7 h-7" />, color:"text-blue-400",
               grad:"from-blue-600/15 to-transparent", border:"border-blue-500/20",
               title:"Supermarket",
               pains:["Stock goes missing with no trail","Cashiers giving wrong change","Slow supplier reordering","No visibility on top products"]},
              {icon:<Cake className="w-7 h-7" />, color:"text-amber-400",
               grad:"from-amber-600/15 to-transparent", border:"border-amber-500/20",
               title:"Bakery & Pastry",
               pains:["Can't track flour & ingredient costs","Don't know daily production profit","Waste invisible until end of day","No recipe standardization"]},
              {icon:<Beer className="w-7 h-7" />, color:"text-emerald-400",
               grad:"from-emerald-600/15 to-transparent", border:"border-emerald-500/20",
               title:"Bar & Club",
               pains:["Bartenders serving without recording","Bottles disappear between shifts","Can't track tabs per table","No proof of what was sold"]},
              {icon:<Utensils className="w-7 h-7" />, color:"text-purple-400",
               grad:"from-purple-600/15 to-transparent", border:"border-purple-500/20",
               title:"Restaurant",
               pains:["Full menu management with categories & modifiers","Kitchen Display System — orders appear live at the kitchen","Waiter table assignment and order tracking per cover","Food POS with combo meals and item-level discounts"]},
            ].map((ind,i) => (
              <div key={ind.title} className={`border ${ind.border} rounded-2xl overflow-hidden reveal reveal-d${i+1} hover:-translate-y-1 transition-transform`}>
                <div className={`bg-gradient-to-b ${ind.grad} p-6`}>
                  <div className={ind.color}>{ind.icon}</div>
                  <h3 className="text-lg font-black text-white mt-4">{ind.title}</h3>
                </div>
                <div className="px-6 pb-6 pt-1 space-y-2.5">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-3">Pain Points → Solved</p>
                  {ind.pains.map(p => (
                    <div key={p} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-300 text-xs leading-relaxed">{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ 7. HOW IT WORKS ══════════════ */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 reveal">
            <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-3">Getting Started</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">Up and Running in Under an Hour</h2>
            <p className="text-slate-400 max-w-lg mx-auto">No IT team. No hardware to buy. No installation. Just create an account and start selling.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {num:"01",title:"Create Account",    desc:"Sign up with your email. Your business profile is ready in 2 minutes."},
              {num:"02",title:"Choose Modules",    desc:"Select Supermarket, Bakery, Bar — or all three. Enable exactly what you need."},
              {num:"03",title:"Add Products",      desc:"Import with barcodes, set prices, and configure inventory and recipes."},
              {num:"04",title:"Start Selling",     desc:"Hand the tablet to your cashier. Your first AI briefing arrives tomorrow morning."},
            ].map((step,i) => (
              <div key={step.num} className={`relative reveal reveal-d${i+1}`}>
                <div className="text-7xl font-black mb-4 leading-none select-none"
                  style={{background:"linear-gradient(135deg,#1e3a5f,#2d5a8e)",WebkitBackgroundClip:"text",backgroundClip:"text",WebkitTextFillColor:"transparent"}}>
                  {step.num}
                </div>
                <h3 className="font-black text-white text-lg mb-2">{step.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{step.desc}</p>
                {i < 3 && <div className="hidden lg:block absolute top-8 -right-5 text-slate-700 text-2xl font-light">→</div>}
              </div>
            ))}
          </div>
          <div className="text-center mt-14">
            <Link href="/onboarding"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-black text-white text-base transition-all hover:brightness-110"
              style={{background:"linear-gradient(135deg,#2563eb,#1d4ed8)",boxShadow:"0 4px 24px rgba(37,99,235,.4)"}}>
              Create Your Account Now
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════ 8. COMPARISON TABLE ══════════════ */}
      <section className="py-24 px-4 border-y border-slate-800"
        style={{background:"linear-gradient(180deg,#060d1a 0%,#0f172a 100%)"}}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16 reveal">
            <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-3">Why DELRON?</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">How We Compare</h2>
            <p className="text-slate-400">DELRON AI POS vs Traditional POS Systems vs Spreadsheets — across the 12 features that matter most.</p>
          </div>
          <div className="rounded-2xl border border-slate-700/60 overflow-hidden reveal">
            <table className="w-full">
              <thead>
                <tr style={{background:"linear-gradient(90deg,#0c1b3e,#091528)"}}>
                  <th className="text-left px-5 py-4 text-slate-400 font-medium text-sm w-2/5">Feature</th>
                  <th className="px-4 py-4 text-center">
                    <span className="text-blue-400 font-black text-sm">DELRON AI POS</span>
                  </th>
                  <th className="px-4 py-4 text-center text-slate-500 font-semibold text-xs">Traditional POS</th>
                  <th className="px-4 py-4 text-center text-slate-500 font-semibold text-xs">Spreadsheets</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {(
                  [
                    ["AI Daily Briefing",                  true,       false,     false],
                    ["Bakery Production Module",           true,       false,     false],
                    ["Shot Variance / Theft Detection",    true,       false,     false],
                    ["Kinyarwanda SMS Alerts",             true,       false,     false],
                    ["Barcode Label Printing",             true,       "Partial", false],
                    ["Credit Customer Tracking",           true,       "Partial", false],
                    ["Multi-Module (Super + Bakery + Bar + Restaurant)",true,       false,     false],
                    ["Real-Time Sales Analytics",          true,       true,      false],
                    ["Staff Performance Tracking",         true,       "Partial", false],
                    ["RRA/EBM Receipt Support",            true,       true,      false],
                    ["Multi-Branch Support",               true,       true,      false],
                    ["14-Day Free Trial",                  true,       false,     false],
                  ] as [string,boolean|string,boolean|string,boolean|string][]
                ).map(([feat,d,k,s],ri) => (
                  <tr key={feat} className={`transition-colors hover:bg-slate-800/20 ${ri%2===0?"bg-slate-900/20":""}`}>
                    <td className="px-5 py-3.5 text-slate-300 text-sm">{feat}</td>
                    {[d,k,s].map((val,ci) => (
                      <td key={ci} className="px-4 py-3.5 text-center">
                        {val===true ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/15">
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          </span>
                        ) : val===false ? (
                          <XIcon className="w-4 h-4 text-slate-700 mx-auto" />
                        ) : (
                          <span className="text-amber-400 text-xs font-semibold">{val}</span>
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

      {/* ══════════════ 9. TESTIMONIALS ══════════════ */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 reveal">
            <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-3">Testimonials</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">Rwandan Business Owners Love It</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {name:"Jean-Pierre Habimana", role:"Supermarket Owner", loc:"Kigali, Kimironko",
               initials:"JH", grad:"from-blue-600 to-blue-900",
               quote:"The AI briefing alone is worth it. Every morning at 6 AM I see exactly what to restock, which cashier sold the most, and where the money went. I no longer need to be there to know everything.",
               tag:"AI Daily Briefing"},
              {name:"Marie-Claire Uwimana", role:"Bakery & Pastry Shop", loc:"Butare, Centre-Ville",
               initials:"MU", grad:"from-amber-600 to-amber-900",
               quote:"Before DELRON, I had no idea how much flour I was wasting on mandazi that didn't sell. Now I see every ingredient used vs. every item sold. My costs dropped 22% in the first month.",
               tag:"Bakery Production Tracking"},
              {name:"David Nkurunziza", role:"Bar & Club Owner", loc:"Gisenyi, Rubavu",
               initials:"DN", grad:"from-emerald-700 to-emerald-900",
               quote:"Shot variance caught my bartender over-serving by 18%. I confronted him with the data — numbers don't lie. That one feature paid for 6 months of the subscription in a single week.",
               tag:"Shot Variance Detection"},
            ].map((t,i) => (
              <div key={t.name} className={`bg-slate-800/40 border border-slate-700/60 rounded-2xl p-6 flex flex-col hover:border-slate-600/60 transition-colors reveal reveal-d${i+1}`}>
                <div className="flex gap-0.5 mb-5">
                  {[...Array(5)].map((_,i) => <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
                </div>
                <p className="text-slate-200 text-sm leading-relaxed flex-1 mb-6">&quot;{t.quote}&quot;</p>
                <div className="border-t border-slate-700/50 pt-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.grad} flex items-center justify-center text-white font-black text-sm flex-shrink-0`}>
                    {t.initials}
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">{t.name}</p>
                    <p className="text-slate-400 text-xs">{t.role} · {t.loc}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">{t.tag}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ 10. PRICING ══════════════ */}
      <section id="pricing" className="py-24 px-4 border-t border-slate-800"
        style={{background:"linear-gradient(180deg,#080f1c 0%,#0f172a 100%)"}}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 reveal">
            <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">Simple, Honest Pricing</h2>
            <p className="text-slate-400">No setup fees. No per-transaction cuts. No surprises. All prices in Rwandan Francs.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 reveal">
            {[
              {name:"Starter", price:"RWF 15,000", period:"/month",
               desc:"One module — perfect for a single business type going digital.",
               features:["1 module (Super, Bakery, Bar, or Restaurant)","Up to 3 staff accounts","AI daily briefings","SMS notifications","PDF & Excel exports"],
               cta:"Start Free Trial", href:"/onboarding", highlight:false},
              {name:"Professional", price:"RWF 35,000", period:"/month",
               desc:"Full platform — all modules, more staff, priority support.",
               features:["All 4 modules included","Up to 20 staff accounts","AI daily briefings","Unlimited SMS","Full reports & exports","Priority support","Multi-branch support"],
               cta:"Get Professional", href:"/onboarding", highlight:true},
              {name:"Enterprise", price:"Custom", period:"tailored",
               desc:"For chains, franchises, and businesses with advanced compliance needs.",
               features:["Unlimited modules & staff","Custom integrations","Dedicated account manager","On-site training in Kigali","Custom reports & branding","SLA guarantee"],
               cta:"Contact Us", href:"mailto:info@delronpos.rw", highlight:false},
            ].map(plan => (
              <div key={plan.name}
                className={`relative rounded-2xl border p-7 flex flex-col hover:-translate-y-1 transition-transform ${
                  plan.highlight
                    ? "border-blue-500 bg-blue-600/5 ring-1 ring-blue-500/20 shadow-xl shadow-blue-500/10"
                    : "border-slate-700/60 bg-slate-800/20"
                }`}>
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="font-black text-xs px-3 py-1 rounded-full text-white"
                      style={{background:"linear-gradient(135deg,#2563eb,#1d4ed8)"}}>
                      Most Popular
                    </span>
                  </div>
                )}
                <p className="text-slate-400 text-sm font-bold mb-1">{plan.name}</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className={`text-3xl font-black ${plan.highlight?"text-blue-400":"text-white"}`}>{plan.price}</span>
                  <span className="text-slate-500 text-sm mb-0.5">{plan.period}</span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed mb-6">{plan.desc}</p>
                <ul className="space-y-2.5 mb-7 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-300">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link href={plan.href}
                  className={`block w-full text-center py-3 rounded-xl font-black text-sm transition-all hover:brightness-110 ${
                    plan.highlight
                      ? "text-white"
                      : "border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white"
                  }`}
                  style={plan.highlight?{background:"linear-gradient(135deg,#2563eb,#1d4ed8)"}:{}}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-sm mt-10 max-w-2xl mx-auto">
            <span className="text-emerald-400 font-bold">14-day free trial on all plans. No credit card required.</span>
            <span className="text-slate-400"> All plans include </span>
            <span className="text-white font-semibold">AI assistant, PDF reports, and SMS notifications</span>
            <span className="text-slate-400"> — features competitors charge extra for or don&apos;t offer at all.</span>
          </p>
        </div>
      </section>

      {/* ══════════════ 11. FAQ ══════════════ */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16 reveal">
            <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-3">FAQ</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">Common Questions</h2>
          </div>
          <div className="space-y-3 reveal">
            {[
              {q:"Does DELRON work without internet?",
               a:"Staff log in using their PIN on a local device. Core POS — sales, receipts, inventory updates — works with limited connectivity. AI features and SMS require an internet connection."},
              {q:"Can I use it for multiple branches?",
               a:"Yes. DELRON supports multi-branch management from a single owner account. Each branch has its own inventory, staff, and reporting — and the owner sees all branches from one dashboard."},
              {q:"Does it support MTN MoMo and Airtel Money?",
               a:"MoMo and Airtel Money integration is in the roadmap and available on Enterprise plans by request. Cash, card, and manual mobile payment recording is supported on all plans today."},
              {q:"Is my data secure?",
               a:"All data is encrypted in transit and at rest using Supabase (PostgreSQL) with row-level security. Your data is never shared or sold. Automated hourly backups run continuously."},
              {q:"Can the AI speak Kinyarwanda?",
               a:"Yes. The DELRON AI assistant (powered by Google Gemini) understands and responds in Kinyarwanda. Ask about your sales, inventory, or staff performance in Kinyarwanda and get a clear, accurate answer."},
              {q:"How is DELRON different from other POS systems?",
               a:"Most POS systems are built for simple retail — they record a sale and print a receipt. DELRON goes further: AI daily briefings that analyse your data every morning, bakery production tracking with ingredient costing, shot variance detection that flags bartender theft before it compounds, and Kinyarwanda SMS alerts your staff actually read. Generic POS software treats a supermarket, bakery, and bar the same way — DELRON has dedicated modules with workflows specific to each business type. You also get a 14-day free trial with no credit card, and features most competitors charge extra for or don't offer at all."},
              {q:"Can I install DELRON as an app on my computer or phone?",
               a:"Yes. DELRON is a Progressive Web App (PWA) — install it directly from your browser with no app store required. On Windows or Mac, click 'Install' in your browser's address bar. On Android, tap 'Add to Home Screen'. On iPhone, use Safari's Share menu → 'Add to Home Screen'. Once installed, it launches like a native app, works offline for core POS functions, and updates automatically — no manual downloads ever needed."},
            ].map(({q,a}) => (
              <details key={q}
                className="group border border-slate-700/50 rounded-xl bg-slate-800/30 hover:border-slate-600/60 transition-colors">
                <summary className="flex items-center justify-between px-5 py-4 gap-4">
                  <span className="font-bold text-white text-sm">{q}</span>
                  <ChevronDown className="faq-icon w-4 h-4 text-slate-400 flex-shrink-0" />
                </summary>
                <div className="faq-body px-5 pb-5">
                  <p className="text-slate-400 text-sm leading-relaxed">{a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ 12. FINAL CTA ══════════════ */}
      <section className="py-28 px-4 relative overflow-hidden border-t border-slate-800">
        <div className="absolute inset-0"
          style={{background:"linear-gradient(135deg,#040b17 0%,#08152e 50%,#040b17 100%)"}} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[280px] rounded-full pointer-events-none"
          style={{background:"radial-gradient(ellipse,rgba(37,99,235,.14),transparent 70%)"}} />

        <div className="relative z-10 max-w-3xl mx-auto text-center reveal">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/25 bg-blue-500/8 text-blue-300 text-xs font-bold mb-8 tracking-wider">
            <Zap className="w-3 h-3" />
            14 DAYS FREE · NO CREDIT CARD · CANCEL ANYTIME
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-5 leading-tight">
            Ready to Leave Your<br />
            <span className="text-slate-400">Old POS Behind?</span>
          </h2>
          <p className="text-slate-400 text-lg mb-10 leading-relaxed max-w-2xl mx-auto">
            Join forward-thinking Rwandan businesses running smarter with DELRON AI POS. Setup takes under an hour. Your first AI briefing arrives tomorrow morning.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/onboarding"
              className="group inline-flex items-center justify-center gap-2.5 px-10 py-4 rounded-xl font-black text-lg text-white transition-all hover:brightness-110"
              style={{background:"linear-gradient(135deg,#2563eb,#1d4ed8)",boxShadow:"0 4px 40px rgba(37,99,235,.5)"}}>
              Start Free Trial Today
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/login"
              className="inline-flex items-center justify-center px-8 py-4 rounded-xl border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-semibold text-base transition-colors">
              Sign In
            </Link>
          </div>
          <p className="text-slate-600 text-sm mt-8">🇷🇼 Built in Rwanda for Rwandan businesses · info@delronpos.rw</p>
        </div>
      </section>

      {/* Scroll-reveal script */}
      <script dangerouslySetInnerHTML={{ __html: `
        (function(){
          var io = new IntersectionObserver(function(entries){
            entries.forEach(function(e){
              if(e.isIntersecting){ e.target.classList.add('in-view'); io.unobserve(e.target); }
            });
          },{threshold:0.08,rootMargin:'0px 0px -40px 0px'});
          document.querySelectorAll('.reveal').forEach(function(el){ io.observe(el); });
        })();
      ` }} />
    </>
  );
}
