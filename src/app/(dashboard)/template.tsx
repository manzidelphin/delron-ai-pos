"use client";

import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { isFullScreenRoute } from "@/lib/full-screen";

// Re-mounts on every navigation inside the app, so each page fades and rises in.
// Kept short so POS and kitchen screens still feel instant.
// The wrapper must end with no transform (and no will-change), otherwise
// position:fixed pop-ups inside pages (checkout, modals) would be positioned
// relative to this wrapper instead of the screen.
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  // Full-screen working screens (POS, kitchen) need a definite height to fill.
  const sizing = isFullScreenRoute(usePathname()) ? "h-full" : undefined;
  if (reduce) return <div className={sizing}>{children}</div>;

  return (
    <motion.div
      className={sizing}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
