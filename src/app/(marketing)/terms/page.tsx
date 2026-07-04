import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | DELRON AI POS",
  description: "Terms of Service for DELRON AI POS — Rwanda's AI-powered point-of-sale platform, operated by DELLON (TIN 143715478).",
  alternates: { canonical: "https://www.delronpos.com/terms" },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen" style={{ background: "#07101f" }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-24">

        {/* Header */}
        <div className="mb-12">
          <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-3">Legal</p>
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">Terms of Service</h1>
          <p className="text-slate-500 text-sm">Last updated: July 3, 2026</p>
          <div className="mt-6 p-5 bg-blue-500/5 border border-blue-500/20 rounded-xl">
            <p className="text-slate-300 text-sm leading-relaxed">
              These Terms of Service (&ldquo;Terms&rdquo;) govern your use of DELRON AI POS
              (&ldquo;Service&rdquo;), operated by{" "}
              <strong className="text-white">DELLON</strong>, a company registered in Rwanda,
              with offices at kg 270, Kanserege, Kamutwa, Kacyiru,
              Gasabo, Kigali, Rwanda (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;DELLON&rdquo;).
            </p>
            <p className="text-slate-300 text-sm mt-3 leading-relaxed font-medium">
              By creating an account or using the Service, you agree to these Terms.
            </p>
          </div>
        </div>

        <div className="space-y-10">

          <Section n="1" title="THE SERVICE">
            <p>
              DELRON AI POS is a cloud-based point-of-sale and business management platform
              designed for Rwandan businesses including supermarkets, bakeries, bars, and
              restaurants. The Service includes inventory management, sales processing,
              AI-powered business insights, staff management, and integrations with MTN MoMo
              and Airtel Money.
            </p>
          </Section>

          <Section n="2" title="ACCOUNTS AND ELIGIBILITY">
            <ul>
              <li>You must be at least 18 years old to create an account.</li>
              <li>You must provide accurate business information during registration.</li>
              <li>
                You are responsible for maintaining the confidentiality of your account
                credentials and staff PINs.
              </li>
              <li>You are responsible for all activity that occurs under your account.</li>
            </ul>
          </Section>

          <Section n="3" title="FREE TRIAL AND PAYMENT">
            <ul>
              <li>New accounts receive a 3-month free trial with full access to all features.</li>
              <li>After the trial period, continued use requires a paid subscription.</li>
              <li>
                Subscription fees are listed on our pricing page at{" "}
                <Link href="/" className="text-blue-400 hover:text-blue-300 underline">
                  www.delronpos.com
                </Link>.
              </li>
              <li>Payments are accepted via MTN MoMo, Airtel Money, and bank transfer.</li>
              <li>We will notify you at least 7 days before your trial ends.</li>
            </ul>
          </Section>

          <Section n="4" title="SUBSCRIPTION AND CANCELLATION">
            <ul>
              <li>Subscriptions are billed monthly.</li>
              <li>You may cancel at any time from your account settings.</li>
              <li>
                Upon cancellation, your account will remain active until the end of the
                current billing period.
              </li>
              <li>No refunds are issued for partial months.</li>
            </ul>
          </Section>

          <Section n="5" title="DATA AND PRIVACY">
            <ul>
              <li>You own your business data. We process it on your behalf.</li>
              <li>We do not sell your data to third parties.</li>
              <li>
                We retain your data for 90 days after account cancellation, after which it
                is permanently deleted.
              </li>
              <li>
                Please see our{" "}
                <Link href="/privacy" className="text-blue-400 hover:text-blue-300 underline">
                  Privacy Policy
                </Link>{" "}
                at www.delronpos.com/privacy for full details.
              </li>
            </ul>
          </Section>

          <Section n="6" title="ACCEPTABLE USE">
            <p>You agree not to use the Service to:</p>
            <ul>
              <li>Process transactions for illegal goods or services</li>
              <li>Attempt to reverse-engineer or copy the Service</li>
              <li>Share your account credentials with businesses other than your own</li>
              <li>Use the Service in any way that violates Rwandan law</li>
            </ul>
          </Section>

          <Section n="7" title="SERVICE AVAILABILITY">
            <ul>
              <li>We target 99% monthly uptime but do not guarantee uninterrupted service.</li>
              <li>Scheduled maintenance will be communicated in advance where possible.</li>
              <li>
                We are not liable for downtime caused by third-party services including
                Supabase, Vercel, MTN MoMo, or Airtel Money.
              </li>
            </ul>
          </Section>

          <Section n="8" title="LIMITATION OF LIABILITY">
            <p>
              To the maximum extent permitted by Rwandan law, DELLON is not liable for:
            </p>
            <ul>
              <li>Loss of revenue or profits due to system downtime</li>
              <li>Loss of data due to user error</li>
              <li>Any indirect, incidental, or consequential damages</li>
            </ul>
            <p>
              Our total liability shall not exceed the amount you paid us in the 3 months
              preceding any claim.
            </p>
          </Section>

          <Section n="9" title="INTELLECTUAL PROPERTY">
            <p>
              The DELRON AI POS software, design, logo, and name are owned by DELLON.
              You may not copy, reproduce, or create derivative works without written
              permission.
            </p>
          </Section>

          <Section n="10" title="CHANGES TO TERMS">
            <p>
              We may update these Terms from time to time. We will notify you by email at
              least 14 days before significant changes take effect. Continued use after
              changes constitutes acceptance.
            </p>
          </Section>

          <Section n="11" title="GOVERNING LAW">
            <p>
              These Terms are governed by the laws of the Republic of Rwanda. Any disputes
              shall be resolved in the competent courts of Kigali, Rwanda.
            </p>
          </Section>

          <Section n="12" title="CONTACT">
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 space-y-2 not-prose">
              <ContactRow label="Email" value="info@delronpos.com" href="mailto:info@delronpos.com" />
              <ContactRow label="Phone" value="+250 785 995 840" href="tel:+250785995840" />
              <ContactRow label="Address" value="kg 270, Kanserege, Kamutwa, Kacyiru, Gasabo, Kigali, Rwanda" />
            </div>
          </Section>

        </div>

        <div className="mt-14 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-slate-600 text-xs">© 2026 DELLON · Kigali, Rwanda</p>
          <Link href="/privacy" className="text-blue-400 hover:text-blue-300 text-xs underline">
            Privacy Policy →
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
      <div className="text-slate-400 text-sm leading-relaxed space-y-3 [&_ul]:space-y-2 [&_ul]:pl-4 [&_li]:relative [&_li]:pl-3 [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:content-['·'] [&_li]:before:text-blue-500 [&_strong]:text-white">
        {children}
      </div>
    </div>
  );
}

function ContactRow({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm">
      <span className="text-slate-500 font-medium w-20 flex-shrink-0">{label}</span>
      {href ? (
        <a href={href} className="text-blue-400 hover:text-blue-300 transition-colors">{value}</a>
      ) : (
        <span className="text-slate-300">{value}</span>
      )}
    </div>
  );
}
