/**
 * Hyperbolic (Poincaré disk) geometry formulas.
 *
 * Every function here assumes the unit disk model: center (0, 0), boundary
 * at Euclidean distance 1 — the same model construction points are stored
 * in (see disk.ts). This is a pure formula library, not a rendering layer:
 * geometry.ts stays the SVG-ready shape layer and is the "swap point" that
 * will eventually call into these formulas to produce hyperbolic shapes
 * (see README).
 *
 * Shared naming convention across formulas, matching how they're usually
 * written on paper:
 *   - A, B, … are points; dA, dB, … are their Euclidean distances from the
 *     origin (see `distanceFromOrigin`).
 *
 * Add new formulas as additional named exports below.
 */

import type { CircleShape, XY } from "./shapes";

/** Euclidean distance from a point to the origin (the "d" in dA, dB, …). */
export function distanceFromOrigin(p: XY): number {
  return Math.hypot(p.x, p.y);
}

/**
 * The circle through A and B that is orthogonal to the unit circle — the
 * hyperbolic geodesic ("straight line" of the Poincaré disk) through A and
 * B, expressed as a Euclidean center/radius so it can be rendered directly
 * as an SVG circle/arc.
 *
 * Returns null when A, B and the origin are (numerically) collinear: the
 * geodesic through them degenerates to a diameter (a straight line), which
 * has no finite orthogonal-circle representation. `denom` is twice the
 * signed area of triangle (O, A, B), exactly zero for true collinearity —
 * but coordinates arriving from a real click (screen → SVG → model, via a
 * matrix inverse) are essentially never bit-exact even when the user's
 * intent was a diameter, leaving a residual on the order of 1e-13 for
 * points within the unit disk. Without a tolerance, that residual is
 * treated as "not collinear", producing an orthogonal circle with a
 * near-infinite radius: it still renders as what looks like a straight
 * line, but squaring and differencing that huge radius (e.g. in
 * intersection math) amplifies the residual into garbage. The tolerance
 * below is well above that noise floor and well below the `denom` of any
 * deliberately-distinct pair of points inside the disk.
 */
export function orthogonalCircleThroughPoints(
  a: XY,
  b: XY,
): CircleShape | null {
  const denom = 2 * (a.x * b.y - b.x * a.y);
  if (Math.abs(denom) < 1e-9) return null;

  const dA = distanceFromOrigin(a);
  const dB = distanceFromOrigin(b);
  const dA2 = dA * dA;
  const dB2 = dB * dB;
  const p = dA2 + 1;
  const q = dB2 + 1;

  const cx = (b.y * p - a.y * q) / denom;
  const cy = (a.x * q - b.x * p) / denom;
  const rSquared =
    (-2 * p * q * (a.y * b.y + a.x * b.x) + dA2 * q * q + p * p * dB2) /
      (denom * denom) -
    1;

  return { cx, cy, r: Math.sqrt(rSquared) };
}

/**
 * The hyperbolic circle centered at A passing through B, expressed as a
 * Euclidean center/radius. A hyperbolic circle IS a Euclidean circle — just
 * with its center shifted away from A toward the disk boundary — so the
 * result renders directly as an SVG `<circle>` with no clipping needed: it
 * never reaches the unit circle (a hyperbolic circle of finite radius stays
 * strictly inside the disk).
 *
 * Defined for any A, B strictly inside the unit disk: unlike
 * `orthogonalCircleThroughPoints`, there's no degenerate case here, since
 * the denominator `1 + dA² − 2(A·B)` equals `1 − dB² + |A−B|²`, and
 * `1 − dB²` alone is already positive for B inside the disk.
 */
export function hyperbolicCircleThroughPoints(a: XY, b: XY): CircleShape {
  const dA2 = a.x * a.x + a.y * a.y;
  const dB2 = b.x * b.x + b.y * b.y;
  const dot = a.x * b.x + a.y * b.y;
  const denom = 1 + dA2 - 2 * dot;
  const oneMinusDB2 = 1 - dB2;

  const cx = (a.x * oneMinusDB2) / denom;
  const cy = (a.y * oneMinusDB2) / denom;
  const rSquared =
    (dA2 * oneMinusDB2 * oneMinusDB2 -
      2 * oneMinusDB2 * dot * denom +
      dB2 * denom * denom) /
    (denom * denom);

  return { cx, cy, r: Math.sqrt(rSquared) };
}

