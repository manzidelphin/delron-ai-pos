import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "sonner";
import { PWARegister } from "@/components/pwa-register";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "DELRON AI POS",
    template: "%s | DELRON AI POS",
  },
  description:
    "Rwanda's first AI-powered business management and Point of Sale platform. Built for supermarkets, bakeries, bars, and restaurants.",
  keywords: ["POS", "Rwanda", "AI", "business management", "supermarket", "bakery", "bar", "restaurant"],
  authors: [{ name: "Delfin Manzi" }],
  creator: "DELRON",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
  openGraph: {
    title: "DELRON AI POS",
    description: "Rwanda's first AI-powered business management platform",
    type: "website",
    siteName: "DELRON AI POS",
  },
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%233b82f6'/><text x='50%25' y='50%25' dominant-baseline='central' text-anchor='middle' font-family='sans-serif' font-weight='bold' font-size='20' fill='white'>D</text></svg>",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // Single solid colour so the PWA splash screen + browser chrome both use the
  // app's dark theme regardless of the OS colour-scheme preference.
  themeColor: "#1e293b",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-right" richColors closeButton />
          <PWARegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
