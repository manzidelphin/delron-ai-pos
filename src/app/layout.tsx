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
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/apple-icon.png",
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
