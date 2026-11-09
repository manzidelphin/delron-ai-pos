"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Renders its children into <div id="print-root"> directly under <body>.
 *
 * The global print styles hide every direct child of <body> except
 * #print-root, so anything that must appear on paper (receipts, labels)
 * has to be rendered through this portal. On screen #print-root is hidden.
 */
export function PrintPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return createPortal(<div id="print-root">{children}</div>, document.body);
}
