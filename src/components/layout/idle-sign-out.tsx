"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ACTIVITY_KEY, signOutEverywhere } from "@/lib/sign-out";
import { idleState, IDLE_SIGN_OUT_MS } from "@/lib/idle";

type Stored = { uid: string; t: number };

const read = (): Stored | null => {
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY);
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
};
const write = (s: Stored) => {
  try { localStorage.setItem(ACTIVITY_KEY, JSON.stringify(s)); } catch { /* storage blocked */ }
};

/**
 * Signs the owner/manager out after 30 minutes without activity (mouse, keys,
 * touch, scroll), with a warning and a "Stay signed in" button 2 minutes before.
 * Activity in any tab counts for all tabs; a device that slept past the limit is
 * signed out as soon as it wakes. PIN staff (cashiers, bartenders…) never use it.
 */
export function IdleSignOut({ enabled }: { enabled: boolean }) {
  const [uid, setUid] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const lastWrite = useRef(0);
  const signingOut = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    createClient().auth.getUser().then(({ data }) => setUid(data.user?.id ?? null)).catch(() => {});
  }, [enabled]);

  const touch = useCallback((force = false) => {
    if (!uid) return;
    const now = Date.now();
    // Writing on every mouse move is wasteful: once every 10 s is plenty.
    if (!force && now - lastWrite.current < 10_000) return;
    lastWrite.current = now;
    write({ uid, t: now });
  }, [uid]);

  const signOut = useCallback(async () => {
    if (signingOut.current) return;
    signingOut.current = true;
    await signOutEverywhere();
    window.location.href = "/login?reason=idle";
  }, []);

  const check = useCallback(() => {
    if (!uid) return;
    const stored = read();
    if (!stored || stored.uid !== uid) { touch(true); return; }
    const state = idleState(Date.now(), stored.t);
    if (state.kind === "expired") { void signOut(); return; }
    setSecondsLeft(state.kind === "warning" ? state.secondsLeft : null);
  }, [uid, touch, signOut]);

  useEffect(() => {
    if (!enabled || !uid) return;

    // First mount for this user: an old timestamp means the browser was left
    // signed in and idle (closed, or asleep) for too long.
    const stored = read();
    if (stored && stored.uid === uid && Date.now() - stored.t >= IDLE_SIGN_OUT_MS) {
      void signOut();
      return;
    }
    touch(true);

    const onActivity = () => { if (secondsLeft === null) touch(); };
    const events = ["mousedown", "mousemove", "keydown", "touchstart", "scroll", "wheel"] as const;
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    const onVisible = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(check, 5_000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [enabled, uid, touch, check, signOut, secondsLeft]);

  if (!enabled || secondsLeft === null) return null;

  const mm = Math.floor(secondsLeft / 60);
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="glass-card rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 text-center">
        <div className="mx-auto w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center">
          <ShieldAlert className="w-6 h-6 text-amber-400" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Are you still there?</h2>
        <p className="text-sm text-muted-foreground">
          For security, you&apos;ll be signed out in <b className="text-foreground tabular-nums">{mm}:{ss}</b> because
          nothing has happened for a while.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => void signOut()}
            className="flex-1 h-11 rounded-xl border border-border text-foreground hover:bg-accent text-sm font-medium"
          >
            Sign out now
          </button>
          <button
            onClick={() => { touch(true); setSecondsLeft(null); }}
            className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
          >
            Stay signed in
          </button>
        </div>
      </div>
    </div>
  );
}
