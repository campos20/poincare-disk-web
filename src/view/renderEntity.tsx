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
import type { HyperbolicLine } from './hyperbolicFormulas'
import {
  hyperbolicCircleThroughPoints,
  hyperbolicLineThroughPoints,
  hyperbolicSegmentThroughPoints,
} from './hyperbolicFormulas'

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

/** SVG path `d` for a hyperbolic line/segment shape, scaled to screen space. */
function hyperbolicPath(shape: HyperbolicLine): string {
  const p1 = toScreen(shape.p1)
  const p2 = toScreen(shape.p2)
  if (shape.kind === 'diameter') return segmentShape(p1, p2)
  return `M ${p1.x} ${p1.y} A ${shape.r * DISK_RADIUS} ${shape.r * DISK_RADIUS} 0 ${
    shape.largeArc ? 1 : 0
  } ${shape.sweep ? 1 : 0} ${p2.x} ${p2.y}`
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
      // The formulas assume a true radius-1 disk, so these need the raw
      // model points, not screen-scaled ones — the resulting shape is
      // scaled to screen afterward instead.
      const a = getPoint(construction, entity.a)
      const b = getPoint(construction, entity.b)
      if (!a || !b) return null
      const shape = hyperbolicSegmentThroughPoints(a, b)
      if (!shape) return null
      return <path key={entity.id} className="ent-stroke" d={hyperbolicPath(shape)} />
    }
    case 'line': {
      const a = getPoint(construction, entity.a)
      const b = getPoint(construction, entity.b)
      if (!a || !b) return null
      const shape = hyperbolicLineThroughPoints(a, b)
      if (!shape) return null
      return <path key={entity.id} className="ent-stroke ent-line" d={hyperbolicPath(shape)} />
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
