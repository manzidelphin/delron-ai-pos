import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import { Check, Plus, MapPin, ShoppingCart, Cake, Beer, Utensils, Bot } from "lucide-react";
import { LandingMotion } from "./landing-motion";

export const metadata = {
  title: "DELRON AI POS | AI-Powered POS for Rwandan Businesses",
  description:
    "AI-powered point-of-sale built for Rwandan supermarkets, bakeries, bars, and restaurants. Founded by Manzi Delphin. MTN MoMo, Kinyarwanda SMS, real-time analytics.",
  keywords: [
    "DELRON", "DelronPOS", "delronpos.com",
    "Rwanda POS", "Rwanda point of sale",
    "Manzi Delphin", "AUCA Rwanda",
    "MTN MoMo POS", "Kigali business software",
    "AI POS Rwanda", "bakery software Rwanda",
    "bar management Rwanda", "supermarket software Rwanda",
  ],
  authors: [{ name: "Manzi Delphin", url: "https://www.delronpos.com" }],
  creator: "Manzi Delphin",
  publisher: "DELRON AI POS",
  openGraph: {
    type: "website",
    url: "https://www.delronpos.com",
    title: "DELRON AI POS — AI-Powered POS for Rwandan Businesses",
    description: "One system for your supermarket, bakery, bar, and restaurant. Built in Kigali by Manzi Delphin.",
    siteName: "DELRON AI POS",
    locale: "en_RW",
  },
  twitter: {
    card: "summary_large_image",
    title: "DELRON AI POS — AI-Powered POS for Rwandan Businesses",
    description: "AI-powered POS for Rwandan businesses. MTN MoMo, Kinyarwanda SMS, theft detection.",
    creator: "@delronpos",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
    },
  },
  alternates: {
    canonical: "https://www.delronpos.com",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "DELRON AI POS",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, Android, iOS",
  url: "https://www.delronpos.com",
  description:
    "AI-powered point-of-sale and business management platform for Rwandan supermarkets, bakeries, bars, and restaurants. MTN MoMo integration, real-time reporting, and Kinyarwanda support.",
  inLanguage: ["en", "rw"],
  offers: [
    {
      "@type": "Offer",
      name: "Starter",
      price: "15000",
      priceCurrency: "RWF",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "15000",
        priceCurrency: "RWF",
        unitCode: "MON",
      },
    },
    {
      "@type": "Offer",
      name: "Professional",
      price: "35000",
      priceCurrency: "RWF",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "35000",
        priceCurrency: "RWF",
        unitCode: "MON",
      },
    },
  ],
  creator: {
    "@type": "Organization",
    name: "DELRON AI POS",
    url: "https://www.delronpos.com",
    founder: {
      "@type": "Person",
      name: "Manzi Delphin",
    },
    contactPoint: {
      "@type": "ContactPoint",
      email: "info@delronpos.com",
      contactType: "customer support",
      areaServed: "RW",
    },
  },
};

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "DELRON AI POS",
  alternateName: ["DELRON", "Delron POS", "DelronPOS"],
  url: "https://www.delronpos.com",
  logo: "https://www.delronpos.com/icon.png",
  description: "AI-powered point-of-sale and business management platform for supermarkets, bakeries, bars, and restaurants across Rwanda.",
  foundingDate: "2026",
  foundingLocation: {
    "@type": "Place",
    name: "Kigali, Rwanda",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Kigali",
      addressCountry: "RW",
    },
  },
  founder: {
    "@type": "Person",
    name: "Manzi Delphin",
    jobTitle: "Founder & CEO",
    nationality: "Rwandan",
    alumniOf: {
      "@type": "CollegeOrUniversity",
      name: "Adventist University of Central Africa",
      alternateName: "AUCA",
    },
    url: "https://www.delronpos.com",
    worksFor: {
      "@type": "Organization",
      name: "DELRON AI POS",
    },
  },
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: "+250785995840",
      contactType: "customer support",
      email: "support@delronpos.com",
      areaServed: "RW",
      availableLanguage: ["English", "Kinyarwanda"],
    },
    {
      "@type": "ContactPoint",
      telephone: "+250785995840",
      contactType: "sales",
      email: "info@delronpos.com",
      areaServed: "RW",
    },
  ],
  areaServed: {
    "@type": "Country",
    name: "Rwanda",
  },
  sameAs: [
    "https://github.com/manzidelphin",
    "https://www.instagram.com/delron_ai_pos",
    "https://www.delronpos.com",
  ],
  knowsAbout: [
    "Point of Sale Software",
    "Business Management Software",
    "MTN MoMo Integration",
    "Kinyarwanda Language Support",
    "AI Business Intelligence",
    "Rwanda Technology",
  ],
};

