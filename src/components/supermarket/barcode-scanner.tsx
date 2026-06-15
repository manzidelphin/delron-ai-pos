"use client";

import { useEffect, useRef, useCallback } from "react";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  enabled?: boolean;
}

/**
 * Invisible USB barcode scanner interceptor.
 * USB scanners act as keyboards — they type characters very fast
 * then send Enter. We detect this pattern globally and call onScan.
 */
export function BarcodeScanner({ onScan, enabled = true }: BarcodeScannerProps) {
  const buffer = useRef<string>("");
  const lastKeyTime = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const processBarcode = useCallback(
    (code: string) => {
      const cleaned = code.trim();
      if (cleaned.length >= 3) {
        onScan(cleaned);
      }
      buffer.current = "";
    },
    [onScan]
  );

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const timeSinceLast = now - lastKeyTime.current;
      lastKeyTime.current = now;

      // If Enter is pressed and we have a buffered barcode
      if (e.key === "Enter") {
        if (buffer.current.length >= 3) {
          e.preventDefault();
          processBarcode(buffer.current);
        }
        return;
      }

      // If the gap between keystrokes is > 100ms, it's human typing
      // Barcode scanners type at < 30ms per character
      if (timeSinceLast > 100 && buffer.current.length > 0) {
        buffer.current = "";
      }

      // Only capture printable characters
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        buffer.current += e.key;

        // Auto-reset buffer if no Enter received within 200ms
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          buffer.current = "";
        }, 200);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [enabled, processBarcode]);

  // Invisible component
  return null;
}