/**
 * The hyperbolic midpoint of two points on the same diameter (A, B and the
 * origin collinear — see `orthogonalCircleThroughPoints`'s null case).
 * Parametrizes both by their signed hyperbolic "coordinate" along that line
 * (`atanh` of their signed Euclidean distance from the origin) and averages
 * those, which is exactly hyperbolic distance for points on a diameter — the
 * general formula below has a removable singularity here (see its use).
 */
function collinearMidpoint(a: XY, b: XY): XY {
  const dir = distanceFromOrigin(a) >= distanceFromOrigin(b) ? a : b;
  const d = distanceFromOrigin(dir);
  if (d < 1e-9) return { x: 0, y: 0 }; // both (numerically) at the origin
  const ux = dir.x / d;
  const uy = dir.y / d;
  const ta = a.x * ux + a.y * uy;
  const tb = b.x * ux + b.y * uy;
  const tMid = Math.tanh((Math.atanh(ta) + Math.atanh(tb)) / 2);
  return { x: tMid * ux, y: tMid * uy };
}

/**
 * The hyperbolic midpoint of A and B: the point on the geodesic through them
 * equidistant (hyperbolically) from both, in unit-disk model coordinates.
 *
 * For any two points strictly inside the unit disk that aren't collinear
 * with the origin: with `p = dA² − 1` and `q = dB² − 1` (both negative
 * there), the quantity under the square root is
 * `p·q·(−2(A·B) + dA²dB² + 1)`, and since `A·B ≤ dA·dB` (Cauchy–Schwarz),
 * `−2(A·B) + dA²dB² + 1 ≥ (dA·dB − 1)² ≥ 0` — so the radicand is a product
 * of two non-negative factors, never negative.
 *
 * When A, B and the origin ARE collinear, this general formula's numerator
 * and denominator both vanish (most visibly for antipodal A, B, where it's
 * an exact 0/0 — both are `2p²(A·B + dA²)`-shaped, and `A·B = −dA²` exactly
 * when B = −A) — a removable singularity, not an actual sign of no
 * midpoint, so `collinearMidpoint` computes it directly instead.
 */
export function hyperbolicMidpoint(a: XY, b: XY): XY {
  const orthogonal = orthogonalCircleThroughPoints(a, b);
  if (!orthogonal) return collinearMidpoint(a, b);

  const dA2 = a.x * a.x + a.y * a.y;
  const dB2 = b.x * b.x + b.y * b.y;
  const dot = a.x * b.x + a.y * b.y;
  const p = dA2 - 1;
  const q = dB2 - 1;

  const radicand = p * q * (-2 * dot + dA2 * dB2 + 1);
  const bracket = -Math.sqrt(Math.max(0, radicand)) - dA2 * dB2 + 1;
  const denom = 2 * p * q * dot + dA2 * q * q + p * p * dB2;

  const numX = p * b.x + q * a.x;
  const numY = p * b.y + q * a.y;

  return {
    x: -(numX * bracket) / denom,
    y: -(numY * bracket) / denom,
  };
}

/** An arc of the circle orthogonal to the unit circle, from p1 to p2. */
export interface HyperbolicArc {
  readonly kind: "arc";
  readonly p1: XY;
  readonly p2: XY;
  readonly r: number;
  /** SVG arc flags for sweeping from p1 to p2 along the disk-side arc. */
  readonly largeArc: boolean;
  readonly sweep: boolean;
}

/** A diameter of the unit circle (the geodesic when A, B, O are collinear). */
export interface HyperbolicDiameter {
  readonly kind: "diameter";
  readonly p1: XY;
  readonly p2: XY;
}

export type HyperbolicLine = HyperbolicArc | HyperbolicDiameter;

/**
 * The hyperbolic line ("geodesic") through A and B, clipped to the part
 * inside the unit disk.
 *
 * Built from `orthogonalCircleThroughPoints`: the geodesic is the arc of
 * that circle between its two intersections with the unit circle — the
 * only two points where it crosses the disk boundary. Because the circle
 * crosses the boundary transversally at exactly those two points, one of
 * the two arcs they cut it into lies entirely inside the disk and the other
 * entirely outside; since A and B are themselves inside the disk, picking
 * the arc that runs through A (found via `orthogonalCircleThroughPoints`'s
 * A) is sufficient — B, on the same circle and same side, follows.
 *
 * When A, B and the origin are collinear, `orthogonalCircleThroughPoints`
 * returns null (no finite orthogonal circle exists) and the geodesic is the
 * straight diameter through them instead.
 *
 * Returns null when A and B coincide — a line needs two distinct points.
 */
