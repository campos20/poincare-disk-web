/**
 * Core object model. Framework-agnostic: no React, no DOM.
 *
 * Only points carry coordinates. Every other entity is defined purely by
 * references to point ids — it never copies coordinates. Rendering resolves
 * the referenced points' current positions each frame, so dragging a point
 * updates every dependent entity for free.
 */

export type EntityId = string

/** A free point: user-placed, draggable, owns its coordinates. */
export interface FreePoint {
  readonly id: EntityId
  readonly kind: 'point'
  readonly x: number
  readonly y: number
}

// FUTURE: derived points (midpoint, intersection, …) slot in here as a new
// kind whose coordinates come from a compute function of its referenced ids
// instead of the mouse:
//   interface DerivedPoint { kind: 'derived-point'; deps: EntityId[]; compute: ... }
// They join `PointEntity` below, and `movePoint` gains a dependency-DAG
// topological recompute pass (see construction.ts).

export type PointEntity = FreePoint

/** Straight segment between two points. */
export interface Segment {
  readonly id: EntityId
  readonly kind: 'segment'
  readonly a: EntityId
  readonly b: EntityId
}

/** Infinite line through two points. */
export interface Line {
  readonly id: EntityId
  readonly kind: 'line'
  readonly a: EntityId
  readonly b: EntityId
}

/** Circle centered at `center`, passing through `thru`. */
export interface Circle {
  readonly id: EntityId
  readonly kind: 'circle'
  readonly center: EntityId
  readonly thru: EntityId
}

export type Entity = PointEntity | Segment | Line | Circle

/** The whole construction: entities by id, plus insertion order for rendering. */
export interface Construction {
  readonly entities: Readonly<Record<EntityId, Entity>>
  readonly order: readonly EntityId[]
  readonly nextId: number
}
