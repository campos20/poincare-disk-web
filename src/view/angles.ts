/**
 * Angle measurement for the Poincaré disk. The model is conformal — a
 * Euclidean angle between two curves equals the hyperbolic angle between
 * them — so measuring an angle only ever needs each curve's Euclidean
 * tangent direction at the shared vertex; nothing here is hyperbolic-
 * specific beyond that fact. Counterpart to intersections.ts (curves →
 * crossing points) and hyperbolicFormulas.ts (points → curves): this one
 * is curves/points → the angle between them.
 */

import type { Construction, CurvesAngle, PointsAngle } from "../engine";
import { getPoint } from "../engine";
import {
  distanceFromOrigin,
  orthogonalCircleThroughPoints,
} from "./hyperbolicFormulas";
import { curveOf, intersectEntities, isIntersectable } from "./intersections";
import type { Curve } from "./intersections";
import type { XY } from "./shapes";

const EPS = 1e-9;
const TWO_PI = 2 * Math.PI;
const normalizeAngle = (theta: number): number =>
  ((theta % TWO_PI) + TWO_PI) % TWO_PI;

/** A resolved angle, ready to render: where its vertex sits and the two
 * unit tangent directions (in model space) its rays point along. */
export interface ResolvedAngle {
  readonly vertex: XY;
  readonly u: XY;
  readonly v: XY;
  /** In [0, π] — the non-reflex angle between `u` and `v`. */
  readonly radians: number;
}

function angleBetween(u: XY, v: XY): number {
  const dot = Math.max(-1, Math.min(1, u.x * v.x + u.y * v.y));
  return Math.acos(dot);
}

/**
 * Unit tangent of the geodesic through `vertex` and `other`, at `vertex`,
 * pointing along the (in-disk) arc toward `other` — mirrors the arc/sweep
 * selection in hyperbolicFormulas.ts's `hyperbolicSegmentThroughPoints`,
 * since that's exactly the arc this is the initial direction of. Returns
 * null only when `vertex` and `other` coincide (no direction to point in).
 */
function tangentToward(vertex: XY, other: XY): XY | null {
  const dx = other.x - vertex.x;
  const dy = other.y - vertex.y;
  if (Math.hypot(dx, dy) < EPS) return null;

  const circle = orthogonalCircleThroughPoints(vertex, other);
  if (!circle) {
    // Diameter case: a straight line, so its direction is constant.
    const len = Math.hypot(dx, dy);
    return { x: dx / len, y: dy / len };
  }

  const angleFrom = (p: XY) => Math.atan2(p.y - circle.cy, p.x - circle.cx);
  const thetaV = angleFrom(vertex);
  const spanCCW = normalizeAngle(angleFrom(other) - thetaV);
  const midTheta = thetaV + spanCCW / 2;
  const mid: XY = {
    x: circle.cx + circle.r * Math.cos(midTheta),
    y: circle.cy + circle.r * Math.sin(midTheta),
  };
  // Derivative of (cx + r cosθ, cy + r sinθ) w.r.t. θ is r(-sinθ, cosθ):
  // the CCW tangent. Whether CCW is "toward other" along the in-disk arc
  // is the same in-disk-midpoint test the segment renderer uses.
  const ccw: XY = { x: -Math.sin(thetaV), y: Math.cos(thetaV) };
  const towardOther = distanceFromOrigin(mid) < 1;
  return towardOther ? ccw : { x: -ccw.x, y: -ccw.y };
}

/** Unit tangent of `curve` at `p` (assumed to lie on it). */
function tangentAt(curve: Curve, p: XY): XY {
  if (curve.kind === "line") return { x: curve.dx, y: curve.dy };
  const rx = p.x - curve.cx;
  const ry = p.y - curve.cy;
  const len = Math.hypot(rx, ry) || 1;
  return { x: -ry / len, y: rx / len };
}

/** Resolve a `PointsAngle`: the vertex is a real point, rays point toward
 * the other two. Null if any point doesn't currently resolve, or if the
 * vertex coincides with one of them (no ray to measure). */
function resolvePointsAngle(
  construction: Construction,
  entity: PointsAngle,
): ResolvedAngle | null {
  const vertex = getPoint(construction, entity.vertex);
  const a = getPoint(construction, entity.a);
  const b = getPoint(construction, entity.b);
  if (!vertex || !a || !b) return null;
  const u = tangentToward(vertex, a);
  const v = tangentToward(vertex, b);
  if (!u || !v) return null;
  return { vertex, u, v, radians: angleBetween(u, v) };
}

/** Resolve a `CurvesAngle`: the vertex is wherever the two curves cross
 * (first solution — for the up-to-two circle/circle case, the angle of
 * intersection is the same at both by symmetry, so either works). Null if
 * either isn't a valid curve, or they don't currently cross inside the
 * disk. */
function resolveCurvesAngle(
  construction: Construction,
  entity: CurvesAngle,
): ResolvedAngle | null {
  const a = construction.entities[entity.a];
  const b = construction.entities[entity.b];
  if (!a || !b || !isIntersectable(a) || !isIntersectable(b)) return null;

  const vertex = intersectEntities(construction, a, b)[0];
  if (!vertex) return null;

  const curveA = curveOf(construction, a);
  const curveB = curveOf(construction, b);
  if (!curveA || !curveB) return null;

  const u = tangentAt(curveA, vertex);
  const v = tangentAt(curveB, vertex);
  return { vertex, u, v, radians: angleBetween(u, v) };
}

/** The engine's `Angle` entity resolved to a drawable vertex + rays, or
 * null when it currently has nothing to show (see the two resolvers'
 * doc comments for why). */
export function resolveAngle(
  construction: Construction,
  entity: PointsAngle | CurvesAngle,
): ResolvedAngle | null {
  return entity.mode === "points"
    ? resolvePointsAngle(construction, entity)
    : resolveCurvesAngle(construction, entity);
}
