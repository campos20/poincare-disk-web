/**
 * Core object model. Framework-agnostic: no React, no DOM.
 *
 * Only points carry coordinates. Every other entity is defined purely by
 * references to point ids — it never copies coordinates. Rendering resolves
 * the referenced points' current positions each frame, so dragging a point
 * updates every dependent entity for free.
 */

export type EntityId = string;

/**
 * Style/visibility shared by every entity kind. `color: null` means "use the
 * default palette color for this kind"; a hex string is an explicit
 * per-object override, same as GeoGebra's object color.
 */
export interface EntityStyle {
  readonly color: string | null;
  readonly hidden: boolean;
}

/** A free point: user-placed, draggable, owns its coordinates. */
export interface FreePoint extends EntityStyle {
  readonly id: EntityId;
  readonly kind: "point";
  readonly x: number;
  readonly y: number;
}

/**
 * A point at one of the (up to two) intersections of two curve entities
 * (segment/line/circle). Coordinates are derived, not user-set:
 * `recomputeIntersections` (construction.ts) refreshes them whenever a
 * dependency moves, given the actual geometry from the view layer — the
 * engine only tracks which two entities it comes from and which solution
 * (`branch`) it is when there are two. Not draggable: `movePoint` only
 * moves entities of kind `'point'`.
 *
 * `exists` tracks whether the two source entities currently meet at this
 * solution at all — e.g. two circles dragged apart stop crossing. When
 * they don't, `recomputeIntersections` sets it false and leaves x/y at
 * their last known position rather than guessing a new one; `exists`,
 * not the coordinates, is what callers (rendering, snapping) must check
 * before treating the point as real.
 */
export interface IntersectionPoint extends EntityStyle {
  readonly id: EntityId;
  readonly kind: "intersection";
  readonly x: number;
  readonly y: number;
  readonly a: EntityId;
  readonly b: EntityId;
  readonly branch: 0 | 1;
  readonly exists: boolean;
}

/**
 * The hyperbolic midpoint of two other points (`a`, `b`), each of which can
 * itself be any point kind — free, intersection, or another midpoint.
 * Coordinates are derived, not user-set, same as `IntersectionPoint`:
 * `recomputeMidpoints` (construction.ts) refreshes them whenever `a` or `b`
 * moves, given the actual hyperbolic formula from the view layer. Not
 * draggable: `movePoint` only moves entities of kind `'point'`.
 *
 * `exists` mirrors `IntersectionPoint.exists`: it goes false (freezing x/y
 * at their last position) when `a` or `b` is itself a currently-nonexistent
 * derived point, rather than when the midpoint formula itself fails — the
 * formula is defined for any two distinct points strictly inside the disk.
 */
export interface MidpointPoint extends EntityStyle {
  readonly id: EntityId;
  readonly kind: "midpoint";
  readonly x: number;
  readonly y: number;
  readonly a: EntityId;
  readonly b: EntityId;
  readonly exists: boolean;
}

export type PointEntity = FreePoint | IntersectionPoint | MidpointPoint;

/** Straight segment between two points. */
export interface Segment extends EntityStyle {
  readonly id: EntityId;
  readonly kind: "segment";
  readonly a: EntityId;
  readonly b: EntityId;
}

/** Infinite line through two points. */
export interface Line extends EntityStyle {
  readonly id: EntityId;
  readonly kind: "line";
  readonly a: EntityId;
  readonly b: EntityId;
}

/** Circle centered at `center`, passing through `thru`. */
export interface Circle extends EntityStyle {
  readonly id: EntityId;
  readonly kind: "circle";
  readonly center: EntityId;
  readonly thru: EntityId;
}

/**
 * A measured angle at the vertex, between the rays toward `a` and `b`
 * (each any point kind). The Poincaré disk is conformal, so the hyperbolic
 * angle equals the Euclidean angle between the two geodesics' tangent
 * directions at the vertex — computed fresh at render time from the three
 * points' current positions (view/angles.ts), the same "no stored
 * geometry" approach as Segment/Line/Circle above.
 */
export interface PointsAngle extends EntityStyle {
  readonly id: EntityId;
  readonly kind: "angle";
  readonly mode: "points";
  readonly a: EntityId;
  readonly vertex: EntityId;
  readonly b: EntityId;
}

/**
 * A measured angle between two curves (segment/line/circle), at one of
 * their intersection points — also computed fresh at render time
 * (view/angles.ts), including finding the intersection itself. Unlike the
 * `intersect` tool, this never materializes the crossing as its own point
 * entity: it's a measurement overlay, not a construction step.
 */
export interface CurvesAngle extends EntityStyle {
  readonly id: EntityId;
  readonly kind: "angle";
  readonly mode: "curves";
  readonly a: EntityId;
  readonly b: EntityId;
}

export type Angle = PointsAngle | CurvesAngle;

export type Entity = PointEntity | Segment | Line | Circle | Angle;

/** The whole construction: entities by id, plus insertion order for rendering. */
export interface Construction {
  readonly entities: Readonly<Record<EntityId, Entity>>;
  readonly order: readonly EntityId[];
  readonly nextId: number;
}
