import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'

import { useShallow } from 'zustand/react/shallow'

import { useEditorStore } from '@/editor/store'
import type { UiPointSize } from '@/editor/types'

type SettingsTab = 'general' | 'grid' | 'appearance' | 'keys'

export type SettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  tab: SettingsTab
  setTab: (tab: SettingsTab) => void
  pointRadiusBase: number
}

export function SettingsDialog(props: SettingsDialogProps) {
  const { open, onOpenChange, tab, setTab, pointRadiusBase } = props

  const {
    themeMode,
    setThemeMode,
    nodesVisible,
    setNodesVisible,
    selectionToolActive,
    setSelectionToolActive,
    debugUiVisible,
    setDebugUiVisible,
    autoSaveEnabled,
    setAutoSaveEnabled,
    fileHandle,
    setStatus,
    gridVisible,
    setGridVisible,
    snapToGrid,
    setSnapToGrid,
    gridSize,
    setGridSize,
    majorGridEvery,
    setMajorGridEvery,
    uiOverlayStrokeWidthScale,
    setUiOverlayStrokeWidthScale,
    uiPointSize,
    setUiPointSize,
    uiSelectionStroke,
    setUiSelectionStroke,
    uiSelectionDash,
    setUiSelectionDash,
    uiSelectionFill,
    setUiSelectionFill,
    uiSelectionFillOpacity,
    setUiSelectionFillOpacity,
    uiOutlineStroke,
    setUiOutlineStroke,
    uiOutlineDash,
    setUiOutlineDash,
    uiSegmentStroke,
    setUiSegmentStroke,
    uiSegmentHoverStroke,
    setUiSegmentHoverStroke,
    uiGridStroke,
    setUiGridStroke,
    uiGridMajorStroke,
    setUiGridMajorStroke,
    resetUiAppearance,
  } = useEditorStore(
    useShallow((s) => ({
      themeMode: s.themeMode,
      setThemeMode: s.setThemeMode,
      nodesVisible: s.nodesVisible,
      setNodesVisible: s.setNodesVisible,
      selectionToolActive: s.selectionToolActive,
      setSelectionToolActive: s.setSelectionToolActive,
      debugUiVisible: s.debugUiVisible,
      setDebugUiVisible: s.setDebugUiVisible,
      autoSaveEnabled: s.autoSaveEnabled,
      setAutoSaveEnabled: s.setAutoSaveEnabled,
      fileHandle: s.fileHandle,
      setStatus: s.setStatus,
      gridVisible: s.gridVisible,
      setGridVisible: s.setGridVisible,
      snapToGrid: s.snapToGrid,
      setSnapToGrid: s.setSnapToGrid,
      gridSize: s.gridSize,
      setGridSize: s.setGridSize,
      majorGridEvery: s.majorGridEvery,
      setMajorGridEvery: s.setMajorGridEvery,
      uiOverlayStrokeWidthScale: s.uiOverlayStrokeWidthScale,
      setUiOverlayStrokeWidthScale: s.setUiOverlayStrokeWidthScale,
      uiPointSize: s.uiPointSize,
      setUiPointSize: s.setUiPointSize,
      uiSelectionStroke: s.uiSelectionStroke,
      setUiSelectionStroke: s.setUiSelectionStroke,
      uiSelectionDash: s.uiSelectionDash,
      setUiSelectionDash: s.setUiSelectionDash,
      uiSelectionFill: s.uiSelectionFill,
      setUiSelectionFill: s.setUiSelectionFill,
      uiSelectionFillOpacity: s.uiSelectionFillOpacity,
      setUiSelectionFillOpacity: s.setUiSelectionFillOpacity,
      uiOutlineStroke: s.uiOutlineStroke,
      setUiOutlineStroke: s.setUiOutlineStroke,
      uiOutlineDash: s.uiOutlineDash,
      setUiOutlineDash: s.setUiOutlineDash,
      uiSegmentStroke: s.uiSegmentStroke,
      setUiSegmentStroke: s.setUiSegmentStroke,
      uiSegmentHoverStroke: s.uiSegmentHoverStroke,
      setUiSegmentHoverStroke: s.setUiSegmentHoverStroke,
      uiGridStroke: s.uiGridStroke,
      setUiGridStroke: s.setUiGridStroke,
      uiGridMajorStroke: s.uiGridMajorStroke,
      setUiGridMajorStroke: s.setUiGridMajorStroke,
      resetUiAppearance: s.resetUiAppearance,
    })),
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1100px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Less-touched editor options and reference info.</DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[78vh] min-h-[520px] grid-cols-1 gap-0 overflow-hidden rounded-md border md:grid-cols-[240px_1fr]">
          <div className="border-b bg-muted/10 p-2 md:border-b-0 md:border-r">
            <div className="px-2 py-2 text-xs font-medium text-muted-foreground">Settings</div>
            <div className="grid grid-cols-2 gap-1 md:grid-cols-1">
              <Button
                type="button"
                variant={tab === 'general' ? 'secondary' : 'ghost'}
                className="justify-start"
                onClick={() => setTab('general')}
              >
                General
              </Button>
              <Button
                type="button"
                variant={tab === 'grid' ? 'secondary' : 'ghost'}
                className="justify-start"
                onClick={() => setTab('grid')}
              >
                Grid & Snap
              </Button>
              <Button
                type="button"
                variant={tab === 'appearance' ? 'secondary' : 'ghost'}
                className="justify-start"
                onClick={() => setTab('appearance')}
              >
                Appearance
              </Button>
              <Button
                type="button"
                variant={tab === 'keys' ? 'secondary' : 'ghost'}
                className="justify-start"
                onClick={() => setTab('keys')}
              >
                Keybindings
              </Button>
            </div>
          </div>

          <div className="min-w-0 overflow-auto p-4">
            {tab === 'general' ? (
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium">Editor</div>
                  <div className="mt-1 text-xs text-muted-foreground">Common options that usually shouldn’t be touched too much.</div>
                </div>

                <div className="space-y-2">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Theme</div>
                    <div className="grid grid-cols-3 gap-2">
                      <Button type="button" variant={themeMode === 'system' ? 'secondary' : 'ghost'} onClick={() => setThemeMode('system')}>
                        System
                      </Button>
                      <Button type="button" variant={themeMode === 'light' ? 'secondary' : 'ghost'} onClick={() => setThemeMode('light')}>
                        Light
                      </Button>
                      <Button type="button" variant={themeMode === 'dark' ? 'secondary' : 'ghost'} onClick={() => setThemeMode('dark')}>
                        Dark
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-md border bg-muted/10 px-3 py-2">
                    <div className="text-sm">Nodes visible</div>
                    <Switch checked={nodesVisible} onCheckedChange={setNodesVisible} />
                  </div>
                  <div className="flex items-center justify-between rounded-md border bg-muted/10 px-3 py-2">
                    <div className="text-sm">Box select tool</div>
                    <Switch checked={selectionToolActive} onCheckedChange={setSelectionToolActive} />
                  </div>
                  <div className="flex items-center justify-between rounded-md border bg-muted/10 px-3 py-2">
                    <div className="text-sm">Debug UI</div>
                    <Switch checked={debugUiVisible} onCheckedChange={setDebugUiVisible} />
                  </div>
                  <div className="flex items-center justify-between rounded-md border bg-muted/10 px-3 py-2">
                    <div className="text-sm">Auto-save</div>
                    <Switch
                      checked={autoSaveEnabled}
                      onCheckedChange={(v) => {
                        if (v && !fileHandle) {
                          setStatus('Open a file first to enable auto-save.')
                          return
                        }
                        setAutoSaveEnabled(v)
                      }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">Note: Auto-save requires an opened file handle.</div>
                </div>

                <Separator />

                <div className="space-y-1">
                  <div className="text-sm font-medium">Reference</div>
                  <div className="text-xs text-muted-foreground">The log lives in the Inspector footer (expand icon).</div>
                </div>
              </div>
            ) : null}

            {tab === 'grid' ? (
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium">Grid & Snap</div>
                  <div className="mt-1 text-xs text-muted-foreground">Visual aids and snapping behavior.</div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-md border bg-muted/10 px-3 py-2">
                    <div className="text-sm">Grid visible</div>
                    <Switch checked={gridVisible} onCheckedChange={setGridVisible} />
                  </div>
                  <div className="flex items-center justify-between rounded-md border bg-muted/10 px-3 py-2">
                    <div className="text-sm">Snap to grid</div>
                    <Switch checked={snapToGrid} onCheckedChange={setSnapToGrid} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Grid size</div>
                      <Input
                        type="number"
                        step={1}
                        value={gridSize}
                        onChange={(e) => setGridSize(Math.max(1, Number(e.target.value) || 1))}
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Major every</div>
                      <Input
                        type="number"
                        step={1}
                        value={majorGridEvery}
                        onChange={(e) => setMajorGridEvery(Math.max(1, Number(e.target.value) || 1))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {tab === 'appearance' ? (
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium">Appearance</div>
                  <div className="mt-1 text-xs text-muted-foreground">Customize editor overlay styling (stored in localStorage).</div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Preview</div>
                  <div className="rounded-md border bg-muted/10 p-3">
                    <svg viewBox="0 0 120 72" width="100%" height="120" className="block">
                      <rect x="8" y="10" width="40" height="26" fill="none" stroke="currentColor" opacity="0.2" />

                      <circle cx="20" cy="23" r={pointRadiusBase} className="point" />
                      <circle cx="34" cy="28" r={pointRadiusBase} className="point selected" />

                      <path d="M 18 50 L 102 50" fill="none" strokeWidth={2 * uiOverlayStrokeWidthScale} style={{ stroke: uiSegmentStroke }} />
                      <path
                        d="M 18 56 L 102 56"
                        fill="none"
                        strokeWidth={2 * uiOverlayStrokeWidthScale}
                        style={{ stroke: uiSegmentHoverStroke }}
                      />

                      <path
                        d="M 18 18 L 64 18 L 64 40"
                        fill="none"
                        strokeWidth={2.5 * uiOverlayStrokeWidthScale}
                        style={{ stroke: uiOutlineStroke, strokeDasharray: uiOutlineDash }}
                      />

                      <rect
                        x="68"
                        y="16"
                        width="38"
                        height="26"
                        strokeWidth={2 * uiOverlayStrokeWidthScale}
                        style={{
                          stroke: uiSelectionStroke,
                          strokeDasharray: uiSelectionDash,
                          fill: uiSelectionFill,
                          fillOpacity: uiSelectionFillOpacity,
                        }}
                      />
                    </svg>
                    <div className="mt-2 text-xs text-muted-foreground">Segments (normal/hover), outline, and selection box.</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Line width</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Overlay width scale</div>
                      <Input
                        type="number"
                        step={0.1}
                        min={0.1}
                        value={uiOverlayStrokeWidthScale}
                        onChange={(e) => {
                          const n = Number(e.target.value)
                          setUiOverlayStrokeWidthScale(Number.isFinite(n) ? Math.max(0.1, Math.min(6, n)) : 1)
                        }}
                      />
                    </div>
                    <div className="flex items-end justify-end">
                      <Button type="button" variant="secondary" onClick={resetUiAppearance}>
                        Reset
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="text-sm font-medium">Node points</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Point size</div>
                      <Select value={uiPointSize} onValueChange={(v) => setUiPointSize(v as UiPointSize)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="xs">Extra small</SelectItem>
                          <SelectItem value="sm">Small</SelectItem>
                          <SelectItem value="md">Medium</SelectItem>
                          <SelectItem value="lg">Large</SelectItem>
                          <SelectItem value="xl">Extra large</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">Controls the visible handle radius for rendered nodes.</div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="text-sm font-medium">Selection box</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Stroke</div>
                      <Input value={uiSelectionStroke} onChange={(e) => setUiSelectionStroke(e.target.value)} placeholder="#0b66ff" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Dash</div>
                      <Input value={uiSelectionDash} onChange={(e) => setUiSelectionDash(e.target.value)} placeholder="4 3" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Fill</div>
                      <Input value={uiSelectionFill} onChange={(e) => setUiSelectionFill(e.target.value)} placeholder="#0b66ff" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Fill opacity</div>
                      <Input
                        type="number"
                        step={0.01}
                        min={0}
                        max={1}
                        value={uiSelectionFillOpacity}
                        onChange={(e) => {
                          const n = Number(e.target.value)
                          setUiSelectionFillOpacity(Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.12)
                        }}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="text-sm font-medium">Outline</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Stroke</div>
                      <Input value={uiOutlineStroke} onChange={(e) => setUiOutlineStroke(e.target.value)} placeholder="#ff3b30" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Dash</div>
                      <Input value={uiOutlineDash} onChange={(e) => setUiOutlineDash(e.target.value)} placeholder="6 4" />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="text-sm font-medium">Segments & grid</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Segment stroke</div>
                      <Input value={uiSegmentStroke} onChange={(e) => setUiSegmentStroke(e.target.value)} placeholder="rgba(0,0,0,0.35)" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Segment hover</div>
                      <Input
                        value={uiSegmentHoverStroke}
                        onChange={(e) => setUiSegmentHoverStroke(e.target.value)}
                        placeholder="#ff9500"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Grid stroke</div>
                      <Input value={uiGridStroke} onChange={(e) => setUiGridStroke(e.target.value)} placeholder="rgba(0,0,0,0.16)" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Grid major</div>
                      <Input value={uiGridMajorStroke} onChange={(e) => setUiGridMajorStroke(e.target.value)} placeholder="rgba(0,0,0,0.28)" />
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">Colors accept hex or CSS colors. Dash patterns use SVG syntax (e.g. "4 3").</div>
                </div>
              </div>
            ) : null}

            {tab === 'keys' ? (
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium">Keybindings</div>
                  <div className="mt-1 text-xs text-muted-foreground">A quick cheat sheet of the built-in shortcuts.</div>
                </div>

                <div className="rounded-md border bg-muted/10 p-3">
                  <div className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm md:grid-cols-2">
                    <div className="text-muted-foreground">Delete / Backspace</div>
                    <div>Delete selected nodes</div>
                    <div className="text-muted-foreground">Esc</div>
                    <div>Clear node selection</div>
                    <div className="text-muted-foreground">Shift + drag (canvas)</div>
                    <div>Box select</div>
                    <div className="text-muted-foreground">Shift + click node</div>
                    <div>Add/remove from selection</div>
                    <div className="text-muted-foreground">Right click node</div>
                    <div>Node context menu</div>
                    <div className="text-muted-foreground">Alt + click node</div>
                    <div>Open node context menu</div>
                    <div className="text-muted-foreground">Mouse wheel</div>
                    <div>Zoom</div>
                    <div className="text-muted-foreground">Drag empty canvas</div>
                    <div>Pan</div>
                    <div className="text-muted-foreground">Ctrl/Cmd + K</div>
                    <div>Open command menu</div>
                    <div className="text-muted-foreground">Ctrl/Cmd + Z</div>
                    <div>Undo</div>
                    <div className="text-muted-foreground">Ctrl/Cmd + Y</div>
                    <div>Redo</div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
