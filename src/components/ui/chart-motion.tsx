"use client";

/**
 * Bar shape for recharts that grows into place, one bar after another:
 * upright bars rise from the axis, sideways (horizontal) bars grow from the left.
 * Use with isAnimationActive={false} so recharts' own animation doesn't double it.
 */
export function GrowBar(props: {
  x?: number; y?: number; width?: number; height?: number; fill?: string; index?: number; horizontal?: boolean;
}) {
  const { x = 0, y = 0, width = 0, height = 0, fill, index = 0, horizontal = false } = props;
  if (height <= 0 || width <= 0) return null;
  const r = Math.min(4, width / 2, height / 2);
  return (
    <rect
      x={x} y={y} width={width} height={height} rx={r} ry={r} fill={fill}
      className={horizontal ? "bar-grow-x" : "bar-rise"}
      style={{ animationDelay: `${0.3 + index * 0.05}s` }}
    />
  );
}

/** Shared timing so lines, areas and donuts start after their card has appeared. */
export const CHART_MOTION = { animationBegin: 300, animationDuration: 1200, animationEasing: "ease-out" as const };
