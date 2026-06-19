import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export function GET(_req: NextRequest, { params }: { params: { size: string } }) {
  const size = Math.min(Math.max(parseInt(params.size, 10) || 192, 48), 512);
  const r = Math.round(size * 0.18);       // corner radius
  const sq = Math.round(size * 0.65);      // inner blue square size
  const sqr = Math.round(sq * 0.22);       // square corner radius
  const fs = Math.round(sq * 0.58);        // font size

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          background: "#1e293b",
          borderRadius: r,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: sq,
            height: sq,
            background: "#3b82f6",
            borderRadius: sqr,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              color: "white",
              fontSize: fs,
              fontWeight: 900,
              lineHeight: 1,
              fontFamily: "sans-serif",
              letterSpacing: "-2px",
            }}
          >
            D
          </span>
        </div>
      </div>
    ),
    { width: size, height: size }
  );
}
