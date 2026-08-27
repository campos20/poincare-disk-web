import { ChevronLeft, ChevronRight, Circle, Dot, Minus, Slash } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Construction, Entity, EntityId } from "../engine";
import { useI18n } from "../i18n/context";
import type { MessageKey } from "../i18n/messages";
import { definingPoints, pointNames } from "./naming";

const ICONS: Record<Entity["kind"], LucideIcon> = {
  point: Dot,
  segment: Minus,
  line: Slash,
  circle: Circle,
};

const KIND_LABEL: Record<Exclude<Entity["kind"], "point">, MessageKey> = {
  segment: "object.segment",
  line: "object.line",
  circle: "object.circle",
};

function objectLabel(
  entity: Entity,
  names: ReadonlyMap<EntityId, string>,
  t: (key: MessageKey) => string,
): string {
  const points = definingPoints(entity)
    .map((id) => names.get(id) ?? "?")
    .join("");
  return entity.kind === "point" ? points : `${t(KIND_LABEL[entity.kind])} ${points}`;
}

interface Props {
  readonly construction: Construction;
  readonly collapsed: boolean;
  readonly onToggle: () => void;
}

export function ObjectPanel({ construction, collapsed, onToggle }: Props) {
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
            return (
              <li key={entity.id} className="object-item">
                <Icon size={14} aria-hidden className={`object-icon object-icon-${entity.kind}`} />
                <span>{objectLabel(entity, names, t)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