export function hyperbolicLineThroughPoints(
  a: XY,
  b: XY,
): HyperbolicLine | null {
  if (a.x === b.x && a.y === b.y) return null;

  const circle = orthogonalCircleThroughPoints(a, b);
  if (!circle) {
    const dir = distanceFromOrigin(a) >= distanceFromOrigin(b) ? a : b;
    const d = distanceFromOrigin(dir);
    return {
      kind: "diameter",
      p1: { x: -dir.x / d, y: -dir.y / d },
      p2: { x: dir.x / d, y: dir.y / d },
    };
  }

  // Intersections of `circle` with the unit circle, using that orthogonality
  // pins the distance from the origin to `circle`'s center at sqrt(r^2 + 1)
  // (see the invariant checked in the test file), which collapses the
  // general circle-circle intersection formula to this closed form.
  const d2 = circle.cx * circle.cx + circle.cy * circle.cy;
  const p1: XY = {
    x: (circle.cx - circle.r * circle.cy) / d2,
    y: (circle.cy + circle.r * circle.cx) / d2,
  };
  const p2: XY = {
    x: (circle.cx + circle.r * circle.cy) / d2,
    y: (circle.cy - circle.r * circle.cx) / d2,
  };

  const angleFrom = (p: XY): number =>
    Math.atan2(p.y - circle.cy, p.x - circle.cx);
  const twoPi = 2 * Math.PI;
  const normalize = (theta: number): number =>
    ((theta % twoPi) + twoPi) % twoPi;

  const theta1 = angleFrom(p1);
  const spanToP2 = normalize(angleFrom(p2) - theta1);
  const spanToA = normalize(angleFrom(a) - theta1);

  const sweep = spanToA <= spanToP2;
  const span = sweep ? spanToP2 : twoPi - spanToP2;

  return { kind: "arc", p1, p2, r: circle.r, largeArc: span > Math.PI, sweep };
}

/**
 * The hyperbolic segment between A and B: the part of the geodesic through
 * them (see `hyperbolicLineThroughPoints`) that lies between the two points
 * themselves, rather than extended out to the disk boundary — an arc of the
 * same orthogonal circle, just the piece from A to B instead of the piece
 * from boundary to boundary. The full geodesic line always contains this
 * segment.
 *
 * Of the two arcs from A to B around that circle, one stays inside the disk
 * and the other bulges out past the boundary; picking the one whose
 * midpoint is still inside the disk (distance from the origin under 1)
 * selects the right one without needing the boundary intersections at all.
 *
 * Falls back to the straight segment between A and B when A, B and the
 * origin are collinear, matching the diameter case of the full geodesic.
 *
 * Returns null when A and B coincide — a segment needs two distinct points.
 */
export function hyperbolicSegmentThroughPoints(
  a: XY,
  b: XY,
): HyperbolicLine | null {
  if (a.x === b.x && a.y === b.y) return null;

  const circle = orthogonalCircleThroughPoints(a, b);
  if (!circle) return { kind: "diameter", p1: a, p2: b };

  const angleFrom = (p: XY): number =>
    Math.atan2(p.y - circle.cy, p.x - circle.cx);
  const twoPi = 2 * Math.PI;
  const normalize = (theta: number): number =>
    ((theta % twoPi) + twoPi) % twoPi;

  const thetaA = angleFrom(a);
  const spanCCW = normalize(angleFrom(b) - thetaA);
  const midTheta = thetaA + spanCCW / 2;
  const mid: XY = {
    x: circle.cx + circle.r * Math.cos(midTheta),
    y: circle.cy + circle.r * Math.sin(midTheta),
  };

  const sweep = distanceFromOrigin(mid) < 1;
  const span = sweep ? spanCCW : twoPi - spanCCW;

  return {
    kind: "arc",
    p1: a,
    p2: b,
    r: circle.r,
    largeArc: span > Math.PI,
    sweep,
  };
}