const BUSINESSES = [
  {
    icon: ShoppingCart, name: "Supermarket", tint: "#1D4ED8",
    line: "Scan barcodes, sell fast, and know which shelves are running empty before customers notice.",
    points: ["Barcode scanning and label printing", "Stock counts with expected vs counted", "Supplier restock records", "Best sellers and slow movers"],
  },
  {
    icon: Cake, name: "Bakery", tint: "#B45309",
    line: "Plan each day's bake, cost every recipe, and see waste the same day instead of at month end.",
    points: ["Daily production plans", "Ingredients deducted by recipe", "Waste and leftovers recorded", "Production compared with sales"],
  },
  {
    icon: Beer, name: "Bar", tint: "#047857",
    line: "Open tabs per table, sell spirits by the shot, and see when bottles and sales don't match.",
    points: ["Tabs per table, one open bill each", "Single, double, quarter or bottle", "Removed items need a reason", "Bottles used vs shots sold"],
  },
  {
    icon: Utensils, name: "Restaurant", tint: "#7C3AED",
    line: "Take orders at the table, send them to the kitchen screen, and close the bill in one place.",
    points: ["Menu with categories", "Kitchen display for new orders", "Waiter orders per table", "Ingredients deducted by recipe"],
  },
];

const DAY = [
  { time: "08:00", title: "Stock email and SMS", desc: "The owner and managers get one email listing what is out of stock and what is running low, with how much to order." },
  { time: "All day", title: "Staff sell on the POS", desc: "Cashiers sign in with a PIN. Every sale, tab and receipt is recorded under their name. If an item runs out, you get an email straight away." },
  { time: "Shift end", title: "Cash is counted", desc: "The cashier counts the drawer. DELRON compares it with the sales and sends you an SMS if money or stock is short." },
  { time: "23:55", title: "Daily report", desc: "Revenue, top products and cash differences for the day arrive in your email, even if you never opened the app." },
];

const FEATURE_GROUPS = [
  { title: "Selling", items: ["POS on any tablet, phone or computer", "Receipts with your MoMo Pay code", "Cash, MoMo, card and credit sales", "Customer display on a second screen"] },
  { title: "Stock", items: ["Low and out-of-stock alerts by email", "Restock and closing counts", "Barcode label sheets", "Recipes that deduct ingredients"] },
  { title: "Money", items: ["Credit customers and amounts owed", "SMS payment reminders in Kinyarwanda", "Shift cash reconciliation", "PDF and Excel reports"] },
  { title: "Team", items: ["Roles for owner, manager, cashier, baker, waiter, bartender and chef", "PIN sign-in for staff on shared devices", "Sales per staff member", "Several branches under one owner"] },
];

const STEPS = [
  { title: "Create your account", desc: "Sign up with your email and business name. It takes about two minutes." },
  { title: "Choose your modules", desc: "Supermarket, bakery, bar, restaurant, or any mix of them." },
  { title: "Add products and staff", desc: "Enter prices and stock, print barcodes, and give each staff member a PIN." },
  { title: "Start selling", desc: "Open the POS on a tablet or phone and make your first sale." },
];

const PLANS = [
  {
    name: "Starter", price: "15,000", period: "RWF / month",
    desc: "One module for a single business going digital.",
    features: ["1 module (supermarket, bakery, bar or restaurant)", "Up to 3 staff accounts", "AI daily briefings", "SMS notifications", "PDF and Excel exports"],
    cta: "Start free trial", href: "/onboarding", highlight: false,
  },
  {
    name: "Professional", price: "35,000", period: "RWF / month",
    desc: "Every module, more staff and priority support.",
    features: ["All 4 modules", "Up to 20 staff accounts", "AI daily briefings", "Unlimited SMS", "Full reports and exports", "Priority support", "Several branches"],
    cta: "Start free trial", href: "/onboarding", highlight: true,
  },
  {
    name: "Enterprise", price: "Custom", period: "",
    desc: "For chains and franchises with special needs.",
    features: ["Unlimited modules and staff", "Custom integrations", "Dedicated account manager", "On-site training in Kigali", "Custom reports and branding"],
    cta: "Contact us", href: "mailto:info@delronpos.com", highlight: false,
  },
];

