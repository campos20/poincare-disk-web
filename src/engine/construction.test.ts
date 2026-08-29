import { describe, expect, it } from "vitest";
import {
  acquirePoint,
  addFreePoint,
  addIntersectionPoint,
  addLine,
  addMidpoint,
  addSegment,
  allPoints,
  deleteEntity,
  emptyConstruction,
  findPointNear,
  getPoint,
  movePoint,
  recomputeIntersections,
  recomputeMidpoints,
  setColor,
  setHidden,
} from "./construction";

describe("construction basics", () => {
  it("adds free points with distinct ids and stored coordinates", () => {
    const r1 = addFreePoint(emptyConstruction(), 10, 20);
    const r2 = addFreePoint(r1.construction, -5, 7);

    expect(r1.id).not.toBe(r2.id);
    expect(getPoint(r2.construction, r1.id)).toMatchObject({ x: 10, y: 20 });
    expect(getPoint(r2.construction, r2.id)).toMatchObject({ x: -5, y: 7 });
    expect(allPoints(r2.construction)).toHaveLength(2);
  });

  it("getPoint returns null for missing ids and non-point entities", () => {
    const p1 = addFreePoint(emptyConstruction(), 0, 0);
    const p2 = addFreePoint(p1.construction, 10, 0);
    const seg = addSegment(p2.construction, p1.id, p2.id);

    expect(getPoint(seg.construction, "nope")).toBeNull();
    expect(getPoint(seg.construction, seg.id)).toBeNull();
  });
});

describe("snapping", () => {
  it("finds a point within the threshold", () => {
    const { construction, id } = addFreePoint(emptyConstruction(), 100, 100);
    expect(findPointNear(construction, 105, 100, 12)).toBe(id);
  });

  it("returns null when nothing is within the threshold", () => {
    const { construction } = addFreePoint(emptyConstruction(), 100, 100);
    expect(findPointNear(construction, 100, 120, 12)).toBeNull();
  });

  it("picks the nearest of several candidates", () => {
    const r1 = addFreePoint(emptyConstruction(), 0, 0);
    const r2 = addFreePoint(r1.construction, 8, 0);
    expect(findPointNear(r2.construction, 6, 0, 12)).toBe(r2.id);
  });

  it("acquirePoint reuses an existing point within the threshold", () => {
    const { construction, id } = addFreePoint(emptyConstruction(), 50, 50);
    const acquired = acquirePoint(construction, 55, 52, 12);

    expect(acquired.created).toBe(false);
    expect(acquired.id).toBe(id);
    expect(allPoints(acquired.construction)).toHaveLength(1);
  });

  it("acquirePoint creates a new point outside the threshold", () => {
    const { construction, id } = addFreePoint(emptyConstruction(), 50, 50);
    const acquired = acquirePoint(construction, 100, 100, 12);

    expect(acquired.created).toBe(true);
    expect(acquired.id).not.toBe(id);
    expect(allPoints(acquired.construction)).toHaveLength(2);
    expect(getPoint(acquired.construction, acquired.id)).toMatchObject({
      x: 100,
      y: 100,
    });
  });

  it("skips a nonexistent intersection point even sitting exactly on its frozen position", () => {
    const p1 = addFreePoint(emptyConstruction(), 0, 0);
    const p2 = addFreePoint(p1.construction, 10, 0);
    const line = addLine(p2.construction, p1.id, p2.id);
    const cross = addIntersectionPoint(
      line.construction,
      5,
      0,
      line.id,
      line.id,
      0,
    );
    const gone = recomputeIntersections(cross.construction, () => null);

    // A small threshold that would only ever match the intersection point
    // itself (p1 and p2 are both 5 units away) confirms it's really being
    // skipped, not just out-distanced by another point.
    expect(findPointNear(gone, 5, 0, 1)).toBeNull();
    // acquirePoint falls back to creating a brand new free point instead.
    const acquired = acquirePoint(gone, 5, 0, 1);
    expect(acquired.created).toBe(true);
  });
});

