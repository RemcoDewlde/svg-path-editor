import React, { useEffect, useMemo, useRef, useState } from 'react'

import { cn } from './lib/utils'

import { clampViewBox } from './app/canvas/viewBox'
import { normalizeCssColorToHex, normalizeHex6 } from './app/utils/color'
import { moveElementWithinParent } from './app/utils/dom'

import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { Label } from './components/ui/label'
import { ScrollArea } from './components/ui/scroll-area'
import { Separator } from './components/ui/separator'
import { Switch } from './components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from './components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './components/ui/tooltip'

import { Popover, PopoverContent, PopoverTrigger } from './components/ui/popover'

import { HexColorPicker } from 'react-colorful'

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from './components/ui/context-menu'

import { openSvgFile, saveSvgFile } from './editor/file'
import { useEditorStore } from './editor/store'
import type { PathCommand } from './editor/utils'
import {
  buildPath,
  buildTransformedPathD,
  createSvgPoint,
  deleteIndicesFromCommands,
  flipBothTransformer,
  formatNumber,
  getPathLabel,
  getSegments,
  getTransformTargetIndices,
  mirrorHorizontalTransformer,
  mirrorVerticalTransformer,
  parsePath,
  rotateTransformer,
  snapPoint,
  snapValue,
  transformPoint,
  type Bounds,
} from './editor/utils'

import {
  Copy,
  LayoutPanelLeft,
  PanelLeft,
  Scissors,
  Square,
  Pencil,
  Grip,
  Maximize2,
  Trash,
  Trash2,
  X,
  RotateCcw,
  RotateCw,
  Repeat2,
} from 'lucide-react'

import { DebugDock } from './app/debug/DebugDock'
import { NodeContextMenu } from './app/menus/NodeContextMenu'
import { CanvasHud } from './app/canvas/CanvasHud'
import { TopBar } from './app/topbar/TopBar'

import { LayersSidebar } from './app/sidebars/LayersSidebar'
import { CommandMenu, type CommandMenuItem } from './app/CommandMenu'
import { buildCommandMenuItems } from './app/command-menu/commandMenuItems'
import { SettingsDialog } from './app/settings/SettingsDialog'
import { LogDialog } from './app/dialogs/LogDialog'
import { OpenSvgDialog } from './app/dialogs/OpenSvgDialog'
import { RenameDialog } from './app/dialogs/RenameDialog'
import { EditPointDialog } from './app/dialogs/EditPointDialog'

