import { useMemo } from 'react'

import { Copy, Maximize2, PanelLeft, Scissors, Trash, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useShallow } from 'zustand/react/shallow'

import { useEditorStore } from '@/editor/store'
import type { PathCommand, PathMeta } from '@/editor/types'
import { buildPath, flipBothTransformer, mirrorHorizontalTransformer, mirrorVerticalTransformer, rotateTransformer, type Bounds } from '@/editor/utils'
import { ColorPickerPopover } from './ColorPicker'
import { DrawToolToggle } from './DrawToolToggle'
import { normalizeCssColorToHex, normalizeHex6 } from '@/app/utils/color'

type InspectorPanelProps = {
  actions: {
    selectAllNodes: () => void
    clearSelection: () => void
    deleteSelectedPoints: () => void
    extractSelectionToNewPath: () => void
    transformSelectedNodes: (transformer: (x: number, y: number, bounds: Bounds) => { x: number; y: number }, label: string) => void
    addNewPathFromCommands: (cmds: PathCommand[], opts?: { label?: string; newLayer?: boolean }) => void
    selectRangeToIndex: (index: number) => void
    copySelectedSection: () => void
    pasteSectionAfterSelected: () => void
    applyActivePathProperties: () => void
    deletePathAtIndex: (index: number) => void
    deleteLayerForPath: (index: number) => void
  }
  logLinesLength: number
  onOpenLogDialog: () => void
  onClearLog: () => void
}


