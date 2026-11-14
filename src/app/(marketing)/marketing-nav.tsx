"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const LINKS = [
  { href: "/#businesses", label: "Businesses" },
  { href: "/#day", label: "How it works" },
  { href: "/#features", label: "Features" },
  { href: "/#pricing", label: "Pricing" },
];

export function MarketingNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md transition-[border-color,box-shadow] duration-200 border-b ${
        scrolled ? "border-[#E3E8EF] shadow-[0_1px_0_rgba(11,31,58,0.04)]" : "border-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D4ED8]">
            <Image src="/brand/logo-mark.png" alt="" width={32} height={32} className="w-8 h-8 rounded-lg" priority />
            <span className="font-extrabold text-[17px] tracking-tight text-[#0B1F3A]">DELRON</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} className="text-sm text-[#475569] hover:text-[#0B1F3A] transition-colors">
                {l.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2">
            <Link href="/login" className="text-sm font-medium text-[#334155] hover:text-[#0B1F3A] px-4 py-2 rounded-lg transition-colors">
              Sign in
            </Link>
            <Link href="/onboarding" className="text-sm font-semibold px-5 py-2.5 rounded-lg bg-[#0B1F3A] hover:bg-[#13305a] text-white transition-colors">
              Start free trial
            </Link>
          </div>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 -mr-2 text-[#334155]"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-white border-t border-[#E3E8EF] px-4 py-3">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)} className="block py-3 text-[15px] text-[#334155] border-b border-[#EEF2F6]">
              {l.label}
            </a>
          ))}
          <div className="pt-4 pb-2 grid grid-cols-2 gap-2">
            <Link href="/login" className="text-center text-sm font-medium px-4 py-2.5 rounded-lg border border-[#E3E8EF] text-[#334155]">
              Sign in
            </Link>
            <Link href="/onboarding" className="text-center text-sm font-semibold px-4 py-2.5 rounded-lg bg-[#0B1F3A] text-white">
              Start free trial
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
