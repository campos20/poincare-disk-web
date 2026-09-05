import { describe, expect, it } from "vitest";
import {
  addCurvesAngle,
  addFreePoint,
  addLine,
  addPointsAngle,
  addSegment,
  emptyConstruction,
} from "../engine";
import type { CurvesAngle, PointsAngle } from "../engine";
import { resolveAngle } from "./angles";

describe("resolveAngle — points mode", () => {
  it("measures a right angle at the origin (both rays are diameters)", () => {
    const vertex = addFreePoint(emptyConstruction(), 0, 0);
    const a = addFreePoint(vertex.construction, 0.5, 0);
    const b = addFreePoint(a.construction, 0, 0.5);
    const angle = addPointsAngle(b.construction, a.id, vertex.id, b.id);

    const resolved = resolveAngle(
      angle.construction,
      angle.construction.entities[angle.id] as PointsAngle,
    );
    expect(resolved).not.toBeNull();
    expect(resolved!.radians).toBeCloseTo(Math.PI / 2);
    // At the origin, a geodesic degenerates to the straight diameter, so
    // the tangent is just the direction to the other point.
    expect(resolved!.u).toEqual({ x: 1, y: 0 });
    expect(resolved!.v).toEqual({ x: 0, y: 1 });
  });

  it("mirrors the two rays' tangent directions for a mirror-symmetric configuration", () => {
    // vertex sits on the real axis; a and b are reflections of each other
    // across it. Reflection across the real axis (y -> -y) is an isometry
    // of the disk that fixes the vertex and swaps a/b, so the two curved
    // rays' tangents at the vertex must be exact mirror images — this
    // exercises the general (non-diameter) orthogonal-circle branch of
    // the tangent formula without needing to hand-derive its angle.
    const vertex = addFreePoint(emptyConstruction(), 0.5, 0);
    const a = addFreePoint(vertex.construction, 0.2, 0.35);
    const b = addFreePoint(a.construction, 0.2, -0.35);
    const angle = addPointsAngle(b.construction, a.id, vertex.id, b.id);

    const resolved = resolveAngle(
      angle.construction,
      angle.construction.entities[angle.id] as PointsAngle,
    )!;
    expect(resolved).not.toBeNull();
    expect(resolved.u.x).toBeCloseTo(resolved.v.x);
    expect(resolved.u.y).toBeCloseTo(-resolved.v.y);
    expect(resolved.radians).toBeGreaterThan(0);
    expect(resolved.radians).toBeLessThan(Math.PI);
  });

  it("returns null when the vertex coincides with one of the rays' points", () => {
    const vertex = addFreePoint(emptyConstruction(), 0.2, 0.2);
    const a = addFreePoint(vertex.construction, 0.2, 0.2); // same position, different point
    const b = addFreePoint(a.construction, 0.5, 0);
    const angle = addPointsAngle(b.construction, a.id, vertex.id, b.id);

    const resolved = resolveAngle(
      angle.construction,
      angle.construction.entities[angle.id] as PointsAngle,
    );
    expect(resolved).toBeNull();
  });

  it("returns null once a referenced point is deleted", () => {
    const vertex = addFreePoint(emptyConstruction(), 0, 0);
    const a = addFreePoint(vertex.construction, 0.5, 0);
    const b = addFreePoint(a.construction, 0, 0.5);
    const angle = addPointsAngle(b.construction, a.id, vertex.id, b.id);

    const missingA = {
      ...angle.construction,
      entities: Object.fromEntries(
        Object.entries(angle.construction.entities).filter(
          ([id]) => id !== a.id,
        ),
      ),
    };
    const resolved = resolveAngle(
      missingA,
      missingA.entities[angle.id] as PointsAngle,
    );
    expect(resolved).toBeNull();
  });
});

describe("resolveAngle — curves mode", () => {
  it("measures the exact Euclidean angle between two diameters", () => {
    // Both lines pass through the origin, so each is a straight diameter
    // (no orthogonal circle) — the angle between them is then plain
    // Euclidean, independently predictable: 60 degrees between a line
    // along the x-axis and one at 60 degrees from it.
    const angleRad = Math.PI / 3;
    const p1 = addFreePoint(emptyConstruction(), 0.3, 0);
    const p2 = addFreePoint(p1.construction, 0.6, 0);
    const p3 = addFreePoint(
      p2.construction,
      0.3 * Math.cos(angleRad),
      0.3 * Math.sin(angleRad),
    );
    const p4 = addFreePoint(
      p3.construction,
      0.6 * Math.cos(angleRad),
      0.6 * Math.sin(angleRad),
    );
    const lineA = addLine(p4.construction, p1.id, p2.id);
    const lineB = addLine(lineA.construction, p3.id, p4.id);
    const angle = addCurvesAngle(lineB.construction, lineA.id, lineB.id);

    const resolved = resolveAngle(
      angle.construction,
      angle.construction.entities[angle.id] as CurvesAngle,
    );
    expect(resolved).not.toBeNull();
    expect(resolved!.vertex.x).toBeCloseTo(0);
    expect(resolved!.vertex.y).toBeCloseTo(0);
    expect(resolved!.radians).toBeCloseTo(angleRad);
  });

  it("returns null when the two curves don't cross inside the disk", () => {
    // Two short, non-crossing segments off to either side of the disk.
    const p1 = addFreePoint(emptyConstruction(), -0.6, 0.5);
    const p2 = addFreePoint(p1.construction, -0.5, 0.6);
    const p3 = addFreePoint(p2.construction, 0.5, -0.6);
    const p4 = addFreePoint(p3.construction, 0.6, -0.5);
    const segA = addSegment(p4.construction, p1.id, p2.id);
    const segB = addSegment(segA.construction, p3.id, p4.id);
    const angle = addCurvesAngle(segB.construction, segA.id, segB.id);

    const resolved = resolveAngle(
      angle.construction,
      angle.construction.entities[angle.id] as CurvesAngle,
    );
    expect(resolved).toBeNull();
  });
});
