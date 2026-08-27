/**
 * Core object model. Framework-agnostic: no React, no DOM.
 *
 * Only points carry coordinates. Every other entity is defined purely by
 * references to point ids — it never copies coordinates. Rendering resolves
 * the referenced points' current positions each frame, so dragging a point
 * updates every dependent entity for free.
 */

export type EntityId = string

/**
 * Style/visibility shared by every entity kind. `color: null` means "use the
 * default palette color for this kind"; a hex string is an explicit
 * per-object override, same as GeoGebra's object color.
 */
export interface EntityStyle {
  readonly color: string | null
  readonly hidden: boolean
}

/** A free point: user-placed, draggable, owns its coordinates. */
export interface FreePoint extends EntityStyle {
  readonly id: EntityId
  readonly kind: 'point'
  readonly x: number
  readonly y: number
}

/**
 * A point at one of the (up to two) intersections of two curve entities
 * (segment/line/circle). Coordinates are derived, not user-set:
 * `recomputeIntersections` (construction.ts) refreshes them whenever a
 * dependency moves, given the actual geometry from the view layer — the
 * engine only tracks which two entities it comes from and which solution
 * (`branch`) it is when there are two. Not draggable: `movePoint` only
 * moves entities of kind `'point'`.
 */
export interface IntersectionPoint extends EntityStyle {
  readonly id: EntityId
  readonly kind: 'intersection'
  readonly x: number
  readonly y: number
  readonly a: EntityId
  readonly b: EntityId
  readonly branch: 0 | 1
}

export type PointEntity = FreePoint | IntersectionPoint

/** Straight segment between two points. */
export interface Segment extends EntityStyle {
  readonly id: EntityId
  readonly kind: 'segment'
  readonly a: EntityId
  readonly b: EntityId
}

/** Infinite line through two points. */
export interface Line extends EntityStyle {
  readonly id: EntityId
  readonly kind: 'line'
  readonly a: EntityId
  readonly b: EntityId
}

/** Circle centered at `center`, passing through `thru`. */
export interface Circle extends EntityStyle {
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
