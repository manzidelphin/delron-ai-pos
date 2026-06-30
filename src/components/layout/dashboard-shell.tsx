"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useBusiness } from "@/hooks/use-business";
import { useAuthStore } from "@/store/auth-store";
import { NAV_ITEMS } from "@/config/nav-items";
import Sidebar from "./sidebar";
import TopBar from "./topbar";
import AIChatWidget from "@/components/ai/ai-chat-widget";
import { Shield, X } from "lucide-react";

function ImpersonationBanner({ businessName }: { businessName: string }) {
  const router = useRouter();
  const [exiting, setExiting] = useState(false);

  const handleExit = async () => {
    setExiting(true);
    await fetch("/api/admin/impersonate", { method: "DELETE" });
    // Hard reload to clear the store and cookie
    window.location.href = "/admin/businesses";
  };

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 bg-violet-600 text-white text-sm z-50 flex-shrink-0">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 flex-shrink-0" />
        <span className="font-medium">Platform Admin Mode</span>
        <span className="opacity-75">—</span>
        <span>Viewing as <strong>{businessName}</strong></span>
      </div>
      <button
        onClick={handleExit}
        disabled={exiting}
        className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/20 hover:bg-white/30 transition-colors text-xs font-medium disabled:opacity-60"
      >
        <X className="w-3.5 h-3.5" />
        {exiting ? "Exiting…" : "Exit Impersonation"}
      </button>
    </div>
  );
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { isLoaded, impersonation } = useBusiness();
  const { canAccess, hasModule } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  // Find all nav entries whose href is a prefix of the current path, then check
  // if at least one is accessible (module + role). If none are, redirect.
  // Uses "any match accessible" so dual-entry routes (e.g. /bar/pos under both
  // bar and restaurant modules) are handled correctly.
  const matchingItems = isLoaded
    ? NAV_ITEMS.filter(
        (item) => item.href.length > 1 && (pathname === item.href || pathname.startsWith(item.href + "/"))
      )
    : [];

  const isBlocked =
    matchingItems.length > 0 &&
    !matchingItems.some((item) => {
      if (item.module && !hasModule(item.module)) return false;
      if (item.anyModule && !item.anyModule.some((m) => hasModule(m))) return false;
      if (item.roles && !canAccess(item.roles)) return false;
      return true;
    });

  useEffect(() => {
    if (isBlocked) router.replace("/dashboard");
  }, [isBlocked, router]);

  if (!isLoaded || isBlocked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center animate-pulse">
            <span className="text-white text-xl font-bold">D</span>
          </div>
          <p className="text-muted-foreground text-sm animate-pulse">Loading DELRON AI POS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {impersonation && <ImpersonationBanner businessName={impersonation.business_name} />}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        {sidebarOpen && (
          <div className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} />
        )}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
      <AIChatWidget />
    </div>
  );
}
