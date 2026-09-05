/**
 * Construction state operations. Pure functions over immutable state —
 * every mutation returns a new Construction, so a React reducer (or any
 * other host) can consume them directly.
 */

import type {
  Construction,
  Entity,
  EntityId,
  FreePoint,
  IntersectionPoint,
  MidpointPoint,
  PointEntity,
} from "./types";

export function emptyConstruction(): Construction {
  return { entities: {}, order: [], nextId: 1, nextPointIndex: 0 };
}

export interface AddResult {
  readonly construction: Construction;
  readonly id: EntityId;
}

function withEntity(
  c: Construction,
  make: (id: EntityId) => Entity,
): AddResult {
  const id = `e${c.nextId}`;
  return {
    construction: {
      ...c,
      entities: { ...c.entities, [id]: make(id) },
      order: [...c.order, id],
      nextId: c.nextId + 1,
    },
    id,
  };
}

/**
 * Like `withEntity`, but also hands out and advances the next `nameIndex`
 * — every point-creating function goes through this instead, so a point's
 * display name is fixed at birth and never shifts when an earlier point
 * is later deleted (see `PointEntity`'s doc comment).
 */
function withPointEntity(
  c: Construction,
  make: (id: EntityId, nameIndex: number) => PointEntity,
): AddResult {
  const nameIndex = c.nextPointIndex;
  const result = withEntity(c, (id) => make(id, nameIndex));
  return {
    ...result,
    construction: { ...result.construction, nextPointIndex: nameIndex + 1 },
  };
}

export function addFreePoint(c: Construction, x: number, y: number): AddResult {
  return withPointEntity(c, (id, nameIndex) => ({
    id,
    kind: "point",
    x,
    y,
    color: null,
    hidden: false,
    nameIndex,
  }));
}

export function addSegment(
  c: Construction,
  a: EntityId,
  b: EntityId,
): AddResult {
  return withEntity(c, (id) => ({
    id,
    kind: "segment",
    a,
    b,
    color: null,
    hidden: false,
  }));
}

export function addLine(c: Construction, a: EntityId, b: EntityId): AddResult {
  return withEntity(c, (id) => ({
    id,
    kind: "line",
    a,
    b,
    color: null,
    hidden: false,
  }));
}

export function addCircle(
  c: Construction,
  center: EntityId,
  thru: EntityId,
): AddResult {
  return withEntity(c, (id) => ({
    id,
    kind: "circle",
    center,
    thru,
    color: null,
    hidden: false,
  }));
}

/**
 * Add a measured angle at `vertex`, between the rays toward `a` and `b`
 * (any point kind each). See `PointsAngle`'s doc comment: nothing here is
 * derived — the actual angle is computed fresh at render time.
 */
export function addPointsAngle(
  c: Construction,
  a: EntityId,
  vertex: EntityId,
  b: EntityId,
): AddResult {
  return withEntity(c, (id) => ({
    id,
    kind: "angle",
    mode: "points",
    a,
    vertex,
    b,
    color: null,
    hidden: false,
  }));
}

/**
 * Add a measured angle between two curves (`a`, `b`: a segment/line/circle
 * id each), at one of their intersection points. See `CurvesAngle`'s doc
 * comment: the intersection and the angle itself are both computed fresh
 * at render time, not stored here.
 */
export function addCurvesAngle(
  c: Construction,
  a: EntityId,
  b: EntityId,
): AddResult {
  return withEntity(c, (id) => ({
    id,
    kind: "angle",
    mode: "curves",
    a,
    b,
    color: null,
    hidden: false,
  }));
}

/**
 * Add a point at the intersection of two curve entities (`a`, `b`: a
 * segment/line/circle id each). `x`/`y` are the solved coordinates and
 * `branch` picks which of up to two solutions this is — both supplied by
 * the caller, since the engine has no geometry of its own (see
 * view/intersections.ts, the counterpart to naming.ts's presentation
 * split).
 */
export function addIntersectionPoint(
  c: Construction,
  x: number,
  y: number,
  a: EntityId,
  b: EntityId,
  branch: 0 | 1,
): AddResult {
  return withPointEntity(c, (id, nameIndex) => ({
    id,
    kind: "intersection",
    x,
    y,
    a,
    b,
    branch,
    exists: true,
    color: null,
    hidden: false,
    nameIndex,
  }));
}

