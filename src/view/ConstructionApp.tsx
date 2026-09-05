import { useEffect, useReducer, useState } from "react";
import type { Construction, ToolState } from "../engine";
import { useI18n } from "../i18n/context";
import type { MessageKey } from "../i18n/messages";
import { appReducer, initialAppState, isCurveKind } from "./appState";
import { ConstructionCanvas } from "./ConstructionCanvas";
import { ObjectPanel } from "./ObjectPanel";
import { PageMenu } from "./PageMenu";
import { Toolbar } from "./Toolbar";
import { useDocumentMeta } from "./useDocumentMeta";
import "./construction.css";

function hintKey(toolState: ToolState, construction: Construction): MessageKey {
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
    case "midpoint":
      return step === 0 ? "hint.midpoint.first" : "hint.midpoint.second";
    case "angle": {
      if (step === 0) return "hint.angle.first";
      if (step === 2) return "hint.angle.points.third";
      // step === 1: whether we're in points- or curves-mode depends on
      // what the first pick actually was.
      const first = construction.entities[toolState.buffer[0]];
      return isCurveKind(first)
        ? "hint.angle.curves.second"
        : "hint.angle.points.second";
    }
  }
}

export function ConstructionApp() {
  const [state, dispatch] = useReducer(appReducer, undefined, initialAppState);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const { t } = useI18n();
  useDocumentMeta("seo.home.title", "seo.home.description");

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "Escape") {
        dispatch({ type: "setTool", tool: "select" });
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (state.selectedId !== null) {
          // Backspace without a focused field would otherwise navigate back.
          e.preventDefault();
          dispatch({ type: "deleteObject", id: state.selectedId });
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [state.selectedId]);

  return (
    <div className="page-shell">
      <header className="app-header">
        <PageMenu />
        <Toolbar
          active={state.toolState.tool}
          onSelect={(tool) => dispatch({ type: "setTool", tool })}
        />
      </header>
      <div className="app-body">
        <ObjectPanel
          construction={state.construction}
          collapsed={panelCollapsed}
          selectedId={state.selectedId}
          onToggle={() => setPanelCollapsed((c) => !c)}
          onPick={(id) => dispatch({ type: "entityPick", id })}
          onSelect={(id) => dispatch({ type: "selectObject", id })}
          onSetColor={(id, color) => dispatch({ type: "setColor", id, color })}
          onToggleHidden={(id) => dispatch({ type: "toggleHidden", id })}
          onDelete={(id) => dispatch({ type: "deleteObject", id })}
        />
        <ConstructionCanvas state={state} dispatch={dispatch} />
      </div>
      <footer className="hint-bar">
        {t(hintKey(state.toolState, state.construction))}
      </footer>
    </div>
  );
}