describe("dragging", () => {
  it("movePoint updates the point coordinates", () => {
    const { construction, id } = addFreePoint(emptyConstruction(), 0, 0);
    const moved = movePoint(construction, id, 33, -12);
    expect(getPoint(moved, id)).toMatchObject({ x: 33, y: -12 });
  });

  it("movePoint ignores unknown ids and non-point entities", () => {
    const p1 = addFreePoint(emptyConstruction(), 0, 0);
    const p2 = addFreePoint(p1.construction, 10, 0);
    const seg = addSegment(p2.construction, p1.id, p2.id);

    expect(movePoint(seg.construction, "nope", 1, 1)).toBe(seg.construction);
    expect(movePoint(seg.construction, seg.id, 1, 1)).toBe(seg.construction);
  });

  it("dependents see the move because they hold references, not coordinates", () => {
    const p1 = addFreePoint(emptyConstruction(), 0, 0);
    const p2 = addFreePoint(p1.construction, 10, 0);
    const seg = addSegment(p2.construction, p1.id, p2.id);

    const moved = movePoint(seg.construction, p1.id, -40, 25);

    const segment = moved.entities[seg.id];
    if (segment.kind !== "segment") throw new Error("expected a segment");
    // The segment still references the same ids…
    expect(segment.a).toBe(p1.id);
    expect(segment.b).toBe(p2.id);
    // …and resolving them yields the updated position.
    expect(getPoint(moved, segment.a)).toMatchObject({ x: -40, y: 25 });
    expect(getPoint(moved, segment.b)).toMatchObject({ x: 10, y: 0 });
  });
});

describe("new entities default to visible with no color override", () => {
  it("points and segments start with color null and hidden false", () => {
    const p1 = addFreePoint(emptyConstruction(), 0, 0);
    const p2 = addFreePoint(p1.construction, 10, 0);
    const seg = addSegment(p2.construction, p1.id, p2.id);

    expect(seg.construction.entities[p1.id]).toMatchObject({
      color: null,
      hidden: false,
    });
    expect(seg.construction.entities[seg.id]).toMatchObject({
      color: null,
      hidden: false,
    });
  });
});

describe("setColor", () => {
  it("sets an explicit color override", () => {
    const { construction, id } = addFreePoint(emptyConstruction(), 0, 0);
    const colored = setColor(construction, id, "#ff0000");
    expect(getPoint(colored, id)).toMatchObject({ color: "#ff0000" });
  });

  it("clears the override back to null", () => {
    const { construction, id } = addFreePoint(emptyConstruction(), 0, 0);
    const colored = setColor(construction, id, "#ff0000");
    const cleared = setColor(colored, id, null);
    expect(getPoint(cleared, id)).toMatchObject({ color: null });
  });

  it("ignores unknown ids", () => {
    const c = emptyConstruction();
    expect(setColor(c, "nope", "#ff0000")).toBe(c);
  });
});

describe("setHidden", () => {
  it("toggles visibility without removing the entity", () => {
    const { construction, id } = addFreePoint(emptyConstruction(), 0, 0);
    const hidden = setHidden(construction, id, true);
    expect(getPoint(hidden, id)).toMatchObject({ hidden: true });
    expect(allPoints(hidden)).toHaveLength(1);
  });

  it("ignores unknown ids", () => {
    const c = emptyConstruction();
    expect(setHidden(c, "nope", true)).toBe(c);
  });
});

