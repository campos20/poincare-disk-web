/**
 * Pure reducer wiring user intents to engine operations. No React imports —
 * consumed via useReducer in ConstructionApp.
 */

import {
  addIntersectionPoint,
  addMidpoint,
  applyClick,
  deleteEntity,
  emptyConstruction,
  getPoint,
  initialToolState,
  movePoint,
  recomputeIntersections,
  recomputeMidpoints,
  selectTool,
  setColor,
  setHidden,
} from "../engine";
import type { Construction, EntityId, ToolId, ToolState } from "../engine";
import { isInsideDisk } from "./disk";
import { hyperbolicMidpoint } from "./hyperbolicFormulas";
import {
  computeIntersectionPoint,
  intersectEntities,
  isIntersectable,
} from "./intersections";
import type { XY } from "./shapes";

export interface AppState {
  readonly construction: Construction;
  readonly toolState: ToolState;
  /** Point currently being dragged (select tool), or null. */
  readonly dragId: EntityId | null;
  /** Object selected in the left panel, or null. */
  readonly selectedId: EntityId | null;
}

export type AppAction =
  | { type: "setTool"; tool: ToolId }
  | { type: "canvasClick"; x: number; y: number }
  | { type: "dragStart"; id: EntityId }
  | { type: "dragMove"; x: number; y: number }
  | { type: "dragEnd" }
  | { type: "selectObject"; id: EntityId }
  | { type: "setColor"; id: EntityId; color: string | null }
  | { type: "toggleHidden"; id: EntityId }
  | { type: "deleteObject"; id: EntityId }
  | { type: "entityClick"; id: EntityId }
  | { type: "entityPick"; id: EntityId };

export function initialAppState(): AppState {
  return {
    construction: emptyConstruction(),
    toolState: initialToolState(),
    dragId: null,
    selectedId: null,
  };
}

/** True once `id` no longer resolves to an entity in `construction`. */
function isGone(construction: Construction, id: EntityId | null): boolean {
  return id !== null && !(id in construction.entities);
}

/**
 * `recomputeMidpoints`'s compute callback: resolve two point ids to their
 * current positions and apply the hyperbolic midpoint formula, or null if
 * either doesn't currently resolve to a real point (e.g. an intersection
 * source that's stopped existing).
 */
function computeMidpoint(
  construction: Construction,
  aId: EntityId,
  bId: EntityId,
): XY | null {
  const a = getPoint(construction, aId);
  const b = getPoint(construction, bId);
  return a && b ? hyperbolicMidpoint(a, b) : null;
}

/**
 * applyClick fills the midpoint tool's buffer the same way as the curve
 * tools but can't finish it itself (see the TOOLS doc comment in
 * engine/tools.ts) — this creates the actual point once both are picked.
 */
function completeMidpoint(
  construction: Construction,
  toolState: ToolState,
): { construction: Construction; toolState: ToolState } {
  const [aId, bId] = toolState.buffer as [EntityId, EntityId];
  const a = getPoint(construction, aId);
  const b = getPoint(construction, bId);
  const nextToolState = { ...toolState, buffer: [] };
  if (!a || !b) return { construction, toolState: nextToolState };

  const mid = hyperbolicMidpoint(a, b);
  const added = addMidpoint(construction, mid.x, mid.y, aId, bId);
  return { construction: added.construction, toolState: nextToolState };
}

/**
 * Advance the active (non-intersect) tool's buffer with one point at
 * (x, y) — the coordinate a canvas click resolved to, or an existing
 * point's own coordinates when the click came from the object panel
 * instead (see 'entityPick' below, which snaps back onto that point via
 * the same acquirePoint threshold applyClick already uses).
 */
function applyToolClick(state: AppState, x: number, y: number): AppState {
  const result = applyClick(state.construction, state.toolState, x, y);
  // The midpoint tool's buffer fills through applyClick like any other
  // 2-point tool, but the entity itself needs the view layer's
  // hyperbolic formula — finish it here once both points are picked.
  if (
    state.toolState.tool === "midpoint" &&
    result.toolState.buffer.length === 2
  ) {
    const done = completeMidpoint(result.construction, result.toolState);
    return {
      ...state,
      construction: done.construction,
      toolState: done.toolState,
    };
  }
  return {
    ...state,
    construction: result.construction,
    toolState: result.toolState,
  };
}

/** Toggle whether `id` is the object selected for property editing. */
function toggleSelected(state: AppState, id: EntityId): AppState {
  return { ...state, selectedId: state.selectedId === id ? null : id };
}

/**
 * The intersect tool's two-entity buffer, keyed off whatever curve was
 * picked — via the canvas's 'entityClick' or the object panel's
 * 'entityPick'. Ignores anything that isn't a segment/line/circle.
 */
