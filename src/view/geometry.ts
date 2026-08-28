/**
 * SWAP POINT — replace these bodies with hyperbolic (Poincaré) equations;
 * model/tools/interaction stay identical.
 *
 * This module is the ONLY place that knows how entities look given their
 * points' coordinates. Every function is pure: resolved coordinates in,
 * SVG-ready shape out. For the Poincaré disk:
 *   - segmentShape/lineShape become geodesic arcs (circles orthogonal to the
 *     unit circle), still expressible as SVG path data.
 *   - circleShape stays a Euclidean circle — a hyperbolic circle IS a
 *     Euclidean circle, just with a shifted center — so {cx, cy, r} holds.
 */

import type { CircleShape, Rect, XY } from "./shapes";

export function distance(a: XY, b: XY): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** SVG path for the segment between two points. */
export function segmentShape(a: XY, b: XY): string {
  return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
}

/**
 * Clip the infinite line through a and b to a rectangle (the viewport).
 * Returns the two boundary points, or null if the line misses the rect
 * or a === b (degenerate).
 */
export function clipLineToRect(a: XY, b: XY, rect: Rect): [XY, XY] | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) return null;

  // Liang–Barsky with an unbounded parameter range (infinite line).
  let t0 = -Infinity;
  let t1 = Infinity;
  const clip = (p: number, d: number, min: number, max: number): boolean => {
    if (d === 0) return p >= min && p <= max;
    let ta = (min - p) / d;
    let tb = (max - p) / d;
    if (ta > tb) {
      const tmp = ta;
      ta = tb;
      tb = tmp;
    }
    t0 = Math.max(t0, ta);
    t1 = Math.min(t1, tb);
    return true;
  };

  if (!clip(a.x, dx, rect.minX, rect.maxX)) return null;
  if (!clip(a.y, dy, rect.minY, rect.maxY)) return null;
  if (t0 > t1) return null;

  return [
    { x: a.x + t0 * dx, y: a.y + t0 * dy },
    { x: a.x + t1 * dx, y: a.y + t1 * dy },
  ];
}

/** SVG path for the infinite line through two points, clipped to the viewport. */
export function lineShape(a: XY, b: XY, viewport: Rect): string | null {
  const clipped = clipLineToRect(a, b, viewport);
  if (!clipped) return null;
  return segmentShape(clipped[0], clipped[1]);
}

/** Circle centered at `center` passing through `thru`. */
export function circleShape(center: XY, thru: XY): CircleShape {
  return { cx: center.x, cy: center.y, r: distance(center, thru) };
}