const FAQ = [
  {
    q: "Does DELRON work without internet?",
    a: "No. DELRON runs in the browser and needs a connection; a normal mobile data bundle is enough. If the connection drops, staff see a page asking them to reconnect, and sales are not recorded until it is back.",
  },
  {
    q: "How do customers pay with MoMo?",
    a: "Add your MTN MoMo Pay code in Settings and it is printed under the total on every receipt, so the customer can dial it and pay straight away. The cashier then records the sale as a MoMo payment. Airtel Money is not supported yet.",
  },
  {
    q: "Can I use it for several branches?",
    a: "Yes. Each branch has its own stock, staff and reports, and the owner sees every branch from one account.",
  },
  {
    q: "Is my data safe?",
    a: "Data is encrypted in transit and stored with Supabase (PostgreSQL), which keeps regular backups. Owners and managers sign in with an email code, staff sign in with a PIN, and idle sessions sign out after 30 minutes. Your data is never sold or shared.",
  },
  {
    q: "Does the AI understand Kinyarwanda?",
    a: "Yes. The assistant, powered by Google Gemini, answers questions about your sales, stock and staff in Kinyarwanda or English.",
  },
  {
    q: "Can I install it like an app?",
    a: "Yes. On Android, tap 'Add to Home Screen'. On iPhone, use Safari's Share menu and 'Add to Home Screen'. On a computer, click 'Install' in the browser's address bar. It opens in its own window and updates by itself.",
  },
];

function Receipt() {
  const lines = [
    { name: "Inyange Milk 1L", qty: 2, price: 600 },
    { name: "Bread 500g", qty: 1, price: 1200 },
    { name: "Primus 72cl", qty: 3, price: 1000 },
    { name: "Sugar 1kg", qty: 1, price: 1500 },
  ];
  const total = lines.reduce((s, l) => s + l.qty * l.price, 0);
  const rwf = (n: number) => n.toLocaleString("en-US");
  // Each printed row appears a little after the one before, like a thermal printer.
  const row = (i: number) => ({ "--r": i } as React.CSSProperties);
  return (
    <div className="receipt-float relative w-[300px] sm:w-[320px]" aria-hidden="true">
      {/* Printer mouth */}
      <div className="relative z-10 h-5 rounded-full bg-[#0B1F3A] shadow-[0_6px_16px_rgba(11,31,58,0.25)]">
        <div className="absolute left-4 right-4 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-black/50" />
        <span className="printer-led absolute right-3 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[#34D399]" />
      </div>
      <div className="relative -mt-2.5 mx-3 overflow-hidden">
        <div className="receipt-paper bg-white px-6 pt-7 pb-8 font-mono text-[12px] leading-[1.55] text-[#1f2937] shadow-[0_18px_40px_-12px_rgba(11,31,58,0.28)]">
          <div className="text-center rc-row" style={row(0)}>
            <p className="font-sans text-[15px] font-extrabold tracking-tight text-black">INZOZI SUPERMARKET</p>
            <p className="text-[11px] text-[#6b7280]">Kimironko, Kigali · 0788 000 000</p>
            <p className="text-[11px] text-[#6b7280]">14/11/2026 18:42 · Cashier: Aline</p>
          </div>
          <div className="my-3 border-t border-dashed border-[#cbd5e1] rc-row" style={row(1)} />
          {lines.map((l, i) => (
            <div key={l.name} className="mb-1.5 rc-row" style={row(2 + i)}>
              <div className="flex justify-between gap-3">
                <span className="truncate">{l.name}</span>
                <span className="tabular-nums">RWF {rwf(l.qty * l.price)}</span>
              </div>
              <div className="text-[11px] text-[#6b7280]">{l.qty} × RWF {rwf(l.price)}</div>
            </div>
          ))}
          <div className="my-3 border-t border-dashed border-[#cbd5e1] rc-row" style={row(6)} />
          <div className="flex justify-between font-sans text-[15px] font-extrabold text-black rc-row rc-total" style={row(7)}>
            <span>TOTAL</span>
            <span className="tabular-nums">RWF {rwf(total)}</span>
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#f1d27a] bg-[#FFF8DC] px-3 py-2.5 rc-row" style={row(8)}>
            <div className="momo-badge relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FFCB05] font-sans text-[10px] font-extrabold leading-none text-black">
              MoMo
            </div>
            <div className="font-sans">
              <p className="text-[11px] text-[#6b7280]">Pay with MoMo Pay</p>
              <p className="text-[14px] font-bold tabular-nums text-black">*182*8*1*123456#</p>
            </div>
          </div>
          <p className="mt-4 text-center text-[11px] text-[#6b7280] rc-row" style={row(9)}>Murakoze! Thank you for shopping.</p>
          <div className="mt-3 flex items-center justify-center gap-1.5 opacity-70 rc-row" style={row(10)}>
            <Image src="/brand/logo-mark.png" alt="" width={14} height={14} className="h-3.5 w-3.5 rounded grayscale" />
            <span className="font-sans text-[10px] font-semibold text-[#6b7280]">DELRON AI POS</span>
          </div>
        </div>
        <div className="receipt-edge h-3 w-full" />
      </div>
    </div>
  );
}

