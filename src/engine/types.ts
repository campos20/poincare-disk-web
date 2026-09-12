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
  readonly nameIndex: number;
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
  readonly nameIndex: number;
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
  readonly nameIndex: number;
}

/**
 * Every point kind carries `nameIndex`: its rank among points *ever
 * created* (0, 1, 2, …), assigned once at creation and never
 * recalculated. Display names (view/naming.ts's `pointName`) are derived
 * from it rather than from a point's current position among survivors, so
 * deleting an earlier point doesn't rename the ones after it.
 */
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
  /** This angle's rank among angles *ever created* — same fixed-at-birth,
   * never-recalculated convention as `PointEntity.nameIndex`. Lets
   * view/naming.ts's `angleLabel` give it a stable "angle1", "angle2", …
   * name to type into an `AngleExpression` formula, one that survives an
   * earlier angle being deleted. */
  readonly index: number;
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
  /** See `PointsAngle.index`. */
  readonly index: number;
}

export type Angle = PointsAngle | CurvesAngle;

/**
 * One node of an `AngleExpression`'s parsed formula tree (view/expressions.ts's
 * `parseAngleExpression`). Plain JSON-serializable data — numbers, entity
 * ids, and nested nodes — like every other entity field, so a construction
 * still round-trips through file.ts without special-casing this.
 */
export type ExpressionNode =
  | { readonly kind: "const"; readonly value: number }
  | { readonly kind: "ref"; readonly id: EntityId }
  | { readonly kind: "neg"; readonly arg: ExpressionNode }
  | {
      readonly kind: "add" | "sub" | "mul" | "div";
      readonly left: ExpressionNode;
      readonly right: ExpressionNode;
    };

/**
 * A value computed by combining other angles' measurements with arithmetic
 * — e.g. "2*angle1 + angle2" — typed by the user as `formula` and parsed
 * into `ast` at creation time (view/expressions.ts's `parseAngleExpression`,
 * which resolves each identifier against view/naming.ts's `angleLabels`).
 * Every number literal in `ast` is degrees, matching how angle measurements
 * are shown everywhere else in the app. Evaluating it
 * (view/expressions.ts's `evaluateExpression`) resolves each `ref` to the
 * angle it names and returns null — same "currently undefined" convention
 * as `IntersectionPoint`/`MidpointPoint` — when a referenced angle doesn't
 * currently resolve, or when a division by zero occurs.
 */
export interface AngleExpression extends EntityStyle {
  readonly id: EntityId;
  readonly kind: "expression";
  readonly formula: string;
  readonly ast: ExpressionNode;
}

export type Entity =
  PointEntity | Segment | Line | Circle | Angle | AngleExpression;

/** The whole construction: entities by id, plus insertion order for rendering. */
export interface Construction {
  readonly entities: Readonly<Record<EntityId, Entity>>;
  readonly order: readonly EntityId[];
  readonly nextId: number;
  /** Next `nameIndex` to hand out to a newly-created point (see `PointEntity`). */
  readonly nextPointIndex: number;
  /** Next `index` to hand out to a newly-created angle (see `PointsAngle.index`). */
  readonly nextAngleIndex: number;
}
