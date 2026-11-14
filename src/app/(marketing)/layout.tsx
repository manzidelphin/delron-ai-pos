import Image from "next/image";
import Link from "next/link";
import "@fontsource-variable/plus-jakarta-sans";
import { Instagram, Mail, MapPin, Phone } from "lucide-react";
import { MarketingNav } from "./marketing-nav";


export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-[#0B1F3A] antialiased"
      style={{ fontFamily: "'Plus Jakarta Sans Variable', ui-sans-serif, system-ui, sans-serif" }}>
      <MarketingNav />

      <main>{children}</main>

      <footer className="border-t border-[#E3E8EF] bg-white py-14 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-3">
                <Image src="/brand/logo-mark.png" alt="" width={28} height={28} className="w-7 h-7 rounded-lg" />
                <span className="font-extrabold tracking-tight">DELRON AI POS</span>
              </div>
              <p className="text-[#64748B] text-sm leading-relaxed max-w-[240px]">
                Point of sale for supermarkets, bakeries, bars and restaurants in Rwanda. Made in Kigali.
              </p>
            </div>

            <div>
              <p className="font-semibold text-sm mb-4">Product</p>
              <ul className="space-y-2.5 text-[#64748B] text-sm">
                <li><a href="/#features" className="hover:text-[#0B1F3A] transition-colors">Features</a></li>
                <li><a href="/#pricing" className="hover:text-[#0B1F3A] transition-colors">Pricing</a></li>
                <li><Link href="/terms" className="hover:text-[#0B1F3A] transition-colors">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-[#0B1F3A] transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>

            <div>
              <p className="font-semibold text-sm mb-4">Account</p>
              <ul className="space-y-2.5 text-[#64748B] text-sm">
                <li><Link href="/login" className="hover:text-[#0B1F3A] transition-colors">Sign in</Link></li>
                <li><Link href="/onboarding" className="hover:text-[#0B1F3A] transition-colors">Create account</Link></li>
                <li><Link href="/pos-login" className="hover:text-[#0B1F3A] transition-colors">Staff POS login</Link></li>
              </ul>
            </div>

            <div>
              <p className="font-semibold text-sm mb-4">Contact</p>
              <ul className="space-y-2.5 text-[#64748B] text-sm">
                <li>
                  <a href="mailto:info@delronpos.com" className="inline-flex items-center gap-2 hover:text-[#0B1F3A] transition-colors">
                    <Mail className="w-4 h-4" /> info@delronpos.com
                  </a>
                </li>
                <li>
                  <a href="mailto:support@delronpos.com" className="inline-flex items-center gap-2 hover:text-[#0B1F3A] transition-colors">
                    <Mail className="w-4 h-4" /> support@delronpos.com
                  </a>
                </li>
                <li>
                  <a href="tel:+250785995840" className="inline-flex items-center gap-2 hover:text-[#0B1F3A] transition-colors">
                    <Phone className="w-4 h-4" /> +250 785 995 840
                  </a>
                </li>
                <li>
                  <a href="https://wa.me/250785995840" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-[#0B1F3A] transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.963 9.963 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.958 7.958 0 0 1-4.078-1.117l-.292-.174-3.027.898.898-3.027-.174-.292A7.958 7.958 0 0 1 4 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8zm4.406-5.969c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.014-.374-1.932-1.192-.714-.636-1.196-1.422-1.336-1.662-.14-.24-.014-.37.106-.49.108-.108.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.302-.74-1.782-.194-.466-.392-.402-.54-.41l-.46-.008c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.694 2.588 4.106 3.628.574.248 1.022.396 1.372.506.576.184 1.1.158 1.514.096.462-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28z" />
                    </svg>
                    WhatsApp
                  </a>
                </li>
                <li>
                  <a href="https://www.instagram.com/delron_ai_pos" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-[#0B1F3A] transition-colors">
                    <Instagram className="w-4 h-4" /> @delron_ai_pos
                  </a>
                </li>
                <li className="inline-flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Kigali, Rwanda
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-[#E3E8EF] pt-6 text-[#94A3B8] text-xs">
            © 2026 DELRON AI POS. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