const MOTION_CSS = `
  /* ── Hero: plays once on load ── */
  @keyframes riseIn { from { opacity: 0; transform: translateY(26px); } to { opacity: 1; transform: none; } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes receiptPrint { from { transform: translateY(-100%); } to { transform: translateY(0); } }
  @keyframes rowIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
  @keyframes totalFlash { 0%, 100% { background: transparent; } 40% { background: #EAF1FF; } }
  @keyframes momoRing { 0% { box-shadow: 0 0 0 0 rgba(255,203,5,.7); } 100% { box-shadow: 0 0 0 16px rgba(255,203,5,0); } }
  @keyframes floatY { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
  @keyframes ledBlink { 0%, 100% { opacity: 1; } 50% { opacity: .25; } }
  @keyframes panelIn { from { opacity: 0; transform: scale(.94); } to { opacity: 1; transform: none; } }

  .hero-line { display: block; animation: riseIn .8s cubic-bezier(.2,.7,.2,1) both; animation-delay: calc(.1s + var(--l) * .12s); }
  .hero-fade { animation: riseIn .8s cubic-bezier(.2,.7,.2,1) both; animation-delay: var(--d, .5s); }
  .hero-panel { animation: panelIn 1s cubic-bezier(.2,.7,.2,1) .15s both; }
  .receipt-paper, .receipt-edge { animation: receiptPrint 1.6s cubic-bezier(.2,.7,.2,1) .5s both; }
  .rc-row { animation: rowIn .35s ease-out both; animation-delay: calc(.8s + var(--r) * .13s); }
  .rc-total { animation: rowIn .35s ease-out both, totalFlash 1.2s ease 2.05s; animation-delay: calc(.8s + var(--r) * .13s), 2.05s; margin: 0 -6px; padding: 2px 6px; border-radius: 6px; }
  .momo-badge { animation: momoRing 1.1s ease-out 2.3s 3; }
  .receipt-float { animation: floatY 6s ease-in-out 3s infinite; }
  .printer-led { animation: ledBlink .5s steps(1) .5s 4; }
  .receipt-edge {
    background:
      linear-gradient(135deg, #fff 33.33%, transparent 33.33%) 0 0 / 12px 12px repeat-x,
      linear-gradient(225deg, #fff 33.33%, transparent 33.33%) 0 0 / 12px 12px repeat-x;
  }

  /* ── Scroll reveals (only once JavaScript has marked the page) ── */
  .lp-js [data-reveal] { opacity: 0; transform: translateY(28px); transition: opacity .7s ease, transform .8s cubic-bezier(.2,.7,.2,1); }
  .lp-js [data-reveal].in { opacity: 1; transform: none; }
  .lp-js [data-reveal="stagger"] { opacity: 1; transform: none; }
  .lp-js [data-reveal="stagger"] > * { opacity: 0; transform: translateY(32px) scale(.98); transition: opacity .6s ease, transform .7s cubic-bezier(.2,.7,.2,1); transition-delay: calc(var(--i, 0) * 110ms); }
  .lp-js [data-reveal="stagger"].in > * { opacity: 1; transform: none; }

  /* Timeline: the line draws across, then each stop lights up */
  .tl-line { transform-origin: left; }
  .lp-js .tl .tl-line { transform: scaleX(0); transition: transform 1.6s cubic-bezier(.4,0,.2,1) .2s; }
  .lp-js .tl.in .tl-line { transform: scaleX(1); }
  .lp-js .tl .tl-dot { transform: scale(0); transition: transform .45s cubic-bezier(.3,1.6,.5,1); transition-delay: calc(.3s + var(--i) * .4s); }
  .lp-js .tl.in .tl-dot { transform: scale(1); }
  .lp-js .tl .tl-text { opacity: 0; transform: translateY(14px); transition: opacity .6s ease, transform .6s ease; transition-delay: calc(.4s + var(--i) * .4s); }
  .lp-js .tl.in .tl-text { opacity: 1; transform: none; }

  /* Chat: messages arrive one by one, with a typing bubble before the answer */
  @keyframes bubbleIn { from { opacity: 0; transform: translateY(12px) scale(.96); } to { opacity: 1; transform: none; } }
  @keyframes typingShow { 0% { opacity: 0; } 12%, 85% { opacity: 1; } 100% { opacity: 0; } }
  @keyframes dot { 0%, 80%, 100% { transform: translateY(0); opacity: .4; } 40% { transform: translateY(-4px); opacity: 1; } }
  .lp-js .chat .bubble { opacity: 0; }
  .lp-js .chat.in .b1 { animation: bubbleIn .5s ease .2s both; }
  .lp-js .chat.in .b2 { animation: bubbleIn .5s ease 1.3s both; }
  .lp-js .chat.in .b3 { animation: bubbleIn .5s ease 3.1s both; }
  .chat .typing { opacity: 0; }
  .lp-js .chat.in .typing { animation: typingShow 1.3s ease 1.9s both; }
  .typing span { display: inline-block; animation: dot 1s infinite; }
  .typing span:nth-child(2) { animation-delay: .15s; }
  .typing span:nth-child(3) { animation-delay: .3s; }

  /* Hover and press feedback */
  .lift { transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease; }
  .lift:hover { transform: translateY(-5px); box-shadow: 0 18px 36px -18px rgba(11,31,58,.28); }
  .lp-js [data-reveal="stagger"].in > .lift:hover { transform: translateY(-5px); transition-delay: 0s; }
  .lift:hover .icon-pop { transform: scale(1.12) rotate(-6deg); }
  .icon-pop { transition: transform .3s cubic-bezier(.3,1.6,.5,1); }
  .press { transition: transform .12s ease, background-color .2s ease, border-color .2s ease; }
  .press:active { transform: scale(.97); }
  .feat-rule { transform-origin: left; }
  .lp-js [data-reveal="stagger"] > * .feat-rule { transform: scaleX(0); transition: transform .9s cubic-bezier(.4,0,.2,1); transition-delay: calc(var(--i, 0) * 110ms + .1s); }
  .lp-js [data-reveal="stagger"].in > * .feat-rule { transform: scaleX(1); }

  @keyframes drift { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(-60px, 40px); } }
  .cta-glow { animation: drift 12s ease-in-out infinite; }

  details summary { list-style: none; cursor: pointer; }
  details summary::-webkit-details-marker { display: none; }
  details[open] .faq-icon { transform: rotate(45deg); }
  .faq-icon { transition: transform .2s ease; }
  details[open] .faq-body { animation: riseIn .35s ease both; }
  .lp a:focus-visible, .lp summary:focus-visible { outline: 2px solid #1D4ED8; outline-offset: 3px; border-radius: 8px; }

  @media (prefers-reduced-motion: reduce) {
    .lp *, .lp *::before, .lp *::after { animation: none !important; transition: none !important; }
    .lp [data-reveal], .lp [data-reveal] > *, .lp .tl-dot, .lp .tl-text, .lp .bubble, .lp .tl-line, .lp .feat-rule { opacity: 1 !important; transform: none !important; }
    .lp .typing { display: none; }
  }
`;

