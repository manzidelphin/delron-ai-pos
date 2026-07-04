import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | DELRON AI POS",
  description: "Privacy Policy for DELRON AI POS — how DELLON (TIN 143715478) collects, uses, and protects your information.",
  alternates: { canonical: "https://www.delronpos.com/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ background: "#07101f" }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-24">

        {/* Header */}
        <div className="mb-12">
          <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-3">Legal</p>
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">Privacy Policy</h1>
          <p className="text-slate-500 text-sm">Last updated: July 3, 2026</p>
          <div className="mt-6 p-5 bg-blue-500/5 border border-blue-500/20 rounded-xl">
            <p className="text-slate-300 text-sm leading-relaxed">
              This Privacy Policy explains how{" "}
              <strong className="text-white">DELLON</strong>, operating
              DELRON AI POS, collects, uses, and protects your information.
            </p>
          </div>
        </div>

        <div className="space-y-10">

          <Section n="1" title="INFORMATION WE COLLECT">
            <SubSection label="Account Information">
              <ul>
                <li>Business name, owner name, email address, phone number, and location</li>
                <li>Provided during registration and account setup</li>
              </ul>
            </SubSection>
            <SubSection label="Business Data">
              <ul>
                <li>Products, inventory, sales transactions, staff records, and customer credit records</li>
                <li>Generated through your use of the Service</li>
              </ul>
            </SubSection>
            <SubSection label="Usage Data">
              <ul>
                <li>How you use the platform (pages visited, features used, login times)</li>
                <li>Used to improve the Service</li>
              </ul>
            </SubSection>
            <SubSection label="Device Information">
              <ul>
                <li>Browser type, IP address, device type</li>
                <li>Used for security and to detect fraud</li>
              </ul>
            </SubSection>
          </Section>

          <Section n="2" title="HOW WE USE YOUR INFORMATION">
            <ul>
              <li>To provide and operate the DELRON AI POS Service</li>
              <li>To send shift reports, stock alerts, and business insights via SMS and email</li>
              <li>To process payments via MTN MoMo and Airtel Money</li>
              <li>To communicate important updates about the Service</li>
              <li>To comply with Rwandan legal obligations</li>
            </ul>
          </Section>

          <Section n="3" title="SMS AND EMAIL COMMUNICATIONS">
            <p>By using the Service, you agree to receive:</p>
            <ul>
              <li>Transactional SMS alerts (low stock, shift reports) via Africa&apos;s Talking</li>
              <li>Account emails (verification, password reset, billing) via our email service</li>
            </ul>
            <p>You can opt out of non-essential communications from your account settings.</p>
          </Section>

          <Section n="4" title="DATA SHARING">
            <p>
              We do not sell your personal data. We share data only with:
            </p>
            <ul>
              <li>
                <strong>Supabase</strong> (database hosting) — processes data on our behalf
              </li>
              <li>
                <strong>Vercel</strong> (application hosting) — serves the application
              </li>
              <li>
                <strong>Africa&apos;s Talking</strong> (SMS delivery) — sends your SMS alerts
              </li>
              <li>
                <strong>Google Gemini AI</strong> (AI insights) — processes anonymized business queries
              </li>
              <li>
                <strong>MTN Rwanda / Airtel Rwanda</strong> (payment processing) — processes payments you initiate
              </li>
            </ul>
            <p>All third-party processors are bound by data protection agreements.</p>
          </Section>

          <Section n="5" title="DATA RETENTION">
            <ul>
              <li>Active account data: retained while your account is active</li>
              <li>After cancellation: data is retained for 90 days then permanently deleted</li>
              <li>
                You may request immediate deletion by emailing{" "}
                <a href="mailto:info@delronpos.com" className="text-blue-400 hover:text-blue-300 underline">
                  info@delronpos.com
                </a>
              </li>
            </ul>
          </Section>

          <Section n="6" title="YOUR RIGHTS">
            <p>You have the right to:</p>
            <ul>
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your business data at any time from your account</li>
            </ul>
            <p>
              To exercise these rights, contact{" "}
              <a href="mailto:info@delronpos.com" className="text-blue-400 hover:text-blue-300 underline">
                info@delronpos.com
              </a>
            </p>
          </Section>

          <Section n="7" title="DATA SECURITY">
            <p>We protect your data using:</p>
            <ul>
              <li>Encryption in transit (HTTPS/TLS)</li>
              <li>Encrypted database storage via Supabase</li>
              <li>Role-based access controls for staff</li>
              <li>Secure PIN authentication for POS access</li>
            </ul>
            <p>
              No security system is 100% foolproof. We will notify you within 72 hours
              of discovering any data breach that may affect your information.
            </p>
          </Section>

          <Section n="8" title="CHILDREN'S PRIVACY">
            <p>
              Our Service is intended for business owners aged 18 and above.
              We do not knowingly collect data from persons under 18.
            </p>
          </Section>

          <Section n="9" title="CHANGES TO THIS POLICY">
            <p>
              We may update this Privacy Policy. We will notify you by email at least
              14 days before significant changes take effect.
            </p>
          </Section>

          <Section n="10" title="CONTACT">
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 space-y-2 not-prose">
              <ContactRow label="Email" value="support@delronpos.com" href="mailto:support@delronpos.com" />
              <ContactRow label="Phone" value="+250 785 995 840" href="tel:+250785995840" />
              <ContactRow label="Address" value="kg 270, Kanserege, Kamutwa, Kacyiru, Gasabo, Kigali, Rwanda" />
              <ContactRow label="Controller" value="Delphin MANZI, DELLON" />
            </div>
          </Section>

        </div>

        <div className="mt-14 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-slate-600 text-xs">© 2026 DELLON · Kigali, Rwanda</p>
          <Link href="/terms" className="text-blue-400 hover:text-blue-300 text-xs underline">
            Terms of Service →
          </Link>
        </div>
      </div>
    </div>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-slate-800/80 pt-8">
      <h2 className="text-base font-black text-white mb-4 flex items-center gap-2">
        <span className="text-blue-400 tabular-nums">{n}.</span>
        {title}
      </h2>
      <div className="text-slate-400 text-sm leading-relaxed space-y-4 [&_ul]:space-y-2 [&_ul]:pl-4 [&_li]:relative [&_li]:pl-3 [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:content-['·'] [&_li]:before:text-blue-500 [&_strong]:text-slate-200">
        {children}
      </div>
    </div>
  );
}

function SubSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-slate-300 font-semibold text-xs uppercase tracking-wider">{label}</p>
      {children}
    </div>
  );
}

function ContactRow({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm">
      <span className="text-slate-500 font-medium w-24 flex-shrink-0">{label}</span>
      {href ? (
        <a href={href} className="text-blue-400 hover:text-blue-300 transition-colors">{value}</a>
      ) : (
        <span className="text-slate-300">{value}</span>
      )}
    </div>
  );
}
