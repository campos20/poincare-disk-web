/**
 * Maps engine entities to SVG. All actual geometry lives in geometry.ts
 * (the SWAP POINT for the future Poincaré rendering); this file only picks
 * SVG elements and styling.
 */

import type { CSSProperties, ReactNode } from "react";
import { getPoint } from "../engine";
import type { Construction, Entity, EntityId } from "../engine";
import { resolveAngle } from "./angles";
import { DISK_RADIUS, toScreen } from "./disk";
import { segmentShape } from "./geometry";
import type { HyperbolicLine } from "./hyperbolicFormulas";
import {
  hyperbolicCircleThroughPoints,
  hyperbolicLineThroughPoints,
  hyperbolicSegmentThroughPoints,
} from "./hyperbolicFormulas";

/** Pixel radius of the small arc drawn at an angle's vertex. */
const ANGLE_ARC_RADIUS = 26;
const TWO_PI = 2 * Math.PI;

export interface RenderOptions {
  /** Entity ids buffered by the active tool: point ids for the 2-point
   * tools, curve entity ids for the intersect tool (highlighted either way). */
  readonly highlighted: ReadonlySet<EntityId>;
  /** Point currently being dragged. */
  readonly dragId: EntityId | null;
  /** Display names for points, keyed by id (see naming.ts). */
  readonly names: ReadonlyMap<EntityId, string>;
  /** Object selected in the left panel, or null. */
  readonly selectedId: EntityId | null;
}

function strokeClass(entity: Entity, opts: RenderOptions, extra = ""): string {
  const buffered = opts.highlighted.has(entity.id) ? " buffered" : "";
  const selected = entity.id === opts.selectedId ? " selected" : "";
  return `ent-stroke${extra}${buffered}${selected}`;
}

// A custom color is skipped while the entity is buffered by the active
// tool (e.g. the first pick for the intersect tool) so the buffered
// feedback color — applied via the .ent-stroke.buffered CSS class — isn't
// overridden by this inline style, which otherwise always wins.
function strokeStyle(
  entity: Entity,
  opts: RenderOptions,
): CSSProperties | undefined {
  const buffered = opts.highlighted.has(entity.id);
  return !buffered && entity.color ? { stroke: entity.color } : undefined;
}

const DERIVED_POINT_KINDS = new Set(["intersection", "midpoint"]);

function pointClass(entity: Entity, opts: RenderOptions): string {
  const derived = DERIVED_POINT_KINDS.has(entity.kind) ? " derived" : "";
  const selected = entity.id === opts.selectedId ? " selected" : "";
  if (entity.id === opts.dragId)
    return `ent-point dragging${derived}${selected}`;
  if (opts.highlighted.has(entity.id))
    return `ent-point buffered${derived}${selected}`;
  return `ent-point${derived}${selected}`;
}

/** SVG path `d` for a hyperbolic line/segment shape, scaled to screen space. */
function hyperbolicPath(shape: HyperbolicLine): string {
  const p1 = toScreen(shape.p1);
  const p2 = toScreen(shape.p2);
  if (shape.kind === "diameter") return segmentShape(p1, p2);
  return `M ${p1.x} ${p1.y} A ${shape.r * DISK_RADIUS} ${shape.r * DISK_RADIUS} 0 ${
    shape.largeArc ? 1 : 0
  } ${shape.sweep ? 1 : 0} ${p2.x} ${p2.y}`;
}

/**
 * Render one entity from its referenced points' CURRENT coordinates.
 * Returns null when a reference is unresolvable or the shape is off-screen.
 */
