/* eslint-disable react-hooks/refs, react-hooks/immutability */

import type { RefObject } from 'react'

import { CanvasHud } from '@/app/canvas/CanvasHud'
import { CanvasOverlay } from '@/app/canvas/CanvasOverlay'

import type { DragState, PathCommand, ViewBox } from '@/editor/types'
import { formatNumber, type Bounds } from '@/editor/utils'

export function EditorCanvas(props: {
  svgRef: RefObject<SVGSVGElement | null>
  svgContentRef: RefObject<SVGGElement | null>

  sourceSvgPresent: boolean

  zoomPercent: number
  selectedCount: number
  cursorPoint: { x: number; y: number } | null
  onZoomIn: () => void
  onZoomOut: () => void
  onSetZoomPercent: (percent: number) => void

  currentViewBox: ViewBox

  // Canvas event helpers
  zoomAt: (event: WheelEvent, getPoint: (event: MouseEvent) => DOMPoint | null) => void
  getEditorPointFromEvent: (event: MouseEvent) => DOMPoint | null
  getLocalPointFromEvent: (event: MouseEvent) => DOMPoint | null

  // Editor state for interaction
  drawTool: 'select' | 'pen' | 'rect'
  selectionToolActive: boolean
  penDraftPoints: Array<{ x: number; y: number }>
  getPenDraftPoints: () => Array<{ x: number; y: number }>
  rectDraft: null | { start: { x: number; y: number }; current: { x: number; y: number } }
  pan: { active: boolean; start: null | { client: { x: number; y: number }; unitsPerPx: { x: number; y: number }; viewBox: ViewBox } }
  drag: { active: boolean }
  selectionBox: { active: boolean; start: { x: number; y: number } | null; current: { x: number; y: number } | null }

  setStatus: (value: string) => void
  setPenDraftPoints: (points: Array<{ x: number; y: number }>) => void
  setRectDraft: (draft: null | { start: { x: number; y: number }; current: { x: number; y: number } }) => void
  setSelectionBox: (next: { active: boolean; start: { x: number; y: number } | null; current: { x: number; y: number } | null }) => void
  setPan: (next: { active: boolean; start: null | { client: { x: number; y: number }; unitsPerPx: { x: number; y: number }; viewBox: ViewBox } }) => void
  setViewBoxCoalesced: (vb: ViewBox) => void
  setCursorPointCoalesced: (p: { x: number; y: number } | null) => void

  perfCounters: {
    panMoves: () => void
    boxMoves: () => void
    dragMoves: () => void
  }
  moveSelectedPoints: (p: DOMPoint, selectedIndicesSet: Set<number>) => void
  selectedIndicesSet: Set<number>
  selectedIndices: number[]

  // Overlay render props
  gridPattern: null | { size: number; majorSize: number; stroke: string; majorStroke: string }
  previewInnerHtml: string
  commands: PathCommand[]
  segments: Array<{ fromIndex: number; toIndex: number; insertIndex: number }>
  selectionRect: null | { x: number; y: number; width: number; height: number }
  matrix: DOMMatrix | null
  scale: number
  handleScale: number
  pointRadiusBase: number
  nodesVisible: boolean
  uiOverlayStrokeWidthScale: number
  uiOutlineStroke: string
  uiOutlineDash: string
  uiSegmentStroke: string
  uiSelectionStroke: string
  uiSelectionFill: string
  uiSelectionFillOpacity: number
  uiSelectionDash: string
  transformedOutlineD: string

  addPoint: (insertIndex: number, x: number, y: number) => void
  selectOnlyPoint: (index: number) => void
  togglePointSelection: (index: number) => void
  selectRangeToIndex: (index: number) => void
  openPointEditorForIndex: (index: number) => void
  copySelectedSection: () => void
  pasteSectionAfterSelected: () => void
  extractSelectionToNewPath: () => void
  transformSelectedNodes: (transformer: (x: number, y: number, bounds: Bounds) => { x: number; y: number }, label: string) => void
  deleteSelectedPoints: () => void
  setDrag: (next: DragState) => void
}) {
  return (
    <main
      className="relative min-h-0 flex-1 overflow-hidden min-w-0"
      style={{
        backgroundColor: 'hsl(var(--canvas-bg))',
        backgroundImage:
          'linear-gradient(45deg, var(--canvas-checker-a) 25%, transparent 25%),\nlinear-gradient(-45deg, var(--canvas-checker-a) 25%, transparent 25%),\nlinear-gradient(45deg, transparent 75%, var(--canvas-checker-b) 75%),\nlinear-gradient(-45deg, transparent 75%, var(--canvas-checker-b) 75%)',
        backgroundSize: '20px 20px',
        backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0',
      }}
    >
      <CanvasHud
        zoomPercent={props.zoomPercent}
        selectedCount={props.selectedCount}
        cursorText={props.cursorPoint ? `x ${formatNumber(props.cursorPoint.x)}  y ${formatNumber(props.cursorPoint.y)}` : 'x -  y -'}
        onZoomIn={props.onZoomIn}
        onZoomOut={props.onZoomOut}
        onSetZoomPercent={props.onSetZoomPercent}
        disabled={!props.sourceSvgPresent}
      />

      <svg
        ref={props.svgRef}
        id="editorSvg"
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`${props.currentViewBox.x} ${props.currentViewBox.y} ${props.currentViewBox.width} ${props.currentViewBox.height}`}
        onWheel={(e) => props.zoomAt(e.nativeEvent, props.getEditorPointFromEvent)}
        onMouseDown={(e) => {
          if (e.button !== 0) return
          const svg = props.svgRef.current
          if (!svg) return

          if (props.drawTool === 'pen') {
            const p = props.getEditorPointFromEvent(e.nativeEvent)
            if (!p) return
            e.preventDefault()
            props.setPenDraftPoints(props.getPenDraftPoints().concat([{ x: p.x, y: p.y }]))
            props.setStatus('Pen: click to add points, Finish to commit.')
            return
          }

          if (props.drawTool === 'rect') {
            const p = props.getEditorPointFromEvent(e.nativeEvent)
            if (!p) return
            e.preventDefault()
            props.setRectDraft({ start: { x: p.x, y: p.y }, current: { x: p.x, y: p.y } })
            props.setStatus('Rect: drag to size, release to commit.')
            return
          }

          if (e.shiftKey || props.selectionToolActive) {
            const start = props.getEditorPointFromEvent(e.nativeEvent)
            if (!start) return
            e.preventDefault()
            props.setSelectionBox({ active: true, start, current: { ...start } })
            return
          }

          const target = e.target as Element
          const clickedInsideSvgContent = !!target.closest('#svgContent')
          const clickedEmpty = target === svg
          const clickedCanvasTarget = (target as SVGElement | null)?.id === 'svgContextTarget' || !!target.closest('#svgContextTarget')
          const clickedOverlay = target instanceof SVGPathElement && target.id === 'editOutline'
          if (!clickedEmpty && !clickedCanvasTarget && !clickedInsideSvgContent && !clickedOverlay) return

          e.preventDefault()

          const start = props.getEditorPointFromEvent(e.nativeEvent)
          if (!start) return
          props.setPan({
            active: true,
            start: {
              client: { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY },
              unitsPerPx: {
                x: props.currentViewBox.width / Math.max(1, svg.clientWidth),
                y: props.currentViewBox.height / Math.max(1, svg.clientHeight),
              },
              viewBox: { ...props.currentViewBox },
            },
          })
          svg.style.cursor = 'grabbing'
        }}
        onMouseMove={(e) => {
          if (props.pan.active && props.pan.start) {
            props.perfCounters.panMoves()
            const dxPx = props.pan.start.client.x - e.nativeEvent.clientX
            const dyPx = props.pan.start.client.y - e.nativeEvent.clientY
            const dx = dxPx * props.pan.start.unitsPerPx.x
            const dy = dyPx * props.pan.start.unitsPerPx.y
            props.setViewBoxCoalesced({
              x: props.pan.start.viewBox.x + dx,
              y: props.pan.start.viewBox.y + dy,
              width: props.pan.start.viewBox.width,
              height: props.pan.start.viewBox.height,
            })
            return
          }

          const cursor = props.getEditorPointFromEvent(e.nativeEvent)
          if (!cursor) return
          props.setCursorPointCoalesced({ x: cursor.x, y: cursor.y })

          if (props.drawTool === 'rect' && props.rectDraft) {
            props.setRectDraft({ ...props.rectDraft, current: { x: cursor.x, y: cursor.y } })
            return
          }

          if (props.selectionBox.active && props.selectionBox.start) {
            props.perfCounters.boxMoves()
            props.setSelectionBox({ ...props.selectionBox, current: cursor })
            return
          }

          if (props.drag.active) {
            props.perfCounters.dragMoves()
            const p = props.getLocalPointFromEvent(e.nativeEvent)
            if (!p) return
            props.moveSelectedPoints(p, props.selectedIndicesSet)
          }
        }}
        onMouseLeave={() => props.setCursorPointCoalesced(null)}
      >
        <CanvasOverlay
          viewBox={props.currentViewBox}
          gridPattern={props.gridPattern}
          previewInnerHtml={props.previewInnerHtml}
          svgContentRef={props.svgContentRef}
          selectedCount={props.selectedCount}
          selectedIndices={props.selectedIndices}
          commands={props.commands}
          segments={props.segments}
          selectionRect={props.selectionRect}
          matrix={props.matrix}
          scale={props.scale}
          handleScale={props.handleScale}
          pointRadiusBase={props.pointRadiusBase}
          drawTool={props.drawTool}
          penDraftPoints={props.penDraftPoints}
          rectDraft={props.rectDraft}
          nodesVisible={props.nodesVisible}
          uiOverlayStrokeWidthScale={props.uiOverlayStrokeWidthScale}
          uiOutlineStroke={props.uiOutlineStroke}
          uiOutlineDash={props.uiOutlineDash}
          uiSegmentStroke={props.uiSegmentStroke}
          uiSelectionStroke={props.uiSelectionStroke}
          uiSelectionFill={props.uiSelectionFill}
          uiSelectionFillOpacity={props.uiSelectionFillOpacity}
          uiSelectionDash={props.uiSelectionDash}
          transformedOutlineD={props.transformedOutlineD}
          addPoint={props.addPoint}
          selectOnlyPoint={props.selectOnlyPoint}
          togglePointSelection={props.togglePointSelection}
          selectRangeToIndex={props.selectRangeToIndex}
          openPointEditorForIndex={props.openPointEditorForIndex}
          copySelectedSection={props.copySelectedSection}
          pasteSectionAfterSelected={props.pasteSectionAfterSelected}
          extractSelectionToNewPath={props.extractSelectionToNewPath}
          transformSelectedNodes={props.transformSelectedNodes}
          deleteSelectedPoints={props.deleteSelectedPoints}
          setDrag={props.setDrag}
          getLocalPointFromEvent={props.getLocalPointFromEvent}
        />
      </svg>
    </main>
  )
}
