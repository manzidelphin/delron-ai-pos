"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * The background of the selected tab. Put it inside the active tab button
 * (which must be position:relative); with the same `group` id on every tab of a
 * tab bar, it slides from the old tab to the new one with a little spring.
 */
export function TabPill({ group, className = "bg-slate-700" }: { group: string; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      layoutId={`tab-pill-${group}`}
      aria-hidden
      className={`absolute inset-0 -z-10 rounded-lg ${className}`}
      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}
    />
  );
}