const d = (s: number) => ({ "--d": `${s}s` } as React.CSSProperties);
const idx = (i: number) => ({ "--i": i } as React.CSSProperties);

export default async function MarketingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: MOTION_CSS }} />
      <LandingMotion />

      <div className="lp">
        {/* ── Hero ── */}
        <section className="pt-28 sm:pt-32 pb-20 px-4 sm:px-6 overflow-hidden">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-[1.55fr_1fr] gap-14 lg:gap-8 items-center">
            <div>
              <p className="hero-fade inline-flex items-center gap-2 rounded-full border border-[#DCE6F5] bg-[#F5F8FC] px-3.5 py-1.5 text-[13px] font-medium text-[#1D4ED8] mb-8" style={d(0)}>
                <MapPin className="w-3.5 h-3.5" /> Made in Kigali for Rwandan businesses
              </p>
              <h1 className="text-[40px] leading-[1.06] sm:text-[56px] sm:leading-[1.04] font-extrabold tracking-[-0.03em] text-[#0B1F3A] mb-6">
                <span className="hero-line" style={{ "--l": 0 } as React.CSSProperties}>Know what your business</span>{" "}
                <span className="hero-line" style={{ "--l": 1 } as React.CSSProperties}>sold today, even when</span>{" "}
                <span className="hero-line" style={{ "--l": 2 } as React.CSSProperties}>you&apos;re away.</span>
              </h1>
              <p className="hero-fade text-lg leading-relaxed text-[#475569] max-w-[54ch] mb-9" style={d(0.5)}>
                DELRON is the point of sale for supermarkets, bakeries, bars and restaurants in Rwanda. Your staff sell on a tablet or phone. You follow every sale, every bottle and every franc from your own phone.
              </p>
              <div className="hero-fade flex flex-col sm:flex-row gap-3 mb-10" style={d(0.65)}>
                <Link href="/onboarding" className="press inline-flex items-center justify-center gap-2 rounded-lg bg-[#1D4ED8] hover:bg-[#1a44c2] px-7 py-3.5 text-[15px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(29,78,216,.7)]">
                  Start 3-month free trial
                </Link>
                <a href="#day" className="press inline-flex items-center justify-center gap-2 rounded-lg border border-[#D5DDE8] hover:border-[#94A3B8] px-7 py-3.5 text-[15px] font-semibold text-[#0B1F3A]">
                  See how a day works
                </a>
              </div>
              <ul className="hero-fade flex flex-col sm:flex-row sm:flex-wrap gap-x-6 gap-y-2.5 text-sm text-[#475569]" style={d(0.8)}>
                {["No card needed to start", "Receipts show your MoMo Pay code", "English and Kinyarwanda"].map((t) => (
                  <li key={t} className="inline-flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#047857]" /> {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex justify-center lg:justify-end">
              <div className="relative">
                <div className="hero-panel absolute -inset-x-5 sm:-inset-x-10 -inset-y-6 rounded-[32px] bg-[#F5F8FC]" aria-hidden="true" />
                <div className="relative pt-6 pb-2">
                  <Receipt />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Businesses ── */}
        <section id="businesses" className="scroll-mt-16 border-y border-[#E3E8EF] bg-[#F5F8FC] py-20 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="max-w-2xl mb-12" data-reveal="up">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.02em] mb-4">One account for four kinds of business</h2>
              <p className="text-[#475569] text-lg leading-relaxed">Turn on only the modules you run. A hotel with a bar and a restaurant uses both, from the same login.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5" data-reveal="stagger">
              {BUSINESSES.map(({ icon: Icon, name, tint, line, points }, i) => (
                <div key={name} className="lift rounded-2xl bg-white border border-[#E3E8EF] p-6" style={idx(i)}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="icon-pop flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${tint}14`, color: tint }}>
                      <Icon className="w-5 h-5" />
                    </span>
                    <h3 className="text-lg font-bold">{name}</h3>
                  </div>
                  <p className="text-sm leading-relaxed text-[#475569] mb-5">{line}</p>
                  <ul className="space-y-2 border-t border-[#EEF2F6] pt-4">
                    {points.map((p) => (
                      <li key={p} className="flex items-start gap-2 text-sm text-[#334155]">
                        <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: tint }} /> {p}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── A day with DELRON ── */}
        <section id="day" className="scroll-mt-16 py-24 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="max-w-2xl mb-14" data-reveal="up">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.02em] mb-4">A normal day with DELRON</h2>
              <p className="text-[#475569] text-lg leading-relaxed">You don&apos;t have to stand behind the counter to know what happened. This is what arrives on its own.</p>
            </div>
            <ol className="tl relative grid md:grid-cols-4 gap-10 md:gap-6" data-reveal="timeline">
              <div className="tl-line hidden md:block absolute left-0 right-0 top-[7px] h-[2px] rounded-full bg-gradient-to-r from-[#1D4ED8] to-[#93B4F5]" aria-hidden="true" />
              <div className="md:hidden absolute left-[7px] top-2 bottom-2 w-px bg-[#D5DDE8]" aria-hidden="true" />
              {DAY.map((dd, i) => (
                <li key={dd.title} className="relative pl-7 md:pl-0" style={idx(i)}>
                  <span className="tl-dot absolute left-0 top-[3px] md:static md:block h-[15px] w-[15px] rounded-full border-[3px] border-white bg-[#1D4ED8] ring-1 ring-[#1D4ED8] md:mb-6" aria-hidden="true" />
                  <div className="tl-text">
                    <p className="text-sm font-bold text-[#1D4ED8] tabular-nums mb-1.5">{dd.time}</p>
                    <h3 className="text-lg font-bold mb-2">{dd.title}</h3>
                    <p className="text-sm leading-relaxed text-[#475569]">{dd.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── AI assistant ── */}
        <section className="border-y border-[#E3E8EF] bg-[#F5F8FC] py-24 px-4 sm:px-6 overflow-hidden">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-14 items-center">
            <div data-reveal="up">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.02em] mb-5">Ask about your business in Kinyarwanda</h2>
              <p className="text-[#475569] text-lg leading-relaxed mb-8">
                The DELRON assistant reads your sales, stock and staff records and answers in plain words. Each morning it writes a short briefing: what sold, what is running low, and what looks unusual.
              </p>
              <ul className="space-y-3">
                {[
                  "A morning briefing on your dashboard",
                  "Questions answered in Kinyarwanda or English",
                  "Unusual discounts, missing shots and low stock pointed out",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3 text-[15px] text-[#334155]">
                    <Check className="w-5 h-5 text-[#047857] shrink-0" /> {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="chat rounded-2xl border border-[#E3E8EF] bg-white shadow-[0_18px_40px_-20px_rgba(11,31,58,0.25)] overflow-hidden" data-reveal="chat" aria-hidden="true">
              <div className="flex items-center gap-3 border-b border-[#EEF2F6] px-5 py-3.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0B1F3A] text-white">
                  <Bot className="w-4 h-4" />
                </span>
                <div>
                  <p className="text-sm font-bold">DELRON assistant</p>
                  <p className="text-xs text-[#64748B]">Inzozi Supermarket</p>
                </div>
                <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-[#047857]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" /> Online
                </span>
              </div>
              <div className="space-y-4 p-5 text-[14px] leading-relaxed min-h-[260px]">
                <div className="bubble b1 max-w-[88%] rounded-2xl rounded-tl-sm bg-[#F1F5FA] px-4 py-3 text-[#334155]">
                  Good morning, Jean-Pierre. Yesterday you sold <b className="text-[#0B1F3A]">RWF 847,200</b>, 12% more than last Tuesday. Sugar 1kg is almost finished: 4 left.
                </div>
                <div className="bubble b2 ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-[#1D4ED8] px-4 py-3 text-white">
                  Ni nde wagurishije byinshi kuwa gatanu?
                </div>
                <div className="grid">
                  <div className="typing [grid-area:1/1] self-start w-fit rounded-2xl rounded-tl-sm bg-[#F1F5FA] px-4 py-3.5 text-[#64748B]">
                    <span className="h-1.5 w-1.5 rounded-full bg-current" /> <span className="h-1.5 w-1.5 rounded-full bg-current" /> <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  </div>
                  <div className="bubble b3 [grid-area:1/1] max-w-[88%] rounded-2xl rounded-tl-sm bg-[#F1F5FA] px-4 py-3 text-[#334155]">
                    Kuwa gatanu, <b className="text-[#0B1F3A]">Aline</b> niwe wagurishije byinshi: <b className="text-[#0B1F3A]">RWF 312,400</b> mu igurisha 38.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" className="scroll-mt-16 py-24 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="max-w-2xl mb-14" data-reveal="up">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.02em] mb-4">Everything the counter needs</h2>
              <p className="text-[#475569] text-lg leading-relaxed">Included in every plan, with no extra fee per sale.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12" data-reveal="stagger">
              {FEATURE_GROUPS.map((g, i) => (
                <div key={g.title} className="relative pt-5" style={idx(i)}>
                  <div className="feat-rule absolute left-0 right-0 top-0 h-[2px] bg-[#0B1F3A]" aria-hidden="true" />
                  <h3 className="text-lg font-bold mb-4">{g.title}</h3>
                  <ul className="space-y-3">
                    {g.items.map((it) => (
                      <li key={it} className="text-[15px] leading-snug text-[#475569]">{it}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Getting started ── */}
        <section className="border-y border-[#E3E8EF] bg-[#F5F8FC] py-24 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="max-w-2xl mb-14" data-reveal="up">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.02em] mb-4">Selling on your first day</h2>
              <p className="text-[#475569] text-lg leading-relaxed">No installation and no special hardware. A phone, tablet or computer you already own is enough.</p>
            </div>
            <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12" data-reveal="stagger">
              {STEPS.map((s, i) => (
                <li key={s.title} className="lift rounded-2xl bg-white border border-[#E3E8EF] p-6" style={idx(i)}>
                  <span className="icon-pop flex h-8 w-8 items-center justify-center rounded-full bg-[#0B1F3A] text-sm font-bold text-white mb-5">{i + 1}</span>
                  <h3 className="font-bold mb-2">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-[#475569]">{s.desc}</p>
                </li>
              ))}
            </ol>
            <div data-reveal="up">
              <Link href="/onboarding" className="press inline-flex items-center justify-center rounded-lg bg-[#1D4ED8] hover:bg-[#1a44c2] px-7 py-3.5 text-[15px] font-semibold text-white">
                Create your account
              </Link>
            </div>
          </div>
        </section>

        {/* ── Pricing ── */}
        <section id="pricing" className="scroll-mt-16 py-24 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="max-w-2xl mb-14" data-reveal="up">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.02em] mb-4">Simple pricing in Rwandan francs</h2>
              <p className="text-[#475569] text-lg leading-relaxed">Every plan starts with 3 months free. No setup fee, no card needed, no cut of your sales.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-5 items-stretch" data-reveal="stagger">
              {PLANS.map((p, i) => (
                <div
                  key={p.name}
                  style={idx(i)}
                  className={`lift relative flex flex-col rounded-2xl p-7 ${
                    p.highlight ? "bg-[#0B1F3A] text-white md:-my-3 md:py-10" : "bg-white border border-[#E3E8EF]"
                  }`}
                >
                  {p.highlight && (
                    <span className="absolute top-7 right-7 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white">Most chosen</span>
                  )}
                  <p className={`text-sm font-semibold mb-3 ${p.highlight ? "text-[#AFC4E6]" : "text-[#64748B]"}`}>{p.name}</p>
                  <p className="mb-1">
                    <span className="text-4xl font-extrabold tracking-tight tabular-nums">{p.price}</span>
                    {p.period && <span className={`ml-2 text-sm ${p.highlight ? "text-[#AFC4E6]" : "text-[#64748B]"}`}>{p.period}</span>}
                  </p>
                  <p className={`text-sm leading-relaxed mb-6 ${p.highlight ? "text-[#CBD8EE]" : "text-[#475569]"}`}>{p.desc}</p>
                  <ul className="space-y-2.5 mb-8 flex-1">
                    {p.features.map((f) => (
                      <li key={f} className={`flex items-start gap-2.5 text-sm ${p.highlight ? "text-white" : "text-[#334155]"}`}>
                        <Check className={`w-4 h-4 mt-0.5 shrink-0 ${p.highlight ? "text-[#7DD3B0]" : "text-[#047857]"}`} /> {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={p.href}
                    className={`press block rounded-lg py-3 text-center text-sm font-semibold ${
                      p.highlight ? "bg-white text-[#0B1F3A] hover:bg-[#E8EEF8]" : "border border-[#D5DDE8] text-[#0B1F3A] hover:border-[#94A3B8]"
                    }`}
                  >
                    {p.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="border-t border-[#E3E8EF] py-24 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-[1fr_1.6fr] gap-10 lg:gap-16">
            <div data-reveal="up">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.02em] mb-4">Questions owners ask</h2>
              <p className="text-[#475569] leading-relaxed">
                Something else? Call or WhatsApp <a href="https://wa.me/250785995840" className="font-semibold text-[#1D4ED8] hover:underline">+250 785 995 840</a>.
              </p>
            </div>
            <div className="divide-y divide-[#E3E8EF] border-y border-[#E3E8EF]" data-reveal="stagger">
              {FAQ.map(({ q, a }, i) => (
                <details key={q} className="group" style={idx(i)}>
                  <summary className="flex items-center justify-between gap-6 py-5">
                    <span className="font-semibold text-[16px] group-hover:text-[#1D4ED8] transition-colors">{q}</span>
                    <Plus className="faq-icon w-5 h-5 shrink-0 text-[#64748B]" />
                  </summary>
                  <p className="faq-body pb-6 -mt-1 max-w-[65ch] text-[15px] leading-relaxed text-[#475569]">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="px-4 sm:px-6 pb-20">
          <div className="cta-band relative overflow-hidden max-w-6xl mx-auto rounded-3xl bg-[#0B1F3A] px-6 py-16 sm:px-16 sm:py-20 text-white" data-reveal="up">
            <div className="cta-glow pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#1D4ED8]/40 blur-3xl" aria-hidden="true" />
            <div className="relative max-w-2xl">
              <h2 className="text-3xl sm:text-[44px] sm:leading-[1.1] font-extrabold tracking-[-0.02em] mb-5">Try DELRON free for 3 months</h2>
              <p className="text-lg leading-relaxed text-[#CBD8EE] mb-9">
                Set it up today, sell tonight, and get your first daily report at 23:55. If it isn&apos;t for you, stop any time.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/onboarding" className="press inline-flex items-center justify-center rounded-lg bg-white hover:bg-[#E8EEF8] px-7 py-3.5 text-[15px] font-semibold text-[#0B1F3A]">
                  Start free trial
                </Link>
                <a href="https://wa.me/250785995840" target="_blank" rel="noopener noreferrer" className="press inline-flex items-center justify-center rounded-lg border border-white/25 hover:border-white/60 px-7 py-3.5 text-[15px] font-semibold text-white">
                  Talk to us on WhatsApp
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
