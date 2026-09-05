/**
 * Intersection geometry for the "intersect" tool. Counterpart to
 * hyperbolicFormulas.ts: that file turns two points into the visible
 * curve through them, this one turns two curves into the point(s) where
 * they cross.
 *
 * Every hyperbolic line/segment lies on a Euclidean circle orthogonal to
 * the unit circle, or — when degenerate — on a straight line through the
 * origin (see orthogonalCircleThroughPoints). Every hyperbolic circle IS a
 * Euclidean circle. So every line/circle/segment pairing reduces to
 * ordinary Euclidean line-circle geometry, then two filters bring it back
 * down to what's actually visible: inside the disk, and — for a segment,
 * whose curve extends beyond its two endpoints — between those endpoints.
 */

import type {
  Circle,
  Construction,
  Entity,
  EntityId,
  Line,
  Segment,
} from "../engine";
import { getPoint } from "../engine";
import {
  distanceFromOrigin,
  hyperbolicCircleThroughPoints,
  orthogonalCircleThroughPoints,
} from "./hyperbolicFormulas";
import type { CircleShape, XY } from "./shapes";

const EPS = 1e-9;

export type IntersectableEntity = Segment | Line | Circle;

export function isIntersectable(e: Entity): e is IntersectableEntity {
  return e.kind === "segment" || e.kind === "line" || e.kind === "circle";
}

/**
 * The full Euclidean curve a hyperbolic line/segment/circle lies on.
 * Exported for view/angles.ts, which needs a curve's tangent direction at
 * an arbitrary point on it (its own math, independent of intersection
 * solving) to measure the angle between two curves.
 */
export type Curve =
  | {
      readonly kind: "circle";
      readonly cx: number;
      readonly cy: number;
      readonly r: number;
    }
  | { readonly kind: "line"; readonly dx: number; readonly dy: number }; // through the origin

function lineCurve(a: XY, b: XY): Curve | null {
  const orthogonal = orthogonalCircleThroughPoints(a, b);
  if (orthogonal) return { kind: "circle", ...orthogonal };
  const far = distanceFromOrigin(a) >= distanceFromOrigin(b) ? a : b;
  const len = distanceFromOrigin(far);
  if (len < EPS) return null; // a === b === origin: no line through them
  return { kind: "line", dx: far.x / len, dy: far.y / len };
}

function curveOfLineOrSegment(
  construction: Construction,
  entity: Line | Segment,
): Curve | null {
  const a = getPoint(construction, entity.a);
  const b = getPoint(construction, entity.b);
  return a && b ? lineCurve(a, b) : null;
}

function curveOfCircle(
  construction: Construction,
  entity: Circle,
): Curve | null {
  const center = getPoint(construction, entity.center);
  const thru = getPoint(construction, entity.thru);
  if (!center || !thru) return null;
  return { kind: "circle", ...hyperbolicCircleThroughPoints(center, thru) };
}

export function curveOf(
  construction: Construction,
  entity: IntersectableEntity,
): Curve | null {
  return entity.kind === "circle"
    ? curveOfCircle(construction, entity)
    : curveOfLineOrSegment(construction, entity);
}

/** Up to two solutions of two Euclidean circles' intersection. */
function circleCircle(c1: CircleShape, c2: CircleShape): XY[] {
  const dx = c2.cx - c1.cx;
  const dy = c2.cy - c1.cy;
  const d = Math.hypot(dx, dy);
  if (d < EPS || d > c1.r + c2.r + EPS || d < Math.abs(c1.r - c2.r) - EPS)
    return [];
  const a = (c1.r * c1.r - c2.r * c2.r + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, c1.r * c1.r - a * a));
  const mx = c1.cx + (a * dx) / d;
  const my = c1.cy + (a * dy) / d;
  if (h < EPS) return [{ x: mx, y: my }];
  const ox = -dy * (h / d);
  const oy = dx * (h / d);
  return [
    { x: mx + ox, y: my + oy },
    { x: mx - ox, y: my - oy },
  ];
}

/** Up to two solutions of a line through the origin (direction dx,dy) and a circle. */
function lineCircle(dx: number, dy: number, c: CircleShape): XY[] {
  const t = c.cx * dx + c.cy * dy; // projection of the circle's center onto the line
  const closeX = t * dx;
  const closeY = t * dy;
  const hSquared = c.r * c.r - ((c.cx - closeX) ** 2 + (c.cy - closeY) ** 2);
  if (hSquared < -EPS) return [];
  const h = Math.sqrt(Math.max(0, hSquared));
  if (h < EPS) return [{ x: closeX, y: closeY }];
  return [
    { x: closeX + h * dx, y: closeY + h * dy },
    { x: closeX - h * dx, y: closeY - h * dy },
  ];
}

