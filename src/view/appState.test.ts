import { describe, expect, it } from "vitest";
import { allPoints, getPoint } from "../engine";
import { appReducer, initialAppState } from "./appState";
import type { AppState } from "./appState";
import { isInsideDisk } from "./disk";

const withTool = (tool: "point" | "select"): AppState => ({
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
    const after = appReducer(withTool("point"), { type: "canvasClick", x: 0.2, y: 0.2 });
    expect(allPoints(after.construction)).toHaveLength(1);
  });

  it("freezes a dragged point when the pointer leaves the disk", () => {
    let state = appReducer(withTool("point"), { type: "canvasClick", x: 0.2, y: 0.2 });
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
