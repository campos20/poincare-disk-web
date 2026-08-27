import { describe, expect, it } from 'vitest'
import { addCircle, addFreePoint, addLine, addSegment, emptyConstruction } from '../engine'
import type { Circle, Line, Segment } from '../engine'
import { computeIntersectionPoint, intersectEntities } from './intersections'

describe('line x line', () => {
  it('two geodesics crossing off-center meet at one point', () => {
    // Two diameters through the origin, at right angles — must cross only
    // at the origin.
    const p1 = addFreePoint(emptyConstruction(), 0.5, 0)
    const p2 = addFreePoint(p1.construction, -0.5, 0)
    const p3 = addFreePoint(p2.construction, 0, 0.5)
    const p4 = addFreePoint(p3.construction, 0, -0.5)
    const lineA = addLine(p4.construction, p1.id, p2.id)
    const lineB = addLine(lineA.construction, p3.id, p4.id)

    const points = intersectEntities(lineB.construction, lineB.construction.entities[lineA.id] as Line, lineB.construction.entities[lineB.id] as Line)
    expect(points).toHaveLength(1)
    expect(points[0].x).toBeCloseTo(0)
    expect(points[0].y).toBeCloseTo(0)
  })

  it('two non-collinear geodesics sharing a point cross there (and possibly a second point)', () => {
    // Both lines pass through (0.5, 0), so that's a guaranteed solution;
    // neither pair is collinear with the origin, so both are real arcs.
    const shared = addFreePoint(emptyConstruction(), 0.5, 0)
    const p2 = addFreePoint(shared.construction, 0, 0.5)
    const p4 = addFreePoint(p2.construction, 0, -0.5)
    const lineA = addLine(p4.construction, shared.id, p2.id)
    const lineB = addLine(lineA.construction, shared.id, p4.id)

    const a = lineB.construction.entities[lineA.id] as Line
    const b = lineB.construction.entities[lineB.id] as Line
    const points = intersectEntities(lineB.construction, a, b)
    expect(points.length).toBeGreaterThanOrEqual(1)
    expect(points.some((p) => Math.hypot(p.x - 0.5, p.y) < 1e-6)).toBe(true)
    for (const p of points) {
      expect(Math.hypot(p.x, p.y)).toBeLessThan(1)
    }
  })
})

describe('line x circle', () => {
  it('a diameter through the circle center crosses it twice, symmetric about the center', () => {
    const p1 = addFreePoint(emptyConstruction(), -0.8, 0)
    const p2 = addFreePoint(p1.construction, 0.8, 0)
    const center = addFreePoint(p2.construction, 0, 0)
    const thru = addFreePoint(center.construction, 0.3, 0)
    const line = addLine(thru.construction, p1.id, p2.id)
    const circle = addCircle(line.construction, center.id, thru.id)

    const a = circle.construction.entities[line.id] as Line
    const b = circle.construction.entities[circle.id] as Circle
    const points = intersectEntities(circle.construction, a, b)
    expect(points).toHaveLength(2)
    // Both on the x-axis, symmetric about the origin (circle centered there).
    expect(points[0].y).toBeCloseTo(0)
    expect(points[1].y).toBeCloseTo(0)
    expect(points[0].x).toBeCloseTo(-points[1].x)
  })

  it('a line that misses the circle entirely has no intersection', () => {
    const p1 = addFreePoint(emptyConstruction(), -0.9, 0.9)
    const p2 = addFreePoint(p1.construction, -0.8, 0.85)
    const center = addFreePoint(p2.construction, 0, 0)
    const thru = addFreePoint(center.construction, 0.1, 0)
    const line = addLine(thru.construction, p1.id, p2.id)
    const circle = addCircle(line.construction, center.id, thru.id)

    const a = circle.construction.entities[line.id] as Line
    const b = circle.construction.entities[circle.id] as Circle
    expect(intersectEntities(circle.construction, a, b)).toHaveLength(0)
  })
})