describe("deleteEntity", () => {
  it("removes a standalone point", () => {
    const { construction, id } = addFreePoint(emptyConstruction(), 0, 0);
    const after = deleteEntity(construction, id);
    expect(getPoint(after, id)).toBeNull();
    expect(allPoints(after)).toHaveLength(0);
  });

  it("removes a non-point entity without touching its points", () => {
    const p1 = addFreePoint(emptyConstruction(), 0, 0);
    const p2 = addFreePoint(p1.construction, 10, 0);
    const seg = addSegment(p2.construction, p1.id, p2.id);

    const after = deleteEntity(seg.construction, seg.id);
    expect(after.entities[seg.id]).toBeUndefined();
    expect(getPoint(after, p1.id)).not.toBeNull();
    expect(getPoint(after, p2.id)).not.toBeNull();
  });

  it("cascades: deleting a point removes every entity built on it", () => {
    const p1 = addFreePoint(emptyConstruction(), 0, 0);
    const p2 = addFreePoint(p1.construction, 10, 0);
    const p3 = addFreePoint(p2.construction, 5, 5);
    const seg = addSegment(p3.construction, p1.id, p2.id);
    const seg2 = addSegment(seg.construction, p1.id, p3.id);

    const after = deleteEntity(seg2.construction, p1.id);

    expect(getPoint(after, p1.id)).toBeNull();
    expect(after.entities[seg.id]).toBeUndefined();
    expect(after.entities[seg2.id]).toBeUndefined();
    // The uninvolved point survives.
    expect(getPoint(after, p2.id)).not.toBeNull();
    expect(getPoint(after, p3.id)).not.toBeNull();
  });

  it("ignores unknown ids", () => {
    const c = emptyConstruction();
    expect(deleteEntity(c, "nope")).toBe(c);
  });

  it("cascades through an intersection point: deleting one of its two source curves removes it too", () => {
    const p1 = addFreePoint(emptyConstruction(), 0, 0);
    const p2 = addFreePoint(p1.construction, 10, 0);
    const p3 = addFreePoint(p2.construction, 0, 10);
    const p4 = addFreePoint(p3.construction, 10, 10);
    const lineA = addLine(p4.construction, p1.id, p3.id);
    const lineB = addLine(lineA.construction, p2.id, p4.id);
    const cross = addIntersectionPoint(
      lineB.construction,
      5,
      5,
      lineA.id,
      lineB.id,
      0,
    );

    const after = deleteEntity(cross.construction, lineA.id);
    expect(after.entities[cross.id]).toBeUndefined();
    // The other source curve is untouched.
    expect(after.entities[lineB.id]).toBeDefined();
  });

  it("cascades through a midpoint: deleting one of its two source points removes it too", () => {
    const p1 = addFreePoint(emptyConstruction(), 0, 0);
    const p2 = addFreePoint(p1.construction, 10, 0);
    const mid = addMidpoint(p2.construction, 5, 0, p1.id, p2.id);

    const after = deleteEntity(mid.construction, p1.id);
    expect(after.entities[mid.id]).toBeUndefined();
    // The other source point is untouched.
    expect(getPoint(after, p2.id)).not.toBeNull();
  });

  it("cascades transitively: point -> line -> intersection -> segment built on the intersection", () => {
    const p1 = addFreePoint(emptyConstruction(), 0, 0);
    const p2 = addFreePoint(p1.construction, 10, 0);
    const p3 = addFreePoint(p2.construction, 0, 10);
    const p4 = addFreePoint(p3.construction, 10, 10);
    const lineA = addLine(p4.construction, p1.id, p3.id);
    const lineB = addLine(lineA.construction, p2.id, p4.id);
    const cross = addIntersectionPoint(
      lineB.construction,
      5,
      5,
      lineA.id,
      lineB.id,
      0,
    );
    const built = addSegment(cross.construction, cross.id, p1.id);

    // Deleting the original point p1 should ripple all the way through:
    // p1 -> lineA (references p1) -> cross (built on lineA) -> built (built on cross).
    const after = deleteEntity(built.construction, p1.id);
    expect(after.entities[lineA.id]).toBeUndefined();
    expect(after.entities[cross.id]).toBeUndefined();
    expect(after.entities[built.id]).toBeUndefined();
    // The untouched line survives.
    expect(after.entities[lineB.id]).toBeDefined();
  });
});

describe("addIntersectionPoint", () => {
  it("adds a point that resolves like any other point", () => {
    const p1 = addFreePoint(emptyConstruction(), 0, 0);
    const p2 = addFreePoint(p1.construction, 10, 0);
    const line = addLine(p2.construction, p1.id, p2.id);

    const cross = addIntersectionPoint(
      line.construction,
      5,
      0,
      line.id,
      line.id,
      0,
    );
    expect(getPoint(cross.construction, cross.id)).toMatchObject({
      x: 5,
      y: 0,
      kind: "intersection",
    });
    expect(allPoints(cross.construction)).toHaveLength(3);
  });

  it("is not moved by movePoint", () => {
    const p1 = addFreePoint(emptyConstruction(), 0, 0);
    const p2 = addFreePoint(p1.construction, 10, 0);
    const line = addLine(p2.construction, p1.id, p2.id);
    const cross = addIntersectionPoint(
      line.construction,
      5,
      0,
      line.id,
      line.id,
      0,
    );

    const after = movePoint(cross.construction, cross.id, 99, 99);
    expect(after).toBe(cross.construction);
  });
});

