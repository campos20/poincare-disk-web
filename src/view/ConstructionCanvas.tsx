import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { findPointNear, SNAP_THRESHOLD } from '../engine'
import { useI18n } from '../i18n/context'
import type { AppAction, AppState } from './appState'
import { DISK_RADIUS } from './disk'
import type { Rect, XY } from './geometry'
import { renderEntity } from './renderEntity'

/** Smallest half-extent of the viewBox: the disk plus a little breathing room. */
const DISK_MARGIN = DISK_RADIUS + 10

/**
 * A viewBox centered on the origin matching the element's aspect ratio, so
 * the disk fills the short dimension on any screen with no letterboxing.
 */
function fitViewport(width: number, height: number): Rect {
  const aspect = width / height
  const halfW = aspect >= 1 ? DISK_MARGIN * aspect : DISK_MARGIN
  const halfH = aspect >= 1 ? DISK_MARGIN : DISK_MARGIN / aspect
  return { minX: -halfW, minY: -halfH, maxX: halfW, maxY: halfH }
}

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
  const { t } = useI18n()
  const { construction, toolState, dragId } = state
  const [viewport, setViewport] = useState<Rect>(() => fitViewport(4, 3))

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const update = () => {
      const { width, height } = svg.getBoundingClientRect()
      if (width > 0 && height > 0) setViewport(fitViewport(width, height))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(svg)
    return () => observer.disconnect()
  }, [])

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
  const opts = { viewport, highlighted, dragId }

  // Strokes first, points on top, so points stay grabbable.
  const entities = state.construction.order.map((id) => construction.entities[id])
  const strokes = entities.filter((ent) => ent.kind !== 'point')
  const points = entities.filter((ent) => ent.kind === 'point')

  return (
    <svg
      ref={svgRef}
      className={`construction-canvas ${toolState.tool === 'select' ? 'mode-select' : 'mode-build'}`}
      viewBox={`${viewport.minX} ${viewport.minY} ${viewport.maxX - viewport.minX} ${viewport.maxY - viewport.minY}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      role="application"
      aria-label={t('canvas.aria')}
    >
      {/* The Poincaré disk: the space itself. Outside it, nothing exists. */}
      <circle className="poincare-disk" cx={0} cy={0} r={DISK_RADIUS} />
      {strokes.map((ent) => renderEntity(construction, ent, opts))}
      {points.map((ent) => renderEntity(construction, ent, opts))}
    </svg>
  )
}
