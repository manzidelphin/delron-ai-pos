"use client";

import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useAIStore } from "@/store/ai-store";
import { Zap, ChevronLeft, Lock, Shield } from "lucide-react";
import { EndShiftButton } from "@/components/shift/end-shift-button";
import { NAV_ITEMS } from "@/config/nav-items";

export default function Sidebar({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { business, staff, activeOperator, clearOperator, hasModule, canAccess, isPlatformAdmin } = useAuthStore();
  const { setOpen: openAI } = useAIStore();

  const handleLockScreen = async () => {
    await fetch("/api/auth/pin-login", { method: "DELETE" });
    clearOperator();
    window.location.href = "/pos-login";
  };

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.module && !hasModule(item.module)) return false;
    if (item.anyModule && !item.anyModule.some((m) => hasModule(m))) return false;
    if (item.hideIfModule && hasModule(item.hideIfModule)) return false;
    if (item.roles && !canAccess(item.roles)) return false;
    return true;
  });

  return (
    <aside
      className={cn(
        "flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 ease-in-out z-30",
        "fixed md:relative h-full",
        isOpen ? "w-56 translate-x-0" : "w-0 md:w-16 -translate-x-full md:translate-x-0",
        "overflow-hidden"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 h-16 px-4 border-b border-sidebar-border flex-shrink-0">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-white" fill="white" />
        </div>
        {isOpen && (
          <div className="min-w-0">
            <div className="font-bold text-sm text-white leading-none">DELRON</div>
            <div className="text-[10px] text-sidebar-foreground/50 leading-none mt-0.5 truncate">
              {business?.name ?? "AI POS"}
            </div>
          </div>
        )}
        {isOpen && (
          <button onClick={onToggle} className="ml-auto text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && item.href !== "/" && pathname.startsWith(item.href) && item.href.length > 1);
          return (
            <div key={item.href}>
              {item.sectionLabel && isOpen && (
                <div className="px-3 pt-3 pb-1">
                  <p className="text-[10px] font-semibold text-sidebar-foreground/30 uppercase tracking-widest">
                    {item.sectionLabel}
                  </p>
                </div>
              )}
              {item.sectionLabel && !isOpen && (
                <div className="my-1 mx-2 h-px bg-sidebar-border/40" />
              )}
              <button
                onClick={() => router.push(item.href)}
                title={!isOpen ? (item.labelFn ? item.labelFn(hasModule) : item.label) : undefined}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isActive ? "bg-sidebar-accent text-sidebar-primary shadow-sm" : "text-sidebar-foreground/70"
                )}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {isOpen && <span className="truncate">{item.labelFn ? item.labelFn(hasModule) : item.label}</span>}
                {isActive && isOpen && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary flex-shrink-0" />}
              </button>
            </div>
          );
        })}
      </nav>

      {/* Platform Admin link — visible to any user in the platform_admins table */}
      {isPlatformAdmin && (
        <div className="px-2 pb-2">
          {isOpen && (
            <div className="px-3 pt-3 pb-1">
              <p className="text-[10px] font-semibold text-violet-400/60 uppercase tracking-widest">Platform</p>
            </div>
          )}
          {!isOpen && <div className="my-1 mx-2 h-px bg-violet-500/20" />}
          <button
            onClick={() => router.push("/admin/businesses")}
            title={!isOpen ? "Platform Admin" : undefined}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
              "bg-violet-600/10 border border-violet-500/20 text-violet-400 hover:bg-violet-600/20 hover:text-violet-300"
            )}
          >
            <Shield className="w-4 h-4 flex-shrink-0" />
            {isOpen && <span className="truncate">Platform Admin</span>}
          </button>
        </div>
      )}

      {/* Lock Screen + AI */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
        {/* Active operator badge */}
        {activeOperator && isOpen && (
          <div className="px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Active operator</p>
            <p className="text-xs font-semibold text-white truncate">{activeOperator.name}</p>
          </div>
        )}

        <EndShiftButton isOpen={isOpen} />

        <button
          onClick={handleLockScreen}
          title={!isOpen ? "Lock Screen" : undefined}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-all text-sm font-medium"
        >
          <Lock className="w-4 h-4 flex-shrink-0" />
          {isOpen && <span>Lock Screen</span>}
        </button>

        <button
          onClick={() => openAI(true)}
          title={!isOpen ? "Ask DELRON AI" : undefined}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all text-sm font-medium"
        >
          <Zap className="w-4 h-4 flex-shrink-0" />
          {isOpen && <span>Ask DELRON AI</span>}
        </button>
      </div>
    </aside>
  );
}
