import type { XY } from "./geometry";

/**
 * The Poincaré disk: centered at the origin, sized to fit within the
 * responsive SVG viewBox (see ConstructionCanvas.fitViewport) with a small margin.
 * Points only exist strictly inside — the boundary circle is at infinity
 * in hyperbolic geometry.
 */
export const DISK_RADIUS = 290;

export function isInsideDisk(p: XY): boolean {
  return Math.hypot(p.x, p.y) < DISK_RADIUS;
}
