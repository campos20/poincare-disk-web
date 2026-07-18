import { describe, expect, it } from 'vitest'
import {
  acquirePoint,
  addFreePoint,
  addSegment,
  allPoints,
  emptyConstruction,
  findPointNear,
  getPoint,
  movePoint,
} from './construction'

describe('construction basics', () => {
  it('adds free points with distinct ids and stored coordinates', () => {
    const r1 = addFreePoint(emptyConstruction(), 10, 20)
    const r2 = addFreePoint(r1.construction, -5, 7)

    expect(r1.id).not.toBe(r2.id)
    expect(getPoint(r2.construction, r1.id)).toMatchObject({ x: 10, y: 20 })
    expect(getPoint(r2.construction, r2.id)).toMatchObject({ x: -5, y: 7 })
    expect(allPoints(r2.construction)).toHaveLength(2)
  })

  it('getPoint returns null for missing ids and non-point entities', () => {
    const p1 = addFreePoint(emptyConstruction(), 0, 0)
    const p2 = addFreePoint(p1.construction, 10, 0)
    const seg = addSegment(p2.construction, p1.id, p2.id)

    expect(getPoint(seg.construction, 'nope')).toBeNull()
    expect(getPoint(seg.construction, seg.id)).toBeNull()
  })
})

describe('snapping', () => {
  it('finds a point within the threshold', () => {
    const { construction, id } = addFreePoint(emptyConstruction(), 100, 100)
    expect(findPointNear(construction, 105, 100, 12)).toBe(id)
  })

  it('returns null when nothing is within the threshold', () => {
    const { construction } = addFreePoint(emptyConstruction(), 100, 100)
    expect(findPointNear(construction, 100, 120, 12)).toBeNull()
  })

  it('picks the nearest of several candidates', () => {
    const r1 = addFreePoint(emptyConstruction(), 0, 0)
    const r2 = addFreePoint(r1.construction, 8, 0)
    expect(findPointNear(r2.construction, 6, 0, 12)).toBe(r2.id)
  })

  it('acquirePoint reuses an existing point within the threshold', () => {
    const { construction, id } = addFreePoint(emptyConstruction(), 50, 50)
    const acquired = acquirePoint(construction, 55, 52, 12)

    expect(acquired.created).toBe(false)
    expect(acquired.id).toBe(id)
    expect(allPoints(acquired.construction)).toHaveLength(1)
  })

  it('acquirePoint creates a new point outside the threshold', () => {
    const { construction, id } = addFreePoint(emptyConstruction(), 50, 50)
    const acquired = acquirePoint(construction, 100, 100, 12)

    expect(acquired.created).toBe(true)
    expect(acquired.id).not.toBe(id)
    expect(allPoints(acquired.construction)).toHaveLength(2)
    expect(getPoint(acquired.construction, acquired.id)).toMatchObject({ x: 100, y: 100 })
  })
})

describe('dragging', () => {
  it('movePoint updates the point coordinates', () => {
    const { construction, id } = addFreePoint(emptyConstruction(), 0, 0)
    const moved = movePoint(construction, id, 33, -12)
    expect(getPoint(moved, id)).toMatchObject({ x: 33, y: -12 })
  })

  it('movePoint ignores unknown ids and non-point entities', () => {
    const p1 = addFreePoint(emptyConstruction(), 0, 0)
    const p2 = addFreePoint(p1.construction, 10, 0)
    const seg = addSegment(p2.construction, p1.id, p2.id)

    expect(movePoint(seg.construction, 'nope', 1, 1)).toBe(seg.construction)
    expect(movePoint(seg.construction, seg.id, 1, 1)).toBe(seg.construction)
  })

  it('dependents see the move because they hold references, not coordinates', () => {
    const p1 = addFreePoint(emptyConstruction(), 0, 0)
    const p2 = addFreePoint(p1.construction, 10, 0)
    const seg = addSegment(p2.construction, p1.id, p2.id)

    const moved = movePoint(seg.construction, p1.id, -40, 25)

    const segment = moved.entities[seg.id]
    if (segment.kind !== 'segment') throw new Error('expected a segment')
    // The segment still references the same ids…
    expect(segment.a).toBe(p1.id)
    expect(segment.b).toBe(p2.id)
    // …and resolving them yields the updated position.
    expect(getPoint(moved, segment.a)).toMatchObject({ x: -40, y: 25 })
    expect(getPoint(moved, segment.b)).toMatchObject({ x: 10, y: 0 })
  })
})
