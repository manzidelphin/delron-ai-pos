"use client";

import { useEffect, useRef, type ReactNode } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  animate,
  type Variants,
} from "framer-motion";
import { cn } from "@/lib/utils";

/* ── Entrance animation: children fade/rise in one after another ───────────── */

export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

export const riseIn: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 260, damping: 26 } },
};

/* ── Accent colours shared by cards, icons and glows ───────────────────────── */

export type Accent = "blue" | "green" | "amber" | "red" | "purple" | "cyan";

export const ACCENT: Record<Accent, { glow: string; icon: string; text: string; ring: string }> = {
  blue:   { glow: "59,130,246",  icon: "from-blue-500/30 to-blue-600/10 text-blue-300",       text: "text-blue-300",   ring: "ring-blue-400/30" },
  green:  { glow: "34,197,94",   icon: "from-emerald-500/30 to-emerald-600/10 text-emerald-300", text: "text-emerald-300", ring: "ring-emerald-400/30" },
  amber:  { glow: "245,158,11",  icon: "from-amber-500/30 to-amber-600/10 text-amber-300",    text: "text-amber-300",  ring: "ring-amber-400/30" },
  red:    { glow: "239,68,68",   icon: "from-rose-500/30 to-rose-600/10 text-rose-300",       text: "text-rose-300",   ring: "ring-rose-400/30" },
  purple: { glow: "168,85,247",  icon: "from-violet-500/30 to-violet-600/10 text-violet-300", text: "text-violet-300", ring: "ring-violet-400/30" },
  cyan:   { glow: "34,211,238",  icon: "from-cyan-500/30 to-cyan-600/10 text-cyan-300",       text: "text-cyan-300",   ring: "ring-cyan-400/30" },
};

/* ── GlassCard: frosted panel with optional 3D tilt + cursor spotlight ─────── */

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  accent?: Accent;
  /** Tilt toward the cursor in 3D (use on small/medium cards, not long lists). */
  tilt?: boolean;
  /** Max tilt in degrees. */
  intensity?: number;
}

export function GlassCard({ children, className, accent = "blue", tilt = false, intensity = 8 }: GlassCardProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  // Pointer position inside the card, 0..1 (0.5 = centre).
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spring = { stiffness: 180, damping: 18, mass: 0.6 };
  const rotateX = useSpring(useTransform(py, [0, 1], [intensity, -intensity]), spring);
  const rotateY = useSpring(useTransform(px, [0, 1], [-intensity, intensity]), spring);
  const spotX = useTransform(px, (v) => `${v * 100}%`);
  const spotY = useTransform(py, (v) => `${v * 100}%`);
  const spotlight = useMotionTemplate`radial-gradient(420px circle at ${spotX} ${spotY}, rgba(${ACCENT[accent].glow},0.16), transparent 60%)`;

  const canTilt = tilt && !reduce;

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };
  const onLeave = () => {
    px.set(0.5);
    py.set(0.5);
  };

  return (
    <motion.div
      variants={riseIn}
      style={{ perspective: 1000 }}
      className={cn("group relative", className)}
    >
      <motion.div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        style={canTilt ? { rotateX, rotateY, transformStyle: "preserve-3d" } : undefined}
        whileHover={reduce ? undefined : { y: -3 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        className={cn(
          "relative h-full overflow-hidden rounded-2xl",
          // frosted glass body
          "bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-white/[0.02] backdrop-blur-xl",
          // hairline border + top highlight + depth shadow
          "border border-white/10 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.08)]",
          "transition-colors duration-300 hover:border-white/20"
        )}
      >
        {/* cursor-following light */}
        {!reduce && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{ background: spotlight }}
          />
        )}
        {/* glass sheen along the top edge */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        <div className="relative h-full" style={canTilt ? { transform: "translateZ(24px)" } : undefined}>
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Glowing gradient icon tile ────────────────────────────────────────────── */

export function GlassIcon({ children, accent = "blue", className }: { children: ReactNode; accent?: Accent; className?: string }) {
  return (
    <div
      className={cn(
        "relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ring-1",
        ACCENT[accent].icon,
        ACCENT[accent].ring,
        className
      )}
      style={{ boxShadow: `0 8px 24px -6px rgba(${ACCENT[accent].glow},0.55)` }}
    >
      {children}
    </div>
  );
}

/* ── Number that counts up to its value ────────────────────────────────────── */

export function CountUp({ value, format = (n) => Math.round(n).toLocaleString() }: { value: number; format?: (n: number) => string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  // The number currently on screen (not the target), so a restarted animation
  // continues from where the previous one was interrupted.
  const shown = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) {
      shown.current = value;
      el.textContent = format(value);
      return;
    }
    const controls = animate(shown.current, value, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        shown.current = v;
        el.textContent = format(v);
      },
    });
    return () => controls.stop();
  }, [value, reduce, format]);

  // Text is replaced by the animation right after mount, and currency formatting
  // differs between Node and browsers ("RF" vs "RWF"), so skip the hydration check.
  return <span ref={ref} className="tabular-nums" suppressHydrationWarning>{format(0)}</span>;
}

/* ── Slow-moving aurora glow behind the whole dashboard ────────────────────── */

export function AuroraBackground() {
  const reduce = useReducedMotion();
  const blob = "absolute rounded-full blur-3xl mix-blend-screen";
  const drift = (x: number[], y: number[], d: number) =>
    reduce ? undefined : { x, y, transition: { duration: d, repeat: Infinity, repeatType: "mirror" as const, ease: "easeInOut" } };

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <motion.div className={cn(blob, "-left-24 -top-24 h-[420px] w-[420px] bg-blue-600/25")} animate={drift([0, 80, -20], [0, 40, 90], 18)} />
      <motion.div className={cn(blob, "right-[-120px] top-40 h-[380px] w-[380px] bg-violet-600/20")} animate={drift([0, -70, 20], [0, 60, -30], 22)} />
      <motion.div className={cn(blob, "bottom-[-140px] left-1/3 h-[460px] w-[460px] bg-cyan-500/15")} animate={drift([0, 60, -60], [0, -50, 10], 26)} />
      {/* faint grid for depth */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at top, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at top, black 30%, transparent 75%)",
        }}
      />
    </div>
  );
}

/* ── Small helpers ─────────────────────────────────────────────────────────── */

export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={cn("mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400/90", className)}>
      {children}
    </h2>
  );
}

export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative flex h-2 w-2", className)}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
    </span>
  );
}
