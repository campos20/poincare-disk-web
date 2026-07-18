import { useReducer } from "react";
import type { ToolState } from "../engine";
import { appReducer, initialAppState } from "./appState";
import { ConstructionCanvas } from "./ConstructionCanvas";
import { Toolbar } from "./Toolbar";
import "./construction.css";

function hint(toolState: ToolState): string {
  const step = toolState.buffer.length;
  switch (toolState.tool) {
    case "select":
      return "Drag a point to move it — everything built on it follows.";
    case "point":
      return "Click anywhere to place a point.";
    case "segment":
      return step === 0
        ? "Segment: click the first endpoint."
        : "Segment: click the second endpoint.";
    case "line":
      return step === 0
        ? "Line: click a first point."
        : "Line: click a second point.";
    case "circle":
      return step === 0
        ? "Circle: click the center."
        : "Circle: click a point on the circle.";
  }
}

export function ConstructionApp() {
  const [state, dispatch] = useReducer(appReducer, undefined, initialAppState);

  return (
    <div className="construction-app">
      <header className="app-header">
        <Toolbar
          active={state.toolState.tool}
          onSelect={(tool) => dispatch({ type: "setTool", tool })}
        />
      </header>
      <ConstructionCanvas state={state} dispatch={dispatch} />
      <footer className="hint-bar">{hint(state.toolState)}</footer>
    </div>
  );
}
