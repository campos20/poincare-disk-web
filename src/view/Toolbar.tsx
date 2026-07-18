import { Circle, Dot, Minus, MousePointer2, Slash } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { TOOL_ORDER, TOOLS } from '../engine'
import type { ToolId } from '../engine'

const ICONS: Record<ToolId, LucideIcon> = {
  select: MousePointer2,
  point: Dot,
  segment: Minus,
  line: Slash,
  circle: Circle,
}

interface Props {
  readonly active: ToolId
  readonly onSelect: (tool: ToolId) => void
}

export function Toolbar({ active, onSelect }: Props) {
  return (
    <div className="toolbar" role="toolbar" aria-label="Construction tools">
      {TOOL_ORDER.map((id) => {
        const Icon = ICONS[id]
        return (
          <button
            key={id}
            type="button"
            className={id === active ? 'tool-button active' : 'tool-button'}
            aria-pressed={id === active}
            onClick={() => onSelect(id)}
          >
            <Icon size={16} aria-hidden />
            <span>{TOOLS[id].label}</span>
          </button>
        )
      })}
    </div>
  )
}
