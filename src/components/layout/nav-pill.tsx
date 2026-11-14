"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

type Box = { top: number; bottom: number };

/**
 * The highlight behind the active menu item. When the page changes it slides to
 * the new item and stretches on the way: the edge in the direction of travel
 * moves first and the other edge catches up, then it settles.
 * `container` must be position:relative and hold the menu items; `target` is the
 * active item (null hides the pill).
 */
export function NavPill({ container, target, deps }: {
  container: React.RefObject<HTMLElement>;
  target: HTMLElement | null;
  deps: unknown[];
}) {
  const reduce = useReducedMotion();
  const [box, setBox] = useState<Box | null>(null);
  const prev = useRef<Box | null>(null);
  const [goingDown, setGoingDown] = useState(true);

  useLayoutEffect(() => {
    const measure = () => {
      const c = container.current;
      if (!c || !target) { setBox(null); return; }
      const top = target.offsetTop;
      const next = { top, bottom: c.scrollHeight - (top + target.offsetHeight) };
      if (prev.current) setGoingDown(next.top >= prev.current.top);
      prev.current = next;
      setBox(next);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, ...deps]);

  if (!box) return null;

  const ease = [0.65, 0, 0.35, 1] as const;
  const lead = { duration: reduce ? 0 : 0.36, ease };
  const trail = { duration: reduce ? 0 : 0.55, ease };

  return (
    <motion.div
      aria-hidden
      className="absolute left-0 right-0 rounded-lg bg-sidebar-accent shadow-sm ring-1 ring-sidebar-primary/20 pointer-events-none"
      initial={false}
      animate={{ top: box.top, bottom: box.bottom }}
      transition={goingDown ? { bottom: lead, top: trail } : { top: lead, bottom: trail }}
    >
      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-sidebar-primary" />
    </motion.div>
  );
}
