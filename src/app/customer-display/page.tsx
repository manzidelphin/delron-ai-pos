"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CustomerDisplayPayload } from "@/hooks/use-customer-display";

const EMPTY: CustomerDisplayPayload = {
  items: [],
  subtotal: 0,
  discount: 0,
  total: 0,
  currency: "RWF",
};

function fmt(n: number) {
  return n.toLocaleString("en-RW") + " RWF";
}

function Clock() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="font-mono text-slate-400 text-2xl tabular-nums">
      {time.toLocaleTimeString("en-RW", { hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}

function CustomerDisplay() {
  const searchParams = useSearchParams();
  const bizId = searchParams.get("biz");
  const [cart, setCart] = useState<CustomerDisplayPayload>(EMPTY);

  useEffect(() => {
    if (!bizId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`customer-display:${bizId}`)
      .on("broadcast", { event: "cart" }, (msg) => {
        setCart((msg.payload as CustomerDisplayPayload) ?? EMPTY);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [bizId]);

  const isEmpty = cart.items.length === 0;

  return (
    <div
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
      className="min-h-screen bg-[#0f172a] text-white flex flex-col select-none overflow-hidden"
    >
      {/* ── Top bar ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-white/10 bg-[#1e293b]/60">
        <div className="flex items-center gap-3">
          {/* DELRON D logo */}
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
            <span className="text-white font-black text-xl leading-none">D</span>
          </div>
          <div>
            <p className="font-black text-white text-lg leading-none">DELRON</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">AI POS</p>
          </div>
        </div>
        <Clock />
      </div>

      {/* ── Body ───────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {isEmpty ? (
          /* ── Idle / welcome screen ── */
          <div className="flex-1 flex flex-col items-center justify-center gap-8">
            <div className="relative">
              <div className="w-40 h-40 bg-blue-600/10 rounded-[2rem] border border-blue-500/20 flex items-center justify-center">
                <span className="text-blue-400 font-black text-8xl leading-none">D</span>
              </div>
              <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-2 border-[#0f172a]" />
            </div>
            <div className="text-center space-y-2">
              <h1 className="text-5xl font-black text-white tracking-tight">WELCOME</h1>
              <p className="text-slate-400 text-xl">Please wait while your items are scanned</p>
            </div>
            <div className="flex gap-1.5 mt-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-blue-500 rounded-full"
                  style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
                />
              ))}
            </div>
          </div>
        ) : (
          /* ── Active cart ── */
          <>
            {/* Items list (left, ~60%) */}
            <div className="flex-[3] flex flex-col overflow-hidden border-r border-white/10">
              {/* Column headers */}
              <div className="px-8 py-3 border-b border-white/10 flex items-center gap-4 text-xs font-semibold text-slate-500 uppercase tracking-widest">
                <span className="flex-1">Item</span>
                <span className="w-14 text-center">Qty</span>
                <span className="w-36 text-right">Unit Price</span>
                <span className="w-40 text-right">Amount</span>
              </div>

              {/* Rows */}
              <div className="flex-1 overflow-y-auto px-8 py-4 space-y-1">
                {cart.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 py-3 border-b border-white/5 last:border-0"
                  >
                    <span className="flex-1 text-xl font-semibold text-white leading-tight">
                      {item.name}
                    </span>
                    <span className="w-14 text-center text-2xl font-bold text-blue-400 tabular-nums">
                      {item.qty}
                    </span>
                    <span className="w-36 text-right text-lg text-slate-400 tabular-nums">
                      {fmt(item.unit_price)}
                    </span>
                    <span className="w-40 text-right text-xl font-black text-white tabular-nums">
                      {fmt(item.total)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total panel (right, ~40%) */}
            <div className="flex-[2] flex flex-col items-center justify-center px-10 py-8 bg-[#1e293b]/40 gap-6">
              <div className="w-full space-y-3">
                {cart.discount > 0 && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-lg">Subtotal</span>
                      <span className="text-2xl font-bold text-slate-300 tabular-nums">
                        {fmt(cart.subtotal)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-green-400 text-lg">Discount</span>
                      <span className="text-2xl font-bold text-green-400 tabular-nums">
                        −{fmt(cart.discount)}
                      </span>
                    </div>
                    <div className="h-px bg-white/10" />
                  </>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-slate-300 text-2xl font-semibold uppercase tracking-wider">
                    Total
                  </span>
                  <span className="text-4xl font-black text-white tabular-nums">
                    {fmt(cart.total)}
                  </span>
                </div>
              </div>

              <div className="text-slate-600 text-sm">
                {cart.items.length} item{cart.items.length !== 1 ? "s" : ""}
              </div>

              {/* Branding */}
              <div className="mt-auto pt-6 text-center opacity-30">
                <div className="w-8 h-8 bg-blue-600 rounded-lg mx-auto mb-2 flex items-center justify-center">
                  <span className="text-white font-black text-sm">D</span>
                </div>
                <p className="text-xs text-slate-400">DELRON AI POS</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div className="px-8 py-2 border-t border-white/10 text-center">
        <p className="text-xs text-slate-700">Powered by DELRON AI POS · Rwanda</p>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40%            { transform: translateY(-8px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default function CustomerDisplayPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0f172a]" />}>
      <CustomerDisplay />
    </Suspense>
  );
}
