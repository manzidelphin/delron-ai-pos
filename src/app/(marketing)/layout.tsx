"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, Zap, Instagram } from "lucide-react";

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
                <li>
                  <Link href="/terms" className="hover:text-white transition-colors">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
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
                <li>info@delronpos.com</li>
                <li>support@delronpos.com</li>
                <li>+250 785 995 840</li>
                <li>
                  <a
                    href="https://wa.me/250785995840"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors"
                  >
                    {/* WhatsApp SVG icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                    </svg>
                    +250 785 995 840
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.instagram.com/delron_ai_pos"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors"
                  >
                    <Instagram className="w-4 h-4" />
                    @delron_ai_pos
                  </a>
                </li>
                <li>Kigali, Rwanda</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-slate-500 text-xs">© 2026 DELRON AI POS. All rights reserved.</p>
            <p className="text-slate-600 text-xs">Powered by DELRON AI POS</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
