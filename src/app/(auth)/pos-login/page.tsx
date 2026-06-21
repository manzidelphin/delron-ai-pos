"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Zap, Delete, LogIn, Loader2, ArrowLeft } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

interface StaffCard {
  id: string;
  name: string;
  role: UserRole;
}

const ROLE_COLORS: Record<string, string> = {
  owner:     "from-purple-500/30 to-purple-600/10 border-purple-500/30 text-purple-300",
  manager:   "from-blue-500/30 to-blue-600/10 border-blue-500/30 text-blue-300",
  cashier:   "from-green-500/30 to-green-600/10 border-green-500/30 text-green-300",
  baker:     "from-yellow-500/30 to-yellow-600/10 border-yellow-500/30 text-yellow-300",
  waiter:    "from-orange-500/30 to-orange-600/10 border-orange-500/30 text-orange-300",
  bartender: "from-pink-500/30 to-pink-600/10 border-pink-500/30 text-pink-300",
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner", manager: "Manager", cashier: "Cashier",
  baker: "Baker", waiter: "Waiter", bartender: "Bartender",
};

const NUMPAD = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["clear", "0", "back"],
];

export default function PosLoginPage() {
  const router = useRouter();
  const { setActiveOperator, setStaff, setBusiness, setBranches, setCurrentBranch } = useAuthStore();

  // undefined = not yet resolved from cookie
  const [businessId, setBusinessId] = useState<string | null | undefined>(undefined);
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [staffList, setStaffList] = useState<StaffCard[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [selected, setSelected] = useState<StaffCard | null>(null);
  const [pin, setPin] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [shake, setShake] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showOpeningCash, setShowOpeningCash] = useState(false);
  const [openingCash, setOpeningCash] = useState("");
  const [openingCashError, setOpeningCashError] = useState("");
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        // 1. Prefer active Supabase session — owner logged in via email/password.
        const sessionRes = await fetch("/api/auth/session-business");
        if (sessionRes.ok) {
          const session = await sessionRes.json() as { businessId: string | null; businessName: string | null };
          if (session.businessId) {
            setBusinessId(session.businessId);
            setBusinessName(session.businessName ?? null);
            const staffRes = await fetch(`/api/auth/pos-staff?businessId=${session.businessId}`);
            if (staffRes.ok) {
              const data = await staffRes.json();
              setStaffList(data.staff ?? []);
            }
            return;
          }
        }

        // 2. Fall back to the pos_business_id cookie (dedicated POS device).
        const match = document.cookie
          .split(";")
          .find((c) => c.trim().startsWith("pos_business_id="));
        const cookieId = match
          ? decodeURIComponent(match.trim().slice("pos_business_id=".length))
          : null;
        setBusinessId(cookieId);

        if (!cookieId) return; // show "Device not configured"

        const staffRes = await fetch(`/api/auth/pos-staff?businessId=${cookieId}`);
        if (!staffRes.ok) throw new Error("Failed");
        const data = await staffRes.json();
        setBusinessName(data.businessName ?? null);
        setStaffList(data.staff ?? []);
      } catch {
        toast.error("Could not load staff list");
      } finally {
        setLoadingStaff(false);
      }
    }
    load();
  }, []);

  const triggerShake = (msg: string) => {
    setErrorMsg(msg);
    setPin("");
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const submitPin = async (enteredPin: string) => {
    if (!selected || verifying) return;
    setVerifying(true);
    try {
      const res = await fetch("/api/auth/pin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: selected.id, pin: enteredPin, businessId: businessId ?? undefined }),
      });

      let data: Record<string, unknown> = {};
      try {
        data = await res.json();
      } catch {
        triggerShake("Server error — check terminal");
        return;
      }

      if (!res.ok) {
        triggerShake((data.error as string) ?? "Wrong PIN");
        return;
      }

      const staffData = data.staff as { id: string; name: string; role: string; branch_id: string | null };
      setActiveOperator({
        id: staffData.id,
        name: staffData.name,
        role: staffData.role as import("@/types").UserRole,
        branch_id: staffData.branch_id ?? null,
      });

      // Hydrate business context so hasModule() works for PIN-only sessions
      if (data.staffRecord) setStaff(data.staffRecord as import("@/types").Staff);
      if (data.business)    setBusiness(data.business as import("@/types").Business);
      if (data.branches && (data.branches as unknown[]).length > 0) {
        const branchList = data.branches as import("@/types").Branch[];
        setBranches(branchList);
        const activeBranch = branchList.find((b) => b.id === staffData.branch_id) ?? branchList[0];
        setCurrentBranch(activeBranch);
      }

      const roleRedirect: Record<string, string> = {
        cashier:   "/supermarket/pos",
        bartender: "/bar/pos",
        waiter:    "/bar/tables",
        baker:     "/bakery",
        manager:   "/dashboard",
        owner:     "/dashboard",
      };
      const dest = roleRedirect[staffData.role] ?? "/dashboard";

      // Cashiers see an opening cash prompt before we create the shift
      if (staffData.role === "cashier") {
        setPendingRedirect(dest);
        setShowOpeningCash(true);
        setVerifying(false);
        return;
      }

      // All other shift-eligible roles: start shift silently then redirect
      const shiftRoles = ["bartender", "baker", "waiter"];
      if (shiftRoles.includes(staffData.role)) {
        fetch("/api/shifts/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) })
          .catch(() => { /* non-blocking */ });
      }

      window.location.href = dest;
    } catch {
      triggerShake("Connection error");
    } finally {
      setVerifying(false);
    }
  };

  const handleOpeningCashSubmit = async () => {
    const amount = parseFloat(openingCash);
    if (openingCash.trim() !== "" && (isNaN(amount) || amount < 0)) {
      setOpeningCashError("Enter a valid amount (0 or more)");
      return;
    }
    setOpeningCashError("");
    try {
      await fetch("/api/shifts/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opening_cash: openingCash.trim() ? amount : null }),
      });
    } catch {
      // non-blocking — shift start failure doesn't block login
    }
    window.location.href = pendingRedirect ?? "/supermarket/pos";
  };

  const handleDigit = (key: string) => {
    if (key === "clear") { setPin(""); setErrorMsg(""); return; }
    if (key === "back")  { setPin((p) => p.slice(0, -1)); setErrorMsg(""); return; }
    if (pin.length >= 4) return;
    const next = pin + key;
    setPin(next);
    setErrorMsg("");
    if (next.length === 4) submitPin(next);
  };

  const selectStaff = (s: StaffCard) => {
    setSelected(s);
    setPin("");
    setErrorMsg("");
    setShake(false);
  };

  if (businessId === undefined) {
    return (
      <div className="min-h-screen bg-[#0A0F1E] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  // Opening cash modal for cashiers — shown after successful PIN verification
  if (showOpeningCash) {
    return (
      <div className="min-h-screen bg-[#0A0F1E] flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto">
              <LogIn className="w-7 h-7 text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Opening Cash</h2>
            <p className="text-slate-400 text-sm">
              Count the cash in the till and enter the opening amount for your shift.
            </p>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-2">Amount in till (RWF)</label>
            <input
              type="number" min="0" step="100"
              value={openingCash}
              onChange={(e) => { setOpeningCash(e.target.value); setOpeningCashError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleOpeningCashSubmit()}
              placeholder="e.g. 50000"
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-600 text-white text-lg font-bold text-center placeholder-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
            />
            {openingCashError && <p className="text-red-400 text-xs mt-1.5 text-center">{openingCashError}</p>}
          </div>
          <button
            onClick={handleOpeningCashSubmit}
            className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-2 transition-colors"
          >
            Start Shift
          </button>
          <button
            onClick={handleOpeningCashSubmit}
            className="w-full text-slate-500 hover:text-slate-300 text-xs transition-colors py-1"
          >
            Skip (no cash tracking)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0F1E] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-600/6 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-3xl mx-auto flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Zap className="w-7 h-7 text-white" fill="white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white tracking-tight">DELRON AI POS</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              {selected ? `Enter your PIN, ${selected.name.split(" ")[0]}` : "Who is using the POS?"}
            </p>
          </div>
          {businessName && (
            <span className="text-xs px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400">
              {businessName}
            </span>
          )}
        </div>

        {/* No cookie: device not yet configured */}
        {!businessId ? (
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-4">
              <LogIn className="w-8 h-8 text-slate-400" />
            </div>
            <h2 className="text-white font-semibold mb-2">Device not configured</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Please ask the business owner to log in once from this device. This sets up the POS for cashier access.
            </p>
          </div>

        ) : !selected ? (
          /* Staff grid */
          loadingStaff ? (
            <div className="flex items-center gap-2 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading staff...</span>
            </div>
          ) : staffList.length === 0 ? (
            <div className="text-center text-slate-500 text-sm">
              No active staff found. Add staff in the dashboard first.
            </div>
          ) : (
            <div className={cn(
              "grid gap-4 w-full",
              staffList.length <= 2 ? "grid-cols-2 max-w-sm" :
              staffList.length <= 4 ? "grid-cols-2 sm:grid-cols-4 max-w-2xl" :
              "grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 max-w-3xl"
            )}>
              {staffList.map((s) => {
                const colors = ROLE_COLORS[s.role] ?? ROLE_COLORS.cashier;
                return (
                  <button
                    key={s.id}
                    onClick={() => selectStaff(s)}
                    className={cn(
                      "flex flex-col items-center gap-3 p-5 rounded-2xl border bg-gradient-to-b backdrop-blur-sm",
                      "transition-all duration-200 active:scale-95 hover:scale-[1.03] hover:shadow-lg",
                      colors
                    )}
                  >
                    <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-base font-bold text-white shadow-inner">
                      {s.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                    </div>
                    <div className="text-center">
                      <p className="text-white font-semibold text-sm leading-tight line-clamp-2">
                        {s.name}
                      </p>
                      <p className="text-xs opacity-70 mt-0.5">{ROLE_LABELS[s.role]}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )

        ) : (
          /* PIN panel */
          <div className="w-full max-w-xs mx-auto flex flex-col items-center gap-6">
            <button
              onClick={() => { setSelected(null); setPin(""); setErrorMsg(""); }}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm self-start"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <div className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-2xl border bg-gradient-to-r w-full",
              ROLE_COLORS[selected.role] ?? ROLE_COLORS.cashier
            )}>
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-base font-bold text-white">
                {selected.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{selected.name}</p>
                <p className="text-xs opacity-60">{ROLE_LABELS[selected.role]}</p>
              </div>
            </div>

            <div className={cn("flex items-center justify-center gap-4", shake && "animate-shake")}>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "w-4 h-4 rounded-full border-2 transition-all duration-150",
                    i < pin.length
                      ? "bg-blue-400 border-blue-400 scale-110"
                      : "bg-transparent border-slate-600"
                  )}
                />
              ))}
            </div>

            <div className="h-5">
              {errorMsg && (
                <p className="text-red-400 text-sm text-center font-medium">{errorMsg}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 w-full">
              {NUMPAD.flat().map((key) => {
                const isSpecial = key === "clear" || key === "back";
                return (
                  <button
                    key={key}
                    onClick={() => handleDigit(key)}
                    disabled={verifying}
                    className={cn(
                      "h-16 rounded-2xl text-xl font-semibold transition-all duration-100",
                      "active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
                      isSpecial
                        ? "bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white text-sm"
                        : "bg-slate-800/80 border border-slate-700/50 text-white hover:bg-slate-700 hover:border-blue-500/30 shadow-sm"
                    )}
                  >
                    {verifying && !isSpecial ? (
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    ) : key === "back" ? (
                      <Delete className="w-5 h-5 mx-auto" />
                    ) : key === "clear" ? (
                      <span className="text-xs font-bold tracking-wider">CLR</span>
                    ) : (
                      key
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Owner login link */}
        <button
          onClick={() => router.push("/login")}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors text-sm"
        >
          <LogIn className="w-4 h-4" />
          Login as Owner
        </button>
      </div>
    </div>
  );
}
