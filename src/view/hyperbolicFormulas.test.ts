import { describe, expect, it } from "vitest";
import {
  distanceFromOrigin,
  hyperbolicCircleThroughPoints,
  hyperbolicLineThroughPoints,
  hyperbolicSegmentThroughPoints,
  orthogonalCircleThroughPoints,
} from "./hyperbolicFormulas";

describe("distanceFromOrigin", () => {
  it("computes the Euclidean distance to the origin", () => {
    expect(distanceFromOrigin({ x: 0.3, y: 0.4 })).toBe(0.5);
  });
});

describe("orthogonalCircleThroughPoints", () => {
  it("computes the center and radius for two symmetric points", () => {
    const circle = orthogonalCircleThroughPoints(
      { x: 0.5, y: 0 },
      { x: 0, y: 0.5 },
    );
    expect(circle).not.toBeNull();
    expect(circle!.cx).toBeCloseTo(1.25);
    expect(circle!.cy).toBeCloseTo(1.25);
    expect(circle!.r).toBeCloseTo(Math.sqrt(2.125));
  });

  it("passes through both A and B", () => {
    const a = { x: 0.5, y: 0 };
    const b = { x: 0, y: 0.5 };
    const circle = orthogonalCircleThroughPoints(a, b)!;
    expect(Math.hypot(a.x - circle.cx, a.y - circle.cy)).toBeCloseTo(circle.r);
    expect(Math.hypot(b.x - circle.cx, b.y - circle.cy)).toBeCloseTo(circle.r);
  });

  it("is orthogonal to the unit circle: cx² + cy² = r² + 1", () => {
    const a = { x: 0.6, y: 0.1 };
    const b = { x: -0.2, y: 0.7 };
    const circle = orthogonalCircleThroughPoints(a, b)!;
    expect(circle.cx * circle.cx + circle.cy * circle.cy).toBeCloseTo(
      circle.r * circle.r + 1,
    );
  });

  it("returns null when A, B and the origin are collinear", () => {
    expect(
      orthogonalCircleThroughPoints({ x: 0.5, y: 0 }, { x: 0.2, y: 0 }),
    ).toBeNull();
    expect(
      orthogonalCircleThroughPoints({ x: 0.5, y: 0.5 }, { x: -0.3, y: -0.3 }),
    ).toBeNull();
  });
});

describe("hyperbolicLineThroughPoints", () => {
  it("returns an arc, on the orthogonal circle, that stays inside the disk and passes through A and B", () => {
    const a = { x: 0.5, y: 0 };
    const b = { x: 0, y: 0.5 };
    const shape = hyperbolicLineThroughPoints(a, b);
    if (!shape || shape.kind !== "arc") throw new Error("expected an arc");

    const circle = orthogonalCircleThroughPoints(a, b)!;
    expect(shape.r).toBeCloseTo(circle.r);
    expect(distanceFromOrigin(shape.p1)).toBeCloseTo(1);
    expect(distanceFromOrigin(shape.p2)).toBeCloseTo(1);

    // Independently walk the arc (same center/radius, but re-deriving the
    // sweep direction from scratch) to confirm it actually traces through A
    // and B without ever leaving the disk — the real invariants that matter,
    // as opposed to trusting the implementation's own angle bookkeeping.
    const theta1 = Math.atan2(shape.p1.y - circle.cy, shape.p1.x - circle.cx);
    const theta2 = Math.atan2(shape.p2.y - circle.cy, shape.p2.x - circle.cx);
    const twoPi = 2 * Math.PI;
    const normalize = (theta: number) => ((theta % twoPi) + twoPi) % twoPi;
    const spanCCW = normalize(theta2 - theta1);
    const span = shape.sweep ? spanCCW : spanCCW - twoPi;

    let minDistA = Infinity;
    let minDistB = Infinity;
    let maxDistFromOrigin = 0;
    const steps = 500;
    for (let i = 0; i <= steps; i++) {
      const theta = theta1 + span * (i / steps);
      const p = {
        x: circle.cx + shape.r * Math.cos(theta),
        y: circle.cy + shape.r * Math.sin(theta),
      };
      minDistA = Math.min(minDistA, Math.hypot(p.x - a.x, p.y - a.y));
      minDistB = Math.min(minDistB, Math.hypot(p.x - b.x, p.y - b.y));
      maxDistFromOrigin = Math.max(maxDistFromOrigin, distanceFromOrigin(p));
    }

    expect(minDistA).toBeLessThan(1e-3);
    expect(minDistB).toBeLessThan(1e-3);
    expect(maxDistFromOrigin).toBeLessThanOrEqual(1 + 1e-9);
    expect(shape.largeArc).toBe(Math.abs(span) > Math.PI);
  });

  it("returns a diameter when A, B and the origin are collinear", () => {
    const shape = hyperbolicLineThroughPoints(
      { x: 0.3, y: 0 },
      { x: 0.6, y: 0 },
    );
    if (!shape || shape.kind !== "diameter")
      throw new Error("expected a diameter");
    expect(shape.p1.x).toBeCloseTo(-1);
    expect(shape.p1.y).toBeCloseTo(0);
    expect(shape.p2.x).toBeCloseTo(1);
    expect(shape.p2.y).toBeCloseTo(0);
  });

  it("treats a point at the origin as a diameter through the other point", () => {
    const shape = hyperbolicLineThroughPoints({ x: 0, y: 0 }, { x: 0, y: 0.4 });
    if (!shape || shape.kind !== "diameter")
      throw new Error("expected a diameter");
    expect(shape.p1.x).toBeCloseTo(0);
    expect(shape.p1.y).toBeCloseTo(-1);
    expect(shape.p2.x).toBeCloseTo(0);
    expect(shape.p2.y).toBeCloseTo(1);
  });

  it("returns null when A and B coincide", () => {
    expect(
      hyperbolicLineThroughPoints({ x: 0.2, y: 0.3 }, { x: 0.2, y: 0.3 }),
    ).toBeNull();
  });
});

