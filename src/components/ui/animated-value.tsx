"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

/** Splits "RWF 1,234,500" into prefix "RWF ", number 1234500 (no decimals), suffix "". */
export function splitNumber(value: string | number): { prefix: string; num: number; decimals: number; suffix: string; grouped: boolean } | null {
  const text = String(value);
  const m = text.match(/^([\s\S]*?)(-?\d[\d,]*(?:\.\d+)?)([\s\S]*)$/);
  if (!m) return null;
  const raw = m[2];
  const num = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(num)) return null;
  const decimals = raw.includes(".") ? raw.split(".")[1].length : 0;
  return { prefix: m[1], num, decimals, suffix: m[3], grouped: raw.includes(",") || Math.abs(num) >= 1000 };
}

function format(n: number, decimals: number, grouped: boolean) {
  return grouped
    ? n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : n.toFixed(decimals);
}

/**
 * Shows a value and counts its number up (or down) to the new figure, keeping
 * any text around it ("RWF 12,500", "85%", "3 tables"). Text without a number is
 * shown as it is.
 */
export function AnimatedValue({ value, duration = 900 }: { value: string | number; duration?: number }) {
  const reduce = useReducedMotion();
  const parts = splitNumber(value);
  const [shown, setShown] = useState(parts ? (reduce ? parts.num : 0) : 0);
  const shownRef = useRef(shown);

  useEffect(() => {
    if (!parts) return;
    if (reduce) { shownRef.current = parts.num; setShown(parts.num); return; }
    const from = shownRef.current;
    const to = parts.num;
    if (from === to) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = from + (to - from) * eased;
      shownRef.current = v;
      setShown(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parts?.num, reduce, duration]);

  if (!parts) return <>{value}</>;
  const factor = Math.pow(10, parts.decimals);
  const rounded = Math.round(shown * factor) / factor;
  return (
    <span className="tabular-nums">
      {parts.prefix}{format(rounded, parts.decimals, parts.grouped)}{parts.suffix}
    </span>
  );
}
