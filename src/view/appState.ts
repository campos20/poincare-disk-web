/**
 * Pure reducer wiring user intents to engine operations. No React imports —
 * consumed via useReducer in ConstructionApp.
 */

import {
  applyClick,
  emptyConstruction,
  initialToolState,
  movePoint,
  selectTool,
} from '../engine'
import type { Construction, EntityId, ToolId, ToolState } from '../engine'

export interface AppState {
  readonly construction: Construction
  readonly toolState: ToolState
  /** Point currently being dragged (select tool), or null. */
  readonly dragId: EntityId | null
}

export type AppAction =
  | { type: 'setTool'; tool: ToolId }
  | { type: 'canvasClick'; x: number; y: number }
  | { type: 'dragStart'; id: EntityId }
  | { type: 'dragMove'; x: number; y: number }
  | { type: 'dragEnd' }

export function initialAppState(): AppState {
  return {
    construction: emptyConstruction(),
    toolState: initialToolState(),
    dragId: null,
  }
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'setTool':
      return {
        ...state,
        toolState: selectTool(state.toolState, action.tool),
        dragId: null,
      }
    case 'canvasClick': {
      const result = applyClick(state.construction, state.toolState, action.x, action.y)
      return { ...state, construction: result.construction, toolState: result.toolState }
    }
    case 'dragStart':
      return { ...state, dragId: action.id }
    case 'dragMove':
      if (state.dragId === null) return state
      return {
        ...state,
        construction: movePoint(state.construction, state.dragId, action.x, action.y),
      }
    case 'dragEnd':
      return { ...state, dragId: null }
  }
}
