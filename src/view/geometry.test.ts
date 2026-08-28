import { describe, expect, it } from "vitest";
import {
  circleShape,
  clipLineToRect,
  distance,
  lineShape,
  segmentShape,
} from "./geometry";
import type { Rect } from "./shapes";

const rect: Rect = { minX: -100, minY: -100, maxX: 100, maxY: 100 };

describe("distance", () => {
  it("computes the Euclidean distance", () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});

describe("segmentShape", () => {
  it("produces a move-line path between the endpoints", () => {
    expect(segmentShape({ x: 1, y: 2 }, { x: 3, y: 4 })).toBe("M 1 2 L 3 4");
  });
});

describe("circleShape", () => {
  it("is centered at `center` with radius reaching `thru`", () => {
    expect(circleShape({ x: 10, y: -5 }, { x: 13, y: -1 })).toEqual({
      cx: 10,
      cy: -5,
      r: 5,
    });
  });
});

describe("clipLineToRect", () => {
  it("extends a horizontal chord to the full rect width", () => {
    const clipped = clipLineToRect({ x: -10, y: 20 }, { x: 10, y: 20 }, rect);
    expect(clipped).toEqual([
      { x: -100, y: 20 },
      { x: 100, y: 20 },
    ]);
  });

  it("extends a vertical chord to the full rect height", () => {
    const clipped = clipLineToRect({ x: 5, y: 0 }, { x: 5, y: 1 }, rect);
    expect(clipped).toEqual([
      { x: 5, y: -100 },
      { x: 5, y: 100 },
    ]);
  });

  it("clips a diagonal through the origin to opposite corners", () => {
    const clipped = clipLineToRect({ x: 0, y: 0 }, { x: 1, y: 1 }, rect);
    expect(clipped).toEqual([
      { x: -100, y: -100 },
      { x: 100, y: 100 },
    ]);
  });

  it("clips a line defined by points outside the rect", () => {
    const clipped = clipLineToRect({ x: -500, y: 0 }, { x: 500, y: 0 }, rect);
    expect(clipped).toEqual([
      { x: -100, y: 0 },
      { x: 100, y: 0 },
    ]);
  });

  it("returns null for a line that misses the rect", () => {
    expect(
      clipLineToRect({ x: -500, y: 200 }, { x: 500, y: 200 }, rect),
    ).toBeNull();
  });

  it("returns null for coincident points", () => {
    expect(clipLineToRect({ x: 1, y: 1 }, { x: 1, y: 1 }, rect)).toBeNull();
  });
});

describe("lineShape", () => {
  it("renders the clipped line as path data", () => {
    expect(lineShape({ x: -10, y: 0 }, { x: 10, y: 0 }, rect)).toBe(
      "M -100 0 L 100 0",
    );
  });

  it("returns null when off-screen", () => {
    expect(lineShape({ x: 0, y: 999 }, { x: 1, y: 999 }, rect)).toBeNull();
  });
});
