/**
 * Maps engine entities to SVG. All actual geometry lives in geometry.ts
 * (the SWAP POINT for the future Poincaré rendering); this file only picks
 * SVG elements and styling.
 */

import type { ReactNode } from 'react'
import { getPoint } from '../engine'
import type { Construction, Entity, EntityId } from '../engine'
import { DISK_RADIUS, toScreen } from './disk'
import { segmentShape } from './geometry'
import type { XY } from './geometry'
import { hyperbolicCircleThroughPoints, hyperbolicLineThroughPoints } from './hyperbolicFormulas'

export interface RenderOptions {
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
  // Points are stored in unit-disk model coordinates; screen space is a
  // view-only concern, so every point is converted here before it reaches
  // an SVG attribute or a geometry.ts function (which stay in screen space).
  const at = (id: EntityId): XY | null => {
    const p = getPoint(construction, id)
    return p ? toScreen(p) : null
  }

  switch (entity.kind) {
    case 'point': {
      const p = toScreen(entity)
      return (
        <circle
          key={entity.id}
          data-point-id={entity.id}
          className={pointClass(entity.id, opts)}
          cx={p.x}
          cy={p.y}
          r={5}
        />
      )
    }
    case 'segment': {
      const a = at(entity.a)
      const b = at(entity.b)
      if (!a || !b) return null
      return <path key={entity.id} className="ent-stroke" d={segmentShape(a, b)} />
    }
    case 'line': {
      // Orthogonality to the unit circle is baked into the formula, so this
      // one needs the raw model points, not the screen-scaled ones `at`
      // gives everything else — the shape it returns is scaled to screen
      // afterward instead.
      const a = getPoint(construction, entity.a)
      const b = getPoint(construction, entity.b)
      if (!a || !b) return null
      const shape = hyperbolicLineThroughPoints(a, b)
      if (!shape) return null
      const p1 = toScreen(shape.p1)
      const p2 = toScreen(shape.p2)
      const d =
        shape.kind === 'diameter'
          ? segmentShape(p1, p2)
          : `M ${p1.x} ${p1.y} A ${shape.r * DISK_RADIUS} ${shape.r * DISK_RADIUS} 0 ${
              shape.largeArc ? 1 : 0
            } ${shape.sweep ? 1 : 0} ${p2.x} ${p2.y}`
      return <path key={entity.id} className="ent-stroke ent-line" d={d} />
    }
    case 'circle': {
      // Like the line case, the formula assumes a true radius-1 disk, so it
      // needs the raw model points; the resulting shape is scaled to screen
      // afterward.
      const center = getPoint(construction, entity.center)
      const thru = getPoint(construction, entity.thru)
      if (!center || !thru) return null
      const shape = hyperbolicCircleThroughPoints(center, thru)
      const c = toScreen({ x: shape.cx, y: shape.cy })
      return (
        <circle key={entity.id} className="ent-stroke" cx={c.x} cy={c.y} r={shape.r * DISK_RADIUS} />
      )
    }
  }
}