describe("recomputeIntersections", () => {
  it("refreshes coordinates using the supplied compute function", () => {
    const p1 = addFreePoint(emptyConstruction(), 0, 0);
    const p2 = addFreePoint(p1.construction, 10, 0);
    const line = addLine(p2.construction, p1.id, p2.id);
    const cross = addIntersectionPoint(
      line.construction,
      5,
      0,
      line.id,
      line.id,
      0,
    );

    const after = recomputeIntersections(cross.construction, () => ({
      x: 42,
      y: -7,
    }));
    expect(getPoint(after, cross.id)).toMatchObject({ x: 42, y: -7 });
  });

  it("marks the point as not existing (coordinates frozen) when compute reports no solution", () => {
    const p1 = addFreePoint(emptyConstruction(), 0, 0);
    const p2 = addFreePoint(p1.construction, 10, 0);
    const line = addLine(p2.construction, p1.id, p2.id);
    const cross = addIntersectionPoint(
      line.construction,
      5,
      0,
      line.id,
      line.id,
      0,
    );

    const after = recomputeIntersections(cross.construction, () => null);
    expect(after.entities[cross.id]).toMatchObject({
      exists: false,
      x: 5,
      y: 0,
    });
    // getPoint treats a nonexistent intersection as not found, same as a
    // deleted or never-created point.
    expect(getPoint(after, cross.id)).toBeNull();
  });

  it("is a no-op once already marked nonexistent", () => {
    const p1 = addFreePoint(emptyConstruction(), 0, 0);
    const p2 = addFreePoint(p1.construction, 10, 0);
    const line = addLine(p2.construction, p1.id, p2.id);
    const cross = addIntersectionPoint(
      line.construction,
      5,
      0,
      line.id,
      line.id,
      0,
    );

    const gone = recomputeIntersections(cross.construction, () => null);
    const again = recomputeIntersections(gone, () => null);
    expect(again).toBe(gone);
  });

  it("comes back into existence, at the newly solved position, once compute finds one again", () => {
    const p1 = addFreePoint(emptyConstruction(), 0, 0);
    const p2 = addFreePoint(p1.construction, 10, 0);
    const line = addLine(p2.construction, p1.id, p2.id);
    const cross = addIntersectionPoint(
      line.construction,
      5,
      0,
      line.id,
      line.id,
      0,
    );

    const gone = recomputeIntersections(cross.construction, () => null);
    const back = recomputeIntersections(gone, () => ({ x: 7, y: 1 }));
    expect(getPoint(back, cross.id)).toMatchObject({
      x: 7,
      y: 1,
      exists: true,
    });
  });

  it("processes in construction order so a later intersection sees an earlier one's refreshed position", () => {
    const p1 = addFreePoint(emptyConstruction(), 0, 0);
    const p2 = addFreePoint(p1.construction, 10, 0);
    const line = addLine(p2.construction, p1.id, p2.id);
    const first = addIntersectionPoint(
      line.construction,
      1,
      1,
      line.id,
      line.id,
      0,
    );
    const second = addIntersectionPoint(
      first.construction,
      2,
      2,
      line.id,
      line.id,
      1,
    );

    const after = recomputeIntersections(
      second.construction,
      (construction, _a, _b, branch) => {
        // Second point's "position" is defined as double the first point's
        // current (already-recomputed) coordinates, to prove ordering.
        if (branch === 0) return { x: 10, y: 20 };
        const firstPoint = getPoint(construction, first.id)!;
        return { x: firstPoint.x * 2, y: firstPoint.y * 2 };
      },
    );

    expect(getPoint(after, first.id)).toMatchObject({ x: 10, y: 20 });
    expect(getPoint(after, second.id)).toMatchObject({ x: 20, y: 40 });
  });
});

