import { describe, expect, it } from "vitest";
import { allPoints, getPoint } from "../engine";
import { appReducer, initialAppState } from "./appState";
import type { AppState } from "./appState";
import { DISK_RADIUS, isInsideDisk } from "./disk";

const withTool = (tool: "point" | "select"): AppState => ({
  ...initialAppState(),
  toolState: { tool, buffer: [] },
});

describe("isInsideDisk", () => {
  it("is true strictly inside, false on and beyond the boundary", () => {
    expect(isInsideDisk({ x: 0, y: 0 })).toBe(true);
    expect(isInsideDisk({ x: DISK_RADIUS - 1, y: 0 })).toBe(true);
    expect(isInsideDisk({ x: DISK_RADIUS, y: 0 })).toBe(false);
    expect(isInsideDisk({ x: 0, y: -DISK_RADIUS - 50 })).toBe(false);
  });
});

describe("disk boundary guard", () => {
  it("ignores clicks outside the disk", () => {
    const state = withTool("point");
    const after = appReducer(state, { type: "canvasClick", x: DISK_RADIUS + 10, y: 0 });
    expect(after).toBe(state);
    expect(allPoints(after.construction)).toHaveLength(0);
  });

  it("creates points from clicks inside the disk", () => {
    const after = appReducer(withTool("point"), { type: "canvasClick", x: 50, y: 50 });
    expect(allPoints(after.construction)).toHaveLength(1);
  });

  it("freezes a dragged point when the pointer leaves the disk", () => {
    let state = appReducer(withTool("point"), { type: "canvasClick", x: 50, y: 50 });
    const id = allPoints(state.construction)[0].id;

    state = appReducer(state, { type: "dragStart", id });
    state = appReducer(state, { type: "dragMove", x: 100, y: 0 });
    expect(getPoint(state.construction, id)).toMatchObject({ x: 100, y: 0 });

    // Pointer escapes the disk: the point must not follow.
    state = appReducer(state, { type: "dragMove", x: DISK_RADIUS + 100, y: 0 });
    expect(getPoint(state.construction, id)).toMatchObject({ x: 100, y: 0 });

    // Pointer comes back inside: dragging resumes.
    state = appReducer(state, { type: "dragMove", x: -20, y: 30 });
    expect(getPoint(state.construction, id)).toMatchObject({ x: -20, y: 30 });
  });
});
