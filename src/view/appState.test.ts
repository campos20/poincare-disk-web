import { describe, expect, it } from "vitest";
import {
  addCircle,
  addFreePoint,
  addSegment,
  allPoints,
  emptyConstruction,
  getPoint,
} from "../engine";
import type { EntityId, ToolId } from "../engine";
import { appReducer, initialAppState } from "./appState";
import type { AppState } from "./appState";
import { isInsideDisk } from "./disk";

const withTool = (tool: ToolId): AppState => ({
  ...initialAppState(),
  toolState: { tool, buffer: [] },
});

describe("isInsideDisk", () => {
  it("is true strictly inside, false on and beyond the boundary", () => {
    expect(isInsideDisk({ x: 0, y: 0 })).toBe(true);
    expect(isInsideDisk({ x: 0.99, y: 0 })).toBe(true);
    expect(isInsideDisk({ x: 1, y: 0 })).toBe(false);
    expect(isInsideDisk({ x: 0, y: -1.5 })).toBe(false);
  });
});

describe("disk boundary guard", () => {
  it("ignores clicks outside the disk", () => {
    const state = withTool("point");
    const after = appReducer(state, { type: "canvasClick", x: 1.1, y: 0 });
    expect(after).toBe(state);
    expect(allPoints(after.construction)).toHaveLength(0);
  });

  it("creates points from clicks inside the disk", () => {
    const after = appReducer(withTool("point"), {
      type: "canvasClick",
      x: 0.2,
      y: 0.2,
    });
    expect(allPoints(after.construction)).toHaveLength(1);
  });

  it("freezes a dragged point when the pointer leaves the disk", () => {
    let state = appReducer(withTool("point"), {
      type: "canvasClick",
      x: 0.2,
      y: 0.2,
    });
    const id = allPoints(state.construction)[0].id;

    state = appReducer(state, { type: "dragStart", id });
    state = appReducer(state, { type: "dragMove", x: 0.4, y: 0 });
    expect(getPoint(state.construction, id)).toMatchObject({ x: 0.4, y: 0 });

    // Pointer escapes the disk: the point must not follow.
    state = appReducer(state, { type: "dragMove", x: 1.5, y: 0 });
    expect(getPoint(state.construction, id)).toMatchObject({ x: 0.4, y: 0 });

    // Pointer comes back inside: dragging resumes.
    state = appReducer(state, { type: "dragMove", x: -0.2, y: 0.3 });
    expect(getPoint(state.construction, id)).toMatchObject({ x: -0.2, y: 0.3 });
  });
});

describe("object panel actions", () => {
  it("selectObject toggles the selection on and off", () => {
    const p = addFreePoint(emptyConstruction(), 0, 0);
    let state: AppState = {
      ...initialAppState(),
      construction: p.construction,
    };

    state = appReducer(state, { type: "selectObject", id: p.id });
    expect(state.selectedId).toBe(p.id);

    state = appReducer(state, { type: "selectObject", id: p.id });
    expect(state.selectedId).toBeNull();
  });

  it("setColor updates the entity's color override", () => {
    const p = addFreePoint(emptyConstruction(), 0, 0);
    const state: AppState = {
      ...initialAppState(),
      construction: p.construction,
    };

    const after = appReducer(state, {
      type: "setColor",
      id: p.id,
      color: "#ff0000",
    });
    expect(after.construction.entities[p.id]).toMatchObject({
      color: "#ff0000",
    });
  });

  it("toggleHidden flips visibility", () => {
    const p = addFreePoint(emptyConstruction(), 0, 0);
    const state: AppState = {
      ...initialAppState(),
      construction: p.construction,
    };

    const hidden = appReducer(state, { type: "toggleHidden", id: p.id });
    expect(hidden.construction.entities[p.id]).toMatchObject({ hidden: true });

    const shown = appReducer(hidden, { type: "toggleHidden", id: p.id });
    expect(shown.construction.entities[p.id]).toMatchObject({ hidden: false });
  });

  it("deleteObject removes the entity and clears a matching selection", () => {
    const p = addFreePoint(emptyConstruction(), 0, 0);
    const state: AppState = {
      ...initialAppState(),
      construction: p.construction,
      selectedId: p.id,
    };

    const after = appReducer(state, { type: "deleteObject", id: p.id });
    expect(getPoint(after.construction, p.id)).toBeNull();
    expect(after.selectedId).toBeNull();
  });

  it("deleteObject cascade clears selection pointing at a dependent entity", () => {
    const p1 = addFreePoint(emptyConstruction(), 0, 0);
    const p2 = addFreePoint(p1.construction, 10, 0);
    const seg = addSegment(p2.construction, p1.id, p2.id);
    const state: AppState = {
      ...initialAppState(),
      construction: seg.construction,
      selectedId: seg.id,
    };

    // Deleting p1 cascades to remove the segment built on it.
    const after = appReducer(state, { type: "deleteObject", id: p1.id });
    expect(after.construction.entities[seg.id]).toBeUndefined();
    expect(after.selectedId).toBeNull();
  });
});