function applyEntityIntersectPick(state: AppState, id: EntityId): AppState {
  const clicked = state.construction.entities[id];
  if (!clicked || !isIntersectable(clicked)) return state;

  const { buffer } = state.toolState;
  if (buffer.length === 0 || buffer[0] === id) {
    // First pick, or re-picking the same entity: (re)start the buffer
    // rather than intersecting it with itself.
    return { ...state, toolState: { ...state.toolState, buffer: [id] } };
  }

  const first = state.construction.entities[buffer[0]];
  if (!first || !isIntersectable(first)) {
    return { ...state, toolState: { ...state.toolState, buffer: [id] } };
  }

  // Second pick: add every intersection point between the two curves
  // (up to two, e.g. where two circles cross twice) in one go.
  const solutions = intersectEntities(state.construction, first, clicked);
  let construction = state.construction;
  solutions.forEach((p, index) => {
    construction = addIntersectionPoint(
      construction,
      p.x,
      p.y,
      buffer[0],
      id,
      index as 0 | 1,
    ).construction;
  });
  return {
    ...state,
    construction,
    toolState: { ...state.toolState, buffer: [] },
  };
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "setTool":
      return {
        ...state,
        toolState: selectTool(state.toolState, action.tool),
        dragId: null,
      };
    case "canvasClick": {
      // The intersect tool acquires entities by what was clicked, handled
      // entirely through 'entityClick' — it never reaches this action.
      if (state.toolState.tool === "intersect") return state;
      // Constructions only exist inside the Poincaré disk.
      if (!isInsideDisk(action)) return state;
      return applyToolClick(state, action.x, action.y);
    }
    case "dragStart":
      return { ...state, dragId: action.id };
    case "dragMove": {
      if (state.dragId === null) return state;
      // Ignore moves outside the disk: the point freezes at its last
      // valid position until the pointer re-enters.
      if (!isInsideDisk(action)) return state;
      const moved = movePoint(
        state.construction,
        state.dragId,
        action.x,
        action.y,
      );
      // Any intersection point built on this one (directly or through a
      // chain of curves/other intersections) needs its position refreshed,
      // and likewise any midpoint built on this point or on one of those
      // intersections — recomputed in that order so a midpoint sees
      // already-fresh intersection sources. (A curve built through a
      // midpoint, then crossed to form an intersection, is the one chain
      // that can lag a single dragMove tick behind before self-correcting
      // on the next one — deep enough chaining that it's not worth a
      // combined single-pass recompute.)
      const withIntersections = recomputeIntersections(
        moved,
        computeIntersectionPoint,
      );
      return {
        ...state,
        construction: recomputeMidpoints(withIntersections, computeMidpoint),
      };
    }
    case "dragEnd":
      return { ...state, dragId: null };
    case "selectObject":
      return toggleSelected(state, action.id);
    case "setColor":
      return {
        ...state,
        construction: setColor(state.construction, action.id, action.color),
      };
    case "toggleHidden": {
      const e = state.construction.entities[action.id];
      if (!e) return state;
      return {
        ...state,
        construction: setHidden(state.construction, action.id, !e.hidden),
      };
    }
    case "deleteObject": {
      const construction = deleteEntity(state.construction, action.id);
      return {
        ...state,
        construction,
        // Deleting a point cascades to whatever was built on it, so drop
        // any reference (selection, drag, in-progress tool buffer) that
        // pointed at something the cascade just removed.
        selectedId: isGone(construction, state.selectedId)
          ? null
          : state.selectedId,
        dragId: isGone(construction, state.dragId) ? null : state.dragId,
        toolState: {
          ...state.toolState,
          buffer: state.toolState.buffer.filter(
            (id) => !isGone(construction, id),
          ),
        },
      };
    }
    case "entityClick": {
      if (state.toolState.tool !== "intersect") return state;
      return applyEntityIntersectPick(state, action.id);
    }
    case "entityPick": {
      // Object-panel counterpart to a canvas click/entityClick, so a tool
      // can be finished by tapping rows in the left panel instead of
      // precise points on screen — the reason mobile users get this at
      // all (see engine/tools.ts's TOOLS doc comment for why intersect and
      // midpoint each need their own finishing path).
      const { tool } = state.toolState;
      if (tool === "select") return toggleSelected(state, action.id);
      if (tool === "intersect")
        return applyEntityIntersectPick(state, action.id);
      const point = getPoint(state.construction, action.id);
      // Not a point, or a derived point that doesn't currently resolve
      // (exists: false) — nothing on screen to snap to either, so ignore.
      return point ? applyToolClick(state, point.x, point.y) : state;
    }
  }
}
