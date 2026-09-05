import { describe, expect, it } from "vitest";
import {
  addFreePoint,
  addIntersectionPoint,
  addLine,
  addMidpoint,
  addSegment,
  deleteEntity,
  emptyConstruction,
} from "../engine";
import { definingPoints, pointName, pointNames } from "./naming";

describe("pointName", () => {
  it("cycles through capital letters A..Z", () => {
    expect(pointName(0)).toBe("A");
    expect(pointName(1)).toBe("B");
    expect(pointName(25)).toBe("Z");
  });

  it("appends a generation number after the alphabet wraps", () => {
    expect(pointName(26)).toBe("A1");
    expect(pointName(27)).toBe("B1");
    expect(pointName(51)).toBe("Z1");
    expect(pointName(52)).toBe("A2");
  });
});

describe("pointNames", () => {
  it("assigns names by point insertion order", () => {
    const p1 = addFreePoint(emptyConstruction(), 0, 0);
    const p2 = addFreePoint(p1.construction, 1, 0);
    const names = pointNames(p2.construction);
    expect(names.get(p1.id)).toBe("A");
    expect(names.get(p2.id)).toBe("B");
  });

  it("keeps a surviving point's name after an earlier point is deleted", () => {
    const p1 = addFreePoint(emptyConstruction(), 0, 0);
    const p2 = addFreePoint(p1.construction, 1, 0);
    const after = deleteEntity(p2.construction, p1.id);

    const names = pointNames(after);
    expect(names.get(p2.id)).toBe("B");
  });

  it("keeps every survivor's name after a middle point is deleted", () => {
    const p1 = addFreePoint(emptyConstruction(), 0, 0);
    const p2 = addFreePoint(p1.construction, 1, 0);
    const p3 = addFreePoint(p2.construction, 2, 0);
    const after = deleteEntity(p3.construction, p2.id);

    const names = pointNames(after);
    expect(names.get(p1.id)).toBe("A");
    expect(names.get(p3.id)).toBe("C");
  });

  it("gives a newly-created point the next name after the highest ever assigned, not a reused gap", () => {
    const p1 = addFreePoint(emptyConstruction(), 0, 0);
    const p2 = addFreePoint(p1.construction, 1, 0);
    const afterDelete = deleteEntity(p2.construction, p1.id);
    const p3 = addFreePoint(afterDelete, 2, 0);

    const names = pointNames(p3.construction);
    expect(names.get(p2.id)).toBe("B");
    expect(names.get(p3.id)).toBe("C");
  });

  it("assigns intersection and midpoint points names from the same stable sequence", () => {
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
    const mid = addMidpoint(cross.construction, 2, 2, p1.id, cross.id);

    // p1..p4 = A..D (indices 0-3), cross = E (index 4), mid = F (index 5).
    const names = pointNames(mid.construction);
    expect(names.get(cross.id)).toBe("E");
    expect(names.get(mid.id)).toBe("F");

    // Deleting p2 cascades: p2 -> lineB (references p2) -> cross (built on
    // lineB) -> mid (built on cross). p3 isn't in that chain, so it must
    // keep its name.
    const after = deleteEntity(mid.construction, p2.id);
    expect(pointNames(after).get(p3.id)).toBe("C");
  });
});

describe("definingPoints", () => {
  it("returns the point itself for a point entity", () => {
    const p1 = addFreePoint(emptyConstruction(), 0, 0);
    const point = p1.construction.entities[p1.id];
    expect(definingPoints(point)).toEqual([p1.id]);
  });

  it("returns endpoints in order for a segment", () => {
    const p1 = addFreePoint(emptyConstruction(), 0, 0);
    const p2 = addFreePoint(p1.construction, 1, 0);
    const seg = addSegment(p2.construction, p1.id, p2.id);
    const segment = seg.construction.entities[seg.id];
    expect(definingPoints(segment)).toEqual([p1.id, p2.id]);
  });
});