function ColorPickerPopover(props: { value: string; onChange: (hex: string) => void; title: string }) {
  const { value, onChange, title } = props
  const parsed = normalizeHex6(value) || '#000000'
  return (
    <Popover>
      <PopoverTrigger asChild>
        <ColorSwatchButton color={parsed} title={title} />
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <div className="space-y-3">
          <HexColorPicker color={parsed} onChange={(hex) => onChange(hex)} />
          <div className="space-y-1">
            <Label>Value</Label>
            <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="#RRGGBB" />
            <div className="text-xs text-muted-foreground">Hex only. Example: `#ff00aa`</div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Debug formatting moved to src/app/debug/DebugDock.tsx

const ColorSwatchButton = React.forwardRef<
  HTMLButtonElement,
  { color: string; title: string } & Omit<React.ComponentPropsWithoutRef<typeof Button>, 'title'>
>(function ColorSwatchButton(props, ref) {
  const { color, title, className, ...rest } = props
  return (
    <Button
      ref={ref}
      type="button"
      variant="outline"
      className={cn('h-9 w-12 p-0', className)}
      title={title}
      {...rest}
    >
      <span className="h-full w-full rounded-[calc(var(--radius)-2px)]" style={{ background: color }} />
    </Button>
  )
})

export default function App() {
  const LOG_HISTORY_LIMIT = 50

  const svgRef = useRef<SVGSVGElement | null>(null)
  const svgContentRef = useRef<SVGGElement | null>(null)
  // Used to detect whether we stayed on the same active path.
  // Many SVGs have paths without an `id` attribute, so we fall back to index-based identity.
  const lastActivePathIdRef = useRef<string | null>(null)

  const globalHandlersRef = useRef<{
    finishBoxSelection: () => void
    clearSelection: () => void
    undo: () => void
    redo: () => void
    copyActivePathToClipboard: () => void
    pasteSectionAfterSelected: () => void
    deleteSelectedPoints: (indicesOverride?: number[]) => void
    addNewPathFromCommands: (cmds: PathCommand[], opts?: { label?: string; newLayer?: boolean }) => void
    setDrawTool: (v: 'select' | 'pen' | 'rect') => void
    setCurrentViewBox: (vb: typeof currentViewBox) => void
    setDrag: typeof setDrag
    setPan: typeof setPan
    setSelectionBox: typeof setSelectionBox
  } | null>(null)

  const {
    svgInput,
    setSvgInput,
    sourceSvg,
    setSourceSvg,
    fileHandle,
    fileName,
    setFileHandle,
    autoSaveEnabled,
    setAutoSaveEnabled,
    pathMetas,
    setPathMetas,
    hiddenPathIndexes,
    setHiddenPathIndexes,
    selectedPathIndex,
    setSelectedPathIndex,
    commands,
    setCommands,
    selectedIndices,
    setSelectedIndices,
    status,
    setStatus,
    xInput,
    yInput,
    setXInput,
    setYInput,
    selectionToolActive,
    setSelectionToolActive,
    nodesVisible,
    setNodesVisible,
    setRangeStartIndex,
    clipboardCommands,
    setClipboardCommands,
    clipboardPath,
    setClipboardPath,
    gridVisible,
    setGridVisible,
    snapToGrid,
    setSnapToGrid,
    gridSize,
    setGridSize,
    majorGridEvery,
    setMajorGridEvery,
    baseViewBox,
    setBaseViewBox,
    currentViewBox,
    setCurrentViewBox,
    undoStack,
    redoStack,
    pushUndo,
    popUndo,
    pushRedo,
    popRedo,
    clearRedo,
    rotateAngle,
    setRotateAngle,
    drag,
    setDrag,
    selectionBox,
    setSelectionBox,
    pan,
    setPan,
    clearHistory,
    inspectorCollapsed,
    setInspectorCollapsed,
    layersCollapsed,
    setLayersCollapsed,
    debugDockOpen,
    setDebugDockOpen,
    debugDockHeight,
    setDebugDockHeight,
    debugUiVisible,
    setDebugUiVisible,
    drawTool,
    setDrawTool,
    drawNewLayer,
    setDrawNewLayer,

    themeMode,
    setThemeMode,

    uiOverlayStrokeWidthScale,
    setUiOverlayStrokeWidthScale,

    uiPointSize,
    setUiPointSize,
    uiOutlineStroke,
    setUiOutlineStroke,
    uiOutlineDash,
    setUiOutlineDash,
    uiSelectionStroke,
    setUiSelectionStroke,
    uiSelectionFill,
    setUiSelectionFill,
    uiSelectionFillOpacity,
    setUiSelectionFillOpacity,
    uiSelectionDash,
    setUiSelectionDash,
    uiSegmentStroke,
    setUiSegmentStroke,
    uiSegmentHoverStroke,
    setUiSegmentHoverStroke,
    uiGridStroke,
    setUiGridStroke,
    uiGridMajorStroke,
    setUiGridMajorStroke,
    resetUiAppearance,
  } = useEditorStore()

  useEffect(() => {
    // Used by CSS for hover styling.
    document.documentElement.style.setProperty('--ui-segment-hover-stroke', uiSegmentHoverStroke)
  }, [uiSegmentHoverStroke])

  useEffect(() => {
    const root = document.documentElement
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')
    const apply = () => {
      const shouldDark = themeMode === 'dark' || (themeMode === 'system' && !!prefersDark?.matches)
      root.classList.toggle('dark', shouldDark)
    }
    apply()
    if (themeMode !== 'system' || !prefersDark) return
    const onChange = () => apply()
    prefersDark.addEventListener('change', onChange)
    return () => prefersDark.removeEventListener('change', onChange)
  }, [themeMode])

  const selectedIndicesSet = useMemo(() => new Set(selectedIndices), [selectedIndices])
  const lastSavedSvgRef = useRef<string>('')
  const [lastSavedSvg, setLastSavedSvg] = useState<string>('')

  const [pathLabelDraft, setPathLabelDraft] = useState('')
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'general' | 'grid' | 'appearance' | 'keys'>('general')
  const [commandMenuOpen, setCommandMenuOpen] = useState(false)

  const [pointEditorOpen, setPointEditorOpen] = useState(false)
  const [pointEditorX, setPointEditorX] = useState('')
  const [pointEditorY, setPointEditorY] = useState('')
  const [pathFillDraft, setPathFillDraft] = useState('')
  const [pathStrokeDraft, setPathStrokeDraft] = useState('')
  const [pathOpacityDraft, setPathOpacityDraft] = useState('')
  const [pathIdDraft, setPathIdDraft] = useState('')
  const [extractToNewLayer] = useState(true)
  const [inspectorTab, setInspectorTab] = useState<'nodes' | 'path'>('nodes')
  // Debug dock

  const [penDraftPoints, setPenDraftPoints] = useState<Array<{ x: number; y: number }>>([])
  const [rectDraft, setRectDraft] = useState<null | { start: { x: number; y: number }; current: { x: number; y: number } }>(null)

  const [cursorPoint, setCursorPoint] = useState<{ x: number; y: number } | null>(null)
  const [logLines, setLogLines] = useState<string[]>([])
  const [logDialogOpen, setLogDialogOpen] = useState(false)

  const [openDialogOpen, setOpenDialogOpen] = useState(false)

  type PerfCounters = {
     panMoves: number
     dragMoves: number
     boxMoves: number
     viewBoxWrites: number
     viewBoxCommits: number
     cursorWrites: number
     cursorCommits: number
  }

  const perfCountersRef = useRef<PerfCounters>({
     panMoves: 0,
     dragMoves: 0,
     boxMoves: 0,
     viewBoxWrites: 0,
     viewBoxCommits: 0,
     cursorWrites: 0,
     cursorCommits: 0,
  })
  const perfLastCountersRef = useRef<PerfCounters>({
     panMoves: 0,
     dragMoves: 0,
     boxMoves: 0,
     viewBoxWrites: 0,
     viewBoxCommits: 0,
     cursorWrites: 0,
     cursorCommits: 0,
  })
  const appRenderCountRef = useRef(0)
  const lastAppRenderCountRef = useRef(0)
  useEffect(() => {
    // Count renders (post-commit) for the perf tab.
    appRenderCountRef.current += 1
  })

  const [fillPickerHex, setFillPickerHex] = useState<string>('#000000')
  const [strokePickerHex, setStrokePickerHex] = useState<string>('#000000')

  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<null | { kind: 'path' | 'layer'; index: number }>(null)
  const [renameDraft, setRenameDraft] = useState('')

  const activePathMeta = selectedPathIndex >= 0 ? pathMetas[selectedPathIndex] : null

  const dirty = useMemo(() => {
    if (!sourceSvg) return false
    if (!lastSavedSvg) return false
    return sourceSvg !== lastSavedSvg
  }, [sourceSvg, lastSavedSvg])

  const previewInnerHtml = useMemo(() => {
    if (!sourceSvg) return ''
    const doc = new DOMParser().parseFromString(sourceSvg, 'image/svg+xml')
    const parserError = doc.querySelector('parsererror')
    if (parserError) return ''
    return doc.documentElement.innerHTML
  }, [sourceSvg])

  function getPreviewPathElement(index = selectedPathIndex): SVGPathElement | null {
    const group = svgContentRef.current
    if (!group) return null
    const paths = Array.from(group.querySelectorAll('path[d]')) as SVGPathElement[]
    return paths[index] ?? null
  }

  function getRenderMatrix() {
    const svg = svgRef.current
    const previewPath = getPreviewPathElement()
    if (!svg || !previewPath) return null
    const editorScreenMatrix = svg.getScreenCTM()
    const pathScreenMatrix = previewPath.getScreenCTM()
    if (!editorScreenMatrix || !pathScreenMatrix) return null
    return editorScreenMatrix.inverse().multiply(pathScreenMatrix)
  }

  function getLocalPointFromEvent(event: MouseEvent) {
    const svg = svgRef.current
    const previewPath = getPreviewPathElement()
    if (!svg) return null

    const point = createSvgPoint(svg, event.clientX, event.clientY)
    if (!previewPath || !previewPath.getScreenCTM()) {
      const ctm = svg.getScreenCTM()
      if (!ctm) return null
      return point.matrixTransform(ctm.inverse())
    }
    return point.matrixTransform(previewPath.getScreenCTM()!.inverse())
  }

  function getEditorPointFromEvent(event: MouseEvent) {
    const svg = svgRef.current
    if (!svg) return null
    const ctm = svg.getScreenCTM()
    if (!ctm) return null
    const point = createSvgPoint(svg, event.clientX, event.clientY)
    return point.matrixTransform(ctm.inverse())
  }

  function setViewBox(vb: typeof currentViewBox) {
    const next = clampViewBox(vb)
    setCurrentViewBox(next)
    const svg = svgRef.current
    if (svg) svg.setAttribute('viewBox', `${next.x} ${next.y} ${next.width} ${next.height}`)
  }

  const viewBoxRafRef = useRef<number | null>(null)
  const pendingViewBoxRef = useRef<typeof currentViewBox | null>(null)
  const lastViewBoxCommitTsRef = useRef(0)
  const panLastViewBoxRef = useRef<typeof currentViewBox | null>(null)

  const viewBoxAttrRafRef = useRef<number | null>(null)
  const pendingViewBoxAttrRef = useRef<typeof currentViewBox | null>(null)

  function setViewBoxCoalesced(vb: typeof currentViewBox) {
    const next = clampViewBox(vb)
    pendingViewBoxRef.current = next
    panLastViewBoxRef.current = next
    pendingViewBoxAttrRef.current = next
    const svg = svgRef.current

    // Coalesce DOM writes to <= 1 per frame.
    if (svg && viewBoxAttrRafRef.current == null) {
      viewBoxAttrRafRef.current = window.requestAnimationFrame(() => {
        viewBoxAttrRafRef.current = null
        const next = pendingViewBoxAttrRef.current
        const el = svgRef.current
        if (!next || !el) return
        el.setAttribute('viewBox', `${next.x} ${next.y} ${next.width} ${next.height}`)
        perfCountersRef.current.viewBoxWrites += 1
      })
    }

    if (viewBoxRafRef.current != null) return
    viewBoxRafRef.current = window.requestAnimationFrame(() => {
      viewBoxRafRef.current = null
      const next = pendingViewBoxRef.current
      if (!next) return

      // Committing viewBox into Zustand triggers a full React rerender.
      // During panning we keep it purely imperative (attribute writes only) and
      // commit once on mouseup.
      const isPanning = useEditorStore.getState().pan.active
      if (isPanning) return

      const now = performance.now()
      if (now - lastViewBoxCommitTsRef.current < 50) return
      lastViewBoxCommitTsRef.current = now
      perfCountersRef.current.viewBoxCommits += 1
      setCurrentViewBox(next)
    })
  }

  const cursorRafRef = useRef<number | null>(null)
  const pendingCursorRef = useRef<{ x: number; y: number } | null>(null)
  function setCursorPointCoalesced(next: { x: number; y: number } | null) {
    pendingCursorRef.current = next
    perfCountersRef.current.cursorWrites += 1
    if (cursorRafRef.current != null) return
    cursorRafRef.current = window.requestAnimationFrame(() => {
      cursorRafRef.current = null
      perfCountersRef.current.cursorCommits += 1
      setCursorPoint(pendingCursorRef.current)
    })
  }

  useEffect(() => {
    return () => {
      if (viewBoxRafRef.current != null) window.cancelAnimationFrame(viewBoxRafRef.current)
      if (viewBoxAttrRafRef.current != null) window.cancelAnimationFrame(viewBoxAttrRafRef.current)
      if (cursorRafRef.current != null) window.cancelAnimationFrame(cursorRafRef.current)
    }
  }, [])

  function getHandleScale() {
    return Math.max(0.2, currentViewBox.width / Math.max(baseViewBox.width, 1))
  }

  function getOverlayScale() {
    const matrix = getRenderMatrix()
    if (!matrix) return 1
    const scaleX = Math.hypot(matrix.a, matrix.b)
    const scaleY = Math.hypot(matrix.c, matrix.d)
    return Math.max(scaleX, scaleY) || 1
  }

  function effectiveHandleScale() {
    return getHandleScale() / getOverlayScale()
  }

  function refreshPathMetas(fromSvg: string) {
    try {
      const doc = new DOMParser().parseFromString(fromSvg, 'image/svg+xml')
      const svg = doc.documentElement
      const paths = Array.from(svg.querySelectorAll('path[d]'))
      const hidden: number[] = []
      setPathMetas(
        paths.map((p, index) => {
          const groupId = p.closest('g')?.getAttribute('id') || ''
          const style = (p.getAttribute('style') || '').toLowerCase()
          const displayAttr = (p.getAttribute('display') || '').toLowerCase()
          const isHidden = displayAttr === 'none' || style.includes('display:none')
          if (isHidden) hidden.push(index)
          return {
            index,
            label: getPathLabel(p, index),
            d: p.getAttribute('d') || '',
            id: p.getAttribute('id') || '',
            dataLabel: p.getAttribute('data-label') || '',
            groupId,
            fill: p.getAttribute('fill') || '',
            stroke: p.getAttribute('stroke') || '',
            strokeWidth: p.getAttribute('stroke-width') || '',
            opacity: p.getAttribute('opacity') || '',
            hidden: isHidden,
          }
        }),
      )
      setHiddenPathIndexes(hidden)
      return paths.length
    } catch {
      setPathMetas([])
      setHiddenPathIndexes([])
      return 0
    }
  }

  function setPathHidden(index: number, hidden: boolean) {
    if (!sourceSvg) return
    try {
      const doc = new DOMParser().parseFromString(sourceSvg, 'image/svg+xml')
      const svg = doc.documentElement
      const paths = Array.from(svg.querySelectorAll('path[d]'))
      const target = paths[index]
      if (!target) return

      if (hidden) {
        target.setAttribute('display', 'none')
      } else {
        if ((target.getAttribute('display') || '').toLowerCase() === 'none') target.removeAttribute('display')
        const style = target.getAttribute('style')
        if (style && style.toLowerCase().includes('display')) {
          const cleaned = style
            .split(';')
            .map((s) => s.trim())
            .filter((s) => s && !s.toLowerCase().startsWith('display:'))
            .join('; ')
          if (cleaned) target.setAttribute('style', cleaned)
          else target.removeAttribute('style')
        }
      }

      const serialized = new XMLSerializer().serializeToString(svg)
      setSourceSvg(serialized)

      const nextHidden = new Set(useEditorStore.getState().hiddenPathIndexes)
      if (hidden) nextHidden.add(index)
      else nextHidden.delete(index)
      setHiddenPathIndexes(Array.from(nextHidden).sort((a, b) => a - b))
    } catch {
      // ignore
    }
  }

  function addNewLayerGroup(label?: string) {
    if (!sourceSvg) return
    try {
      // eslint-disable-next-line react-hooks/purity
      const now = Date.now()
      pushHistory()
      const doc = new DOMParser().parseFromString(sourceSvg, 'image/svg+xml')
      const svg = doc.documentElement
      const g = doc.createElementNS('http://www.w3.org/2000/svg', 'g')
      g.setAttribute('id', label ? label.replace(/\s+/g, '-').toLowerCase() : `layer-${now}`)
      svg.appendChild(g)
      const serialized = new XMLSerializer().serializeToString(svg)
      setSourceSvg(serialized)
      refreshPathMetas(serialized)
      setStatus('Added new layer group (<g>).')
    } catch (e) {
      setStatus(`Could not add layer: ${(e as Error).message}`)
    }
  }

  function addNewPathToRoot() {
    if (!sourceSvg) return
    try {
      // eslint-disable-next-line react-hooks/purity
      const now = Date.now()
      pushHistory()
      const doc = new DOMParser().parseFromString(sourceSvg, 'image/svg+xml')
      const svg = doc.documentElement
      const p = doc.createElementNS('http://www.w3.org/2000/svg', 'path')
      p.setAttribute('fill', 'none')
      p.setAttribute('stroke', '#111')
      p.setAttribute('stroke-width', '2')
      p.setAttribute('d', 'M 0 0\nL 50 0\nL 50 30\nL 0 30\nZ')
      p.setAttribute('id', `path-${now}`)
      svg.appendChild(p)

      const serialized = new XMLSerializer().serializeToString(svg)
      setSourceSvg(serialized)
      const count = refreshPathMetas(serialized)
      if (count > 0) setSelectedPathIndex(count - 1)
      setStatus('Added new path and selected it.')
    } catch (e) {
      setStatus(`Could not add path: ${(e as Error).message}`)
    }
  }

  function addNewPathFromCommands(newCommands: PathCommand[], opts?: { label?: string; newLayer?: boolean }) {
    if (!sourceSvg) return
    try {
      // eslint-disable-next-line react-hooks/purity
      const now = Date.now()
      pushHistory()
      const doc = new DOMParser().parseFromString(sourceSvg, 'image/svg+xml')
      const svg = doc.documentElement

      const p = doc.createElementNS('http://www.w3.org/2000/svg', 'path')
      p.setAttribute('d', buildPath(newCommands))
      p.setAttribute('id', `path-${now}`)
      if (opts?.label) p.setAttribute('data-label', opts.label)
      p.setAttribute('fill', 'none')
      p.setAttribute('stroke', '#111')
      p.setAttribute('stroke-width', '2')

      if (opts?.newLayer) {
        const g = doc.createElementNS('http://www.w3.org/2000/svg', 'g')
        g.setAttribute('id', `layer-${now}`)
        g.appendChild(p)
        svg.appendChild(g)
      } else {
        svg.appendChild(p)
      }

      const serialized = new XMLSerializer().serializeToString(svg)
      setSourceSvg(serialized)
      const count = refreshPathMetas(serialized)
      if (count > 0) setSelectedPathIndex(count - 1)
      setStatus('Added drawn path.')
    } catch (e) {
      setStatus(`Could not add drawn path: ${(e as Error).message}`)
    }
  }

  function deletePathAtIndex(index: number) {
    if (!sourceSvg) return
    try {
      pushHistory()
      const doc = new DOMParser().parseFromString(sourceSvg, 'image/svg+xml')
      const svg = doc.documentElement
      const paths = Array.from(svg.querySelectorAll('path[d]'))
      const target = paths[index]
      if (!target || !target.parentNode) {
        setStatus('Could not delete: path not found.')
        return
      }
      target.parentNode.removeChild(target)

      const serialized = new XMLSerializer().serializeToString(svg)
      setSourceSvg(serialized)
      const count = refreshPathMetas(serialized)

      setSelectedIndices([])
      setDrag({ active: false, startLocal: null, originalCommands: null })
      setSelectionBox({ active: false, start: null, current: null })
      setPan({ active: false, start: null })

      if (!count) {
        setSelectedPathIndex(-1)
        setCommands([])
        setStatus('Deleted path. No paths remain.')
        return
      }

      const nextIndex = Math.min(index, count - 1)
      setSelectedPathIndex(nextIndex)
      setStatus('Deleted path.')
    } catch (e) {
      setStatus(`Could not delete path: ${(e as Error).message}`)
    }
  }

  function deleteLayerForPath(index: number) {
    if (!sourceSvg) return
    try {
      const doc = new DOMParser().parseFromString(sourceSvg, 'image/svg+xml')
      const svg = doc.documentElement
      const paths = Array.from(svg.querySelectorAll('path[d]'))
      const target = paths[index]
      if (!target) {
        setStatus('Could not delete layer: path not found.')
        return
      }

      // Only delete a layer group when it contains exactly this one path.
      // This prevents accidentally deleting a large group that contains many paths.
      const findSinglePathGroup = () => {
        let g = (target.parentElement?.closest('g') as SVGGElement | null) ?? (target.closest('g') as SVGGElement | null)
        while (g) {
          const groupPaths = Array.from(g.querySelectorAll('path[d]'))
          if (groupPaths.length === 1 && groupPaths[0] === target) return g
          g = g.parentElement?.closest('g') as SVGGElement | null
        }
        return null
      }

      const parentGroup = findSinglePathGroup()
      if (!parentGroup) {
        setStatus('Layer contains multiple paths (or no layer group). Use “Delete path” instead.')
        return
      }

      pushHistory()
      parentGroup.parentNode?.removeChild(parentGroup)

      const serialized = new XMLSerializer().serializeToString(svg)
      setSourceSvg(serialized)
      const count = refreshPathMetas(serialized)

      setSelectedIndices([])
      setDrag({ active: false, startLocal: null, originalCommands: null })
      setSelectionBox({ active: false, start: null, current: null })
      setPan({ active: false, start: null })

      if (!count) {
        setSelectedPathIndex(-1)
        setCommands([])
        setStatus('Deleted layer. No paths remain.')
        return
      }
      setSelectedPathIndex(Math.min(selectedPathIndex, count - 1))
      setStatus('Deleted layer group (<g>).')
    } catch (e) {
      setStatus(`Could not delete layer: ${(e as Error).message}`)
    }
  }

  function openRenameDialog(kind: 'path' | 'layer', index: number) {
    if (!sourceSvg) return
    try {
      const doc = new DOMParser().parseFromString(sourceSvg, 'image/svg+xml')
      const svg = doc.documentElement
      const paths = Array.from(svg.querySelectorAll('path[d]'))
      const target = paths[index]
      if (!target) return

      if (kind === 'path') {
        const current = target.getAttribute('data-label') || target.getAttribute('id') || `Path ${index + 1}`
        setRenameDraft(current)
      } else {
        const g = target.closest('g') as SVGGElement | null
        if (!g) {
          setStatus('Path is not inside a <g> layer.')
          return
        }
        const current = g.getAttribute('id') || 'layer'
        setRenameDraft(current)
      }

      setRenameTarget({ kind, index })
      setRenameDialogOpen(true)
    } catch {
      // ignore
    }
  }

  function applyRename() {
    if (!renameTarget || !sourceSvg) return
    const { kind, index } = renameTarget
    try {
      const doc = new DOMParser().parseFromString(sourceSvg, 'image/svg+xml')
      const svg = doc.documentElement
      const paths = Array.from(svg.querySelectorAll('path[d]'))
      const target = paths[index]
      if (!target) return

      const trimmed = renameDraft.trim()
      if (kind === 'path') {
        if (trimmed) target.setAttribute('data-label', trimmed)
        else target.removeAttribute('data-label')
      } else {
        const g = target.closest('g') as SVGGElement | null
        if (!g) {
          setStatus('Path is not inside a <g> layer.')
          return
        }
        if (trimmed) g.setAttribute('id', trimmed)
        else g.removeAttribute('id')
      }

      pushHistory()
      const serialized = new XMLSerializer().serializeToString(svg)
      setSourceSvg(serialized)
      refreshPathMetas(serialized)
      setRenameDialogOpen(false)
      setRenameTarget(null)
      setStatus(kind === 'path' ? 'Renamed path.' : 'Renamed layer.')
    } catch (e) {
      setStatus(`Could not rename: ${(e as Error).message}`)
    }
  }

  function movePathAtIndex(index: number, direction: -1 | 1) {
    if (!sourceSvg) return
    try {
      const doc = new DOMParser().parseFromString(sourceSvg, 'image/svg+xml')
      const svg = doc.documentElement
      const paths = Array.from(svg.querySelectorAll('path[d]'))
      const target = paths[index]
      if (!target) return

      let id = target.getAttribute('id')
      if (!id) {
        // eslint-disable-next-line react-hooks/purity
        const now = Date.now()
        id = `path-${now}`
        target.setAttribute('id', id)
      }

      const moved = moveElementWithinParent(target, direction)
      if (!moved) return

      pushHistory()
      const serialized = new XMLSerializer().serializeToString(svg)
      setSourceSvg(serialized)
      refreshPathMetas(serialized)
      const metas = useEditorStore.getState().pathMetas
      const nextIndex = metas.findIndex((m) => m.id === id)
      if (nextIndex >= 0) setSelectedPathIndex(nextIndex)
      setStatus(direction === -1 ? 'Moved path up.' : 'Moved path down.')
    } catch (e) {
      setStatus(`Could not move path: ${(e as Error).message}`)
    }
  }

  function extractSelectionToNewPath(opts?: { ownLayer?: boolean }) {
    if (!sourceSvg || selectedPathIndex < 0) {
      setStatus('No active path.')
      return
    }

    const indices = selectedIndices
      .filter((i) => commands[i] && commands[i].type !== 'Z')
      .slice()
      .sort((a, b) => a - b)

    if (!indices.length) {
      setStatus('Select one or more nodes to extract.')
      return
    }

    const min = indices[0]
    const max = indices[indices.length - 1]

    // Must be contiguous to be a clean extract.
    for (let i = 1; i < indices.length; i += 1) {
      if (indices[i] !== indices[i - 1] + 1) {
        setStatus('Selection must be a continuous range to extract.')
        return
      }
    }

    // Must not cross subpaths.
    const slice = commands.slice(min, max + 1)
    if (slice.some((c) => c.type === 'Z')) {
      setStatus('Selection cannot cross a subpath close (Z).')
      return
    }

    try {
      // eslint-disable-next-line react-hooks/purity
      const now = Date.now()
      pushHistory()

      const doc = new DOMParser().parseFromString(sourceSvg, 'image/svg+xml')
      const svg = doc.documentElement
      const paths = Array.from(svg.querySelectorAll('path[d]'))
      const sourcePath = paths[selectedPathIndex]
      if (!sourcePath) {
        setStatus('Active path not found in SVG.')
        return
      }

      // Build new d from selected commands.
      const points = indices.map((i) => commands[i]).filter((c): c is { type: 'M' | 'L'; x: number; y: number } => c.type !== 'Z')
      const newCommands: PathCommand[] = points.map((p, idx) => ({
        type: idx === 0 ? 'M' : 'L',
        x: p.x,
        y: p.y,
      }))

      // When splitting/extracting into its own layer/path, users typically expect a closed shape.
      // Only close when we have at least 3 points; otherwise Z is not meaningful.
      if (points.length >= 3) newCommands.push({ type: 'Z' })
      const newD = buildPath(newCommands)

      const newPath = doc.createElementNS('http://www.w3.org/2000/svg', 'path')
      newPath.setAttribute('d', newD)

      // Copy appearance attributes from source path.
      ;['fill', 'stroke', 'stroke-width', 'opacity', 'fill-rule'].forEach((attr) => {
        const v = sourcePath.getAttribute(attr)
        if (v !== null) newPath.setAttribute(attr, v)
      })

      newPath.setAttribute('id', `path-${now}`)
      newPath.setAttribute('data-label', 'extracted')

      // Insert next to the source path so it preserves the same transform context.
      const parent = sourcePath.parentNode
      const intoOwnLayer = opts?.ownLayer ?? extractToNewLayer
      if (intoOwnLayer) {
        const g = doc.createElementNS('http://www.w3.org/2000/svg', 'g')
        g.setAttribute('id', `layer-${now}`)
        g.appendChild(newPath)
        if (parent) parent.insertBefore(g, sourcePath.nextSibling)
        else svg.appendChild(g)
      } else {
        if (parent) parent.insertBefore(newPath, sourcePath.nextSibling)
        else svg.appendChild(newPath)
      }

      // Delete extracted nodes from original commands.
      const nextCommands = commands.slice()

      // If we're removing the subpath start (M), we should keep the remaining subpath connected.
      // deleteIndicesFromCommands will convert the next point to M when deleting M; that's correct.
      // For mid-subpath extractions, we want the path to remain continuous (no unexpected M break).
      const deletingStartMove = indices.includes(min) && commands[min]?.type === 'M'
      const beforeIndex = min - 1
      const afterIndex = max + 1
      const before = beforeIndex >= 0 ? commands[beforeIndex] : null
      const after = afterIndex < commands.length ? commands[afterIndex] : null

      deleteIndicesFromCommands(nextCommands, new Set(indices))

      // Reconnect: if we cut a middle segment (L..L) out, ensure the next point is an L (not M).
      // We only do this when both neighbors exist and we're not cutting from a subpath start.
      if (!deletingStartMove && before && after && before.type !== 'Z' && after.type !== 'Z') {
        // Find where the original `afterIndex` ended up in the new array.
        // Everything before `min` remains, then we removed (max-min+1) items.
        const removedCount = indices.length
        const newAfterIndex = afterIndex - removedCount
        const candidate = nextCommands[newAfterIndex]
        if (candidate && candidate.type !== 'Z') {
          // If extraction caused a break (candidate is M), stitch it back.
          if (candidate.type === 'M') {
            candidate.type = 'L'
          }
        }
      }

      // If we deleted from subpath start and there's a remaining point, keep it as M.
      // (No extra work needed; deleteIndicesFromCommands already handles this.)

      setCommands(nextCommands)
      sourcePath.setAttribute('d', buildPath(nextCommands))

      const serialized = new XMLSerializer().serializeToString(svg)
      setSourceSvg(serialized)
      const count = refreshPathMetas(serialized)

      // Select the newly added path by id (not necessarily last).
      if (count > 0) {
        const metas = useEditorStore.getState().pathMetas
        const nextIndex = metas.findIndex((m) => m.id === `path-${now}`)
        setSelectedPathIndex(nextIndex >= 0 ? nextIndex : count - 1)
      }
      setSelectedIndices([])
      setStatus(intoOwnLayer ? 'Extracted selection into a new path (own layer).' : 'Extracted selection into a new path.')
    } catch (e) {
      setStatus(`Could not extract selection: ${(e as Error).message}`)
    }
  }

  function syncCommandsToSource(nextCommands: PathCommand[]) {
    if (!sourceSvg || selectedPathIndex < 0) return
    try {
      const doc = new DOMParser().parseFromString(sourceSvg, 'image/svg+xml')
      const svg = doc.documentElement
      const paths = Array.from(svg.querySelectorAll('path[d]'))
      const target = paths[selectedPathIndex]
      if (!target) return

      const d = buildPath(nextCommands)
      target.setAttribute('d', d)
      const serialized = new XMLSerializer().serializeToString(svg)
      setSourceSvg(serialized)

      // Update just the active list item to avoid re-parsing state during drag.
      setPathMetas(
        useEditorStore.getState().pathMetas.map((m) => (m.index === selectedPathIndex ? { ...m, d } : m)),
      )
    } catch {
      // ignore
    }
  }

  function snapshot() {
    return {
      selectedPathIndex,
      svg: sourceSvg,
      commands: commands.map((c) => ({ ...c })) as PathCommand[],
    }
  }

  function pushHistory() {
    if (!sourceSvg || selectedPathIndex < 0) return
    pushUndo(snapshot())
    clearRedo()
  }

  function applySnapshot(snap: { selectedPathIndex: number; svg: string; commands: PathCommand[] }) {
    const preservedBase = { ...baseViewBox }
    const preservedCurrent = { ...currentViewBox }

    setSourceSvg(snap.svg)
    refreshPathMetas(snap.svg)
    setSelectedPathIndex(snap.selectedPathIndex)
    setCommands(snap.commands)
    setSelectedIndices([])
    setDrag({ active: false, startLocal: null, originalCommands: null })
    setSelectionBox({ active: false, start: null, current: null })
    setPan({ active: false, start: null })
    setXInput('')
    setYInput('')

    setBaseViewBox(preservedBase)
    setViewBox(preservedCurrent)
    syncCommandsToSource(snap.commands)
  }

  function undo() {
    const prev = popUndo()
    if (!prev) return
    pushRedo(snapshot())
    applySnapshot(prev)
    setStatus('Undo')
  }

  function redo() {
    const next = popRedo()
    if (!next) return
    pushUndo(snapshot())
    applySnapshot(next)
    setStatus('Redo')
  }

  function updateSelectedPointInputs(nextSelected = selectedIndices, cmds = commands) {
    if (nextSelected.length !== 1) {
      setXInput('')
      setYInput('')
      setStatus(`${nextSelected.length} points selected.`)
      return
    }

    const index = nextSelected[0]
    const cmd = cmds[index]
    if (!cmd || cmd.type === 'Z') return
    setXInput(formatNumber(cmd.x))
    setYInput(formatNumber(cmd.y))
    setStatus(`Selected ${cmd.type} point at index ${index}: x=${formatNumber(cmd.x)}, y=${formatNumber(cmd.y)}`)
  }

  function pushLog(line: string) {
    const msg = String(line ?? '').trim()
    if (!msg) return
    setLogLines((prev) => {
      const next = prev.concat([msg])
      return next.length > LOG_HISTORY_LIMIT ? next.slice(next.length - LOG_HISTORY_LIMIT) : next
    })
  }

  function selectOnlyPoint(index: number) {
    setSelectedIndices([index])
    setRangeStartIndex(index)
    updateSelectedPointInputs([index])
  }

  function togglePointSelection(index: number) {
    const next = new Set(selectedIndices)
    if (next.has(index)) next.delete(index)
    else next.add(index)
    const arr = Array.from(next)
    setSelectedIndices(arr)
    setRangeStartIndex(index)
    updateSelectedPointInputs(arr)
  }

  function findSubpathBounds(index: number) {
    let start = index
    let end = index
    for (let i = index; i >= 0; i -= 1) {
      if (commands[i]?.type === 'Z') {
        start = i + 1
        break
      }
      start = i
    }
    for (let i = index; i < commands.length; i += 1) {
      if (commands[i]?.type === 'Z') {
        end = i - 1
        break
      }
      end = i
    }
    return { start, end }
  }

  function selectRangeToIndex(index: number) {
    const { start, end } = findSubpathBounds(index)
    const next: number[] = []
    for (let i = start; i <= end; i += 1) {
      if (commands[i] && commands[i].type !== 'Z') next.push(i)
    }
    setSelectedIndices(next)
    setRangeStartIndex(start)
    updateSelectedPointInputs(next)
    setStatus(`Selected subpath (${start} -> ${end}) with ${next.length} nodes.`)
  }

  function clearSelection() {
    setSelectedIndices([])
    setRangeStartIndex(null)
    updateSelectedPointInputs([])
  }

  function addPoint(insertIndex: number, x: number, y: number) {
    const snapped = snapPoint({ x, y }, snapToGrid, gridSize)
    pushHistory()
    const next = commands.slice()
    next.splice(insertIndex, 0, { type: 'L', x: snapped.x, y: snapped.y })
    setCommands(next)
    syncCommandsToSource(next)
    setSelectedIndices([insertIndex])
    updateSelectedPointInputs([insertIndex])
    setStatus(`Added L point at index ${insertIndex}: x=${formatNumber(snapped.x)}, y=${formatNumber(snapped.y)}`)
  }

  function moveSelectedPoints(currentLocalPoint: DOMPoint) {
    if (!drag.active || !drag.startLocal || !drag.originalCommands) return
    if (!drag.hasHistory) {
      pushHistory()
      setDrag({ ...drag, hasHistory: true })
    }

    const snappedCurrent = snapPoint({ x: currentLocalPoint.x, y: currentLocalPoint.y }, snapToGrid, gridSize)
    const snappedStart = snapPoint({ x: drag.startLocal.x, y: drag.startLocal.y }, snapToGrid, gridSize)
    const dx = snappedCurrent.x - snappedStart.x
    const dy = snappedCurrent.y - snappedStart.y

    const base = drag.originalCommands!
    const next = base.map((c, i) => {
      if (c.type === 'Z') return c
      if (!selectedIndicesSet.has(i)) return c
      return { ...c, x: c.x + dx, y: c.y + dy }
    })

    setCommands(next)
    syncCommandsToSource(next)
    updateSelectedPointInputs(undefined, next)
  }

  function deleteSelectedPoints(indicesOverride?: number[]) {
    const indices = (indicesOverride ?? selectedIndices).slice()
    if (!indices.length) {
      setStatus('Select one or more points first.')
      return
    }

    pushHistory()
    const next = commands.slice()
    const deletedCount = deleteIndicesFromCommands(next, new Set(indices))
    setCommands(next)
    syncCommandsToSource(next)
    setSelectedIndices([])
    setDrag({ active: false, startLocal: null, originalCommands: null })
    setXInput('')
    setYInput('')
    setStatus(`Deleted ${deletedCount} point${deletedCount === 1 ? '' : 's'}.`)
  }

  function selectAllNodes() {
    const all = commands.map((c, i) => (c.type === 'Z' ? null : i)).filter((v): v is number => v !== null)
    setSelectedIndices(all)
    updateSelectedPointInputs(all)
    setStatus(`${all.length} nodes selected.`)
  }

  function copySelectedSection() {
    const indices = selectedIndices
      .filter((i) => commands[i] && commands[i].type !== 'Z')
      .slice()
      .sort((a, b) => a - b)
    if (!indices.length) {
      setStatus('Select one or more continuous nodes to copy.')
      return
    }

    const copied = indices.map((i) => {
      const c = commands[i] as { type: 'M' | 'L'; x: number; y: number }
      return { type: 'L' as const, x: c.x, y: c.y }
    })
    setClipboardCommands(copied)
    setClipboardPath(null)
    setStatus(`Copied ${copied.length} node${copied.length === 1 ? '' : 's'}.`)
  }

  function copyActivePathToClipboard() {
    if (selectedPathIndex < 0) {
      setStatus('No active path to copy.')
      return
    }
    const meta = pathMetas[selectedPathIndex]
    if (!meta?.d) {
      setStatus('Active path not found.')
      return
    }

    try {
      const doc = new DOMParser().parseFromString(sourceSvg, 'image/svg+xml')
      const svg = doc.documentElement
      const paths = Array.from(svg.querySelectorAll('path[d]'))
      const sourcePath = paths[selectedPathIndex]
      if (!sourcePath) {
        setStatus('Active path not found in SVG.')
        return
      }
      const attrs: Record<string, string> = {}
      ;['fill', 'stroke', 'stroke-width', 'opacity', 'fill-rule', 'data-label'].forEach((attr) => {
        const v = sourcePath.getAttribute(attr)
        if (v !== null) attrs[attr] = v
      })
      setClipboardPath({ d: meta.d, attrs })
      setClipboardCommands([])
      setStatus('Copied active path.')
    } catch (e) {
      setStatus(`Could not copy path: ${(e as Error).message}`)
    }
  }

  function pasteSectionAfterSelected() {
    // Prefer object paste if present.
    if (clipboardPath) {
      if (!sourceSvg || selectedPathIndex < 0) {
        setStatus('No active path to paste into.')
        return
      }
      try {
        // eslint-disable-next-line react-hooks/purity
        const now = Date.now()
        pushHistory()
        const doc = new DOMParser().parseFromString(sourceSvg, 'image/svg+xml')
        const svg = doc.documentElement
        const paths = Array.from(svg.querySelectorAll('path[d]'))
        const sourcePath = paths[selectedPathIndex]
        if (!sourcePath) {
          setStatus('Active path not found in SVG.')
          return
        }

        const newPath = doc.createElementNS('http://www.w3.org/2000/svg', 'path')
        newPath.setAttribute('d', clipboardPath.d)
        Object.entries(clipboardPath.attrs).forEach(([k, v]) => newPath.setAttribute(k, v))
        newPath.setAttribute('id', `path-${now}`)

        const parent = sourcePath.parentNode
        if (parent) parent.insertBefore(newPath, sourcePath.nextSibling)
        else svg.appendChild(newPath)

        const serialized = new XMLSerializer().serializeToString(svg)
        setSourceSvg(serialized)
        const count = refreshPathMetas(serialized)
        if (count > 0) setSelectedPathIndex(count - 1)
        setSelectedIndices([])
        setStatus('Pasted path as a new path.')
      } catch (e) {
        setStatus(`Could not paste path: ${(e as Error).message}`)
      }
      return
    }

    if (!clipboardCommands.length) {
      setStatus('Copy a path or a section first.')
      return
    }

    const selectedSorted = selectedIndices.slice().sort((a, b) => a - b)
    const lastNonZ = (() => {
      for (let i = commands.length - 1; i >= 0; i -= 1) {
        if (commands[i]?.type !== 'Z') return i
      }
      return -1
    })()

    const insertAfter = selectedSorted.length ? selectedSorted[selectedSorted.length - 1] : lastNonZ
    const insertIndex = Math.max(insertAfter + 1, 0)
    const pasted = clipboardCommands.map((c) => ({ ...c }))

    pushHistory()
    const next = commands.slice()
    next.splice(insertIndex, 0, ...pasted)
    setCommands(next)
    syncCommandsToSource(next)

    const nextSel = Array.from({ length: pasted.length }, (_, i) => insertIndex + i)
    setSelectedIndices(nextSel)
    updateSelectedPointInputs(nextSel)
    setStatus(`Pasted ${pasted.length} node${pasted.length === 1 ? '' : 's'}.`)
  }

  // (globalHandlersRef is populated later, after function declarations)

  function applyPointXY(opts?: { x?: string; y?: string }) {
    if (selectedIndices.length !== 1) {
      setStatus('Select exactly one point to edit X/Y.')
      return
    }

    const index = selectedIndices[0]
    const xRaw = (opts?.x ?? xInput).trim()
    const yRaw = (opts?.y ?? yInput).trim()
    const x = snapValue(Number(xRaw), snapToGrid, gridSize)
    const y = snapValue(Number(yRaw), snapToGrid, gridSize)
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      setStatus('Enter valid X and Y numbers.')
      return
    }

    pushHistory()
    const next = commands.slice()
    const cmd = next[index]
    if (cmd && cmd.type !== 'Z') next[index] = { ...cmd, x, y }
    setCommands(next)
    syncCommandsToSource(next)
    updateSelectedPointInputs()
  }

  function openPointEditorForIndex(index: number) {
    const cmd = commands[index]
    if (!cmd || cmd.type === 'Z') return
    setPointEditorX(formatNumber(cmd.x))
    setPointEditorY(formatNumber(cmd.y))
    setPointEditorOpen(true)
  }

  function applyPointEditor() {
    // Use the same underlying behavior and snapping as applyPointXY.
    applyPointXY({ x: pointEditorX, y: pointEditorY })
    setPointEditorOpen(false)
  }

  function transformSelectedNodes(transformer: (x: number, y: number, bounds: Bounds) => { x: number; y: number }, label: string) {
    const indices = getTransformTargetIndices(commands, selectedIndices)
    if (!indices.length) {
      setStatus('No nodes available to transform.')
      return
    }

    pushHistory()
    const pts = indices.map((i) => commands[i]).filter(Boolean) as Array<{ type: 'M' | 'L'; x: number; y: number }>
    const xs = pts.map((p) => p.x)
    const ys = pts.map((p) => p.y)
    const bounds: Bounds = {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
      centerX: (Math.min(...xs) + Math.max(...xs)) / 2,
      centerY: (Math.min(...ys) + Math.max(...ys)) / 2,
    }

    const next = commands.map((c, i) => {
      if (c.type === 'Z') return c
      if (!indices.includes(i)) return c
      const out = transformer(c.x, c.y, bounds)
      const snapped = snapPoint(out, snapToGrid, gridSize)
      return { ...c, x: snapped.x, y: snapped.y }
    })

    setCommands(next)
    syncCommandsToSource(next)
    updateSelectedPointInputs()
    setStatus(`${label} applied to ${indices.length} node${indices.length === 1 ? '' : 's'}.`)
  }

  function zoomAt(event: WheelEvent) {
    event.preventDefault()
    const mouse = getEditorPointFromEvent(event)
    if (!mouse) return

    const factor = event.deltaY < 0 ? 0.85 : 1.15
    const nextWidth = currentViewBox.width * factor
    const nextHeight = currentViewBox.height * factor
    const minWidth = baseViewBox.width / 40
    const maxWidth = baseViewBox.width * 8
    if (nextWidth < minWidth || nextWidth > maxWidth) return

    const relativeX = (mouse.x - currentViewBox.x) / currentViewBox.width
    const relativeY = (mouse.y - currentViewBox.y) / currentViewBox.height
    const next = {
      x: mouse.x - nextWidth * relativeX,
      y: mouse.y - nextHeight * relativeY,
      width: nextWidth,
      height: nextHeight,
    }
    setViewBox(next)
  }

  function zoomByFactor(factor: number) {
    const nextWidth = currentViewBox.width * factor
    const nextHeight = currentViewBox.height * factor
    const minWidth = baseViewBox.width / 40
    const maxWidth = baseViewBox.width * 8
    if (nextWidth < minWidth || nextWidth > maxWidth) return

    const cx = currentViewBox.x + currentViewBox.width / 2
    const cy = currentViewBox.y + currentViewBox.height / 2
    const relativeX = (cx - currentViewBox.x) / currentViewBox.width
    const relativeY = (cy - currentViewBox.y) / currentViewBox.height

    const next = {
      x: cx - nextWidth * relativeX,
      y: cy - nextHeight * relativeY,
      width: nextWidth,
      height: nextHeight,
    }
    setViewBox(next)
  }

  function zoomIn() {
    zoomByFactor(0.85)
  }

  function zoomOut() {
    zoomByFactor(1.15)
  }

  function setZoomPercent(percent: number) {
    // Same limits as zoomAt/zoomByFactor, but driven by an explicit percent.
    const p = percent
    if (!Number.isFinite(p) || p <= 0) {
      setStatus('Enter a valid zoom percent.')
      return
    }

    const targetWidth = baseViewBox.width / (p / 100)
    const targetHeight = baseViewBox.height / (p / 100)
    const minWidth = baseViewBox.width / 40
    const maxWidth = baseViewBox.width * 8
    if (targetWidth < minWidth || targetWidth > maxWidth) {
      setStatus('Zoom percent is out of range.')
      return
    }

    const cx = currentViewBox.x + currentViewBox.width / 2
    const cy = currentViewBox.y + currentViewBox.height / 2
    setViewBox({
      x: cx - targetWidth / 2,
      y: cy - targetHeight / 2,
      width: targetWidth,
      height: targetHeight,
    })
  }

  function finishBoxSelection() {
    const latest = useEditorStore.getState().selectionBox
    if (!latest.active || !latest.start || !latest.current) return
    const x1 = Math.min(latest.start.x, latest.current.x)
    const y1 = Math.min(latest.start.y, latest.current.y)
    const x2 = Math.max(latest.start.x, latest.current.x)
    const y2 = Math.max(latest.start.y, latest.current.y)
    const matrix = getRenderMatrix()

    const next: number[] = []
    commands.forEach((c, i) => {
      if (c.type === 'Z') return
      const p = transformPoint(matrix, c.x, c.y, svgRef.current)
      if (p.x >= x1 && p.x <= x2 && p.y >= y1 && p.y <= y2) next.push(i)
    })
    setSelectedIndices(next)
    updateSelectedPointInputs(next)
    setStatus(`${next.length} nodes selected.`)
  }

  useEffect(() => {
    // Avoid reattaching global listeners by routing through a ref.
    globalHandlersRef.current = {
      finishBoxSelection,
      clearSelection,
      undo,
      redo,
      copyActivePathToClipboard,
      pasteSectionAfterSelected,
      deleteSelectedPoints,
      addNewPathFromCommands,
      setDrawTool,
      setCurrentViewBox,
      setDrag,
      setPan,
      setSelectionBox,
    }
  })

  function loadSvg() {
    try {
      if (!svgInput.trim()) {
        setStatus('Open an SVG to begin.')
        return
      }
      const doc = new DOMParser().parseFromString(svgInput, 'image/svg+xml')
      const parserError = doc.querySelector('parsererror')
      if (parserError) throw new Error('Invalid SVG markup.')
      const svg = doc.documentElement
      if (svg.tagName.toLowerCase() !== 'svg') throw new Error('Input must contain an <svg> root element.')

      const serialized = new XMLSerializer().serializeToString(svg)
      setSourceSvg(serialized)
      lastSavedSvgRef.current = serialized
      setLastSavedSvg(serialized)
      clearHistory()
      setSelectedIndices([])
      setDrag({ active: false, startLocal: null, originalCommands: null })
      setSelectionBox({ active: false, start: null, current: null })
      setPan({ active: false, start: null })

      const count = refreshPathMetas(serialized)
      if (!count) {
        setStatus('No <path d="..."> elements found.')
        return
      }
      setSelectedPathIndex(0)
      setStatus(`Loaded SVG with ${count} editable paths.`)
    } catch (e) {
      setStatus((e as Error).message)
    }
  }

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text)
      setStatus(`${label} copied.`)
    } catch {
      setStatus(`Could not copy ${label}. Select it manually from the output field.`)
    }
  }

  async function onOpenFile() {
    try {
      const result = await openSvgFile()
      if (!result.text) return
      setFileHandle(result.handle, result.name)
      setSvgInput(result.text)
      setStatus(`Loaded file: ${result.name || 'untitled'}`)

      const doc = new DOMParser().parseFromString(result.text, 'image/svg+xml')
      const parserError = doc.querySelector('parsererror')
      if (parserError) throw new Error('Invalid SVG markup.')
      const svg = doc.documentElement
      if (svg.tagName.toLowerCase() !== 'svg') throw new Error('Input must contain an <svg> root element.')
      const serialized = new XMLSerializer().serializeToString(svg)
      setSourceSvg(serialized)
      lastSavedSvgRef.current = serialized
      setLastSavedSvg(serialized)
      clearHistory()
      setSelectedIndices([])
      setDrag({ active: false, startLocal: null, originalCommands: null })
      setSelectionBox({ active: false, start: null, current: null })
      setPan({ active: false, start: null })

      const count = refreshPathMetas(serialized)
      if (!count) {
        setStatus('No <path d="..."> elements found.')
        return
      }
      setSelectedPathIndex(0)
    } catch (e) {
      setStatus((e as Error).message)
    }
  }

  async function onSaveFile(forceSaveAs?: boolean) {
    try {
      if (!sourceSvg) {
        setStatus('Nothing to save yet.')
        return
      }
      const result = await saveSvgFile({
        handle: forceSaveAs ? null : fileHandle,
        suggestedName: fileName || 'edited.svg',
        text: sourceSvg,
      })
      setFileHandle(result.handle, result.name)
      lastSavedSvgRef.current = sourceSvg
      setLastSavedSvg(sourceSvg)
      setStatus(`Saved: ${result.name || 'downloaded'}`)
    } catch (e) {
      setStatus((e as Error).message)
    }
  }

  function applyActivePathProperties() {
    if (!sourceSvg || selectedPathIndex < 0) return
    try {
      pushHistory()
      const doc = new DOMParser().parseFromString(sourceSvg, 'image/svg+xml')
      const svg = doc.documentElement
      const paths = Array.from(svg.querySelectorAll('path[d]'))
      const target = paths[selectedPathIndex]
      if (!target) return

      const trimmedLabel = pathLabelDraft.trim()
      if (trimmedLabel) target.setAttribute('data-label', trimmedLabel)
      else target.removeAttribute('data-label')

      const trimmedId = pathIdDraft.trim()
      if (trimmedId) target.setAttribute('id', trimmedId)
      else target.removeAttribute('id')

      const fill = pathFillDraft.trim()
      const stroke = pathStrokeDraft.trim()
      const opacity = pathOpacityDraft.trim()
      if (fill) target.setAttribute('fill', fill)
      else target.removeAttribute('fill')
      if (stroke) target.setAttribute('stroke', stroke)
      else target.removeAttribute('stroke')
      if (opacity) target.setAttribute('opacity', opacity)
      else target.removeAttribute('opacity')

      const serialized = new XMLSerializer().serializeToString(svg)
      setSourceSvg(serialized)
      refreshPathMetas(serialized)
      setStatus('Updated active path properties.')
    } catch (e) {
      setStatus(`Could not update path: ${(e as Error).message}`)
    }
  }

  function applyActivePathPaint(next: { fill?: string; stroke?: string }) {
    if (!sourceSvg || selectedPathIndex < 0) return
    try {
      pushHistory()
      const doc = new DOMParser().parseFromString(sourceSvg, 'image/svg+xml')
      const svg = doc.documentElement
      const paths = Array.from(svg.querySelectorAll('path[d]'))
      const target = paths[selectedPathIndex]
      if (!target) return

      if (Object.prototype.hasOwnProperty.call(next, 'fill')) {
        const fill = (next.fill ?? '').trim()
        if (fill) target.setAttribute('fill', fill)
        else target.removeAttribute('fill')
      }
      if (Object.prototype.hasOwnProperty.call(next, 'stroke')) {
        const stroke = (next.stroke ?? '').trim()
        if (stroke) target.setAttribute('stroke', stroke)
        else target.removeAttribute('stroke')
      }

      const serialized = new XMLSerializer().serializeToString(svg)
      setSourceSvg(serialized)
      refreshPathMetas(serialized)
      setStatus('Updated path paint.')
    } catch (e) {
      setStatus(`Could not update paint: ${(e as Error).message}`)
    }
  }

  // Auto-save (debounced)
  const autoSaveTimerRef = useRef<number | null>(null)
  const lastAutoSavedRef = useRef<string>('')
  useEffect(() => {
    if (!autoSaveEnabled) return
    if (!fileHandle) return
    if (!sourceSvg) return
    if (sourceSvg === lastAutoSavedRef.current) return

    if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = window.setTimeout(() => {
      void (async () => {
        try {
          await saveSvgFile({ handle: fileHandle, suggestedName: fileName || 'edited.svg', text: sourceSvg })
          lastAutoSavedRef.current = sourceSvg
          lastSavedSvgRef.current = sourceSvg
          setLastSavedSvg(sourceSvg)
          setStatus(`Auto-saved: ${fileName || fileHandle.name}`)
        } catch (e) {
          setStatus(`Auto-save failed: ${(e as Error).message}`)
        }
      })()
    }, 450)

    return () => {
      if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current)
      autoSaveTimerRef.current = null
    }
  }, [autoSaveEnabled, fileHandle, fileName, sourceSvg, setStatus])

  // Initial load
  useEffect(() => {
    // No default SVG. If nothing is loaded yet, prompt to open a file.
    if (!sourceSvg) setOpenDialogOpen(true)
    else loadSvg()
    // Intentional: run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // Keep prompting when there's no SVG loaded.
    if (!sourceSvg) setOpenDialogOpen(true)
  }, [sourceSvg])

  // Refresh list for non-drag updates
  useEffect(() => {
    if (!sourceSvg) return
    if (useEditorStore.getState().drag.active) return
    refreshPathMetas(sourceSvg)
    // refreshPathMetas is stable for this component; avoid re-running due to fn identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceSvg])

  // Parse active path when selection changes
  useEffect(() => {
    if (!sourceSvg) return
    if (selectedPathIndex < 0) return
    const meta = pathMetas[selectedPathIndex]
    if (!meta) return
    if (useEditorStore.getState().drag.active) return

     const activePathKey = meta.id ? `id:${meta.id}` : `index:${selectedPathIndex}`
     const stayingOnSamePath = lastActivePathIdRef.current === activePathKey
    const prevSelected = selectedIndices
    setDrag({ active: false, startLocal: null, originalCommands: null })
    setSelectionBox({ active: false, start: null, current: null })
    setXInput('')
    setYInput('')

    try {
      const nextCommands = parsePath(meta.d)
      setCommands(nextCommands)

      // Preserve selection when the active path didn't change (eg. rotate/flip updates SVG / pathMetas).
      if (stayingOnSamePath && prevSelected.length) {
        const nextSel = prevSelected.filter((i) => nextCommands[i] && nextCommands[i].type !== 'Z')
        setSelectedIndices(nextSel)
        setRangeStartIndex(nextSel.length ? nextSel[0] : null)
        updateSelectedPointInputs(nextSel, nextCommands)
      } else {
        setSelectedIndices([])
      }

      // Fit viewBox only when switching to a different path.
      // Editing the active path should not reset the user's current view.
      if (!stayingOnSamePath) {
        // Fit viewBox based on raw command coordinates. This avoids needing the preview DOM matrix,
        // which isn't reliably available immediately after loading a new SVG.
        const points = nextCommands.filter((c) => c.type !== 'Z') as Array<{ type: 'M' | 'L'; x: number; y: number }>
        if (points.length) {
          const xs = points.map((p) => p.x)
          const ys = points.map((p) => p.y)
          const minX = Math.min(...xs)
          const minY = Math.min(...ys)
          const maxX = Math.max(...xs)
          const maxY = Math.max(...ys)
          const padding = 40
          const base = clampViewBox({
            x: minX - padding,
            y: minY - padding,
            width: Math.max(maxX - minX + padding * 2, 50),
            height: Math.max(maxY - minY + padding * 2, 50),
          })
          setBaseViewBox(base)
          setViewBox(base)
        }
      }

      setStatus(`Editing ${meta.label}`)
       lastActivePathIdRef.current = activePathKey
    } catch (e) {
      setCommands([])
      setSelectedIndices([])
      setStatus(`Cannot edit selected path: ${(e as Error).message}`)
    }
    // Store setters are stable; avoid extra dependency churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPathIndex, pathMetas, sourceSvg])

  // Sync active-path drafts
  useEffect(() => {
    const meta = selectedPathIndex >= 0 ? pathMetas[selectedPathIndex] : null
    setPathIdDraft(meta?.id || '')
    setPathLabelDraft(meta?.dataLabel || '')
    setPathFillDraft(meta?.fill || '')
    setPathStrokeDraft(meta?.stroke || '')
    setPathOpacityDraft(meta?.opacity || '')

    // Keep the native color pickers always usable.
    const fillHex = normalizeCssColorToHex(meta?.fill || '')
    if (fillHex) setFillPickerHex(fillHex)
    const strokeHex = normalizeCssColorToHex(meta?.stroke || '')
    if (strokeHex) setStrokePickerHex(strokeHex)
  }, [selectedPathIndex, pathMetas])

  // No inspector debug tab; debug lives in the bottom dock.

  const commandMenuItems: CommandMenuItem[] = buildCommandMenuItems({
    hasDoc: Boolean(sourceSvg),
    hasSelection: selectedIndices.length > 0,
    themeMode,
    gridVisible,
    snapToGrid,
    nodesVisible,
    debugUiVisible,
    openSettings: () => setSettingsDialogOpen(true),
    openSettingsTab: (tab) => {
      setSettingsTab(tab)
      setSettingsDialogOpen(true)
    },
    setThemeMode,
    toggleGrid: () => setGridVisible(!gridVisible),
    toggleSnap: () => setSnapToGrid(!snapToGrid),
    toggleNodes: () => setNodesVisible(!nodesVisible),
    toggleDebugUi: () => setDebugUiVisible(!debugUiVisible),
    clearSelection,
    deleteSelectedPoints: () => deleteSelectedPoints(),
    extractSelectionToNewPath: () => extractSelectionToNewPath(),
  })

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isK = e.key.toLowerCase() === 'k'
      if (!isK) return
      if (!(e.metaKey || e.ctrlKey)) return

      const active = document.activeElement as HTMLElement | null
      const tag = (active?.tagName || '').toLowerCase()
      const isEditingText = tag === 'input' || tag === 'textarea' || tag === 'select' || !!active?.isContentEditable
      // Monaco uses a div contenteditable and consumes Ctrl/Cmd+K chords.
      if (active && active.closest('.monaco-editor')) return
      if (isEditingText) return

      e.preventDefault()
      setCommandMenuOpen(true)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Dim non-active paths
  useEffect(() => {
    pushLog(status)
  }, [status])

  useEffect(() => {
    const group = svgContentRef.current
    if (!group) return
    const paths = Array.from(group.querySelectorAll('path[d]')) as SVGPathElement[]
    paths.forEach((p, i) => {
      if (i === selectedPathIndex) p.style.opacity = ''
      else p.style.opacity = '0.45'
      p.style.pointerEvents = 'none'
    })
  }, [previewInnerHtml, selectedPathIndex])

  // Global events
  useEffect(() => {
    function onMouseUp() {
      const h = globalHandlersRef.current
      if (!h) return

      if (useEditorStore.getState().selectionBox.active) h.finishBoxSelection()

      // If we were panning, commit the final viewBox once.
      if (useEditorStore.getState().pan.active && panLastViewBoxRef.current) {
        perfCountersRef.current.viewBoxCommits += 1
        h.setCurrentViewBox(clampViewBox(panLastViewBoxRef.current))
      }

      // Commit rect tool on mouse up.
      if (useEditorStore.getState().drawTool === 'rect') {
        setRectDraft((draft) => {
          if (!draft) return null
          const x1 = draft.start.x
          const y1 = draft.start.y
          const x2 = draft.current.x
          const y2 = draft.current.y
          const minX = Math.min(x1, x2)
          const minY = Math.min(y1, y2)
          const maxX = Math.max(x1, x2)
          const maxY = Math.max(y1, y2)
          const w = maxX - minX
          const height = maxY - minY
          if (w < 0.01 || height < 0.01) return null
          const cmds: PathCommand[] = [
            { type: 'M', x: minX, y: minY },
            { type: 'L', x: maxX, y: minY },
            { type: 'L', x: maxX, y: maxY },
            { type: 'L', x: minX, y: maxY },
            { type: 'Z' },
          ]
          h.addNewPathFromCommands(cmds, { label: 'rect', newLayer: useEditorStore.getState().drawNewLayer })
          h.setDrawTool('select')
          return null
        })
      }

      h.setDrag({ active: false, startLocal: null, originalCommands: null, hasHistory: false })
      h.setPan({ active: false, start: null })
      h.setSelectionBox({ active: false, start: null, current: null })
      const svg = svgRef.current
      if (svg) svg.style.cursor = 'crosshair'
    }

    function onKeyDown(event: KeyboardEvent) {
      const h = globalHandlersRef.current
      if (!h) return

      const ctrl = event.ctrlKey || event.metaKey
      const active = document.activeElement as HTMLElement | null
      const tag = (active?.tagName || '').toLowerCase()
      const isEditingText = tag === 'input' || tag === 'textarea' || tag === 'select' || !!active?.isContentEditable
      // Monaco uses a div contenteditable. Also treat any interaction inside it as text editing.
      if (!isEditingText && active && active.closest('.monaco-editor')) return
      if (isEditingText) return

      if (event.key === 'Escape') {
        event.preventDefault()
        h.clearSelection()
        return
      }

      if (ctrl && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        h.undo()
        return
      }
      if (ctrl && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        h.redo()
        return
      }
      if (ctrl && event.key.toLowerCase() === 'c') {
        event.preventDefault()
        // Prefer object-level copy. If nodes are selected, user can still use the Inspector "Copy" button.
        h.copyActivePathToClipboard()
        return
      }
      if (ctrl && event.key.toLowerCase() === 'v') {
        event.preventDefault()
        h.pasteSectionAfterSelected()
        return
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        const indices = useEditorStore.getState().selectedIndices
        if (indices.length) h.deleteSelectedPoints(indices)
      }
    }

    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  const outputPath = useMemo(() => buildPath(commands), [commands])
  const outputSvg = useMemo(() => sourceSvg, [sourceSvg])

  // Render matrix is derived from SVG DOM refs.
  // eslint-disable-next-line react-hooks/refs
  const matrix = getRenderMatrix()
  // eslint-disable-next-line react-hooks/refs
  const scale = effectiveHandleScale()
  // eslint-disable-next-line react-hooks/refs
  const transformedOutlineD = useMemo(() => buildTransformedPathD(commands, matrix, svgRef.current), [commands, matrix])
  const segments = useMemo(() => getSegments(commands), [commands])

  const pointRadiusBase = useMemo(() => {
    switch (uiPointSize) {
      case 'xs':
        return 2.5
      case 'sm':
        return 3.25
      case 'lg':
        return 5
      case 'xl':
        return 6.5
      case 'md':
      default:
        return 4
    }
  }, [uiPointSize])

  const selectionRect = useMemo(() => {
    if (!selectionBox.active || !selectionBox.start || !selectionBox.current) return null
    const { start, current } = selectionBox
    const x = Math.min(start.x, current.x)
    const y = Math.min(start.y, current.y)
    const width = Math.abs(current.x - start.x)
    const height = Math.abs(current.y - start.y)
    return { x, y, width, height }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionBox.active, selectionBox.start?.x, selectionBox.start?.y, selectionBox.current?.x, selectionBox.current?.y])

  const gridPattern = useMemo(() => {
    if (!gridVisible) return null
    const size = Number.isFinite(gridSize) && gridSize > 0 ? gridSize : 10
    const majorEvery = Number.isFinite(majorGridEvery) && majorGridEvery > 0 ? Math.round(majorGridEvery) : 5
    const majorSize = size * majorEvery
    return {
      size,
      majorSize,
      stroke: uiGridStroke,
      majorStroke: uiGridMajorStroke,
    }
  }, [gridVisible, gridSize, majorGridEvery, uiGridStroke, uiGridMajorStroke])

  const zoomPercent = useMemo(() => {
    if (!baseViewBox.width || !currentViewBox.width) return 100
    return Math.round((baseViewBox.width / currentViewBox.width) * 100)
  }, [baseViewBox.width, currentViewBox.width])

  const selectedCount = selectedIndices.length

  const pathListItems = useMemo(() => {
    return pathMetas.map((m) => {
      try {
        const cmds = parsePath(m.d)
        const pts = cmds.filter((c) => c.type !== 'Z') as Array<{ type: 'M' | 'L'; x: number; y: number }>
        if (!pts.length) return { ...m, viewBox: { x: 0, y: 0, width: 1, height: 1 } }
        const xs = pts.map((p) => p.x)
        const ys = pts.map((p) => p.y)
        const minX = Math.min(...xs)
        const minY = Math.min(...ys)
        const maxX = Math.max(...xs)
        const maxY = Math.max(...ys)
        const pad = 6
        const vb = clampViewBox({
          x: minX - pad,
          y: minY - pad,
          width: maxX - minX + pad * 2,
          height: maxY - minY + pad * 2,
        })
        return { ...m, viewBox: vb }
      } catch {
        return { ...m, viewBox: { x: 0, y: 0, width: 1, height: 1 } }
      }
    })
  }, [pathMetas])

  const inspector = (
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
                  <Button type="button" variant="secondary" onClick={selectAllNodes}>Select all</Button>
                  <Button type="button" variant="secondary" onClick={clearSelection}>Clear</Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="destructive" onClick={() => deleteSelectedPoints()} disabled={!selectedCount}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => extractSelectionToNewPath()} disabled={!selectedCount}>
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
                      onClick={() => transformSelectedNodes(mirrorHorizontalTransformer, 'Horizontal mirror')}
                    >
                      Mirror X
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => transformSelectedNodes(mirrorVerticalTransformer, 'Vertical mirror')}
                    >
                      Mirror Y
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => transformSelectedNodes(rotateTransformer(-90), 'Rotate -90 deg')}
                    >
                      Rotate -90
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => transformSelectedNodes(rotateTransformer(90), 'Rotate 90 deg')}
                    >
                      Rotate +90
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => transformSelectedNodes(flipBothTransformer, 'Flip 180 deg')}
                    >
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
                          transformSelectedNodes(rotateTransformer(degrees), `Rotate ${degrees} deg`)
                        }}
                      >
                        Rotate
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Draw</Label>
                  <ToggleGroup
                    type="single"
                    value={drawTool}
                    onValueChange={(v) => {
                      const next = (v || 'select') as typeof drawTool
                      setDrawTool(next)
                      // clear drafts when switching
                      setPenDraftPoints([])
                      setRectDraft(null)
                    }}
                    className="grid grid-cols-3 gap-1"
                  >
                    <ToggleGroupItem value="select" aria-label="Select">
                      <Grip className="mr-2 h-4 w-4" />
                      Sel
                    </ToggleGroupItem>
                    <ToggleGroupItem value="pen" aria-label="Pen">
                      <Pencil className="mr-2 h-4 w-4" />
                      Pen
                    </ToggleGroupItem>
                    <ToggleGroupItem value="rect" aria-label="Rectangle">
                      <Square className="mr-2 h-4 w-4" />
                      Rect
                    </ToggleGroupItem>
                  </ToggleGroup>

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
                          addNewPathFromCommands(cmds, { label: 'drawn', newLayer: drawNewLayer })
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
                        selectRangeToIndex(sorted[sorted.length - 1])
                      }}
                    >
                      Range
                    </Button>
                    <Button type="button" variant="secondary" onClick={copySelectedSection} disabled={!selectedCount}>
                      <Scissors className="mr-2 h-4 w-4" />
                      Copy
                    </Button>
                  </div>
                  <Button type="button" variant="secondary" onClick={pasteSectionAfterSelected} disabled={!clipboardCommands.length}>Paste after</Button>
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
                  <Button type="button" variant="destructive" disabled={!activePathMeta} onClick={() => activePathMeta && deletePathAtIndex(activePathMeta.index)}>
                    Delete path
                  </Button>
                  <Button type="button" variant="secondary" disabled={!activePathMeta} onClick={() => activePathMeta && deleteLayerForPath(activePathMeta.index)}>
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
                        value={pathFillDraft || fillPickerHex}
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
                        value={pathStrokeDraft || strokePickerHex}
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
                  <Button type="button" variant="secondary" onClick={applyActivePathProperties} disabled={!activePathMeta}>Apply</Button>
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
                    <Button type="button" variant="secondary" onClick={() => copyText(outputSvg, 'Full SVG')} disabled={!outputSvg}>
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
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setLogDialogOpen(true)}>
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
                    setLogLines([])
                    setStatus('Log cleared.')
                  }}
                  disabled={!logLines.length}
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

  // Layers panel extracted to src/app/** components.
  return (
    <TooltipProvider delayDuration={250}>
      <CommandMenu open={commandMenuOpen} onOpenChange={setCommandMenuOpen} items={commandMenuItems} />

       <LogDialog
         open={logDialogOpen}
         onOpenChange={setLogDialogOpen}
         logLines={logLines}
         onClear={() => {
           setLogLines([])
           setStatus('Log cleared.')
         }}
       />

       <OpenSvgDialog
         open={openDialogOpen}
         onOpenChange={setOpenDialogOpen}
         sourceSvg={sourceSvg}
         onOpenFile={onOpenFile}
         afterOpenHasSvg={() => !!useEditorStore.getState().sourceSvg}
       />

       <RenameDialog
         open={renameDialogOpen}
         onOpenChange={setRenameDialogOpen}
         target={renameTarget}
         draft={renameDraft}
         setDraft={setRenameDraft}
         onApply={applyRename}
       />

       <EditPointDialog
         open={pointEditorOpen}
         onOpenChange={setPointEditorOpen}
         x={pointEditorX}
         y={pointEditorY}
         setX={setPointEditorX}
         setY={setPointEditorY}
         onApply={applyPointEditor}
         canApply={selectedIndices.length === 1}
       />

      <SettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
        tab={settingsTab}
        setTab={setSettingsTab}
        themeMode={themeMode}
        setThemeMode={setThemeMode}
        nodesVisible={nodesVisible}
        setNodesVisible={setNodesVisible}
        selectionToolActive={selectionToolActive}
        setSelectionToolActive={setSelectionToolActive}
        debugUiVisible={debugUiVisible}
        setDebugUiVisible={setDebugUiVisible}
        autoSaveEnabled={autoSaveEnabled}
        setAutoSaveEnabled={setAutoSaveEnabled}
        fileHandle={fileHandle}
        setStatus={setStatus}
        gridVisible={gridVisible}
        setGridVisible={setGridVisible}
        snapToGrid={snapToGrid}
        setSnapToGrid={setSnapToGrid}
        gridSize={gridSize}
        setGridSize={setGridSize}
        majorGridEvery={majorGridEvery}
        setMajorGridEvery={setMajorGridEvery}
        pointRadiusBase={pointRadiusBase}
        uiOverlayStrokeWidthScale={uiOverlayStrokeWidthScale}
        setUiOverlayStrokeWidthScale={setUiOverlayStrokeWidthScale}
        uiPointSize={uiPointSize}
        setUiPointSize={setUiPointSize}
        uiSelectionStroke={uiSelectionStroke}
        setUiSelectionStroke={setUiSelectionStroke}
        uiSelectionDash={uiSelectionDash}
        setUiSelectionDash={setUiSelectionDash}
        uiSelectionFill={uiSelectionFill}
        setUiSelectionFill={setUiSelectionFill}
        uiSelectionFillOpacity={uiSelectionFillOpacity}
        setUiSelectionFillOpacity={setUiSelectionFillOpacity}
        uiOutlineStroke={uiOutlineStroke}
        setUiOutlineStroke={setUiOutlineStroke}
        uiOutlineDash={uiOutlineDash}
        setUiOutlineDash={setUiOutlineDash}
        uiSegmentStroke={uiSegmentStroke}
        setUiSegmentStroke={setUiSegmentStroke}
        uiSegmentHoverStroke={uiSegmentHoverStroke}
        setUiSegmentHoverStroke={setUiSegmentHoverStroke}
        uiGridStroke={uiGridStroke}
        setUiGridStroke={setUiGridStroke}
        uiGridMajorStroke={uiGridMajorStroke}
        setUiGridMajorStroke={setUiGridMajorStroke}
        resetUiAppearance={resetUiAppearance}
      />

      <div className="flex h-svh flex-col">
        <TopBar
          fileName={fileName}
          dirty={dirty}
          undoCount={undoStack.length}
          redoCount={redoStack.length}
          onUndo={undo}
          onRedo={redo}
          selectionToolActive={selectionToolActive}
          setSelectionToolActive={setSelectionToolActive}
          gridVisible={gridVisible}
          setGridVisible={setGridVisible}
          nodesVisible={nodesVisible}
          setNodesVisible={setNodesVisible}
          snapToGrid={snapToGrid}
          setSnapToGrid={setSnapToGrid}
          onOpenSettings={() => setSettingsDialogOpen(true)}
          onOpenFile={onOpenFile}
          onSaveFile={onSaveFile}
          sourceSvgPresent={Boolean(sourceSvg)}
          autoSaveEnabled={autoSaveEnabled}
          setAutoSaveEnabled={setAutoSaveEnabled}
          fileHandlePresent={Boolean(fileHandle)}
          setStatus={setStatus}
          inspector={inspector}
          layersPanelProps={{
            pathListItems,
            selectedPathIndex,
            hiddenPathIndexes,
            layersCollapsed,
            setLayersCollapsed,
            setSelectedPathIndex,
            setPathHidden,
            deletePathAtIndex,
            movePathAtIndex,
            openRenameDialog,
            addNewLayerGroup,
            addNewPathToRoot,
          }}
        />

        <div className="min-h-0 flex-1 min-w-0">
          <div className="flex h-full min-w-0">
            <aside
              className={
                inspectorCollapsed
                  ? 'hidden w-[56px] shrink-0 border-r bg-background md:block'
                  : 'hidden w-[380px] shrink-0 border-r bg-background md:block'
              }
            >
              {inspectorCollapsed ? (
                <div className="flex h-full flex-col">
                  <div className="shrink-0 border-b p-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="icon" variant="ghost" className="w-full" onClick={() => setInspectorCollapsed(false)}>
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
                          <Button size="icon" variant="ghost" className="h-12 w-12" onClick={selectAllNodes} disabled={!commands.length}>
                            <Grip className="h-5 w-5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Select all nodes</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-12 w-12" onClick={clearSelection} disabled={!selectedCount}>
                            <X className="h-5 w-5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Clear selection</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-12 w-12"
                            onClick={() => deleteSelectedPoints()}
                            disabled={!selectedCount}
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete selected</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-12 w-12"
                            onClick={() => extractSelectionToNewPath()}
                            disabled={!selectedCount}
                          >
                            <Scissors className="h-5 w-5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Extract selection</TooltipContent>
                      </Tooltip>

                      <div className="my-1 h-px w-full bg-border" />

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant={drawTool === 'select' ? 'secondary' : 'ghost'}
                            className="h-12 w-12"
                            onClick={() => {
                              setDrawTool('select')
                              setPenDraftPoints([])
                              setRectDraft(null)
                            }}
                            disabled={!sourceSvg}
                          >
                            <Grip className="h-5 w-5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Draw: select</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant={drawTool === 'pen' ? 'secondary' : 'ghost'}
                            className="h-12 w-12"
                            onClick={() => {
                              setDrawTool('pen')
                              setPenDraftPoints([])
                              setRectDraft(null)
                              setStatus('Pen: click to add points, Finish to commit.')
                            }}
                            disabled={!sourceSvg}
                          >
                            <Pencil className="h-5 w-5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Draw: pen</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant={drawTool === 'rect' ? 'secondary' : 'ghost'}
                            className="h-12 w-12"
                            onClick={() => {
                              setDrawTool('rect')
                              setPenDraftPoints([])
                              setRectDraft(null)
                              setStatus('Rect: drag to draw, release to commit.')
                            }}
                            disabled={!sourceSvg}
                          >
                            <Square className="h-5 w-5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Draw: rect</TooltipContent>
                      </Tooltip>

                      <div className="my-1 h-px w-full bg-border" />

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-12 w-12"
                            onClick={() => transformSelectedNodes(rotateTransformer(-90), 'Rotate -90 deg')}
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
                            onClick={() => transformSelectedNodes(rotateTransformer(90), 'Rotate 90 deg')}
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
                            onClick={() => transformSelectedNodes(flipBothTransformer, 'Flip 180 deg')}
                            disabled={!selectedCount}
                          >
                            <Repeat2 className="h-5 w-5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Flip 180</TooltipContent>
                      </Tooltip>

                      <div className="my-1 h-px w-full bg-border" />

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <ColorPickerPopover
                              value={pathFillDraft || fillPickerHex}
                              title="Fill"
                              onChange={(v) => {
                                const hex = normalizeHex6(v) || normalizeCssColorToHex(v) || v
                                setPathFillDraft(hex)
                                const normalized = normalizeCssColorToHex(hex) || normalizeHex6(hex)
                                if (normalized) setFillPickerHex(normalized)
                                applyActivePathPaint({ fill: hex })
                              }}
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>Fill</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <ColorPickerPopover
                              value={pathStrokeDraft || strokePickerHex}
                              title="Stroke"
                              onChange={(v) => {
                                const hex = normalizeHex6(v) || normalizeCssColorToHex(v) || v
                                setPathStrokeDraft(hex)
                                const normalized = normalizeCssColorToHex(hex) || normalizeHex6(hex)
                                if (normalized) setStrokePickerHex(normalized)
                                applyActivePathPaint({ stroke: hex })
                              }}
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>Stroke</TooltipContent>
                      </Tooltip>
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                inspector
              )}
            </aside>

            <div className="min-h-0 flex-1 min-w-0">
              <div className="flex h-full min-h-0 flex-col">
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
                    zoomPercent={zoomPercent}
                    selectedCount={selectedCount}
                    cursorText={cursorPoint ? `x ${formatNumber(cursorPoint.x)}  y ${formatNumber(cursorPoint.y)}` : 'x -  y -'}
                    onZoomIn={zoomIn}
                    onZoomOut={zoomOut}
                    onSetZoomPercent={setZoomPercent}
                    disabled={!sourceSvg}
                  />

                  <svg
                ref={svgRef}
                id="editorSvg"
                xmlns="http://www.w3.org/2000/svg"
                viewBox={`${currentViewBox.x} ${currentViewBox.y} ${currentViewBox.width} ${currentViewBox.height}`}
                onWheel={(e) => zoomAt(e.nativeEvent)}
                onMouseDown={(e) => {
                  if (e.button !== 0) return
                  const svg = svgRef.current
                  if (!svg) return

                  // Draw tools override pan/select interactions.
                  if (drawTool === 'pen') {
                    const p = getEditorPointFromEvent(e.nativeEvent)
                    if (!p) return
                    e.preventDefault()
                    setPenDraftPoints((prev) => prev.concat([{ x: p.x, y: p.y }]))
                    setStatus('Pen: click to add points, Finish to commit.')
                    return
                  }

                  if (drawTool === 'rect') {
                    const p = getEditorPointFromEvent(e.nativeEvent)
                    if (!p) return
                    e.preventDefault()
                    setRectDraft({ start: { x: p.x, y: p.y }, current: { x: p.x, y: p.y } })
                    setStatus('Rect: drag to size, release to commit.')
                    return
                  }

                  // Shift (or Box-select tool) should always allow box selection, even if the
                  // initial press is on grid/overlay elements.
                  if (e.shiftKey || selectionToolActive) {
                    const start = getEditorPointFromEvent(e.nativeEvent)
                    if (!start) return
                    e.preventDefault()
                    setSelectionBox({ active: true, start, current: { ...start } })
                    return
                  }

                  const target = e.target as Element
                  const clickedInsideSvgContent = !!target.closest('#svgContent')
                  const clickedEmpty = target === svg
                  const clickedCanvasTarget = (target as SVGElement | null)?.id === 'svgContextTarget' || !!target.closest('#svgContextTarget')
                  const clickedOverlay = target instanceof SVGPathElement && target.id === 'editOutline'
                  if (!clickedEmpty && !clickedCanvasTarget && !clickedInsideSvgContent && !clickedOverlay) return

                  e.preventDefault()

                  const start = getEditorPointFromEvent(e.nativeEvent)
                  if (!start) return
                  setPan({
                    active: true,
                    start: {
                      client: { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY },
                      unitsPerPx: {
                        x: currentViewBox.width / Math.max(1, svg.clientWidth),
                        y: currentViewBox.height / Math.max(1, svg.clientHeight),
                      },
                      viewBox: { ...currentViewBox },
                    },
                  })
                  svg.style.cursor = 'grabbing'
                }}
                onMouseMove={(e) => {
                  if (pan.active && pan.start) {
                    // Compute deltas in screen space to avoid feedback when viewBox changes.
                    perfCountersRef.current.panMoves += 1
                    const dxPx = pan.start.client.x - e.nativeEvent.clientX
                    const dyPx = pan.start.client.y - e.nativeEvent.clientY
                    const dx = dxPx * pan.start.unitsPerPx.x
                    const dy = dyPx * pan.start.unitsPerPx.y
                    setViewBoxCoalesced({
                      x: pan.start.viewBox.x + dx,
                      y: pan.start.viewBox.y + dy,
                      width: pan.start.viewBox.width,
                      height: pan.start.viewBox.height,
                    })
                    return
                  }

                  const cursor = getEditorPointFromEvent(e.nativeEvent)
                  if (!cursor) return
                  setCursorPointCoalesced({ x: cursor.x, y: cursor.y })

                  if (drawTool === 'rect' && rectDraft) {
                    setRectDraft({ ...rectDraft, current: { x: cursor.x, y: cursor.y } })
                    return
                  }

                  if (selectionBox.active && selectionBox.start) {
                    perfCountersRef.current.boxMoves += 1
                    setSelectionBox({ ...selectionBox, current: cursor })
                    return
                  }

                  if (drag.active) {
                    perfCountersRef.current.dragMoves += 1
                    const p = getLocalPointFromEvent(e.nativeEvent)
                    if (!p) return
                    moveSelectedPoints(p)
                  }
                }}
                onMouseLeave={() => setCursorPointCoalesced(null)}
              >
                {gridPattern ? (
                  <defs>
                    <pattern
                      id="gridMinor"
                      patternUnits="userSpaceOnUse"
                      width={gridPattern.size}
                      height={gridPattern.size}
                    >
                      <path
                        d={`M ${gridPattern.size} 0 L 0 0 0 ${gridPattern.size}`}
                        fill="none"
                        stroke={gridPattern.stroke}
                        strokeWidth={1}
                        vectorEffect="non-scaling-stroke"
                      />
                    </pattern>
                    <pattern
                      id="gridMajor"
                      patternUnits="userSpaceOnUse"
                      width={gridPattern.majorSize}
                      height={gridPattern.majorSize}
                    >
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
                      x={currentViewBox.x}
                      y={currentViewBox.y}
                      width={currentViewBox.width}
                      height={currentViewBox.height}
                      fill="transparent"
                      pointerEvents="all"
                    />
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem
                      disabled={!selectedCount}
                      onSelect={() => extractSelectionToNewPath({ ownLayer: true })}
                    >
                      Extract selection to own layer
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>

                {gridPattern ? (
                  <rect
                    x={currentViewBox.x}
                    y={currentViewBox.y}
                    width={currentViewBox.width}
                    height={currentViewBox.height}
                    fill="url(#gridMajor)"
                    pointerEvents="none"
                  />
                ) : null}

                <g
                  id="svgContent"
                  ref={svgContentRef}
                  style={{ pointerEvents: 'none' }}
                  dangerouslySetInnerHTML={{ __html: previewInnerHtml }}
                />

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
                      d={
                        penDraftPoints
                          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
                          .join(' ')
                        }
                      strokeWidth={1.5 * getHandleScale() * uiOverlayStrokeWidthScale}
                      style={{ stroke: uiOutlineStroke, strokeDasharray: uiOutlineDash }}
                      />
                    ) : null}

                  {drawTool === 'rect' && rectDraft ? (() => {
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
                        strokeWidth={1.5 * getHandleScale() * uiOverlayStrokeWidthScale}
                        style={{ stroke: uiOutlineStroke, strokeDasharray: uiOutlineDash }}
                      />
                    )
                  })() : null}

                  <g id="segments">
                    {/* eslint-disable-next-line react-hooks/refs */}
                    {segments.map((seg, idx) => {
                      const from = commands[seg.fromIndex]
                      const to = commands[seg.toIndex]
                      if (!from || !to || from.type === 'Z' || to.type === 'Z') return null
                      const p1 = transformPoint(matrix, from.x, from.y, svgRef.current)
                      const p2 = transformPoint(matrix, to.x, to.y, svgRef.current)
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
                          <path
                            d={d}
                            className="segment-visible"
                            strokeWidth={1 * scale * uiOverlayStrokeWidthScale}
                            style={{ stroke: uiSegmentStroke }}
                          />
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
                      strokeWidth={1 * getHandleScale() * uiOverlayStrokeWidthScale}
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
                      {/* eslint-disable-next-line react-hooks/refs */}
                      {commands.map((cmd, index) => {
                        if (cmd.type === 'Z') return null
                        const p = transformPoint(matrix, cmd.x, cmd.y, svgRef.current)
                        const selected = selectedIndicesSet.has(index)
                        return (
                          <NodeContextMenu
                            key={index}
                            index={index}
                            selectedIndices={selectedIndices}
                            disableSelectNode={selectedIndices.length === 1 && selectedIndicesSet.has(index)}
                            clipboardPath={clipboardPath}
                            clipboardCommandsLength={clipboardCommands.length}
                            onSelectOnlyPoint={selectOnlyPoint}
                            onTogglePointSelection={togglePointSelection}
                            onSelectRangeToIndex={selectRangeToIndex}
                            onOpenPointEditor={openPointEditorForIndex}
                            onCopySelectedSection={copySelectedSection}
                            onPasteSectionAfterSelected={pasteSectionAfterSelected}
                            onExtractSelectionToNewPath={extractSelectionToNewPath}
                            onTransformSelectedNodes={transformSelectedNodes}
                            onDeleteSelectedPoints={() => deleteSelectedPoints()}
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
              </svg>
                </main>

                <DebugDock
                  enabled={debugUiVisible}
                  dockOpen={debugDockOpen}
                  setDockOpen={setDebugDockOpen}
                  dockHeight={debugDockHeight}
                  setDockHeight={setDebugDockHeight}
                  outputSvg={outputSvg}
                  outputPath={outputPath}
                  activePathIndex={activePathMeta?.index ?? -1}
                  setStatus={setStatus}
                  applyPathCommands={(cmds) => {
                    setCommands(cmds)
                    syncCommandsToSource(cmds)
                  }}
                  applySvgSerialized={(serializedSvg, pathCount) => {
                    setSourceSvg(serializedSvg)
                    refreshPathMetas(serializedSvg)
                    if (pathCount && selectedPathIndex >= pathCount) setSelectedPathIndex(pathCount - 1)
                  }}
                  perfCountersRef={perfCountersRef}
                  perfLastCountersRef={perfLastCountersRef}
                  appRenderCountRef={appRenderCountRef}
                  lastAppRenderCountRef={lastAppRenderCountRef}
                />
              </div>
            </div>

            <LayersSidebar
              layersCollapsed={layersCollapsed}
              setLayersCollapsed={setLayersCollapsed}
              pathListItems={pathListItems}
              selectedPathIndex={selectedPathIndex}
              hiddenPathIndexes={hiddenPathIndexes}
              setSelectedPathIndex={setSelectedPathIndex}
              setPathHidden={setPathHidden}
              deletePathAtIndex={deletePathAtIndex}
              movePathAtIndex={movePathAtIndex}
              openRenameDialog={openRenameDialog}
              addNewLayerGroup={addNewLayerGroup}
              addNewPathToRoot={addNewPathToRoot}
            />
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
