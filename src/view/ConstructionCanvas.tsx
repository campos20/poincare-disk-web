import { useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { findPointNear, SNAP_THRESHOLD } from '../engine'
import type { AppAction, AppState } from './appState'
import type { Rect, XY } from './geometry'
import { renderEntity } from './renderEntity'

/** Fixed viewBox centered at the origin — a friendly frame for the future unit disk. */
const VIEWPORT: Rect = { minX: -400, minY: -300, maxX: 400, maxY: 300 }

interface Props {
  readonly state: AppState
  readonly dispatch: (action: AppAction) => void
}

/** Screen (client) coords → svg user coords, respecting viewBox scaling. */
function toSvgCoords(svg: SVGSVGElement, clientX: number, clientY: number): XY | null {
  const ctm = svg.getScreenCTM()
  if (!ctm) return null
  const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse())
  return { x: p.x, y: p.y }
}

export function ConstructionCanvas({ state, dispatch }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const { construction, toolState, dragId } = state

  const eventCoords = (e: ReactPointerEvent<SVGSVGElement>): XY | null => {
    const svg = svgRef.current
    return svg ? toSvgCoords(svg, e.clientX, e.clientY) : null
  }

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    const pt = eventCoords(e)
    if (!pt) return
    if (toolState.tool === 'select') {
      const id = findPointNear(construction, pt.x, pt.y, SNAP_THRESHOLD)
      if (id !== null) {
        e.currentTarget.setPointerCapture(e.pointerId)
        dispatch({ type: 'dragStart', id })
      }
    } else {
      dispatch({ type: 'canvasClick', x: pt.x, y: pt.y })
    }
  }

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (dragId === null) return
    const pt = eventCoords(e)
    if (pt) dispatch({ type: 'dragMove', x: pt.x, y: pt.y })
  }

  const endDrag = () => {
    if (dragId !== null) dispatch({ type: 'dragEnd' })
  }

  const highlighted = new Set(toolState.buffer)
  const opts = { viewport: VIEWPORT, highlighted, dragId }

  // Strokes first, points on top, so points stay grabbable.
  const entities = state.construction.order.map((id) => construction.entities[id])
  const strokes = entities.filter((ent) => ent.kind !== 'point')
  const points = entities.filter((ent) => ent.kind === 'point')

  return (
    <svg
      ref={svgRef}
      className={`construction-canvas ${toolState.tool === 'select' ? 'mode-select' : 'mode-build'}`}
      viewBox={`${VIEWPORT.minX} ${VIEWPORT.minY} ${VIEWPORT.maxX - VIEWPORT.minX} ${VIEWPORT.maxY - VIEWPORT.minY}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      role="application"
      aria-label="Construction canvas"
    >
      {strokes.map((ent) => renderEntity(construction, ent, opts))}
      {points.map((ent) => renderEntity(construction, ent, opts))}
    </svg>
  )
}
