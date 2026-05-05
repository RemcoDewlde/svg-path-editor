import { useMemo, type RefObject } from 'react'
import { useShallow } from 'zustand/react/shallow'

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import type { PathCommand } from '@/editor/types'
import { buildTransformedPathD, getSegments, transformPoint, type Bounds } from '@/editor/utils'
import { NodeContextMenu } from '@/app/menus/NodeContextMenu'
import { useEditorStore } from '@/editor/store'

type GridPattern = {
  size: number
  majorSize: number
  stroke: string
  majorStroke: string
}

type SelectionRect = { x: number; y: number; width: number; height: number } | null

type RectDraft = null | { start: { x: number; y: number }; current: { x: number; y: number } }

type ViewBox = { x: number; y: number; width: number; height: number }

type CanvasOverlayProps = {
  viewBox: ViewBox
  gridPattern: GridPattern | null
  previewInnerHtml: string
  svgContentRef: RefObject<SVGGElement | null>
  selectionRect: SelectionRect
  matrix: DOMMatrix | null
  scale: number
  handleScale: number
  pointRadiusBase: number
  drawTool: 'select' | 'pen' | 'rect'
  penDraftPoints: Array<{ x: number; y: number }>
  rectDraft: RectDraft
  nodesVisible: boolean
  uiOverlayStrokeWidthScale: number
  uiOutlineStroke: string
  uiOutlineDash: string
  uiSegmentStroke: string
  uiSelectionStroke: string
  uiSelectionFill: string
  uiSelectionFillOpacity: number
  uiSelectionDash: string
  addPoint: (insertIndex: number, x: number, y: number) => void
  selectOnlyPoint: (index: number) => void
  togglePointSelection: (index: number) => void
  selectRangeToIndex: (index: number) => void
  openPointEditorForIndex: (index: number) => void
  copySelectedSection: () => void
  pasteSectionAfterSelected: () => void
  extractSelectionToNewPath: (opts?: { ownLayer?: boolean }) => void
  transformSelectedNodes: (transformer: (x: number, y: number, bounds: Bounds) => { x: number; y: number }, label: string) => void
  deleteSelectedPoints: () => void
  setDrag: (value: {
    active: boolean
    startLocal: DOMPoint | null
    originalCommands: PathCommand[] | null
    hasHistory?: boolean
  }) => void
  getLocalPointFromEvent: (event: MouseEvent) => DOMPoint | null
}

