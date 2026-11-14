"use client";

import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { isFullScreenRoute } from "@/lib/full-screen";

// Re-mounts on every navigation inside the app, so each page comes in.
// Management pages: blur-to-sharp while rising slightly. POS and kitchen screens:
// a short plain fade, so they stay instant.
// The wrapper must end with no transform and no filter (both are cleared with
// transitionEnd), otherwise position:fixed pop-ups inside pages (checkout,
// modals) would be positioned relative to this wrapper instead of the screen.
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const fullScreen = isFullScreenRoute(usePathname());
  // Full-screen working screens (POS, kitchen) need a definite height to fill.
  const sizing = fullScreen ? "h-full" : undefined;
  if (reduce) return <div className={sizing}>{children}</div>;

  if (fullScreen) {
    return (
      <motion.div className={sizing} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)", transitionEnd: { filter: "none", transform: "none" } }}
      transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
