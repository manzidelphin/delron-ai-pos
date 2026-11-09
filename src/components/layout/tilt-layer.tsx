"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Management screens that get the 3D tilt. POS, tables and kitchen screens are
// deliberately excluded: they run on touch tablets and must stay fast.
// (/dashboard has its own tilt via <GlassCard>.)
function isTiltRoute(path: string) {
  return (
    path === "/bar" ||
    path === "/bakery" ||
    path === "/restaurant" ||
    path === "/bar/reports" ||
    path === "/reports" ||
    path.startsWith("/reports/")
  );
}

const MAX_DEG = 7;
const MAX_W = 600; // only stat-sized cards, not wide tables
const MAX_H = 260;

/** Tilts small `.glass-card` elements toward the cursor on management screens. */
export default function TiltLayer() {
  const pathname = usePathname();

  useEffect(() => {
    if (!isTiltRoute(pathname)) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;

    let current: HTMLElement | null = null;

    const release = (el: HTMLElement) => {
      el.classList.remove("tilt-active");
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
      el.style.setProperty("--lift", "0px");
      // Drop the transform entirely once it has eased back.
      window.setTimeout(() => { if (el !== current) el.classList.remove("tilt-ready"); }, 400);
    };

    const onMove = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      const card = target?.closest<HTMLElement>(".glass-card") ?? null;
      const eligible =
        card &&
        !card.closest(".fixed") && // never pop-ups
        card.offsetWidth <= MAX_W &&
        card.offsetHeight <= MAX_H;

      if (!eligible) {
        if (current) { release(current); current = null; }
        return;
      }
      if (card !== current) {
        if (current) release(current);
        current = card;
        card.classList.add("tilt-ready", "tilt-active");
      }
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.setProperty("--ry", `${(px * 2 * MAX_DEG).toFixed(2)}deg`);
      card.style.setProperty("--rx", `${(-py * 2 * MAX_DEG).toFixed(2)}deg`);
      card.style.setProperty("--lift", "-3px");
    };

    const onLeave = () => { if (current) { release(current); current = null; } };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
      onLeave();
    };
  }, [pathname]);

  return null;
}
