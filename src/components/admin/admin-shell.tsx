"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Building2, LayoutDashboard, LogOut, RefreshCw, Shield } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { IdleSignOut } from "@/components/layout/idle-sign-out";
import { signOutEverywhere } from "@/lib/sign-out";

/** How often the open admin page reloads its figures on its own. */
const AUTO_REFRESH_MS = 60_000;

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Admin pages are rendered on the server; the browser keeps a copy of each
  // page it has shown. router.refresh() asks the server for current figures.
  const refresh = useCallback(() => {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 800);
  }, [router]);

  // Fresh figures on every page change, every minute, and on returning to the tab.
  useEffect(() => { router.refresh(); }, [pathname, router]);
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, AUTO_REFRESH_MS);
    const onVisible = () => { if (document.visibilityState === "visible") router.refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [router]);

  const handleLogout = async () => {
    setSigningOut(true);
    await signOutEverywhere();
    toast.success("Logged out");
    // Full page load so no admin page stays in the browser's memory.
    window.location.href = "/login";
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100">
      {/* The admin portal sees every business: sign out after 30 min idle. */}
      <IdleSignOut enabled />
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        <div className="h-16 px-4 border-b border-zinc-800 flex items-center gap-3">
          <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm text-white leading-none">Platform Admin</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">DELRON</div>
          </div>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          <button
            onClick={() => router.push("/admin/businesses")}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
              pathname.startsWith("/admin/businesses")
                ? "bg-violet-600/20 text-violet-300"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            )}
          >
            <Building2 className="w-4 h-4" />
            Businesses
          </button>
        </nav>

        <div className="p-3 border-t border-zinc-800 space-y-0.5">
          <button
            onClick={refresh}
            disabled={refreshing}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 text-sm font-medium transition-all disabled:opacity-60"
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            {refreshing ? "Refreshing…" : "Refresh data"}
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 text-sm font-medium transition-all"
          >
            <LayoutDashboard className="w-4 h-4" />
            Back to Dashboard
          </button>
          <button
            onClick={handleLogout}
            disabled={signingOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 text-sm font-medium transition-all disabled:opacity-60"
          >
            <LogOut className="w-4 h-4" />
            {signingOut ? "Logging out…" : "Log out"}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