/** The origin, if two distinct lines through it aren't parallel. */
function lineLine(d1x: number, d1y: number, d2x: number, d2y: number): XY[] {
  const cross = d1x * d2y - d1y * d2x;
  return Math.abs(cross) < EPS ? [] : [{ x: 0, y: 0 }];
}

function intersectCurves(c1: Curve, c2: Curve): XY[] {
  if (c1.kind === "circle" && c2.kind === "circle") return circleCircle(c1, c2);
  if (c1.kind === "circle" && c2.kind === "line")
    return lineCircle(c2.dx, c2.dy, c1);
  if (c1.kind === "line" && c2.kind === "circle")
    return lineCircle(c1.dx, c1.dy, c2);
  if (c1.kind === "line" && c2.kind === "line")
    return lineLine(c1.dx, c1.dy, c2.dx, c2.dy);
  return [];
}

const TWO_PI = 2 * Math.PI;
const normalizeAngle = (theta: number): number =>
  ((theta % TWO_PI) + TWO_PI) % TWO_PI;

/**
 * Is `p` (already known to lie on the segment's curve) between its two
 * endpoints — i.e. on the actual hyperbolic segment, not just somewhere
 * else on the geodesic it extends to? Mirrors the arc-selection logic in
 * hyperbolicSegmentThroughPoints: of the two arcs (or, for a straight
 * diameter, the one line) through A and B, the segment is whichever part
 * stays inside the disk.
 */
function onSegmentSpan(
  construction: Construction,
  entity: Segment,
  p: XY,
): boolean {
  const a = getPoint(construction, entity.a);
  const b = getPoint(construction, entity.b);
  if (!a || !b) return false;

  const circle = orthogonalCircleThroughPoints(a, b);
  if (!circle) {
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const len2 = abx * abx + aby * aby;
    if (len2 < EPS) return false;
    const t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2;
    if (t < -1e-6 || t > 1 + 1e-6) return false;
    const projX = a.x + t * abx;
    const projY = a.y + t * aby;
    return Math.hypot(p.x - projX, p.y - projY) < 1e-6;
  }

  const angleFrom = (q: XY) => Math.atan2(q.y - circle.cy, q.x - circle.cx);
  const thetaA = angleFrom(a);
  const spanCCW = normalizeAngle(angleFrom(b) - thetaA);
  const midTheta = thetaA + spanCCW / 2;
  const mid: XY = {
    x: circle.cx + circle.r * Math.cos(midTheta),
    y: circle.cy + circle.r * Math.sin(midTheta),
  };
  const sweep = distanceFromOrigin(mid) < 1;
  const spanToP = normalizeAngle(angleFrom(p) - thetaA);
  const tol = 1e-6;
  return sweep ? spanToP <= spanCCW + tol : spanToP >= spanCCW - tol;
}

/** Every visible intersection point between two curve entities. */
export function intersectEntities(
  construction: Construction,
  a: IntersectableEntity,
  b: IntersectableEntity,
): XY[] {
  const curveA = curveOf(construction, a);
  const curveB = curveOf(construction, b);
  if (!curveA || !curveB) return [];

  let points = intersectCurves(curveA, curveB).filter(
    (p) => distanceFromOrigin(p) < 1 - EPS,
  );
  if (a.kind === "segment")
    points = points.filter((p) => onSegmentSpan(construction, a, p));
  if (b.kind === "segment")
    points = points.filter((p) => onSegmentSpan(construction, b, p));
  return points;
}

/**
 * The engine's `recomputeIntersections` compute callback: resolve two
 * entity ids to their current intersection solutions and return the one
 * at `branch`, or null if they no longer meet (or aren't curves anymore —
 * e.g. one was deleted, though that normally cascades the point away too).
 */
export function computeIntersectionPoint(
  construction: Construction,
  aId: EntityId,
  bId: EntityId,
  branch: 0 | 1,
): XY | null {
  const a = construction.entities[aId];
  const b = construction.entities[bId];
  if (!a || !b || !isIntersectable(a) || !isIntersectable(b)) return null;
  return intersectEntities(construction, a, b)[branch] ?? null;
}
