/**
 * Maps engine entities to SVG. All actual geometry lives in geometry.ts
 * (the SWAP POINT for the future Poincaré rendering); this file only picks
 * SVG elements and styling.
 */

import type { ReactNode } from 'react'
import { getPoint } from '../engine'
import type { Construction, Entity, EntityId } from '../engine'
import { circleShape, lineShape, segmentShape } from './geometry'
import type { Rect, XY } from './geometry'

export interface RenderOptions {
  readonly viewport: Rect
  /** Point ids buffered by the active tool (highlighted). */
  readonly highlighted: ReadonlySet<EntityId>
  /** Point currently being dragged. */
  readonly dragId: EntityId | null
}

function pointClass(id: EntityId, opts: RenderOptions): string {
  if (id === opts.dragId) return 'ent-point dragging'
  if (opts.highlighted.has(id)) return 'ent-point buffered'
  return 'ent-point'
}

/**
 * Render one entity from its referenced points' CURRENT coordinates.
 * Returns null when a reference is unresolvable or the shape is off-screen.
 */
export function renderEntity(
  construction: Construction,
  entity: Entity,
  opts: RenderOptions,
): ReactNode {
  const at = (id: EntityId): XY | null => getPoint(construction, id)

  switch (entity.kind) {
    case 'point':
      return (
        <circle
          key={entity.id}
          data-point-id={entity.id}
          className={pointClass(entity.id, opts)}
          cx={entity.x}
          cy={entity.y}
          r={5}
        />
      )
    case 'segment': {
      const a = at(entity.a)
      const b = at(entity.b)
      if (!a || !b) return null
      return <path key={entity.id} className="ent-stroke" d={segmentShape(a, b)} />
    }
    case 'line': {
      const a = at(entity.a)
      const b = at(entity.b)
      if (!a || !b) return null
      const d = lineShape(a, b, opts.viewport)
      if (!d) return null
      return <path key={entity.id} className="ent-stroke ent-line" d={d} />
    }
    case 'circle': {
      const center = at(entity.center)
      const thru = at(entity.thru)
      if (!center || !thru) return null
      const c = circleShape(center, thru)
      return (
        <circle key={entity.id} className="ent-stroke" cx={c.cx} cy={c.cy} r={c.r} />
      )
    }
  }
}
