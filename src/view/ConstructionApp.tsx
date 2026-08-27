import { useReducer, useState } from "react";
import type { ToolState } from "../engine";
import { useI18n } from "../i18n/context";
import type { MessageKey } from "../i18n/messages";
import { appReducer, initialAppState } from "./appState";
import { ConstructionCanvas } from "./ConstructionCanvas";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ObjectPanel } from "./ObjectPanel";
import { Toolbar } from "./Toolbar";
import "./construction.css";

function hintKey(toolState: ToolState): MessageKey {
  const step = toolState.buffer.length;
  switch (toolState.tool) {
    case "select":
      return "hint.select";
    case "point":
      return "hint.point";
    case "segment":
      return step === 0 ? "hint.segment.first" : "hint.segment.second";
    case "line":
      return step === 0 ? "hint.line.first" : "hint.line.second";
    case "circle":
      return step === 0 ? "hint.circle.center" : "hint.circle.thru";
    case "intersect":
      return step === 0 ? "hint.intersect.first" : "hint.intersect.second";
  }
}

export function ConstructionApp() {
  const [state, dispatch] = useReducer(appReducer, undefined, initialAppState);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const { t } = useI18n();

  return (
    <div className="construction-app">
      <header className="app-header">
        <Toolbar
          active={state.toolState.tool}
          onSelect={(tool) => dispatch({ type: "setTool", tool })}
        />
        <LanguageSwitcher />
      </header>
      <div className="app-body">
        <ObjectPanel
          construction={state.construction}
          collapsed={panelCollapsed}
          selectedId={state.selectedId}
          onToggle={() => setPanelCollapsed((c) => !c)}
          onSelect={(id) => dispatch({ type: "selectObject", id })}
          onSetColor={(id, color) => dispatch({ type: "setColor", id, color })}
          onToggleHidden={(id) => dispatch({ type: "toggleHidden", id })}
          onDelete={(id) => dispatch({ type: "deleteObject", id })}
        />
        <ConstructionCanvas state={state} dispatch={dispatch} />
      </div>
      <footer className="hint-bar">{t(hintKey(state.toolState))}</footer>
    </div>
  );
}