export function renderEntity(
  construction: Construction,
  entity: Entity,
  opts: RenderOptions,
): ReactNode {
  switch (entity.kind) {
    case "point":
    case "intersection":
    case "midpoint": {
      if (entity.hidden) return null;
      // A vanished intersection/midpoint (its sources currently don't
      // resolve) has no real position — its x/y are just frozen at the
      // last one — so it must not be drawn.
      if (entity.kind !== "point" && !entity.exists) return null;
      const p = toScreen(entity);
      const name = opts.names.get(entity.id);
      // A custom color is skipped while the point is being actively
      // manipulated so the drag/buffered feedback colors stay visible.
      const active =
        entity.id === opts.dragId || opts.highlighted.has(entity.id);
      const style: CSSProperties | undefined =
        !active && entity.color ? { fill: entity.color } : undefined;
      return (
        <g key={entity.id}>
          <circle
            data-point-id={entity.id}
            className={pointClass(entity, opts)}
            style={style}
            cx={p.x}
            cy={p.y}
            r={5}
          />
          {name && (
            <text className="point-label" x={p.x + 8} y={p.y - 8}>
              {name}
            </text>
          )}
        </g>
      );
    }
    case "segment": {
      if (entity.hidden) return null;
      // The formulas assume a true radius-1 disk, so these need the raw
      // model points, not screen-scaled ones — the resulting shape is
      // scaled to screen afterward instead.
      const a = getPoint(construction, entity.a);
      const b = getPoint(construction, entity.b);
      if (!a || !b) return null;
      const shape = hyperbolicSegmentThroughPoints(a, b);
      if (!shape) return null;
      const d = hyperbolicPath(shape);
      return (
        <g key={entity.id} data-entity-id={entity.id}>
          <path className="ent-hit" d={d} />
          <path
            className={strokeClass(entity, opts)}
            style={strokeStyle(entity, opts)}
            d={d}
          />
        </g>
      );
    }
    case "line": {
      if (entity.hidden) return null;
      const a = getPoint(construction, entity.a);
      const b = getPoint(construction, entity.b);
      if (!a || !b) return null;
      const shape = hyperbolicLineThroughPoints(a, b);
      if (!shape) return null;
      const d = hyperbolicPath(shape);
      return (
        <g key={entity.id} data-entity-id={entity.id}>
          <path className="ent-hit" d={d} />
          <path
            className={strokeClass(entity, opts, " ent-line")}
            style={strokeStyle(entity, opts)}
            d={d}
          />
        </g>
      );
    }
    case "circle": {
      if (entity.hidden) return null;
      // Like the line case, the formula assumes a true radius-1 disk, so it
      // needs the raw model points; the resulting shape is scaled to screen
      // afterward.
      const center = getPoint(construction, entity.center);
      const thru = getPoint(construction, entity.thru);
      if (!center || !thru) return null;
      const shape = hyperbolicCircleThroughPoints(center, thru);
      const c = toScreen({ x: shape.cx, y: shape.cy });
      const r = shape.r * DISK_RADIUS;
      return (
        <g key={entity.id} data-entity-id={entity.id}>
          <circle className="ent-hit" cx={c.x} cy={c.y} r={r} />
          <circle
            className={strokeClass(entity, opts)}
            style={strokeStyle(entity, opts)}
            cx={c.x}
            cy={c.y}
            r={r}
          />
        </g>
      );
    }
    case "angle": {
      if (entity.hidden) return null;
      // The vertex and rays are resolved fresh from current point/curve
      // positions every render — same "no stored geometry" approach as
      // segment/line/circle above (see view/angles.ts).
      const resolved = resolveAngle(construction, entity);
      if (!resolved) return null;
      const { vertex, u, v, radians } = resolved;
      const center = toScreen(vertex);

      const thetaU = Math.atan2(u.y, u.x);
      const thetaV = Math.atan2(v.y, v.x);
      const spanCCW = ((thetaV - thetaU) % TWO_PI + TWO_PI) % TWO_PI;
      // The arc command always draws the minor (<= π) arc between the two
      // rays — exactly the angle `radians` already measures — so which
      // direction that is (sweep-flag) just depends on whether the CCW gap
      // between them happens to be that minor one.
      const sweep = spanCCW <= Math.PI;
      const p1 = {
        x: center.x + ANGLE_ARC_RADIUS * Math.cos(thetaU),
        y: center.y + ANGLE_ARC_RADIUS * Math.sin(thetaU),
      };
      const p2 = {
        x: center.x + ANGLE_ARC_RADIUS * Math.cos(thetaV),
        y: center.y + ANGLE_ARC_RADIUS * Math.sin(thetaV),
      };
      const d = `M ${p1.x} ${p1.y} A ${ANGLE_ARC_RADIUS} ${ANGLE_ARC_RADIUS} 0 0 ${
        sweep ? 1 : 0
      } ${p2.x} ${p2.y}`;

      // The label sits along the angle's bisector; when u and v point
      // nearly opposite ways (a near-straight angle), fall back to a
      // perpendicular of u rather than dividing by a near-zero length.
      let bx = u.x + v.x;
      let by = u.y + v.y;
      const blen = Math.hypot(bx, by);
      if (blen < 1e-6) {
        bx = -u.y;
        by = u.x;
      } else {
        bx /= blen;
        by /= blen;
      }
      const labelR = ANGLE_ARC_RADIUS + 18;

      const buffered = opts.highlighted.has(entity.id) ? " buffered" : "";
      const selected = entity.id === opts.selectedId ? " selected" : "";
      const degrees = (radians * 180) / Math.PI;

      return (
        <g key={entity.id}>
          <path
            className={`ent-angle-arc${buffered}${selected}`}
            style={strokeStyle(entity, opts)}
            d={d}
          />
          <text
            className="ent-angle-label"
            textAnchor="middle"
            x={center.x + bx * labelR}
            y={center.y + by * labelR}
          >
            {`${degrees.toFixed(1)}°`}
          </text>
        </g>
      );
    }
  }
}