export function InspectorPanel(props: InspectorPanelProps) {
  const { actions, logLinesLength, onOpenLogDialog, onClearLog } = props

  const {
    inspectorCollapsed,
    setInspectorCollapsed,
    inspectorTab,
    setInspectorTab,
    selectedIndices,
    commands,
    status,
    setStatus,
    rotateAngle,
    setRotateAngle,
    drawTool,
    setDrawTool,
    drawNewLayer,
    setDrawNewLayer,
    penDraftPoints,
    setPenDraftPoints,
    setRectDraft,
    clipboardCommandsLength,
    selectedPathIndex,
    pathMetas,
    pathLabelDraft,
    setPathLabelDraft,
    pathIdDraft,
    setPathIdDraft,
    pathFillDraft,
    setPathFillDraft,
    pathStrokeDraft,
    setPathStrokeDraft,
    pathOpacityDraft,
    setPathOpacityDraft,
    fillPickerHex,
    setFillPickerHex,
    strokePickerHex,
    setStrokePickerHex,
    sourceSvg,
    setRangeStartIndex,
  } = useEditorStore(
    useShallow((s) => ({
      inspectorCollapsed: s.inspectorCollapsed,
      setInspectorCollapsed: s.setInspectorCollapsed,
      inspectorTab: s.inspectorTab,
      setInspectorTab: s.setInspectorTab,
      selectedIndices: s.selectedIndices,
      commands: s.commands,
      status: s.status,
      setStatus: s.setStatus,
      rotateAngle: s.rotateAngle,
      setRotateAngle: s.setRotateAngle,
      drawTool: s.drawTool,
      setDrawTool: s.setDrawTool,
      drawNewLayer: s.drawNewLayer,
      setDrawNewLayer: s.setDrawNewLayer,
      penDraftPoints: s.penDraftPoints,
      setPenDraftPoints: s.setPenDraftPoints,
      setRectDraft: s.setRectDraft,
      clipboardCommandsLength: s.clipboardCommands.length,
      selectedPathIndex: s.selectedPathIndex,
      pathMetas: s.pathMetas,
      pathLabelDraft: s.pathLabelDraft,
      setPathLabelDraft: s.setPathLabelDraft,
      pathIdDraft: s.pathIdDraft,
      setPathIdDraft: s.setPathIdDraft,
      pathFillDraft: s.pathFillDraft,
      setPathFillDraft: s.setPathFillDraft,
      pathStrokeDraft: s.pathStrokeDraft,
      setPathStrokeDraft: s.setPathStrokeDraft,
      pathOpacityDraft: s.pathOpacityDraft,
      setPathOpacityDraft: s.setPathOpacityDraft,
      fillPickerHex: s.fillPickerHex,
      setFillPickerHex: s.setFillPickerHex,
      strokePickerHex: s.strokePickerHex,
      setStrokePickerHex: s.setStrokePickerHex,
      sourceSvg: s.sourceSvg,
      setRangeStartIndex: s.setRangeStartIndex,
    })),
  )

  const selectedCount = selectedIndices.length
  const activePathMeta: PathMeta | null = selectedPathIndex >= 0 ? pathMetas[selectedPathIndex] ?? null : null

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text)
      setStatus(`${label} copied.`)
    } catch {
      setStatus(`Could not copy ${label}. Select it manually from the output field.`)
    }
  }

  const outputPath = useMemo(() => buildPath(commands), [commands])

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-medium">Inspector</div>
            <div className="mt-1 text-xs text-muted-foreground">{selectedCount ? `${selectedCount} nodes selected` : 'No nodes selected'}</div>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setInspectorCollapsed(!inspectorCollapsed)}
                className="hidden md:inline-flex"
              >
                <PanelLeft />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{inspectorCollapsed ? 'Expand inspector' : 'Collapse inspector'}</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="p-3">
          <Tabs value={inspectorTab} onValueChange={(v) => setInspectorTab(v as 'nodes' | 'path')}>
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="nodes">Nodes</TabsTrigger>
              <TabsTrigger value="path">Path</TabsTrigger>
            </TabsList>

            <TabsContent value="nodes">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="secondary" onClick={actions.selectAllNodes}>Select all</Button>
                  <Button type="button" variant="secondary" onClick={actions.clearSelection}>Clear</Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="destructive" onClick={() => actions.deleteSelectedPoints()} disabled={!selectedCount}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => actions.extractSelectionToNewPath()} disabled={!selectedCount}>
                    Extract
                  </Button>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Transform</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => actions.transformSelectedNodes(mirrorHorizontalTransformer, 'Horizontal mirror')}
                    >
                      Mirror X
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => actions.transformSelectedNodes(mirrorVerticalTransformer, 'Vertical mirror')}
                    >
                      Mirror Y
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant="secondary" onClick={() => actions.transformSelectedNodes(rotateTransformer(-90), 'Rotate -90 deg')}>
                      Rotate -90
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => actions.transformSelectedNodes(rotateTransformer(90), 'Rotate 90 deg')}>
                      Rotate +90
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant="secondary" onClick={() => actions.transformSelectedNodes(flipBothTransformer, 'Flip 180 deg')}>
                      Flip 180
                    </Button>

                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step={1}
                        value={rotateAngle}
                        onChange={(e) => setRotateAngle(e.target.value)}
                        placeholder="deg"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          const degrees = Number(rotateAngle)
                          if (!Number.isFinite(degrees)) {
                            setStatus('Enter a valid rotation angle.')
                            return
                          }
                          actions.transformSelectedNodes(rotateTransformer(degrees), `Rotate ${degrees} deg`)
                        }}
                      >
                        Rotate
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Draw</Label>
                  <DrawToolToggle
                    variant="panel"
                    drawTool={drawTool}
                    setDrawTool={setDrawTool}
                    setPenDraftPoints={setPenDraftPoints}
                    setRectDraft={setRectDraft}
                    setStatus={setStatus}
                    disabled={!sourceSvg}
                  />

                  <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
                    <div className="text-sm">New layer</div>
                    <Switch checked={drawNewLayer} onCheckedChange={setDrawNewLayer} />
                  </div>

                  {drawTool === 'pen' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={penDraftPoints.length < 2}
                        onClick={() => {
                          const pts = penDraftPoints
                          const cmds: PathCommand[] = pts.map((p, i) => ({ type: i === 0 ? 'M' : 'L', x: p.x, y: p.y }))
                          if (pts.length >= 3) cmds.push({ type: 'Z' })
                          actions.addNewPathFromCommands(cmds, { label: 'drawn', newLayer: drawNewLayer })
                          setPenDraftPoints([])
                          setDrawTool('select')
                        }}
                      >
                        Finish
                      </Button>
                      <Button type="button" variant="secondary" disabled={!penDraftPoints.length} onClick={() => setPenDraftPoints([])}>
                        Cancel
                      </Button>
                    </div>
                  ) : null}

                  {drawTool === 'rect' ? (
                    <div className="text-xs text-muted-foreground">Drag on canvas to place rectangle.</div>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label>Section</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        const sorted = selectedIndices.slice().sort((a, b) => a - b)
                        if (sorted.length < 2) {
                          setStatus('Select two nodes first, then click Range.')
                          return
                        }
                        setRangeStartIndex(sorted[0])
                        actions.selectRangeToIndex(sorted[sorted.length - 1])
                      }}
                    >
                      Range
                    </Button>
                    <Button type="button" variant="secondary" onClick={actions.copySelectedSection} disabled={!selectedCount}>
                      <Scissors className="mr-2 h-4 w-4" />
                      Copy
                    </Button>
                  </div>
                  <Button type="button" variant="secondary" onClick={actions.pasteSectionAfterSelected} disabled={!clipboardCommandsLength}>Paste after</Button>
                </div>

                {/* Selected point X/Y editor is available via node context menu (Edit point). */}
              </div>
            </TabsContent>

            <TabsContent value="path">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Active path</div>
                  <div className="text-xs text-muted-foreground">{activePathMeta ? `#${activePathMeta.index + 1}` : 'None'}</div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="destructive" disabled={!activePathMeta} onClick={() => activePathMeta && actions.deletePathAtIndex(activePathMeta.index)}>
                    Delete path
                  </Button>
                  <Button type="button" variant="secondary" disabled={!activePathMeta} onClick={() => activePathMeta && actions.deleteLayerForPath(activePathMeta.index)}>
                    Delete layer
                  </Button>
                </div>

                <Separator />

                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Label (data-label)</div>
                  <Input value={pathLabelDraft} onChange={(e) => setPathLabelDraft(e.target.value)} placeholder="e.g. windows" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">ID</div>
                  <Input value={pathIdDraft} onChange={(e) => setPathIdDraft(e.target.value)} placeholder="optional" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Fill</div>
                    <div className="flex items-center gap-2">
                      <Input
                        value={pathFillDraft}
                        onChange={(e) => {
                          const v = e.target.value
                          setPathFillDraft(v)
                          const hex = normalizeCssColorToHex(v)
                          if (hex) setFillPickerHex(hex)
                        }}
                        placeholder="none, red, rgb(...), #RRGGBB"
                      />
                      <ColorPickerPopover
                        value={pathFillDraft}
                        fallbackColor={fillPickerHex}
                        title="Pick fill color"
                        onChange={(v) => {
                          const hex = normalizeHex6(v) || normalizeCssColorToHex(v) || v
                          setPathFillDraft(hex)
                          const normalized = normalizeCssColorToHex(hex) || normalizeHex6(hex)
                          if (normalized) setFillPickerHex(normalized)
                        }}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Stroke</div>
                    <div className="flex items-center gap-2">
                      <Input
                        value={pathStrokeDraft}
                        onChange={(e) => {
                          const v = e.target.value
                          setPathStrokeDraft(v)
                          const hex = normalizeCssColorToHex(v)
                          if (hex) setStrokePickerHex(hex)
                        }}
                        placeholder="red, rgb(...), #RRGGBB"
                      />
                      <ColorPickerPopover
                        value={pathStrokeDraft}
                        fallbackColor={strokePickerHex}
                        title="Pick stroke color"
                        onChange={(v) => {
                          const hex = normalizeHex6(v) || normalizeCssColorToHex(v) || v
                          setPathStrokeDraft(hex)
                          const normalized = normalizeCssColorToHex(hex) || normalizeHex6(hex)
                          if (normalized) setStrokePickerHex(normalized)
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Opacity</div>
                  <Input value={pathOpacityDraft} onChange={(e) => setPathOpacityDraft(e.target.value)} placeholder="1" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="secondary" onClick={actions.applyActivePathProperties} disabled={!activePathMeta}>Apply</Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      if (!activePathMeta) return
                      setPathIdDraft(activePathMeta.id || '')
                      setPathLabelDraft(activePathMeta.dataLabel || '')
                      setPathFillDraft(activePathMeta.fill || '')
                      setPathStrokeDraft(activePathMeta.stroke || '')
                      setPathOpacityDraft(activePathMeta.opacity || '')
                    }}
                    disabled={!activePathMeta}
                  >
                    Reset
                  </Button>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Export</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant="secondary" onClick={() => copyText(outputPath, 'Edited path')} disabled={!outputPath}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy d
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => copyText(sourceSvg, 'Full SVG')} disabled={!sourceSvg}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy SVG
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t p-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 truncate text-xs text-muted-foreground" title={status}>
            {status}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onOpenLogDialog}>
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open log</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => {
                    onClearLog()
                  }}
                  disabled={!logLinesLength}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Clear log</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  )
}
