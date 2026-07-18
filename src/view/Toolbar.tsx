import { Circle, Dot, Minus, MousePointer2, Slash } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { TOOL_ORDER } from "../engine";
import type { ToolId } from "../engine";
import { useI18n } from "../i18n/context";

const ICONS: Record<ToolId, LucideIcon> = {
  select: MousePointer2,
  point: Dot,
  segment: Minus,
  line: Slash,
  circle: Circle,
};

interface Props {
  readonly active: ToolId;
  readonly onSelect: (tool: ToolId) => void;
}

export function Toolbar({ active, onSelect }: Props) {
  const { t } = useI18n();

  return (
    <div className="toolbar" role="toolbar" aria-label={t("toolbar.aria")}>
      {TOOL_ORDER.map((id) => {
        const Icon = ICONS[id];
        return (
          <button
            key={id}
            type="button"
            className={id === active ? "tool-button active" : "tool-button"}
            aria-pressed={id === active}
            onClick={() => onSelect(id)}
          >
            <Icon size={16} aria-hidden />
            <span>{t(`tool.${id}`)}</span>
          </button>
        );
      })}
    </div>
  );
}