/**
 * Add a point at the hyperbolic midpoint of two other points (`a`, `b`).
 * `x`/`y` are the computed coordinates — supplied by the caller, since the
 * engine has no geometry of its own (see view/hyperbolicFormulas.ts's
 * `hyperbolicMidpoint`, the counterpart to `addIntersectionPoint`'s split).
 */
export function addMidpoint(
  c: Construction,
  x: number,
  y: number,
  a: EntityId,
  b: EntityId,
): AddResult {
  return withPointEntity(c, (id, nameIndex) => ({
    id,
    kind: "midpoint",
    x,
    y,
    a,
    b,
    exists: true,
    color: null,
    hidden: false,
    nameIndex,
  }));
}

function isPoint(e: Entity): e is PointEntity {
  return (
    e.kind === "point" || e.kind === "intersection" || e.kind === "midpoint"
  );
}

function isDerivedPoint(
  e: PointEntity,
): e is IntersectionPoint | MidpointPoint {
  return e.kind === "intersection" || e.kind === "midpoint";
}

/**
 * Resolve a point id to its current entity, or null if absent, not a
 * point, or a derived point (intersection/midpoint) whose sources currently
 * don't resolve (`exists: false`) — callers that look a point up to use its
 * coordinates (rendering, geometry) should see nothing there, same as if it
 * had never been created; the raw entity itself is still reachable via
 * `c.entities[id]` for things like the object panel that list it either way.
 */
export function getPoint(c: Construction, id: EntityId): PointEntity | null {
  const e = c.entities[id];
  if (!e || !isPoint(e)) return null;
  if (isDerivedPoint(e) && !e.exists) return null;
  return e;
}

/** All point entities (free or intersection) in insertion order. */
export function allPoints(c: Construction): readonly PointEntity[] {
  const out: PointEntity[] = [];
  for (const id of c.order) {
    const e = c.entities[id];
    if (isPoint(e)) out.push(e);
  }
  return out;
}

/**
 * Move a free point. Dependents (segments/lines/circles) update "for free"
 * because they only hold references and are resolved at render time.
 * Intersection points don't move directly — they only ever get new
 * coordinates through `recomputeIntersections` below — so this is a no-op
 * for any id that isn't a `FreePoint`.
 */
export function movePoint(
  c: Construction,
  id: EntityId,
  x: number,
  y: number,
): Construction {
  const e = c.entities[id];
  if (!e || e.kind !== "point") return c;
  const moved: FreePoint = { ...e, x, y };
  return { ...c, entities: { ...c.entities, [id]: moved } };
}

/**
 * Refresh every intersection point's coordinates from its two source
 * entities, in construction order. Order alone is a valid dependency order
 * here — nothing can reference an entity created after it — so later
 * intersections (e.g. a segment built between two earlier intersection
 * points, then crossed with a circle) see already-updated sources.
 *
 * `compute` supplies the actual geometry: the engine has no notion of
 * curves or coordinates beyond a point's own x/y, so the view layer
 * (view/intersections.ts) injects the real hyperbolic math, same split as
 * naming.ts does for display names. When it returns null — the two
 * sources no longer meet — the point is marked `exists: false` (its x/y
 * stay at their last position, unused while it doesn't exist) instead of
 * being deleted, so it comes back at the right spot if the sources are
 * dragged back into meeting again.
 */
export function recomputeIntersections(
  c: Construction,
  compute: (
    construction: Construction,
    a: EntityId,
    b: EntityId,
    branch: 0 | 1,
  ) => { readonly x: number; readonly y: number } | null,
): Construction {
  let entities = c.entities;
  for (const id of c.order) {
    const e = entities[id];
    if (e.kind !== "intersection") continue;
    const p = compute({ ...c, entities }, e.a, e.b, e.branch);
    if (p) {
      if (!e.exists || p.x !== e.x || p.y !== e.y) {
        const moved: IntersectionPoint = { ...e, x: p.x, y: p.y, exists: true };
        entities = { ...entities, [id]: moved };
      }
    } else if (e.exists) {
      const vanished: IntersectionPoint = { ...e, exists: false };
      entities = { ...entities, [id]: vanished };
    }
  }
  return entities === c.entities ? c : { ...c, entities };
}

/**
 * Refresh every midpoint's coordinates from its two source points, in
 * construction order — the same single-pass approach as
 * `recomputeIntersections` (see its doc comment), which also correctly
 * cascades a midpoint built on another midpoint or on an intersection
 * point, since `compute` resolves sources through the progressively-updated
 * `entities` map rather than the original snapshot.
 *
 * `compute` supplies the actual formula (view/hyperbolicFormulas.ts's
 * `hyperbolicMidpoint`, wrapped to resolve point ids); it returns null when
 * `a` or `b` doesn't currently resolve to a real point (e.g. an
 * intersection source that's stopped existing), in which case the midpoint
 * is marked `exists: false` rather than deleted — same freeze-in-place
 * behavior as a vanished intersection.
 */
