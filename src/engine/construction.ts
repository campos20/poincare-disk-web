/**
 * Construction state operations. Pure functions over immutable state —
 * every mutation returns a new Construction, so a React reducer (or any
 * other host) can consume them directly.
 */

import type { Construction, Entity, EntityId, FreePoint, IntersectionPoint, PointEntity } from './types'

export function emptyConstruction(): Construction {
  return { entities: {}, order: [], nextId: 1 }
}

export interface AddResult {
  readonly construction: Construction
  readonly id: EntityId
}

function withEntity(c: Construction, make: (id: EntityId) => Entity): AddResult {
  const id = `e${c.nextId}`
  return {
    construction: {
      entities: { ...c.entities, [id]: make(id) },
      order: [...c.order, id],
      nextId: c.nextId + 1,
    },
    id,
  }
}

export function addFreePoint(c: Construction, x: number, y: number): AddResult {
  return withEntity(c, (id) => ({ id, kind: 'point', x, y, color: null, hidden: false }))
}

export function addSegment(c: Construction, a: EntityId, b: EntityId): AddResult {
  return withEntity(c, (id) => ({ id, kind: 'segment', a, b, color: null, hidden: false }))
}

export function addLine(c: Construction, a: EntityId, b: EntityId): AddResult {
  return withEntity(c, (id) => ({ id, kind: 'line', a, b, color: null, hidden: false }))
}

export function addCircle(c: Construction, center: EntityId, thru: EntityId): AddResult {
  return withEntity(c, (id) => ({ id, kind: 'circle', center, thru, color: null, hidden: false }))
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
  return withEntity(c, (id) => ({
    id,
    kind: 'intersection',
    x,
    y,
    a,
    b,
    branch,
    exists: true,
    color: null,
    hidden: false,
  }))
}

function isPoint(e: Entity): e is PointEntity {
  return e.kind === 'point' || e.kind === 'intersection'
}

/**
 * Resolve a point id to its current entity, or null if absent, not a
 * point, or an intersection point whose sources currently don't meet
 * (`exists: false`) — callers that look a point up to use its coordinates
 * (rendering, geometry) should see nothing there, same as if it had never
 * been created; the raw entity itself is still reachable via
 * `c.entities[id]` for things like the object panel that list it either way.
 */
export function getPoint(c: Construction, id: EntityId): PointEntity | null {
  const e = c.entities[id]
  if (!e || !isPoint(e)) return null
  if (e.kind === 'intersection' && !e.exists) return null
  return e
}

/** All point entities (free or intersection) in insertion order. */
export function allPoints(c: Construction): readonly PointEntity[] {
  const out: PointEntity[] = []
  for (const id of c.order) {
    const e = c.entities[id]
    if (isPoint(e)) out.push(e)
  }
  return out
}

/**
 * Move a free point. Dependents (segments/lines/circles) update "for free"
 * because they only hold references and are resolved at render time.
 * Intersection points don't move directly — they only ever get new
 * coordinates through `recomputeIntersections` below — so this is a no-op
 * for any id that isn't a `FreePoint`.
 */
export function movePoint(c: Construction, id: EntityId, x: number, y: number): Construction {
  const e = c.entities[id]
  if (!e || e.kind !== 'point') return c
  const moved: FreePoint = { ...e, x, y }
  return { ...c, entities: { ...c.entities, [id]: moved } }
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
  let entities = c.entities
  for (const id of c.order) {
    const e = entities[id]
    if (e.kind !== 'intersection') continue
    const p = compute({ ...c, entities }, e.a, e.b, e.branch)
    if (p) {
      if (!e.exists || p.x !== e.x || p.y !== e.y) {
        const moved: IntersectionPoint = { ...e, x: p.x, y: p.y, exists: true }
        entities = { ...entities, [id]: moved }
      }
    } else if (e.exists) {
      const vanished: IntersectionPoint = { ...e, exists: false }
      entities = { ...entities, [id]: vanished }
    }
  }
  return entities === c.entities ? c : { ...c, entities }
}

/**
 * Nearest existing, currently-visible point within `threshold` (svg
 * units), or null. This powers snapping: tools reuse this point instead
 * of stacking a new one on top, which is what lets entities share
 * endpoints and survive drags. An intersection point with no current
 * solution (`exists: false`) is invisible and skipped — nothing should
 * snap to, or start a drag on, a point that isn't there.
 */
export function findPointNear(
  c: Construction,
  x: number,
  y: number,
  threshold: number,
): EntityId | null {
  let best: EntityId | null = null
  let bestDist = threshold
  for (const p of allPoints(c)) {
    if (p.kind === 'intersection' && !p.exists) continue
    const d = Math.hypot(p.x - x, p.y - y)
    if (d <= bestDist) {
      best = p.id
      bestDist = d
    }
  }
  return best
}

export interface AcquireResult extends AddResult {
  /** true if a new point was created, false if an existing one was reused. */
  readonly created: boolean
}

/** Snap to an existing point within `threshold`, else create a free point. */
export function acquirePoint(
  c: Construction,
  x: number,
  y: number,
  threshold: number,
): AcquireResult {
  const near = findPointNear(c, x, y, threshold)
  if (near !== null) return { construction: c, id: near, created: false }
  return { ...addFreePoint(c, x, y), created: true }
}

/** Set (or clear, with `null`) an entity's explicit color override. */
export function setColor(c: Construction, id: EntityId, color: string | null): Construction {
  const e = c.entities[id]
  if (!e) return c
  return { ...c, entities: { ...c.entities, [id]: { ...e, color } } }
}

/** Show or hide an entity on the canvas without deleting it. */
export function setHidden(c: Construction, id: EntityId, hidden: boolean): Construction {
  const e = c.entities[id]
  if (!e) return c
  return { ...c, entities: { ...c.entities, [id]: { ...e, hidden } } }
}

/** The other entities an entity can't exist without. */
function dependencies(e: Entity): readonly EntityId[] {
  switch (e.kind) {
    case 'point':
      return []
    case 'intersection':
    case 'segment':
    case 'line':
      return [e.a, e.b]
    case 'circle':
      return [e.center, e.thru]
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
  if (!(id in c.entities)) return c

  const doomed = new Set<EntityId>([id])
  let grew = true
  while (grew) {
    grew = false
    for (const e of Object.values(c.entities)) {
      if (doomed.has(e.id)) continue
      if (dependencies(e).some((dep) => doomed.has(dep))) {
        doomed.add(e.id)
        grew = true
      }
    }
  }

  const entities = { ...c.entities }
  for (const doomedId of doomed) delete entities[doomedId]
  return { ...c, entities, order: c.order.filter((oid) => !doomed.has(oid)) }
}
