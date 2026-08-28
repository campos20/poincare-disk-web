import { describe, expect, it } from "vitest";
import {
  addFreePoint,
  allPoints,
  emptyConstruction,
  getPoint,
} from "./construction";
import {
  applyClick,
  initialToolState,
  selectTool,
  SNAP_THRESHOLD,
} from "./tools";
import type { ToolState } from "./tools";

const tool = (id: ToolState["tool"]): ToolState => ({ tool: id, buffer: [] });

describe("select tool", () => {
  it("creates nothing on click", () => {
    const c = emptyConstruction();
    const result = applyClick(c, tool("select"), 10, 10);
    expect(result.construction).toBe(c);
    expect(result.created).toBeNull();
  });
});

describe("point tool", () => {
  it("drops a free point at the click position", () => {
    const result = applyClick(emptyConstruction(), tool("point"), 42, 17);
    expect(result.created).not.toBeNull();
    expect(getPoint(result.construction, result.created!)).toMatchObject({
      x: 42,
      y: 17,
    });
  });

  it("snaps onto an existing point instead of stacking a duplicate", () => {
    const { construction } = addFreePoint(emptyConstruction(), 42, 17);
    const result = applyClick(construction, tool("point"), 45, 17, 12);
    expect(result.created).toBeNull();
    expect(allPoints(result.construction)).toHaveLength(1);
  });
});

describe("default snap threshold", () => {
  // The tests above pass an explicit threshold so they can use readable,
  // arbitrary-scale coordinates independent of SNAP_THRESHOLD's actual
  // value. This one instead exercises applyClick's real default, at
  // fractions of SNAP_THRESHOLD itself so it stays correct if that value
  // is ever retuned.
  it("snaps within SNAP_THRESHOLD and creates a new point just beyond it", () => {
    const { construction } = addFreePoint(emptyConstruction(), 0.5, 0.5);

    const inside = applyClick(
      construction,
      tool("point"),
      0.5 + SNAP_THRESHOLD * 0.9,
      0.5,
    );
    expect(inside.created).toBeNull();
    expect(allPoints(inside.construction)).toHaveLength(1);

    const outside = applyClick(
      construction,
      tool("point"),
      0.5 + SNAP_THRESHOLD * 1.1,
      0.5,
    );
    expect(outside.created).not.toBeNull();
    expect(allPoints(outside.construction)).toHaveLength(2);
  });
});

describe("two-point tools", () => {
  it("segment: first click buffers, second click creates and resets the buffer", () => {
    const first = applyClick(emptyConstruction(), tool("segment"), 0, 0);
    expect(first.created).toBeNull();
    expect(first.toolState.buffer).toHaveLength(1);

    const second = applyClick(first.construction, first.toolState, 100, 0);
    expect(second.created).not.toBeNull();
    expect(second.toolState.buffer).toHaveLength(0);

    const seg = second.construction.entities[second.created!];
    expect(seg.kind).toBe("segment");
    if (seg.kind !== "segment") return;
    expect(getPoint(second.construction, seg.a)).toMatchObject({ x: 0, y: 0 });
    expect(getPoint(second.construction, seg.b)).toMatchObject({
      x: 100,
      y: 0,
    });
  });

  it("reuses an existing point as an endpoint via snapping", () => {
    const existing = addFreePoint(emptyConstruction(), 0, 0);
    const first = applyClick(existing.construction, tool("segment"), 5, 3, 12);
    expect(first.toolState.buffer).toEqual([existing.id]);
    expect(allPoints(first.construction)).toHaveLength(1);
  });

  it("two segments built through the same click position share an endpoint", () => {
    let state = applyClick(emptyConstruction(), tool("segment"), 0, 0);
    state = applyClick(state.construction, state.toolState, 100, 0);
    const segA = state.construction.entities[state.created!];

    state = applyClick(state.construction, state.toolState, 98, 2, 12); // snaps to (100, 0)
    state = applyClick(state.construction, state.toolState, 200, 50, 12);
    const segB = state.construction.entities[state.created!];

    if (segA.kind !== "segment" || segB.kind !== "segment")
      throw new Error("expected segments");
    expect(segB.a).toBe(segA.b);
    expect(allPoints(state.construction)).toHaveLength(3);
  });

  it("ignores a second click on the already-buffered point", () => {
    const first = applyClick(emptyConstruction(), tool("segment"), 0, 0);
    const second = applyClick(first.construction, first.toolState, 3, 3, 12); // snaps to buffered point
    expect(second.created).toBeNull();
    expect(second.toolState.buffer).toHaveLength(1);
    expect(allPoints(second.construction)).toHaveLength(1);
  });

  it("line stores its two defining points", () => {
    const first = applyClick(emptyConstruction(), tool("line"), 0, 0);
    const second = applyClick(first.construction, first.toolState, 50, 50);
    const line = second.construction.entities[second.created!];
    expect(line.kind).toBe("line");
  });

  it("circle stores center first, then the through-point", () => {
    const first = applyClick(emptyConstruction(), tool("circle"), 10, 10);
    const second = applyClick(first.construction, first.toolState, 40, 10);
    const circle = second.construction.entities[second.created!];
    expect(circle.kind).toBe("circle");
    if (circle.kind !== "circle") return;
    expect(getPoint(second.construction, circle.center)).toMatchObject({
      x: 10,
      y: 10,
    });
    expect(getPoint(second.construction, circle.thru)).toMatchObject({
      x: 40,
      y: 10,
    });
  });
});

describe("tool switching", () => {
  it("starts on select with an empty buffer", () => {
    expect(initialToolState()).toEqual({ tool: "select", buffer: [] });
  });

  it("clears the in-progress buffer", () => {
    const mid = applyClick(emptyConstruction(), tool("segment"), 0, 0);
    expect(mid.toolState.buffer).toHaveLength(1);
    const switched = selectTool(mid.toolState, "circle");
    expect(switched).toEqual({ tool: "circle", buffer: [] });
  });
});
