"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface BarcodeRenderProps {
  value: string;
  width?: number;
  height?: number;
}

export function BarcodeRender({ value, width = 1.5, height = 30 }: BarcodeRenderProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: "CODE128",
        displayValue: false,
        width,
        height,
        margin: 0,
      });
    } catch {
      // Invalid barcode value — leave SVG empty
    }
  }, [value, width, height]);

  return <svg ref={svgRef} />;
}