export function recomputeMidpoints(
  c: Construction,
  compute: (
    construction: Construction,
    a: EntityId,
    b: EntityId,
  ) => { readonly x: number; readonly y: number } | null,
): Construction {
  let entities = c.entities;
  for (const id of c.order) {
    const e = entities[id];
    if (e.kind !== "midpoint") continue;
    const p = compute({ ...c, entities }, e.a, e.b);
    if (p) {
      if (!e.exists || p.x !== e.x || p.y !== e.y) {
        const moved: MidpointPoint = { ...e, x: p.x, y: p.y, exists: true };
        entities = { ...entities, [id]: moved };
      }
    } else if (e.exists) {
      const vanished: MidpointPoint = { ...e, exists: false };
      entities = { ...entities, [id]: vanished };
    }
  }
  return entities === c.entities ? c : { ...c, entities };
}

/**
 * Nearest existing, currently-visible point within `threshold` (svg
 * units), or null. This powers snapping: tools reuse this point instead
 * of stacking a new one on top, which is what lets entities share
 * endpoints and survive drags. A derived point (intersection/midpoint)
 * with no current solution (`exists: false`) is invisible and skipped —
 * nothing should snap to, or start a drag on, a point that isn't there.
 */
export function findPointNear(
  c: Construction,
  x: number,
  y: number,
  threshold: number,
): EntityId | null {
  let best: EntityId | null = null;
  let bestDist = threshold;
  for (const p of allPoints(c)) {
    if (isDerivedPoint(p) && !p.exists) continue;
    const d = Math.hypot(p.x - x, p.y - y);
    if (d <= bestDist) {
      best = p.id;
      bestDist = d;
    }
  }
  return best;
}

export interface AcquireResult extends AddResult {
  /** true if a new point was created, false if an existing one was reused. */
  readonly created: boolean;
}

/** Snap to an existing point within `threshold`, else create a free point. */
export function acquirePoint(
  c: Construction,
  x: number,
  y: number,
  threshold: number,
): AcquireResult {
  const near = findPointNear(c, x, y, threshold);
  if (near !== null) return { construction: c, id: near, created: false };
  return { ...addFreePoint(c, x, y), created: true };
}

/** Set (or clear, with `null`) an entity's explicit color override. */
export function setColor(
  c: Construction,
  id: EntityId,
  color: string | null,
): Construction {
  const e = c.entities[id];
  if (!e) return c;
  return { ...c, entities: { ...c.entities, [id]: { ...e, color } } };
}

/** Show or hide an entity on the canvas without deleting it. */
export function setHidden(
  c: Construction,
  id: EntityId,
  hidden: boolean,
): Construction {
  const e = c.entities[id];
  if (!e) return c;
  return { ...c, entities: { ...c.entities, [id]: { ...e, hidden } } };
}

/** The other entities an entity can't exist without. */
function dependencies(e: Entity): readonly EntityId[] {
  switch (e.kind) {
    case "point":
      return [];
    case "intersection":
    case "midpoint":
    case "segment":
    case "line":
      return [e.a, e.b];
    case "circle":
      return [e.center, e.thru];
    case "angle":
      return e.mode === "points" ? [e.a, e.vertex, e.b] : [e.a, e.b];
  }
}

/**
 * Delete an entity, cascading to everything built on it — directly or
 * transitively. A point's dependents are the segments/lines/circles that
 * reference it; an intersection point additionally depends on its two
 * source curves; and any of those can, in turn, be a dependency of
 * something built later (e.g. a segment between two intersection points).
 * A single sweep over `dependencies()` only catches direct references, so
 * this repeats until a pass finds nothing new.
 */
export function deleteEntity(c: Construction, id: EntityId): Construction {
  if (!(id in c.entities)) return c;

  const doomed = new Set<EntityId>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const e of Object.values(c.entities)) {
      if (doomed.has(e.id)) continue;
      if (dependencies(e).some((dep) => doomed.has(dep))) {
        doomed.add(e.id);
        grew = true;
      }
    }
  }

  const entities = { ...c.entities };
  for (const doomedId of doomed) delete entities[doomedId];
  return { ...c, entities, order: c.order.filter((oid) => !doomed.has(oid)) };
}
