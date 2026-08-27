import {
  Asterisk,
  ChevronLeft,
  ChevronRight,
  Circle,
  Dot,
  Eye,
  EyeOff,
  Minus,
  Slash,
  Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Construction, Entity, EntityId } from "../engine";
import { useI18n } from "../i18n/context";
import type { MessageKey } from "../i18n/messages";
import { definingPoints, pointNames } from "./naming";

const ICONS: Record<Entity["kind"], LucideIcon> = {
  point: Dot,
  intersection: Asterisk,
  segment: Minus,
  line: Slash,
  circle: Circle,
};

const KIND_LABEL: Record<Exclude<Entity["kind"], "point" | "intersection">, MessageKey> = {
  segment: "object.segment",
  line: "object.line",
  circle: "object.circle",
};

/** Swatches offered for object color; matches the app's existing accents. */
const PALETTE = ["#e8b45a", "#7fa7d4", "#6ee7b7", "#f4708a", "#c792ea", "#eaf1f8"] as const;

function objectLabel(
  entity: Entity,
  names: ReadonlyMap<EntityId, string>,
  t: (key: MessageKey) => string,
): string {
  const points = definingPoints(entity)
    .map((id) => names.get(id) ?? "?")
    .join("");
  return entity.kind === "point" || entity.kind === "intersection"
    ? points
    : `${t(KIND_LABEL[entity.kind])} ${points}`;
}

interface Props {
  readonly construction: Construction;
  readonly collapsed: boolean;
  readonly selectedId: EntityId | null;
  readonly onToggle: () => void;
  readonly onSelect: (id: EntityId) => void;
  readonly onSetColor: (id: EntityId, color: string | null) => void;
  readonly onToggleHidden: (id: EntityId) => void;
  readonly onDelete: (id: EntityId) => void;
}

export function ObjectPanel({
  construction,
  collapsed,
  selectedId,
  onToggle,
  onSelect,
  onSetColor,
  onToggleHidden,
  onDelete,
}: Props) {
  const { t } = useI18n();
  const names = pointNames(construction);
  const entities = construction.order.map((id) => construction.entities[id]);

  return (
    <aside className={collapsed ? "object-panel collapsed" : "object-panel"}>
      <div className="object-panel-header">
        {!collapsed && <span className="object-panel-title">{t("panel.title")}</span>}
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
          {entities.length === 0 && <li className="object-empty">{t("panel.empty")}</li>}
          {entities.map((entity) => {
            const Icon = ICONS[entity.kind];
            const selected = entity.id === selectedId;
            const vanished = entity.kind === "intersection" && !entity.exists;
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
                  onClick={() => onSelect(entity.id)}
                >
                  <Icon
                    size={14}
                    aria-hidden
                    className={`object-icon object-icon-${entity.kind}`}
                    style={entity.color ? { color: entity.color } : undefined}
                  />
                  <span className="object-label">{objectLabel(entity, names, t)}</span>
                </button>
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
                          entity.color === color ? "color-swatch active" : "color-swatch"
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
    </aside>
  );
}