export function CanvasOverlay(props: CanvasOverlayProps) {
  const {
    viewBox,
    gridPattern,
    previewInnerHtml,
    svgContentRef,
    selectionRect,
    matrix,
    scale,
    handleScale,
    pointRadiusBase,
    drawTool,
    penDraftPoints,
    rectDraft,
    nodesVisible,
    uiOverlayStrokeWidthScale,
    uiOutlineStroke,
    uiOutlineDash,
    uiSegmentStroke,
    uiSelectionStroke,
    uiSelectionFill,
    uiSelectionFillOpacity,
    uiSelectionDash,
    addPoint,
    selectOnlyPoint,
    togglePointSelection,
    selectRangeToIndex,
    openPointEditorForIndex,
    copySelectedSection,
    pasteSectionAfterSelected,
    extractSelectionToNewPath,
    transformSelectedNodes,
    deleteSelectedPoints,
    setDrag,
    getLocalPointFromEvent,
  } = props

  // Fix A/B/C: Subscribe to commands + selectedIndices directly from store so
  // CanvasOverlay re-renders when they change, but App does not.
  const { commands, selectedIndices } = useEditorStore(
    useShallow((s) => ({ commands: s.commands, selectedIndices: s.selectedIndices })),
  )

  const selectedIndicesSet = useMemo(() => new Set(selectedIndices), [selectedIndices])
  const selectedCount = selectedIndices.length
  const segments = useMemo(() => getSegments(commands), [commands])
  const transformedOutlineD = useMemo(() => buildTransformedPathD(commands, matrix, null), [commands, matrix])

  return (
    <>
      {gridPattern ? (
        <defs>
          <pattern id="gridMinor" patternUnits="userSpaceOnUse" width={gridPattern.size} height={gridPattern.size}>
            <path
              d={`M ${gridPattern.size} 0 L 0 0 0 ${gridPattern.size}`}
              fill="none"
              stroke={gridPattern.stroke}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          </pattern>
          <pattern id="gridMajor" patternUnits="userSpaceOnUse" width={gridPattern.majorSize} height={gridPattern.majorSize}>
            <rect width={gridPattern.majorSize} height={gridPattern.majorSize} fill="url(#gridMinor)" />
            <path
              d={`M ${gridPattern.majorSize} 0 L 0 0 0 ${gridPattern.majorSize}`}
              fill="none"
              stroke={gridPattern.majorStroke}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          </pattern>
        </defs>
      ) : null}

      <ContextMenu>
        <ContextMenuTrigger asChild>
          <rect
            id="svgContextTarget"
            x={viewBox.x}
            y={viewBox.y}
            width={viewBox.width}
            height={viewBox.height}
            fill="transparent"
            pointerEvents="all"
          />
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem disabled={!selectedCount} onSelect={() => extractSelectionToNewPath({ ownLayer: true })}>
            Extract selection to own layer
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {gridPattern ? (
        <rect x={viewBox.x} y={viewBox.y} width={viewBox.width} height={viewBox.height} fill="url(#gridMajor)" pointerEvents="none" />
      ) : null}

      <g id="svgContent" ref={svgContentRef} style={{ pointerEvents: 'none' }} dangerouslySetInnerHTML={{ __html: previewInnerHtml }} />

      <g id="editorOverlay">
        <path
          id="editOutline"
          className="edit-outline"
          d={transformedOutlineD}
          strokeWidth={1.5 * scale * uiOverlayStrokeWidthScale}
          style={{ stroke: uiOutlineStroke, strokeDasharray: uiOutlineDash }}
        />

        {drawTool === 'pen' && penDraftPoints.length ? (
          <path
            className="edit-outline"
            d={penDraftPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
            strokeWidth={1.5 * handleScale * uiOverlayStrokeWidthScale}
            style={{ stroke: uiOutlineStroke, strokeDasharray: uiOutlineDash }}
          />
        ) : null}

        {drawTool === 'rect' && rectDraft
          ? (() => {
              const x1 = rectDraft.start.x
              const y1 = rectDraft.start.y
              const x2 = rectDraft.current.x
              const y2 = rectDraft.current.y
              const minX = Math.min(x1, x2)
              const minY = Math.min(y1, y2)
              const maxX = Math.max(x1, x2)
              const maxY = Math.max(y1, y2)
              const d = `M ${minX} ${minY} L ${maxX} ${minY} L ${maxX} ${maxY} L ${minX} ${maxY} Z`
              return (
                <path
                  className="edit-outline"
                  d={d}
                  strokeWidth={1.5 * handleScale * uiOverlayStrokeWidthScale}
                  style={{ stroke: uiOutlineStroke, strokeDasharray: uiOutlineDash }}
                />
              )
            })()
          : null}

        <g id="segments">
          {segments.map((seg, idx) => {
            const from = commands[seg.fromIndex]
            const to = commands[seg.toIndex]
            if (!from || !to || from.type === 'Z' || to.type === 'Z') return null
            const p1 = transformPoint(matrix, from.x, from.y, null)
            const p2 = transformPoint(matrix, to.x, to.y, null)
            const d = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`
            return (
              <g key={idx}>
                <path
                  d={d}
                  className="segment-hit"
                  strokeWidth={14 * scale}
                  onMouseDown={(ev) => {
                    ev.preventDefault()
                    ev.stopPropagation()
                  }}
                  onClick={(ev) => {
                    ev.preventDefault()
                    ev.stopPropagation()
                    const pt = getLocalPointFromEvent(ev.nativeEvent)
                    if (!pt) return
                    addPoint(seg.insertIndex, pt.x, pt.y)
                  }}
                />
                <path d={d} className="segment-visible" strokeWidth={1 * scale * uiOverlayStrokeWidthScale} style={{ stroke: uiSegmentStroke }} />
              </g>
            )
          })}
        </g>

        {selectionRect ? (
          <rect
            className="selection-box"
            x={selectionRect.x}
            y={selectionRect.y}
            width={selectionRect.width}
            height={selectionRect.height}
            strokeWidth={1 * handleScale * uiOverlayStrokeWidthScale}
            style={{
              stroke: uiSelectionStroke,
              strokeDasharray: uiSelectionDash,
              fill: uiSelectionFill,
              fillOpacity: uiSelectionFillOpacity,
            }}
          />
        ) : null}

        {nodesVisible ? (
          <g id="points">
            {commands.map((cmd, index) => {
              if (cmd.type === 'Z') return null

              // Cull in overlay coordinate space (the space where circles are
              // actually rendered). transformPoint applies the render matrix, so
              // the result is in the same space as currentViewBox.
              const p = transformPoint(matrix, cmd.x, cmd.y, null)
              const margin = 20
              if (
                p.x < viewBox.x - margin ||
                p.x > viewBox.x + viewBox.width + margin ||
                p.y < viewBox.y - margin ||
                p.y > viewBox.y + viewBox.height + margin
              ) {
                return null
              }

              const selected = selectedIndicesSet.has(index)
              return (
                <NodeContextMenu
                  key={index}
                  index={index}
                  disableSelectNode={selectedIndices.length === 1 && selectedIndicesSet.has(index)}
                  onSelectOnlyPoint={selectOnlyPoint}
                  onTogglePointSelection={togglePointSelection}
                  onSelectRangeToIndex={selectRangeToIndex}
                  onOpenPointEditor={openPointEditorForIndex}
                  onCopySelectedSection={copySelectedSection}
                  onPasteSectionAfterSelected={pasteSectionAfterSelected}
                  onExtractSelectionToNewPath={extractSelectionToNewPath}
                  onTransformSelectedNodes={transformSelectedNodes}
                  onDeleteSelectedPoints={deleteSelectedPoints}
                >
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={pointRadiusBase * scale}
                    className={selected ? 'point selected' : 'point'}
                    onMouseDown={(ev) => {
                      // Right-click selects, but doesn't start drag.
                      if (ev.button === 2) {
                        ev.preventDefault()
                        ev.stopPropagation()
                        if (ev.shiftKey) togglePointSelection(index)
                        else if (!selectedIndicesSet.has(index)) selectOnlyPoint(index)
                        return
                      }

                      // Alt+click: open node context menu.
                      if (ev.button === 0 && ev.altKey) {
                        ev.preventDefault()
                        ev.stopPropagation()
                        if (ev.shiftKey) togglePointSelection(index)
                        else if (!selectedIndicesSet.has(index)) selectOnlyPoint(index)

                        // Radix ContextMenu opens on the `contextmenu` event.
                        ev.currentTarget.dispatchEvent(
                          new MouseEvent('contextmenu', {
                            bubbles: true,
                            cancelable: true,
                            clientX: ev.nativeEvent.clientX,
                            clientY: ev.nativeEvent.clientY,
                            button: 2,
                          }),
                        )
                        return
                      }

                      // Only handle left-button drag here.
                      if (ev.button !== 0) return
                      ev.preventDefault()
                      ev.stopPropagation()
                      if (ev.shiftKey) {
                        togglePointSelection(index)
                        return
                      }
                      if (!selectedIndicesSet.has(index)) selectOnlyPoint(index)
                      const local = getLocalPointFromEvent(ev.nativeEvent)
                      if (!local) return
                      setDrag({
                        active: true,
                        startLocal: local,
                        originalCommands: commands.map((c) => ({ ...c })) as PathCommand[],
                        hasHistory: false,
                      })
                    }}
                    onDoubleClick={(ev) => {
                      ev.preventDefault()
                      ev.stopPropagation()
                      selectRangeToIndex(index)
                    }}
                  />
                </NodeContextMenu>
              )
            })}
          </g>
        ) : null}
      </g>
    </>
  )
}
