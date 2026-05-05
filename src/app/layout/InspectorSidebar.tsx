import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

import type { PathCommand } from '@/editor/types'
import { flipBothTransformer, rotateTransformer, type Bounds } from '@/editor/utils'
import { useEditorStore } from '@/editor/store'

import { LayoutPanelLeft, Grip, Trash2, X, RotateCcw, RotateCw, Repeat2, Scissors } from 'lucide-react'

import { InspectorPanel } from '@/app/panels/InspectorPanel'
import { ColorPickerPopover } from '@/app/panels/ColorPicker'
import { DrawToolToggle } from '@/app/panels/DrawToolToggle'
import { normalizeCssColorToHex, normalizeHex6 } from '@/app/utils/color'

type TransformSelectedNodes = (transformer: (x: number, y: number, bounds: Bounds) => { x: number; y: number }, label: string) => void

export function InspectorSidebar(props: {
  inspectorCollapsed: boolean
  setInspectorCollapsed: (collapsed: boolean) => void

  sourceSvgPresent: boolean
  activePathPresent: boolean

  drawTool: 'select' | 'pen' | 'rect'
  setDrawTool: (tool: 'select' | 'pen' | 'rect') => void
  setPenDraftPoints: (points: Array<{ x: number; y: number }>) => void
  setRectDraft: (draft: null | { start: { x: number; y: number }; current: { x: number; y: number } }) => void
  setStatus: (value: string) => void

  pathFillDraft: string
  setPathFillDraft: (value: string) => void
  fillPickerHex: string
  setFillPickerHex: (value: string) => void
  pathStrokeDraft: string
  setPathStrokeDraft: (value: string) => void
  strokePickerHex: string
  setStrokePickerHex: (value: string) => void
  applyActivePathProperties: () => void

  selectAllNodes: () => void
  clearSelection: () => void
  deleteSelectedPoints: () => void
  extractSelectionToNewPath: () => void
  transformSelectedNodes: TransformSelectedNodes
  addNewPathFromCommands: (cmds: PathCommand[], opts?: { label?: string; newLayer?: boolean }) => void
  selectRangeToIndex: (index: number) => void
  copySelectedSection: () => void
  pasteSectionAfterSelected: () => void
  deletePathAtIndex: (index: number) => void
  deleteLayerForPath: (index: number) => void

  logLinesLength: number
  onOpenLogDialog: () => void
  onClearLog: () => void
}) {
  // Subscribe to commands/selectedIndices here so InspectorSidebar buttons
  // stay correctly enabled/disabled without App needing to re-render.
  const commandsLength = useEditorStore((s) => s.commands.length)
  const selectedCount = useEditorStore((s) => s.selectedIndices.length)

  const actions = {
    selectAllNodes: props.selectAllNodes,
    clearSelection: props.clearSelection,
    deleteSelectedPoints: props.deleteSelectedPoints,
    extractSelectionToNewPath: props.extractSelectionToNewPath,
    transformSelectedNodes: props.transformSelectedNodes,
    addNewPathFromCommands: props.addNewPathFromCommands,
    selectRangeToIndex: props.selectRangeToIndex,
    copySelectedSection: props.copySelectedSection,
    pasteSectionAfterSelected: props.pasteSectionAfterSelected,
    applyActivePathProperties: props.applyActivePathProperties,
    deletePathAtIndex: props.deletePathAtIndex,
    deleteLayerForPath: props.deleteLayerForPath,
  }

  return (
    <aside
      className={
        props.inspectorCollapsed
          ? 'hidden w-[56px] shrink-0 border-r bg-background md:block'
          : 'hidden w-[380px] shrink-0 border-r bg-background md:block'
      }
    >
      {props.inspectorCollapsed ? (
        <div className="flex h-full flex-col">
          <div className="shrink-0 border-b p-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="w-full" onClick={() => props.setInspectorCollapsed(false)}>
                  <LayoutPanelLeft />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Expand inspector</TooltipContent>
            </Tooltip>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="flex flex-col items-center gap-1 p-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-12 w-12" onClick={props.selectAllNodes} disabled={!commandsLength}>
                    <Grip className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Select all nodes</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-12 w-12" onClick={props.clearSelection} disabled={!selectedCount}>
                    <X className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Clear selection</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-12 w-12" onClick={props.deleteSelectedPoints} disabled={!selectedCount}>
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete selected</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-12 w-12" onClick={props.extractSelectionToNewPath} disabled={!selectedCount}>
                    <Scissors className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Extract selection</TooltipContent>
              </Tooltip>

              <div className="my-1 h-px w-full bg-border" />

              <DrawToolToggle
                variant="collapsed"
                drawTool={props.drawTool}
                setDrawTool={props.setDrawTool}
                setPenDraftPoints={props.setPenDraftPoints}
                setRectDraft={props.setRectDraft}
                setStatus={props.setStatus}
                disabled={!props.sourceSvgPresent}
              />

              <div className="my-1 h-px w-full bg-border" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-12 w-12"
                    onClick={() => props.transformSelectedNodes(rotateTransformer(-90), 'Rotate -90 deg')}
                    disabled={!selectedCount}
                  >
                    <RotateCcw className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Rotate -90</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-12 w-12"
                    onClick={() => props.transformSelectedNodes(rotateTransformer(90), 'Rotate 90 deg')}
                    disabled={!selectedCount}
                  >
                    <RotateCw className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Rotate +90</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-12 w-12"
                    onClick={() => props.transformSelectedNodes(flipBothTransformer, 'Flip 180 deg')}
                    disabled={!selectedCount}
                  >
                    <Repeat2 className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Flip 180</TooltipContent>
              </Tooltip>

              <div className="my-1 h-px w-full bg-border" />

              <div className="flex w-full flex-col items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <ColorPickerPopover
                        value={props.pathFillDraft}
                        fallbackColor={props.fillPickerHex}
                        title="Pick fill color"
                        buttonClassName="h-12 w-12 p-1"
                        disabled={!props.activePathPresent}
                        onChange={(v) => {
                          const hex = normalizeHex6(v) || normalizeCssColorToHex(v) || v
                          props.setPathFillDraft(hex)
                          const normalized = normalizeCssColorToHex(hex) || normalizeHex6(hex)
                          if (normalized) props.setFillPickerHex(normalized)
                          props.applyActivePathProperties()
                        }}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Fill color</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <ColorPickerPopover
                        value={props.pathStrokeDraft}
                        fallbackColor={props.strokePickerHex}
                        title="Pick stroke color"
                        buttonClassName="h-12 w-12 p-1"
                        disabled={!props.activePathPresent}
                        onChange={(v) => {
                          const hex = normalizeHex6(v) || normalizeCssColorToHex(v) || v
                          props.setPathStrokeDraft(hex)
                          const normalized = normalizeCssColorToHex(hex) || normalizeHex6(hex)
                          if (normalized) props.setStrokePickerHex(normalized)
                          props.applyActivePathProperties()
                        }}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Stroke color</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </ScrollArea>
        </div>
      ) : (
        <InspectorPanel actions={actions} logLinesLength={props.logLinesLength} onOpenLogDialog={props.onOpenLogDialog} onClearLog={props.onClearLog} />
      )}
    </aside>
  )
}
