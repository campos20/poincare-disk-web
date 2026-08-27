import type { XY } from "./geometry";

/**
 * The Poincaré disk model: internally always the unit disk — centered at
 * the origin, boundary at Euclidean distance 1 from it. Points only exist
 * strictly inside — the boundary circle is at infinity in hyperbolic
 * geometry. Every stored coordinate (engine points, reducer actions) lives
 * in this unit-disk model space, which is also what the formulas in
 * `hyperbolicFormulas.ts` assume.
 *
 * DISK_RADIUS is purely a view-layer concern: the on-screen pixel radius the
 * unit disk is drawn at, sized to fit within the responsive SVG viewBox (see
 * ConstructionCanvas.fitViewport) with a small margin. toScreen/toModel
 * convert at the view's input/output boundary so nothing past the view ever
 * sees screen pixels.
 */
export const DISK_RADIUS = 290;

export function isInsideDisk(p: XY): boolean {
  return Math.hypot(p.x, p.y) < 1;
}

/** Model (unit disk) coordinates → on-screen svg coordinates. */
export function toScreen(p: XY): XY {
  return { x: p.x * DISK_RADIUS, y: p.y * DISK_RADIUS };
}

/** On-screen svg coordinates → model (unit disk) coordinates. */
export function toModel(p: XY): XY {
  return { x: p.x / DISK_RADIUS, y: p.y / DISK_RADIUS };
}
