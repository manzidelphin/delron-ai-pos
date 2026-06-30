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
      // JsBarcode stamps fixed width/height px attributes on the element, causing
      // overflow when the encoded value produces more bars than the container allows.
      // Remove them and rely on CSS + the viewBox JsBarcode also sets, so the SVG
      // scales to 100% of its container while preserving aspect ratio.
      svgRef.current.removeAttribute("width");
      svgRef.current.removeAttribute("height");
      svgRef.current.style.width = "100%";
      svgRef.current.style.height = "auto";
      svgRef.current.style.display = "block";
    } catch {
      // Invalid barcode value — leave SVG empty
    }
  }, [value, width, height]);

  return <svg ref={svgRef} />;
}
