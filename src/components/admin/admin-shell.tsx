"use client";

import { usePathname, useRouter } from "next/navigation";
import { Building2, LayoutDashboard, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100">
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

        <div className="p-3 border-t border-zinc-800">
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 text-sm font-medium transition-all"
          >
            <LayoutDashboard className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
