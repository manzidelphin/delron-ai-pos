"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/auth-store";
import { cn, getInitials } from "@/lib/utils";
import { Menu, Bell, Sun, Moon, LogOut, ChevronDown, MapPin } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

export default function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { staff, currentBranch, branches, setCurrentBranch, reset } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function fetchUnread() {
      try {
        const res = await fetch("/api/notifications?unread=true");
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unread_count ?? 0);
        }
      } catch {}
    }
    fetchUnread();
    const interval = setInterval(fetchUnread, 60_000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    reset();
    toast.success("Logged out successfully");
    router.push("/login");
  };

  return (
    <header className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-border bg-card/50 backdrop-blur-sm flex-shrink-0 gap-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
        >
          <Menu className="w-5 h-5" />
        </button>

        {staff?.role === "owner" && branches.length >= 1 && (
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-sm font-medium text-foreground hover:bg-accent/80 transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="max-w-[120px] truncate">{currentBranch?.name ?? "All Branches"}</span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                <div className="absolute top-full mt-1 left-0 w-52 bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                  <button
                    onClick={() => { setCurrentBranch(null); setDropdownOpen(false); }}
                    className={cn("w-full text-left px-4 py-2.5 text-sm hover:bg-accent transition-colors", !currentBranch ? "text-primary font-medium bg-primary/5" : "text-foreground")}
                  >
                    All Branches
                  </button>
                  {branches.map((branch) => (
                    <button
                      key={branch.id}
                      onClick={() => { setCurrentBranch(branch); setDropdownOpen(false); }}
                      className={cn("w-full text-left px-4 py-2.5 text-sm hover:bg-accent transition-colors", currentBranch?.id === branch.id ? "text-primary font-medium bg-primary/5" : "text-foreground")}
                    >
                      {branch.name}
                    </button>
                  ))}
                  <div className="border-t border-border">
                    <button
                      onClick={() => { router.push("/settings/branches"); setDropdownOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors flex items-center gap-2"
                    >
                      + Add / Manage Branches
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          onClick={() => router.push("/notifications")}
          className="relative w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-blue-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center px-0.5">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        <div className="flex items-center gap-2 pl-2 border-l border-border ml-1">
          <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
            <span className="text-xs font-bold text-blue-400">
              {staff ? getInitials(staff.name) : "?"}
            </span>
          </div>
          <div className="hidden md:block">
            <div className="text-sm font-medium text-foreground leading-none">{staff?.name ?? "Loading..."}</div>
            <div className="text-xs text-muted-foreground capitalize leading-none mt-0.5">{staff?.role}</div>
          </div>
          <button
            onClick={handleLogout}
            title="Log out"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
