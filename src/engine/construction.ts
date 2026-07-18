/**
 * Construction state operations. Pure functions over immutable state —
 * every mutation returns a new Construction, so a React reducer (or any
 * other host) can consume them directly.
 */

import type { Construction, Entity, EntityId, FreePoint, PointEntity } from './types'

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
  return withEntity(c, (id) => ({ id, kind: 'point', x, y }))
}

export function addSegment(c: Construction, a: EntityId, b: EntityId): AddResult {
  return withEntity(c, (id) => ({ id, kind: 'segment', a, b }))
}

export function addLine(c: Construction, a: EntityId, b: EntityId): AddResult {
  return withEntity(c, (id) => ({ id, kind: 'line', a, b }))
}

export function addCircle(c: Construction, center: EntityId, thru: EntityId): AddResult {
  return withEntity(c, (id) => ({ id, kind: 'circle', center, thru }))
}

/** Resolve a point id to its current entity, or null if absent / not a point. */
export function getPoint(c: Construction, id: EntityId): PointEntity | null {
  const e = c.entities[id]
  return e && e.kind === 'point' ? e : null
}

/** All point entities in insertion order. */
export function allPoints(c: Construction): readonly PointEntity[] {
  const out: PointEntity[] = []
  for (const id of c.order) {
    const e = c.entities[id]
    if (e.kind === 'point') out.push(e)
  }
  return out
}

/**
 * Move a free point. Dependents (segments/lines/circles) update "for free"
 * because they only hold references and are resolved at render time.
 *
 * FUTURE (dependency DAG): once derived points exist, this is where a
 * topological recompute of everything downstream of `id` happens.
 */
export function movePoint(c: Construction, id: EntityId, x: number, y: number): Construction {
  const e = c.entities[id]
  if (!e || e.kind !== 'point') return c
  const moved: FreePoint = { ...e, x, y }
  return { ...c, entities: { ...c.entities, [id]: moved } }
}

/**
 * Nearest existing point within `threshold` (svg units), or null.
 * This powers snapping: tools reuse this point instead of stacking a new one
 * on top, which is what lets entities share endpoints and survive drags.
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