describe("addMidpoint", () => {
  it("adds a point that resolves like any other point", () => {
    const p1 = addFreePoint(emptyConstruction(), 0, 0);
    const p2 = addFreePoint(p1.construction, 10, 0);
    const mid = addMidpoint(p2.construction, 5, 0, p1.id, p2.id);

    expect(getPoint(mid.construction, mid.id)).toMatchObject({
      x: 5,
      y: 0,
      kind: "midpoint",
    });
    expect(allPoints(mid.construction)).toHaveLength(3);
  });

  it("is not moved by movePoint", () => {
    const p1 = addFreePoint(emptyConstruction(), 0, 0);
    const p2 = addFreePoint(p1.construction, 10, 0);
    const mid = addMidpoint(p2.construction, 5, 0, p1.id, p2.id);

    const after = movePoint(mid.construction, mid.id, 99, 99);
    expect(after).toBe(mid.construction);
  });
});

describe("recomputeMidpoints", () => {
  it("refreshes coordinates using the supplied compute function", () => {
    const p1 = addFreePoint(emptyConstruction(), 0, 0);
    const p2 = addFreePoint(p1.construction, 10, 0);
    const mid = addMidpoint(p2.construction, 5, 0, p1.id, p2.id);

    const after = recomputeMidpoints(mid.construction, () => ({
      x: 42,
      y: -7,
    }));
    expect(getPoint(after, mid.id)).toMatchObject({ x: 42, y: -7 });
  });

  it("marks the point as not existing (coordinates frozen) when compute reports no source", () => {
    const p1 = addFreePoint(emptyConstruction(), 0, 0);
    const p2 = addFreePoint(p1.construction, 10, 0);
    const mid = addMidpoint(p2.construction, 5, 0, p1.id, p2.id);

    const after = recomputeMidpoints(mid.construction, () => null);
    expect(after.entities[mid.id]).toMatchObject({
      exists: false,
      x: 5,
      y: 0,
    });
    expect(getPoint(after, mid.id)).toBeNull();
  });

  it("is a no-op once already marked nonexistent", () => {
    const p1 = addFreePoint(emptyConstruction(), 0, 0);
    const p2 = addFreePoint(p1.construction, 10, 0);
    const mid = addMidpoint(p2.construction, 5, 0, p1.id, p2.id);

    const gone = recomputeMidpoints(mid.construction, () => null);
    const again = recomputeMidpoints(gone, () => null);
    expect(again).toBe(gone);
  });

  it("comes back into existence, at the newly solved position, once compute finds a source again", () => {
    const p1 = addFreePoint(emptyConstruction(), 0, 0);
    const p2 = addFreePoint(p1.construction, 10, 0);
    const mid = addMidpoint(p2.construction, 5, 0, p1.id, p2.id);

    const gone = recomputeMidpoints(mid.construction, () => null);
    const back = recomputeMidpoints(gone, () => ({ x: 7, y: 1 }));
    expect(getPoint(back, mid.id)).toMatchObject({
      x: 7,
      y: 1,
      exists: true,
    });
  });

  it("processes in construction order so a midpoint built on another midpoint sees its refreshed position", () => {
    const p1 = addFreePoint(emptyConstruction(), 0, 0);
    const p2 = addFreePoint(p1.construction, 10, 0);
    const first = addMidpoint(p2.construction, 1, 1, p1.id, p2.id);
    const second = addMidpoint(first.construction, 2, 2, first.id, p2.id);

    const after = recomputeMidpoints(second.construction, (construction, a) => {
      // Second point's "position" is defined as double whatever `a` (the
      // first midpoint) currently resolves to, to prove ordering.
      if (a === p1.id) return { x: 10, y: 20 };
      const source = getPoint(construction, a)!;
      return { x: source.x * 2, y: source.y * 2 };
    });

    expect(getPoint(after, first.id)).toMatchObject({ x: 10, y: 20 });
    expect(getPoint(after, second.id)).toMatchObject({ x: 20, y: 40 });
  });
});
