/**
 * Tools as one-click-at-a-time state machines. Each tool declares how many
 * points it needs; clicks accumulate point ids in a buffer until the tool is
 * satisfied, then the entity is created and the buffer resets.
 */

import { acquirePoint, addCircle, addLine, addSegment } from "./construction";
import type { Construction, EntityId } from "./types";

/**
 * Snap radius in model units: clicks within this reuse an existing point.
 * The unit disk has radius 1, so this is a plain model-space constant with
 * no dependency on the view's current pixel scale — the view converts
 * screen coordinates to model space before ever calling into the engine, so
 * a display-scale change never needs a matching change here.
 */
export const SNAP_THRESHOLD = 0.04;

export type ToolId =
  | "select"
  | "point"
  | "segment"
  | "line"
  | "circle"
  | "intersect"
  | "midpoint"
  | "angle";

// Display names are presentation and live in the view's i18n layer;
// the engine only knows stable ids and click counts.
export interface ToolDef {
  readonly id: ToolId;
  readonly pointsNeeded: number;
}

// 'intersect' clicks pick entities, not coordinates, so it needs geometry
// (which curves cross where) the engine doesn't have — its 2-click buffering
// is handled by the view's reducer instead of applyClick below (see
// appState.ts's 'entityClick' action, and view/intersections.ts for the
// math). It's still declared here so the toolbar/tool-switching machinery
// treats it like any other tool.
//
// 'midpoint' clicks a coordinate like segment/line/circle (so it does flow
// through applyClick's buffering below), but the entity it creates is a
// point with real coordinates computed by a hyperbolic formula — geometry
// the engine doesn't have either. applyClick fills its buffer the same way
// as the curve tools but stops short of creating the entity; appState.ts's
// 'canvasClick' case finishes the job (see hyperbolicFormulas.ts's
// `hyperbolicMidpoint`).
//
// 'angle' clicks pick either 3 points (a, vertex, b) or 2 curves, and which
// one is only known once the first click lands — so, like 'intersect', its
// buffering isn't uniform enough for this function alone. The 3-points case
// still flows through applyClick's generic buffering below (pointsNeeded: 3
// covers it, same deferred-creation pattern as 'midpoint' — appState.ts's
// 'canvasClick' case finishes it); the 2-curves case bypasses applyClick
// entirely, same as 'intersect' (see appState.ts's 'entityClick' action and
// view/angles.ts for the tangent-based math, both shared with 'intersect').
export const TOOLS: Readonly<Record<ToolId, ToolDef>> = {
  select: { id: "select", pointsNeeded: 0 },
  point: { id: "point", pointsNeeded: 1 },
  segment: { id: "segment", pointsNeeded: 2 },
  line: { id: "line", pointsNeeded: 2 },
  circle: { id: "circle", pointsNeeded: 2 },
  intersect: { id: "intersect", pointsNeeded: 2 },
  midpoint: { id: "midpoint", pointsNeeded: 2 },
  angle: { id: "angle", pointsNeeded: 3 },
};

export const TOOL_ORDER: readonly ToolId[] = [
  "select",
  "point",
  "segment",
  "line",
  "circle",
  "intersect",
  "midpoint",
  "angle",
];

export interface ToolState {
  readonly tool: ToolId;
  /** Point ids accumulated by clicks, in order. */
  readonly buffer: readonly EntityId[];
}

export function initialToolState(): ToolState {
  return { tool: "select", buffer: [] };
}

/** Switching tools always clears the in-progress buffer. */
export function selectTool(_state: ToolState, tool: ToolId): ToolState {
  return { tool, buffer: [] };
}

export interface ClickResult {
  readonly construction: Construction;
  readonly toolState: ToolState;
  /** Id of the entity this click completed (for the point tool: the new point), or null. */
  readonly created: EntityId | null;
}

/**
 * Advance the active tool's state machine with one canvas click.
 * Points are acquired via snapping: an existing point within `threshold`
 * is reused, otherwise a free point is created at the click position.
 */
export function applyClick(
  construction: Construction,
  toolState: ToolState,
  x: number,
  y: number,
  threshold: number = SNAP_THRESHOLD,
): ClickResult {
  const { tool, buffer } = toolState;
  if (tool === "select") {
    return { construction, toolState, created: null };
  }

  const acquired = acquirePoint(construction, x, y, threshold);

  if (tool === "point") {
    // Snapping makes dropping a point onto an existing one a no-op
    // rather than stacking an invisible duplicate.
    return {
      construction: acquired.construction,
      toolState,
      created: acquired.created ? acquired.id : null,
    };
  }

  // Two-point tools: ignore a click that re-selects a buffered point —
  // a segment/line/circle needs two distinct points.
  if (buffer.includes(acquired.id)) {
    return { construction: acquired.construction, toolState, created: null };
  }

  const nextBuffer = [...buffer, acquired.id];
  if (nextBuffer.length < TOOLS[tool].pointsNeeded) {
    return {
      construction: acquired.construction,
      toolState: { tool, buffer: nextBuffer },
      created: null,
    };
  }

  // segment/line/circle entities need no geometry to create — they only
  // ever store point references, resolved at render time — so applyClick
  // finishes them itself. Any other 2-point tool (currently just
  // 'midpoint') needs geometry the engine doesn't have, so it reports the
  // full buffer back without creating anything; the caller finishes it
  // (see the TOOLS doc comment above).
  if (tool === "segment" || tool === "line" || tool === "circle") {
    const [a, b] = nextBuffer as [EntityId, EntityId];
    const added =
      tool === "segment"
        ? addSegment(acquired.construction, a, b)
        : tool === "line"
          ? addLine(acquired.construction, a, b)
          : addCircle(acquired.construction, a, b);

    return {
      construction: added.construction,
      toolState: { tool, buffer: [] },
      created: added.id,
    };
  }

  return {
    construction: acquired.construction,
    toolState: { tool, buffer: nextBuffer },
    created: null,
  };
}
