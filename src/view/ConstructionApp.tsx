import { useReducer } from "react";
import type { ToolState } from "../engine";
import { useI18n } from "../i18n/context";
import type { MessageKey } from "../i18n/messages";
import { appReducer, initialAppState } from "./appState";
import { ConstructionCanvas } from "./ConstructionCanvas";
import { LanguageSwitcher } from "./LanguageSwitcher";
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
  }
}

export function ConstructionApp() {
  const [state, dispatch] = useReducer(appReducer, undefined, initialAppState);
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
      <ConstructionCanvas state={state} dispatch={dispatch} />
      <footer className="hint-bar">{t(hintKey(state.toolState))}</footer>
    </div>
  );
}