describe("midpoint tool", () => {
  it("creates the midpoint once both points are clicked, via the hyperbolic formula", () => {
    let state = appReducer(withTool("midpoint"), {
      type: "canvasClick",
      x: 0,
      y: 0,
    });
    expect(state.toolState.buffer).toHaveLength(1);

    state = appReducer(state, { type: "canvasClick", x: 0.5, y: 0 });
    expect(state.toolState.buffer).toHaveLength(0);

    const points = allPoints(state.construction);
    expect(points).toHaveLength(3); // A, B, and the midpoint
    const mid = points.find((p) => p.kind === "midpoint")!;
    // On the real axis, the Euclidean position is tanh(artanh(t)/2) for a
    // point at parameter t; for t = 0.5 that simplifies to 2 − √3.
    expect(mid.x).toBeCloseTo(2 - Math.sqrt(3));
    expect(mid.y).toBeCloseTo(0);
  });

  it("recomputes on drag, including through the antipodal edge case", () => {
    let state = appReducer(withTool("midpoint"), {
      type: "canvasClick",
      x: 0,
      y: 0,
    });
    state = appReducer(state, { type: "canvasClick", x: 0.5, y: 0 });
    const [a, , mid] = allPoints(state.construction);

    // Drag A to (-0.5, 0): A and B are now antipodal through the origin —
    // the general midpoint formula's removable singularity (see
    // hyperbolicFormulas.ts) — so this also regression-tests that case.
    state = appReducer(state, { type: "dragStart", id: a.id });
    state = appReducer(state, { type: "dragMove", x: -0.5, y: 0 });

    const after = getPoint(state.construction, mid.id)!;
    expect(after.x).toBeCloseTo(0);
    expect(after.y).toBeCloseTo(0);
  });
});

describe("intersect tool", () => {
  const withIntersectTool = (buffer: EntityId[] = []): AppState => ({
    ...initialAppState(),
    toolState: { tool: "intersect", buffer },
  });

  function twoCrossingCircles() {
    const c1 = addFreePoint(emptyConstruction(), -0.15, 0);
    const t1 = addFreePoint(c1.construction, 0.15, 0);
    const c2 = addFreePoint(t1.construction, 0.15, 0);
    const t2 = addFreePoint(c2.construction, -0.15, 0);
    const circleA = addCircle(t2.construction, c1.id, t1.id);
    const circleB = addCircle(circleA.construction, c2.id, t2.id);
    return {
      construction: circleB.construction,
      circleA: circleA.id,
      circleB: circleB.id,
      c1: c1.id,
    };
  }

  it("first click buffers the entity; second click adds the intersection point(s)", () => {
    const { construction, circleA, circleB } = twoCrossingCircles();
    let state: AppState = { ...withIntersectTool(), construction };

    state = appReducer(state, { type: "entityClick", id: circleA });
    expect(state.toolState.buffer).toEqual([circleA]);
    expect(allPoints(state.construction)).toHaveLength(4); // just the 4 defining points so far

    state = appReducer(state, { type: "entityClick", id: circleB });
    expect(state.toolState.buffer).toHaveLength(0);
    expect(allPoints(state.construction)).toHaveLength(6); // + 2 intersection points
    expect(
      allPoints(state.construction).filter((p) => p.kind === "intersection"),
    ).toHaveLength(2);
  });

  it("ignores entityClick outside the intersect tool", () => {
    const { construction, circleA } = twoCrossingCircles();
    const state: AppState = { ...withTool("select"), construction };
    const after = appReducer(state, { type: "entityClick", id: circleA });
    expect(after).toBe(state);
  });

  it("re-clicking the same entity restarts the buffer instead of self-intersecting", () => {
    const { construction, circleA } = twoCrossingCircles();
    let state: AppState = { ...withIntersectTool(), construction };
    state = appReducer(state, { type: "entityClick", id: circleA });
    state = appReducer(state, { type: "entityClick", id: circleA });
    expect(state.toolState.buffer).toEqual([circleA]);
  });

  it("dragging a source point recomputes the intersection point's position", () => {
    const { construction, circleA, circleB, c1 } = twoCrossingCircles();
    let state: AppState = { ...withIntersectTool(), construction };
    state = appReducer(state, { type: "entityClick", id: circleA });
    state = appReducer(state, { type: "entityClick", id: circleB });

    const crossId = allPoints(state.construction).find(
      (p) => p.kind === "intersection",
    )!.id;
    const before = getPoint(state.construction, crossId)!;

    state = appReducer(state, { type: "dragStart", id: c1 });
    state = appReducer(state, { type: "dragMove", x: -0.3, y: 0 });

    const after = getPoint(state.construction, crossId)!;
    expect(after.x === before.x && after.y === before.y).toBe(false);
  });
});