describe("hyperbolicSegmentThroughPoints", () => {
  it("runs endpoint-to-endpoint (not out to the boundary) on the same circle as the full geodesic", () => {
    const a = { x: 0.5, y: 0 };
    const b = { x: 0, y: 0.5 };
    const shape = hyperbolicSegmentThroughPoints(a, b);
    if (!shape || shape.kind !== "arc") throw new Error("expected an arc");

    expect(shape.p1).toEqual(a);
    expect(shape.p2).toEqual(b);

    const circle = orthogonalCircleThroughPoints(a, b)!;
    expect(shape.r).toBeCloseTo(circle.r);
  });

  it("stays inside the disk and is a sub-arc of the full geodesic (same circle, smaller span)", () => {
    const a = { x: 0.6, y: 0.1 };
    const b = { x: -0.2, y: 0.7 };
    const segment = hyperbolicSegmentThroughPoints(a, b);
    const line = hyperbolicLineThroughPoints(a, b);
    if (!segment || segment.kind !== "arc") throw new Error("expected an arc");
    if (!line || line.kind !== "arc") throw new Error("expected an arc");

    const circle = orthogonalCircleThroughPoints(a, b)!;
    const angleFrom = (p: { x: number; y: number }) =>
      Math.atan2(p.y - circle.cy, p.x - circle.cx);
    const twoPi = 2 * Math.PI;
    const normalize = (theta: number) => ((theta % twoPi) + twoPi) % twoPi;

    const segSpan = normalize(
      segment.sweep
        ? angleFrom(segment.p2) - angleFrom(segment.p1)
        : angleFrom(segment.p1) - angleFrom(segment.p2),
    );
    const lineSpan = normalize(
      line.sweep
        ? angleFrom(line.p2) - angleFrom(line.p1)
        : angleFrom(line.p1) - angleFrom(line.p2),
    );
    expect(segSpan).toBeLessThan(lineSpan);

    let maxDistFromOrigin = 0;
    const steps = 200;
    const theta1 = angleFrom(segment.p1);
    const direction = segment.sweep ? 1 : -1;
    for (let i = 0; i <= steps; i++) {
      const theta = theta1 + direction * segSpan * (i / steps);
      const p = {
        x: circle.cx + circle.r * Math.cos(theta),
        y: circle.cy + circle.r * Math.sin(theta),
      };
      maxDistFromOrigin = Math.max(maxDistFromOrigin, distanceFromOrigin(p));
    }
    expect(maxDistFromOrigin).toBeLessThanOrEqual(1 + 1e-9);
  });

  it("returns the straight segment A→B when A, B and the origin are collinear", () => {
    const a = { x: 0.3, y: 0 };
    const b = { x: 0.6, y: 0 };
    expect(hyperbolicSegmentThroughPoints(a, b)).toEqual({
      kind: "diameter",
      p1: a,
      p2: b,
    });
  });

  it("returns null when A and B coincide", () => {
    expect(
      hyperbolicSegmentThroughPoints({ x: 0.2, y: 0.3 }, { x: 0.2, y: 0.3 }),
    ).toBeNull();
  });
});

describe("hyperbolicCircleThroughPoints", () => {
  it("computes the center and radius for a hand-checked example", () => {
    const circle = hyperbolicCircleThroughPoints(
      { x: 0.5, y: 0 },
      { x: 0, y: 0.5 },
    );
    expect(circle.cx).toBeCloseTo(0.3);
    expect(circle.cy).toBeCloseTo(0);
    expect(circle.r).toBeCloseTo(Math.sqrt(0.34));
  });

  it("passes through B", () => {
    const a = { x: 0.6, y: -0.2 };
    const b = { x: -0.1, y: 0.3 };
    const circle = hyperbolicCircleThroughPoints(a, b);
    expect(Math.hypot(b.x - circle.cx, b.y - circle.cy)).toBeCloseTo(circle.r);
  });

  it("shifts the Euclidean center along the ray from the origin through A", () => {
    const a = { x: 0.4, y: 0.3 };
    const circle = hyperbolicCircleThroughPoints(a, { x: -0.2, y: 0.1 });
    // (cx, cy) is a scalar multiple of A, i.e. the cross product is ~0.
    expect(circle.cx * a.y - circle.cy * a.x).toBeCloseTo(0);
  });

  it("centers on A itself when A is the origin", () => {
    const b = { x: 0.3, y: -0.4 };
    const circle = hyperbolicCircleThroughPoints({ x: 0, y: 0 }, b);
    expect(circle.cx).toBeCloseTo(0);
    expect(circle.cy).toBeCloseTo(0);
    expect(circle.r).toBeCloseTo(distanceFromOrigin(b));
  });

  it("stays strictly inside the unit disk", () => {
    const circle = hyperbolicCircleThroughPoints(
      { x: 0.7, y: 0.2 },
      { x: 0.75, y: 0.25 },
    );
    expect(
      distanceFromOrigin({ x: circle.cx, y: circle.cy }) + circle.r,
    ).toBeLessThan(1);
  });
});
