import type { XY } from "./geometry";

/**
 * The Poincaré disk: centered at the origin, as large as the fixed
 * 800×600 viewBox allows (min half-dimension is 300) with a small margin.
 * Points only exist strictly inside — the boundary circle is at infinity
 * in hyperbolic geometry.
 */
export const DISK_RADIUS = 290;

export function isInsideDisk(p: XY): boolean {
  return Math.hypot(p.x, p.y) < DISK_RADIUS;
}
