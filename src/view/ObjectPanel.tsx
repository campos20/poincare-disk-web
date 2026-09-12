import {
  Angle as AngleIcon,
  Asterisk,
  ChevronLeft,
  ChevronRight,
  Circle,
  Diamond,
  Dot,
  Eye,
  EyeOff,
  Minus,
  Sigma,
  Slash,
  Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Construction, Entity, EntityId, ExpressionNode } from "../engine";
import { useI18n } from "../i18n/context";
import type { MessageKey } from "../i18n/messages";
import { angleDegrees, formatDegrees } from "./angles";
import { evaluateExpression } from "./expressions";
import { ExpressionInput } from "./ExpressionInput";
import { angleLabel, definingPoints, pointNames } from "./naming";

const ICONS: Record<Entity["kind"], LucideIcon> = {
  point: Dot,
  intersection: Asterisk,
  midpoint: Diamond,
  segment: Minus,
  line: Slash,
  circle: Circle,
  angle: AngleIcon,
  expression: Sigma,
};

const KIND_LABEL: Record<
  Exclude<Entity["kind"], "point" | "intersection" | "midpoint" | "expression">,
  MessageKey
> = {
  segment: "object.segment",
  line: "object.line",
  circle: "object.circle",
  angle: "object.angle",
};

/** Swatches offered for object color; matches the app's existing accents. */
const PALETTE = [
  "#e8b45a",
  "#7fa7d4",
  "#6ee7b7",
  "#f4708a",
  "#c792ea",
  "#eaf1f8",
] as const;

function objectLabel(
  entity: Entity,
  names: ReadonlyMap<EntityId, string>,
  t: (key: MessageKey) => string,
): string {
  // An expression is identified by its own formula text, not by points —
  // that's also the identifier other formulas would reference, but
  // expressions can't currently reference each other (see naming.ts).
  if (entity.kind === "expression") return entity.formula;

  const points = definingPoints(entity)
    .map((id) => names.get(id) ?? "?")
    .join("");
  if (
    entity.kind === "point" ||
    entity.kind === "intersection" ||
    entity.kind === "midpoint"
  ) {
    return points;
  }
  const kindLabel = t(KIND_LABEL[entity.kind]);
  // A curves-mode angle has no defining points (see naming.ts) — fall back
  // to the bare kind label rather than "Angle " with a trailing space.
  const base = points ? `${kindLabel} ${points}` : kindLabel;
  // Append the reference name (angle1, angle2, …) an expression formula
  // would use to point at this angle.
  return entity.kind === "angle"
    ? `${base} (${angleLabel(entity.index)})`
    : base;
}

/** The degree value shown next to an angle or expression row, or null for
 * every other kind (nothing to show) or when it doesn't currently resolve. */
function objectValue(
  entity: Entity,
  construction: Construction,
): string | null {
  const degrees =
    entity.kind === "angle"
      ? angleDegrees(construction, entity)
      : entity.kind === "expression"
        ? evaluateExpression(construction, entity.ast)
        : null;
  return degrees === null ? null : formatDegrees(degrees);
}

interface Props {
  readonly construction: Construction;
  readonly collapsed: boolean;
  readonly selectedId: EntityId | null;
  readonly onToggle: () => void;
  /**
   * Plain click/tap on a row: feeds the active tool, same as clicking the
   * object on the canvas would (a point for a point-needing tool, a curve
   * for the intersect tool) — this is what lets a construction be built
   * entirely from the panel on a screen too small to tap precisely.
   */
  readonly onPick: (id: EntityId) => void;
  /**
   * Right-click or long-press (both fire the browser's native
   * 'contextmenu' event): select the object for property editing — color,
   * visibility, delete. Kept off the plain click so it can't collide with
   * onPick above.
   */
  readonly onSelect: (id: EntityId) => void;
  readonly onSetColor: (id: EntityId, color: string | null) => void;
  readonly onToggleHidden: (id: EntityId) => void;
  readonly onDelete: (id: EntityId) => void;
  readonly onAddAngleExpression: (formula: string, ast: ExpressionNode) => void;
}

export function ObjectPanel({
  construction,
  collapsed,
  selectedId,
  onToggle,
  onPick,
  onSelect,
  onSetColor,
  onToggleHidden,
  onDelete,
  onAddAngleExpression,
}: Props) {
  const { t } = useI18n();
  const names = pointNames(construction);
  const entities = construction.order.map((id) => construction.entities[id]);

  return (
    <aside className={collapsed ? "object-panel collapsed" : "object-panel"}>
      <div className="object-panel-header">
        {!collapsed && (
          <span className="object-panel-title">{t("panel.title")}</span>
        )}
        <button
          type="button"
          className="panel-toggle"
          aria-label={t(collapsed ? "panel.expand" : "panel.collapse")}
          aria-expanded={!collapsed}
          onClick={onToggle}
        >
          {collapsed ? (
            <ChevronRight size={16} aria-hidden />
          ) : (
            <ChevronLeft size={16} aria-hidden />
          )}
        </button>
      </div>
      {!collapsed && (
        <ul className="object-list">
          {entities.length === 0 && (
            <li className="object-empty">{t("panel.empty")}</li>
          )}
          {entities.map((entity) => {
            const Icon = ICONS[entity.kind];
            const selected = entity.id === selectedId;
            const value = objectValue(entity, construction);
            const vanished =
              (entity.kind === "intersection" || entity.kind === "midpoint") &&
              !entity.exists;
            const itemClass = [
              "object-item",
              selected && "selected",
              entity.hidden && "hidden-entity",
              vanished && "undefined-entity",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <li
                key={entity.id}
                className={itemClass}
                title={vanished ? t("panel.undefined") : undefined}
              >
                <button
                  type="button"
                  className="object-row"
                  aria-pressed={selected}
                  onClick={() => onPick(entity.id)}
                  onContextMenu={(e) => {
                    // Right-click on desktop, long-press on mobile — both
                    // fire this event natively, so no manual timer needed.
                    e.preventDefault();
                    onSelect(entity.id);
                  }}
                >
                  <Icon
                    size={14}
                    aria-hidden
                    className={`object-icon object-icon-${entity.kind}`}
                    style={entity.color ? { color: entity.color } : undefined}
                  />
                  <span className="object-label">
                    {objectLabel(entity, names, t)}
                  </span>
                </button>
                {value && <span className="object-value">{value}</span>}
                <div className="object-actions">
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={t(entity.hidden ? "panel.show" : "panel.hide")}
                    aria-pressed={entity.hidden}
                    onClick={() => onToggleHidden(entity.id)}
                  >
                    {entity.hidden ? (
                      <EyeOff size={14} aria-hidden />
                    ) : (
                      <Eye size={14} aria-hidden />
                    )}
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={t("panel.delete")}
                    onClick={() => onDelete(entity.id)}
                  >
                    <Trash2 size={14} aria-hidden />
                  </button>
                </div>
                {selected && (
                  <div className="object-colors">
                    {PALETTE.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={
                          entity.color === color
                            ? "color-swatch active"
                            : "color-swatch"
                        }
                        style={{ background: color }}
                        aria-label={color}
                        aria-pressed={entity.color === color}
                        onClick={() => onSetColor(entity.id, color)}
                      />
                    ))}
                    <button
                      type="button"
                      className="color-swatch color-swatch-reset"
                      aria-label={t("panel.colorReset")}
                      aria-pressed={entity.color === null}
                      onClick={() => onSetColor(entity.id, null)}
                    >
                      ×
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {!collapsed && (
        <ExpressionInput
          construction={construction}
          onAdd={onAddAngleExpression}
        />
      )}
    </aside>
  );
}
