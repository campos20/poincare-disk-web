import { useEffect, useRef, useState } from "react";
import {
  Angle,
  ChevronDown,
  Circle,
  Diamond,
  Dot,
  Minus,
  MousePointer2,
  Slash,
  SquaresIntersect,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ToolId } from "../engine";
import { useI18n } from "../i18n/context";
import type { MessageKey } from "../i18n/messages";

const ICONS: Record<ToolId, LucideIcon> = {
  select: MousePointer2,
  point: Dot,
  intersect: SquaresIntersect,
  midpoint: Diamond,
  segment: Minus,
  line: Slash,
  circle: Circle,
  angle: Angle,
};

interface ToolGroup {
  /** Message key naming the group — also its button's label/tooltip. */
  readonly label: MessageKey;
  readonly tools: readonly ToolId[];
}

// 'select' isn't a drawing tool, so it stays its own top-level button rather
// than joining a group. Every drawing tool lives in a named group — even
// 'circle' alone — so every group gets the same open-a-submenu affordance.
const GROUPS: readonly ToolGroup[] = [
  { label: "tool.point", tools: ["point", "midpoint", "intersect"] },
  { label: "tool.line", tools: ["segment", "line"] },
  { label: "tool.circle", tools: ["circle"] },
  { label: "tool.angle", tools: ["angle"] },
];

function ToolIcon({ id }: { readonly id: ToolId }) {
  const Icon = ICONS[id];
  return <Icon size={16} aria-hidden />;
}

interface Props {
  readonly active: ToolId;
  readonly onSelect: (tool: ToolId) => void;
}

export function Toolbar({ active, onSelect }: Props) {
  const { t } = useI18n();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [openGroup, setOpenGroup] = useState<number | null>(null);
  // Remembers the last tool picked from each group, so the group's button
  // keeps showing that choice instead of resetting to the group's first
  // tool once you switch to a different group.
  const [lastPicked, setLastPicked] = useState<readonly ToolId[]>(() =>
    GROUPS.map((group) => group.tools[0]),
  );

  useEffect(() => {
    if (openGroup === null) return;
    const closeIfOutside = (e: PointerEvent) => {
      const target = e.target;
      if (
        rootRef.current &&
        target instanceof Node &&
        !rootRef.current.contains(target)
      ) {
        setOpenGroup(null);
      }
    };
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenGroup(null);
    };
    document.addEventListener("pointerdown", closeIfOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeIfOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [openGroup]);

  const pick = (groupIndex: number, tool: ToolId) => {
    setLastPicked((prev) =>
      prev.map((id, i) => (i === groupIndex ? tool : id)),
    );
    setOpenGroup(null);
    onSelect(tool);
  };

  return (
    <div
      className="toolbar"
      role="toolbar"
      aria-label={t("toolbar.aria")}
      ref={rootRef}
    >
      <button
        type="button"
        className={active === "select" ? "tool-button active" : "tool-button"}
        aria-pressed={active === "select"}
        aria-label={t("tool.select")}
        title={t("tool.select")}
        onClick={() => {
          setOpenGroup(null);
          onSelect("select");
        }}
      >
        <ToolIcon id="select" />
        <span>{t("tool.select")}</span>
      </button>

      {GROUPS.map((group, i) => {
        const activeInGroup = group.tools.includes(active) ? active : null;
        const shown = activeInGroup ?? lastPicked[i];
        const isOpen = openGroup === i;
        const groupLabel = t(group.label);
        return (
          <div className="tool-group" key={group.label}>
            <button
              type="button"
              className={activeInGroup ? "tool-button active" : "tool-button"}
              aria-haspopup="menu"
              aria-expanded={isOpen}
              aria-label={groupLabel}
              title={groupLabel}
              onClick={() => {
                if (!activeInGroup) {
                  // No tool from this group is active yet: clicking the
                  // group button both opens it and pre-selects the last
                  // tool picked from it.
                  pick(i, lastPicked[i]);
                } else {
                  // A tool from this group is already active — just
                  // toggle the dropdown. Switching tools here (even to
                  // itself) would clear any in-progress buffer, e.g.
                  // losing a midpoint's first-clicked point just from
                  // opening the menu to see the other options.
                  setOpenGroup(isOpen ? null : i);
                }
              }}
            >
              <ToolIcon id={shown} />
              <span>{t(`tool.${shown}`)}</span>
              <ChevronDown className="tool-group-caret" size={12} aria-hidden />
            </button>
            {isOpen && (
              <div className="tool-menu" role="menu" aria-label={groupLabel}>
                {group.tools.map((id) => {
                  const label = t(`tool.${id}`);
                  return (
                    <button
                      key={id}
                      type="button"
                      role="menuitem"
                      className={
                        id === active
                          ? "tool-menu-item active"
                          : "tool-menu-item"
                      }
                      aria-pressed={id === active}
                      onClick={() => pick(i, id)}
                    >
                      <ToolIcon id={id} />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
