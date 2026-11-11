/**
 * Terms of Service as plain text, for the signed agreement PDF.
 * Keep in step with the page at src/app/(marketing)/terms/page.tsx: when the
 * Terms change, update both and change TERMS_VERSION (owners are then asked
 * to accept the new version on their next login).
 */

/** The Terms' "Last updated" date. Stored with every acceptance. */
export const TERMS_VERSION = "2026-07-03";

export const PROVIDER = {
  name: "DELLON",
  product: "DELRON AI POS",
  tin: "143715478",
  address: "kg 270, Kanserege, Kamutwa, Kacyiru, Gasabo, Kigali, Rwanda",
  email: "info@delronpos.com",
  phone: "+250 785 995 840",
  website: "www.delronpos.com",
};

export type TermsBlock = { p: string } | { ul: string[] };

export const TERMS_INTRO = [
  `These Terms of Service ("Terms") govern your use of DELRON AI POS ("Service"), operated by DELLON, a company registered in Rwanda, with offices at ${PROVIDER.address} ("we," "us," or "DELLON").`,
  "By creating an account or using the Service, you agree to these Terms.",
];

export const TERMS_SECTIONS: { n: string; title: string; blocks: TermsBlock[] }[] = [
  { n: "1", title: "THE SERVICE", blocks: [
    { p: "DELRON AI POS is a cloud-based point-of-sale and business management platform designed for Rwandan businesses including supermarkets, bakeries, bars, and restaurants. The Service includes inventory management, sales processing, AI-powered business insights, staff management, and integrations with MTN MoMo and Airtel Money." },
  ] },
  { n: "2", title: "ACCOUNTS AND ELIGIBILITY", blocks: [
    { ul: [
      "You must be at least 18 years old to create an account.",
      "You must provide accurate business information during registration.",
      "You are responsible for maintaining the confidentiality of your account credentials and staff PINs.",
      "You are responsible for all activity that occurs under your account.",
    ] },
  ] },
  { n: "3", title: "FREE TRIAL AND PAYMENT", blocks: [
    { ul: [
      "New accounts receive a 3-month free trial with full access to all features.",
      "After the trial period, continued use requires a paid subscription.",
      "Subscription fees are listed on our pricing page at www.delronpos.com.",
      "Payments are accepted via MTN MoMo, Airtel Money, and bank transfer.",
      "We will notify you at least 7 days before your trial ends.",
    ] },
  ] },
  { n: "4", title: "SUBSCRIPTION AND CANCELLATION", blocks: [
    { ul: [
      "Subscriptions are billed monthly.",
      "You may cancel at any time from your account settings.",
      "Upon cancellation, your account will remain active until the end of the current billing period.",
      "No refunds are issued for partial months.",
    ] },
  ] },
  { n: "5", title: "DATA AND PRIVACY", blocks: [
    { ul: [
      "You own your business data. We process it on your behalf.",
      "We do not sell your data to third parties.",
      "We retain your data for 90 days after account cancellation, after which it is permanently deleted.",
      "Please see our Privacy Policy at www.delronpos.com/privacy for full details.",
    ] },
  ] },
  { n: "6", title: "ACCEPTABLE USE", blocks: [
    { p: "You agree not to use the Service to:" },
    { ul: [
      "Process transactions for illegal goods or services",
      "Attempt to reverse-engineer or copy the Service",
      "Share your account credentials with businesses other than your own",
      "Use the Service in any way that violates Rwandan law",
    ] },
  ] },
  { n: "7", title: "SERVICE AVAILABILITY", blocks: [
    { ul: [
      "We target 99% monthly uptime but do not guarantee uninterrupted service.",
      "Scheduled maintenance will be communicated in advance where possible.",
      "We are not liable for downtime caused by third-party services including Supabase, Vercel, MTN MoMo, or Airtel Money.",
    ] },
  ] },
  { n: "8", title: "LIMITATION OF LIABILITY", blocks: [
    { p: "To the maximum extent permitted by Rwandan law, DELLON is not liable for:" },
    { ul: [
      "Loss of revenue or profits due to system downtime",
      "Loss of data due to user error",
      "Any indirect, incidental, or consequential damages",
    ] },
    { p: "Our total liability shall not exceed the amount you paid us in the 3 months preceding any claim." },
  ] },
  { n: "9", title: "INTELLECTUAL PROPERTY", blocks: [
    { p: "The DELRON AI POS software, design, logo, and name are owned by DELLON. You may not copy, reproduce, or create derivative works without written permission." },
  ] },
  { n: "10", title: "CHANGES TO TERMS", blocks: [
    { p: "We may update these Terms from time to time. We will notify you by email at least 14 days before significant changes take effect. Continued use after changes constitutes acceptance." },
  ] },
  { n: "11", title: "GOVERNING LAW", blocks: [
    { p: "These Terms are governed by the laws of the Republic of Rwanda. Any disputes shall be resolved in the competent courts of Kigali, Rwanda." },
  ] },
  { n: "12", title: "CONTACT", blocks: [
    { ul: [`Email: ${PROVIDER.email}`, `Phone: ${PROVIDER.phone}`, `Address: ${PROVIDER.address}`] },
  ] },
];
