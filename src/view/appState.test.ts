import { describe, expect, it } from "vitest";
import { addFreePoint, addSegment, allPoints, emptyConstruction, getPoint } from "../engine";
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

describe("object panel actions", () => {
  it("selectObject toggles the selection on and off", () => {
    const p = addFreePoint(emptyConstruction(), 0, 0);
    let state: AppState = { ...initialAppState(), construction: p.construction };

    state = appReducer(state, { type: "selectObject", id: p.id });
    expect(state.selectedId).toBe(p.id);

    state = appReducer(state, { type: "selectObject", id: p.id });
    expect(state.selectedId).toBeNull();
  });

  it("setColor updates the entity's color override", () => {
    const p = addFreePoint(emptyConstruction(), 0, 0);
    const state: AppState = { ...initialAppState(), construction: p.construction };

    const after = appReducer(state, { type: "setColor", id: p.id, color: "#ff0000" });
    expect(after.construction.entities[p.id]).toMatchObject({ color: "#ff0000" });
  });

  it("toggleHidden flips visibility", () => {
    const p = addFreePoint(emptyConstruction(), 0, 0);
    const state: AppState = { ...initialAppState(), construction: p.construction };

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
