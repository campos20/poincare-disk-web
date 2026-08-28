import { describe, expect, it } from "vitest";
import { addFreePoint, addSegment, emptyConstruction } from "../engine";
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