describe('circle x circle', () => {
  it('two overlapping circles meet at two points', () => {
    const c1 = addFreePoint(emptyConstruction(), -0.15, 0)
    const t1 = addFreePoint(c1.construction, 0.15, 0)
    const c2 = addFreePoint(t1.construction, 0.15, 0)
    const t2 = addFreePoint(c2.construction, -0.15, 0)
    const circleA = addCircle(t2.construction, c1.id, t1.id)
    const circleB = addCircle(circleA.construction, c2.id, t2.id)

    const a = circleB.construction.entities[circleA.id] as Circle
    const b = circleB.construction.entities[circleB.id] as Circle
    const points = intersectEntities(circleB.construction, a, b)
    expect(points).toHaveLength(2)
    for (const p of points) {
      expect(Math.hypot(p.x, p.y)).toBeLessThan(1)
    }
    // Symmetric about the x-axis given the mirrored setup.
    expect(points[0].y).toBeCloseTo(-points[1].y)
  })

  it('two circles too far apart to touch have no intersection', () => {
    const c1 = addFreePoint(emptyConstruction(), -0.5, 0)
    const t1 = addFreePoint(c1.construction, -0.45, 0)
    const c2 = addFreePoint(t1.construction, 0.5, 0)
    const t2 = addFreePoint(c2.construction, 0.45, 0)
    const circleA = addCircle(t2.construction, c1.id, t1.id)
    const circleB = addCircle(circleA.construction, c2.id, t2.id)

    const a = circleB.construction.entities[circleA.id] as Circle
    const b = circleB.construction.entities[circleB.id] as Circle
    expect(intersectEntities(circleB.construction, a, b)).toHaveLength(0)
  })
})

describe('segment x circle', () => {
  it('finds the crossing when it lies within the segment span', () => {
    const p1 = addFreePoint(emptyConstruction(), -0.8, 0)
    const p2 = addFreePoint(p1.construction, 0.8, 0)
    const center = addFreePoint(p2.construction, 0, 0)
    const thru = addFreePoint(center.construction, 0.3, 0)
    const seg = addSegment(thru.construction, p1.id, p2.id)
    const circle = addCircle(seg.construction, center.id, thru.id)

    const a = circle.construction.entities[seg.id] as Segment
    const b = circle.construction.entities[circle.id] as Circle
    const points = intersectEntities(circle.construction, a, b)
    expect(points).toHaveLength(2)
  })

  it('excludes a crossing that lies on the full line but outside the segment', () => {
    // Segment from 0.1 to 0.8 on the x-axis never reaches x = -0.3, even
    // though the underlying geodesic (extended) would cross the circle there.
    const p1 = addFreePoint(emptyConstruction(), 0.1, 0)
    const p2 = addFreePoint(p1.construction, 0.8, 0)
    const center = addFreePoint(p2.construction, 0, 0)
    const thru = addFreePoint(center.construction, 0.3, 0)
    const seg = addSegment(thru.construction, p1.id, p2.id)
    const circle = addCircle(seg.construction, center.id, thru.id)

    const a = circle.construction.entities[seg.id] as Segment
    const b = circle.construction.entities[circle.id] as Circle
    const points = intersectEntities(circle.construction, a, b)
    // Only the +0.3 crossing is within [0.1, 0.8]; the -0.3 one is not.
    expect(points).toHaveLength(1)
    expect(points[0].x).toBeCloseTo(0.3)
  })
})

describe('computeIntersectionPoint', () => {
  it('returns the solution at the given branch', () => {
    const c1 = addFreePoint(emptyConstruction(), -0.15, 0)
    const t1 = addFreePoint(c1.construction, 0.15, 0)
    const c2 = addFreePoint(t1.construction, 0.15, 0)
    const t2 = addFreePoint(c2.construction, -0.15, 0)
    const circleA = addCircle(t2.construction, c1.id, t1.id)
    const circleB = addCircle(circleA.construction, c2.id, t2.id)

    const p0 = computeIntersectionPoint(circleB.construction, circleA.id, circleB.id, 0)
    const p1 = computeIntersectionPoint(circleB.construction, circleA.id, circleB.id, 1)
    expect(p0).not.toBeNull()
    expect(p1).not.toBeNull()
    expect(p0).not.toEqual(p1)
  })

  it('returns null once entities stop intersecting', () => {
    const c1 = addFreePoint(emptyConstruction(), -0.5, 0)
    const t1 = addFreePoint(c1.construction, -0.45, 0)
    const c2 = addFreePoint(t1.construction, 0.5, 0)
    const t2 = addFreePoint(c2.construction, 0.45, 0)
    const circleA = addCircle(t2.construction, c1.id, t1.id)
    const circleB = addCircle(circleA.construction, c2.id, t2.id)

    expect(computeIntersectionPoint(circleB.construction, circleA.id, circleB.id, 0)).toBeNull()
  })

  it('returns null for an unknown or non-intersectable id', () => {
    const p = addFreePoint(emptyConstruction(), 0, 0)
    expect(computeIntersectionPoint(p.construction, 'nope', 'also-nope', 0)).toBeNull()
    expect(computeIntersectionPoint(p.construction, p.id, p.id, 0)).toBeNull()
  })
})
