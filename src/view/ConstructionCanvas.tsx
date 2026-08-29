import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { findPointNear, SNAP_THRESHOLD } from "../engine";
import type { EntityId } from "../engine";
import { useI18n } from "../i18n/context";
import type { AppAction, AppState } from "./appState";
import { DISK_RADIUS, toModel } from "./disk";
import type { Rect, XY } from "./shapes";
import { renderEntity } from "./renderEntity";
import { pointNames } from "./naming";

/** Smallest half-extent of the viewBox: the disk plus a little breathing room. */
const DISK_MARGIN = DISK_RADIUS + 10;

/** Client-space pointer movement below which a press+release counts as a
 * click rather than a drag. */
const CLICK_MOVE_THRESHOLD = 4;

/**
 * A viewBox centered on the origin matching the element's aspect ratio, so
 * the disk fills the short dimension on any screen with no letterboxing.
 */
function fitViewport(width: number, height: number): Rect {
  const aspect = width / height;
  const halfW = aspect >= 1 ? DISK_MARGIN * aspect : DISK_MARGIN;
  const halfH = aspect >= 1 ? DISK_MARGIN : DISK_MARGIN / aspect;
  return { minX: -halfW, minY: -halfH, maxX: halfW, maxY: halfH };
}

interface Props {
  readonly state: AppState;
  readonly dispatch: (action: AppAction) => void;
}

/** Screen (client) coords → svg user coords, respecting viewBox scaling. */
function toSvgCoords(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): XY | null {
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
  return { x: p.x, y: p.y };
}

export function ConstructionCanvas({ state, dispatch }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { t } = useI18n();
  const { construction, toolState, dragId, selectedId } = state;
  const [viewport, setViewport] = useState<Rect>(() => fitViewport(4, 3));
  // Entity under the pointer at press time, and where the press started —
  // used to tell a select-tool click (no movement) apart from a drag.
  const clickCandidate = useRef<{ id: EntityId; x: number; y: number } | null>(
    null,
  );

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const update = () => {
      const { width, height } = svg.getBoundingClientRect();
      if (width > 0 && height > 0) setViewport(fitViewport(width, height));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  const eventCoords = (e: ReactPointerEvent<SVGSVGElement>): XY | null => {
    const svg = svgRef.current;
    return svg ? toSvgCoords(svg, e.clientX, e.clientY) : null;
  };

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (toolState.tool === "intersect") {
      // The intersect tool picks entities by what was actually clicked
      // (see renderEntity's invisible `.ent-hit` overlays), not by nearest
      // coordinate — an entirely different click model from the other
      // tools, so it bypasses the coordinate-based canvasClick action.
      const target = e.target as Element;
      const id = target
        .closest("[data-entity-id]")
        ?.getAttribute("data-entity-id");
      if (id) dispatch({ type: "entityClick", id });
      return;
    }

    const pt = eventCoords(e);
    if (!pt) return;
    const model = toModel(pt);
    if (toolState.tool === "select") {
      const id = findPointNear(construction, model.x, model.y, SNAP_THRESHOLD);
      if (id !== null) {
        clickCandidate.current = { id, x: e.clientX, y: e.clientY };
        // Intersection points are derived, not draggable — don't start a
        // drag that movePoint would just ignore.
        if (construction.entities[id]?.kind === "point") {
          e.currentTarget.setPointerCapture(e.pointerId);
          dispatch({ type: "dragStart", id });
        }
        return;
      }
      // No point under the pointer — see if a stroke (segment/line/circle)
      // was hit via its invisible `.ent-hit` overlay (see renderEntity).
      const target = e.target as Element;
      const entityId = target
        .closest("[data-entity-id]")
        ?.getAttribute("data-entity-id");
      clickCandidate.current = entityId
        ? { id: entityId, x: e.clientX, y: e.clientY }
        : null;
    } else {
      dispatch({ type: "canvasClick", x: model.x, y: model.y });
    }
  };

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (dragId === null) return;
    const pt = eventCoords(e);
    if (pt) {
      const model = toModel(pt);
      dispatch({ type: "dragMove", x: model.x, y: model.y });
    }
  };

  const onPointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (dragId !== null) dispatch({ type: "dragEnd" });
    const candidate = clickCandidate.current;
    clickCandidate.current = null;
    if (!candidate) return;
    const moved = Math.hypot(e.clientX - candidate.x, e.clientY - candidate.y);
    // A press that didn't move is a click: select what was under it. A
    // press that moved was a drag, which already did its own thing.
    if (moved < CLICK_MOVE_THRESHOLD) {
      dispatch({ type: "selectObject", id: candidate.id });
    }
  };

  const onPointerCancel = () => {
    clickCandidate.current = null;
    if (dragId !== null) dispatch({ type: "dragEnd" });
  };

  const highlighted = new Set(toolState.buffer);
  const names = pointNames(construction);
  const opts = { highlighted, dragId, names, selectedId };

  // Strokes first, points on top, so points stay grabbable.
  const entities = state.construction.order.map(
    (id) => construction.entities[id],
  );
  const isPointKind = (ent: (typeof entities)[number]) =>
    ent.kind === "point" ||
    ent.kind === "intersection" ||
    ent.kind === "midpoint";
  const strokes = entities.filter((ent) => !isPointKind(ent));
  const points = entities.filter(isPointKind);

  const mode =
    toolState.tool === "select"
      ? "mode-select"
      : toolState.tool === "intersect"
        ? "mode-intersect"
        : "mode-build";

  return (
    <svg
      ref={svgRef}
      className={`construction-canvas ${mode}`}
      viewBox={`${viewport.minX} ${viewport.minY} ${viewport.maxX - viewport.minX} ${viewport.maxY - viewport.minY}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      aria-label={t("canvas.aria")}
    >
      {/* The Poincaré disk: the space itself. Outside it, nothing exists. */}
      <circle className="poincare-disk" cx={0} cy={0} r={DISK_RADIUS} />
      {strokes.map((ent) => renderEntity(construction, ent, opts))}
      {points.map((ent) => renderEntity(construction, ent, opts))}
    </svg>
  );
}
