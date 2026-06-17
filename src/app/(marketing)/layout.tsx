"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, Zap } from "lucide-react";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      {/* Navbar */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
          scrolled
            ? "bg-[#0f172a]/95 backdrop-blur-md border-b border-slate-800/60 shadow-lg"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/30">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg bg-gradient-to-r from-white to-blue-400 bg-clip-text text-transparent">
                DELRON AI POS
              </span>
            </Link>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-slate-300 hover:text-white text-sm transition-colors">
                Features
              </a>
              <a href="#modules" className="text-slate-300 hover:text-white text-sm transition-colors">
                Modules
              </a>
              <a href="#pricing" className="text-slate-300 hover:text-white text-sm transition-colors">
                Pricing
              </a>
            </div>

            {/* Desktop CTA buttons */}
            <div className="hidden md:flex items-center gap-3">
              <Link
                href="/login"
                className="text-slate-300 hover:text-white text-sm px-4 py-2 rounded-lg border border-slate-700 hover:border-slate-500 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/onboarding"
                className="text-sm px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors shadow-md shadow-blue-600/25"
              >
                Get Started
              </Link>
            </div>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 text-slate-400 hover:text-white transition-colors"
              aria-label="Toggle menu"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {menuOpen && (
          <div className="md:hidden bg-[#0f172a] border-t border-slate-800 px-4 py-4 space-y-1">
            <a
              href="#features"
              onClick={() => setMenuOpen(false)}
              className="block text-slate-300 hover:text-white py-2.5 text-sm border-b border-slate-800/60"
            >
              Features
            </a>
            <a
              href="#modules"
              onClick={() => setMenuOpen(false)}
              className="block text-slate-300 hover:text-white py-2.5 text-sm border-b border-slate-800/60"
            >
              Modules
            </a>
            <a
              href="#pricing"
              onClick={() => setMenuOpen(false)}
              className="block text-slate-300 hover:text-white py-2.5 text-sm"
            >
              Pricing
            </a>
            <div className="pt-4 flex flex-col gap-2">
              <Link
                href="/login"
                className="block text-center text-sm px-4 py-2.5 rounded-lg border border-slate-700 text-slate-300 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/onboarding"
                className="block text-center text-sm px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Page content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-14 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="font-bold text-sm">DELRON AI POS</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed max-w-[200px]">
                Rwanda&apos;s first AI-powered point-of-sale system. Built for supermarkets, bakeries, and bars.
              </p>
              <p className="text-slate-500 text-xs mt-4">🇷🇼 Built with ♥ in Rwanda</p>
            </div>

            <div>
              <p className="font-semibold text-sm mb-4 text-slate-200">Product</p>
              <ul className="space-y-2.5 text-slate-400 text-xs">
                <li>
                  <a href="#features" className="hover:text-white transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#modules" className="hover:text-white transition-colors">
                    Modules
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-white transition-colors">
                    Pricing
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <p className="font-semibold text-sm mb-4 text-slate-200">Account</p>
              <ul className="space-y-2.5 text-slate-400 text-xs">
                <li>
                  <Link href="/login" className="hover:text-white transition-colors">
                    Sign In
                  </Link>
                </li>
                <li>
                  <Link href="/onboarding" className="hover:text-white transition-colors">
                    Create Account
                  </Link>
                </li>
                <li>
                  <Link href="/pos-login" className="hover:text-white transition-colors">
                    Staff POS Login
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="font-semibold text-sm mb-4 text-slate-200">Contact</p>
              <ul className="space-y-2.5 text-slate-400 text-xs">
                <li>info@delronpos.rw</li>
                <li>+250 788 000 000</li>
                <li>Kigali, Rwanda</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-slate-500 text-xs">© 2026 DELRON AI POS. All rights reserved.</p>
            <p className="text-slate-600 text-xs">Powered by Claude AI · Supabase · Next.js 14</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
