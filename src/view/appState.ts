/**
 * Pure reducer wiring user intents to engine operations. No React imports —
 * consumed via useReducer in ConstructionApp.
 */

import {
  addIntersectionPoint,
  applyClick,
  deleteEntity,
  emptyConstruction,
  initialToolState,
  movePoint,
  recomputeIntersections,
  selectTool,
  setColor,
  setHidden,
} from "../engine";
import type { Construction, EntityId, ToolId, ToolState } from "../engine";
import { isInsideDisk } from "./disk";
import {
  computeIntersectionPoint,
  intersectEntities,
  isIntersectable,
} from "./intersections";

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
  | { type: "entityClick"; id: EntityId };

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
      const result = applyClick(
        state.construction,
        state.toolState,
        action.x,
        action.y,
      );
      return {
        ...state,
        construction: result.construction,
        toolState: result.toolState,
      };
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
      // chain of curves/other intersections) needs its position refreshed.
      return {
        ...state,
        construction: recomputeIntersections(moved, computeIntersectionPoint),
      };
    }
    case "dragEnd":
      return { ...state, dragId: null };
    case "selectObject":
      return {
        ...state,
        selectedId: state.selectedId === action.id ? null : action.id,
      };
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
      const clicked = state.construction.entities[action.id];
      if (!clicked || !isIntersectable(clicked)) return state;

      const { buffer } = state.toolState;
      if (buffer.length === 0 || buffer[0] === action.id) {
        // First pick, or re-clicking the same entity: (re)start the buffer
        // rather than intersecting it with itself.
        return {
          ...state,
          toolState: { ...state.toolState, buffer: [action.id] },
        };
      }

      const first = state.construction.entities[buffer[0]];
      if (!first || !isIntersectable(first)) {
        return {
          ...state,
          toolState: { ...state.toolState, buffer: [action.id] },
        };
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
          action.id,
          index as 0 | 1,
        ).construction;
      });
      return {
        ...state,
        construction,
        toolState: { ...state.toolState, buffer: [] },
      };
    }
  }
}
