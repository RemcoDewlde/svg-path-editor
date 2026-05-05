import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { TooltipProvider } from '@/components/ui/tooltip'

import { useEditorStore } from '@/editor/store'
import type { PathCommand, PerfCounters, RenameTarget } from '@/editor/types'
import { buildPath, createSvgPoint, deleteIndicesFromCommands, formatNumber, transformPoint } from '@/editor/utils'
import { getInnerHtml, isLiveDocLoaded, loadLiveDoc, serializeLiveDoc, setActivePath } from '@/editor/liveSvgDoc'

import { DebugDock } from '@/app/debug/DebugDock'
import { TopBar } from '@/app/topbar/TopBar'
import { LayersSidebar } from '@/app/sidebars/LayersSidebar'
import { CommandMenu } from '@/app/CommandMenu'
import { buildCommandMenuItems } from '@/app/command-menu/commandMenuItems'
import { SettingsDialog } from '@/app/settings/SettingsDialog'
import { LogDialog } from '@/app/dialogs/LogDialog'
import { OpenSvgDialog } from '@/app/dialogs/OpenSvgDialog'
import { RenameDialog } from '@/app/dialogs/RenameDialog'
import { EditPointDialog } from '@/app/dialogs/EditPointDialog'
import { InspectorPanel } from '@/app/panels/InspectorPanel'
import { InspectorSidebar } from '@/app/layout/InspectorSidebar'
import { EditorCanvas } from '@/app/layout/EditorCanvas'
import { useViewBox } from '@/app/hooks/useViewBox'
import { useSvgMutations } from '@/app/hooks/useSvgMutations'
import { useHistory } from '@/app/hooks/useHistory'
import { useNodeEditor } from '@/app/hooks/useNodeEditor'
import { useCursorPoint } from '@/app/hooks/useCursorPoint'
import { useSvgPathMetas } from '@/app/hooks/useSvgPathMetas'
import { useFileIo } from '@/app/hooks/useFileIo'
import { useCommandMenuHotkey } from '@/app/hooks/useCommandMenuHotkey'
import { useGlobalInputHandlers } from '@/app/hooks/useGlobalInputHandlers'
import { useActivePathSync } from '@/app/hooks/useActivePathSync'
import { mutateSvg } from '@/editor/svgDoc'

export default function App() {
  const LOG_HISTORY_LIMIT = 50

  const svgRef = useRef<SVGSVGElement | null>(null)
  const svgContentRef = useRef<SVGGElement | null>(null)

  const {
    sourceSvg,
    setSourceSvg,
    pathMetas,
    setPathMetas,
    selectedPathIndex,
    setSelectedPathIndex,
    setCommands,
    setSelectedIndices,
    status,
    setStatus,
    pathLabelDraft,
    setPathLabelDraft,
    pathFillDraft,
    setPathFillDraft,
    pathStrokeDraft,
    setPathStrokeDraft,
    pathOpacityDraft,
    setPathOpacityDraft,
    pathIdDraft,
    setPathIdDraft,
    fillPickerHex,
    setFillPickerHex,
    strokePickerHex,
    setStrokePickerHex,
    setXInput,
    setYInput,
    selectionToolActive,
    nodesVisible,
    setNodesVisible,
    setRangeStartIndex,
    clipboardCommands,
    setClipboardCommands,
    clipboardPath,
    setClipboardPath,
    penDraftPoints,
    setPenDraftPoints,
    rectDraft,
    setRectDraft,
    gridVisible,
    setGridVisible,
    snapToGrid,
    setSnapToGrid,
    gridSize,
    majorGridEvery,
    baseViewBox,
    setBaseViewBox,
    currentViewBox,
    setCurrentViewBox,
    drag,
    setDrag,
    selectionBox,
    setSelectionBox,
    pan,
    setPan,
    inspectorCollapsed,
    setInspectorCollapsed,
    debugUiVisible,
    setDebugUiVisible,
    drawTool,
    setDrawTool,
    themeMode,
    setThemeMode,
    uiOverlayStrokeWidthScale,
    uiPointSize,
    uiOutlineStroke,
    uiOutlineDash,
    uiSelectionStroke,
    uiSelectionFill,
    uiSelectionFillOpacity,
    uiSelectionDash,
    uiSegmentStroke,
    uiSegmentHoverStroke,
    uiGridStroke,
    uiGridMajorStroke,
  } = useEditorStore()

  // Fix A: commands + selectedIndices are NOT read reactively in App.
  // All callbacks that need them call useEditorStore.getState() inside their
  // body so they always see fresh values without subscribing App to re-renders.
  // selectedIndicesLength is the only count needed for conditional rendering
  // (EditPointDialog canApply, commandMenuItems hasSelection).
  const selectedIndicesLength = useEditorStore((s) => s.selectedIndices.length)

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

  // selectedIndicesSet is no longer used in App — CanvasOverlay computes it directly.

  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'general' | 'grid' | 'appearance' | 'keys'>('general')
  const [commandMenuOpen, setCommandMenuOpen] = useState(false)

  const [pointEditorOpen, setPointEditorOpen] = useState(false)
  const [pointEditorX, setPointEditorX] = useState('')
  const [pointEditorY, setPointEditorY] = useState('')
  const extractToNewLayer = true

  const [logLines, setLogLines] = useState<string[]>([])
  const [logDialogOpen, setLogDialogOpen] = useState(false)

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

  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<RenameTarget>(null)
  const [renameDraft, setRenameDraft] = useState('')

  const { refreshPathMetas, getPathCountFromSvg, getPathIndexById } = useSvgPathMetas()

  const { openDialogOpen, setOpenDialogOpen, lastSavedSvg, onOpenFile, onSaveFile } = useFileIo({ getPathCountFromSvg })

  const activePathMeta = selectedPathIndex >= 0 ? pathMetas[selectedPathIndex] : null

  const dirty = useMemo(() => {
    if (!sourceSvg) return false
    if (!lastSavedSvg) return false
    return sourceSvg !== lastSavedSvg
  }, [sourceSvg, lastSavedSvg])

  // Fix 2: read innerHTML directly from the live doc — no second DOMParser call.
  // The live doc is kept in sync by loadLiveDoc / mutateSvg / setActivePath.
  // We still depend on sourceSvg so React re-renders when the SVG changes.
  const previewInnerHtml = useMemo(() => {
    if (!sourceSvg) return ''
    // If the live doc isn't loaded yet (e.g. first render before any mutation),
    // load it now so getInnerHtml() works.
    if (!isLiveDocLoaded()) loadLiveDoc(sourceSvg)
    return getInnerHtml()
  }, [sourceSvg])

  const getPreviewPathElement = useCallback(
    (index = selectedPathIndex): SVGPathElement | null => {
      const group = svgContentRef.current
      if (!group) return null
      const paths = Array.from(group.querySelectorAll('path[d]')) as SVGPathElement[]
      return paths[index] ?? null
    },
    [selectedPathIndex],
  )

  const getRenderMatrix = useCallback(() => {
    const svg = svgRef.current
    const previewPath = getPreviewPathElement()
    if (!svg || !previewPath) return null
    const editorScreenMatrix = svg.getScreenCTM()
    const pathScreenMatrix = previewPath.getScreenCTM()
    if (!editorScreenMatrix || !pathScreenMatrix) return null
    return editorScreenMatrix.inverse().multiply(pathScreenMatrix)
  }, [getPreviewPathElement])

  // Fix 3: Cache the render matrix so we don't call getScreenCTM() (layout-
  // forcing) unconditionally on every render.  We recompute it:
  //  - when the SVG container resizes (ResizeObserver)
  //  - when the viewBox changes (pan / zoom)
  //  - when the selected path changes (different element → different CTM)
  const matrixCacheRef = useRef<DOMMatrix | null>(null)

  const recomputeMatrix = useCallback(() => {
    matrixCacheRef.current = getRenderMatrix()
  }, [getRenderMatrix])

  // Recompute on resize.
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const observer = new ResizeObserver(() => { recomputeMatrix() })
    observer.observe(el)
    return () => observer.disconnect()
  }, [recomputeMatrix])

  // Recompute when viewBox or selected path changes.
  useEffect(() => { recomputeMatrix() }, [currentViewBox, selectedPathIndex, recomputeMatrix])

  const getLocalPointFromEvent = useCallback(
    (event: MouseEvent) => {
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
    },
    [getPreviewPathElement],
  )

  const getEditorPointFromEvent = useCallback((event: MouseEvent) => {
    const svg = svgRef.current
    if (!svg) return null
    const ctm = svg.getScreenCTM()
    if (!ctm) return null
    const point = createSvgPoint(svg, event.clientX, event.clientY)
    return point.matrixTransform(ctm.inverse())
  }, [])

  const { zoomPercent, setViewBox, setViewBoxCoalesced, zoomAt, zoomIn, zoomOut, setZoomPercent, panLastViewBoxRef } = useViewBox(
    svgRef,
    perfCountersRef,
  )

  const { cursorPoint, setCursorPointCoalesced } = useCursorPoint(perfCountersRef)

  const getHandleScale = useCallback(() => {
    return Math.max(0.2, currentViewBox.width / Math.max(baseViewBox.width, 1))
  }, [baseViewBox.width, currentViewBox.width])

  const getOverlayScale = useCallback(() => {
    const matrix = matrixCacheRef.current ?? getRenderMatrix()
    if (!matrix) return 1
    const scaleX = Math.hypot(matrix.a, matrix.b)
    const scaleY = Math.hypot(matrix.c, matrix.d)
    return Math.max(scaleX, scaleY) || 1
  }, [getRenderMatrix])

  const effectiveHandleScale = useCallback(() => {
    return getHandleScale() / getOverlayScale()
  }, [getHandleScale, getOverlayScale])

  const syncCommandsToSource = useCallback(
    (nextCommands: PathCommand[]) => {
      if (!sourceSvg || selectedPathIndex < 0) return
      try {
        const d = buildPath(nextCommands)

        // Fix 9 (hot path): During drag, update only the active path's `d`
        // attribute in the live doc DOM — no XMLSerializer, no setSourceSvg,
        // no setPathMetas. The DOM mutation is immediately visible in the
        // browser; React state is flushed at drag-end by flushDragToSource().
        // setCommands is called by the RAF callback in moveSelectedPoints so
        // CanvasOverlay node positions stay in sync.
        if (useEditorStore.getState().drag.active) {
          setActivePath(selectedPathIndex, d)
          return
        }

        // Non-drag path: full mutateSvg (updates live doc + returns serialized).
        const serialized = mutateSvg(sourceSvg, (_svg, paths) => {
          const target = paths[selectedPathIndex]
          if (!target) return
          target.setAttribute('d', d)
        })
        setSourceSvg(serialized)
        setPathMetas(useEditorStore.getState().pathMetas.map((m) => (m.index === selectedPathIndex ? { ...m, d } : m)))
      } catch {
        // ignore
      }
    },
    [selectedPathIndex, setPathMetas, setSourceSvg, sourceSvg],
  )

  const { pushHistory, undo, redo } = useHistory(syncCommandsToSource, {
    refreshPathMetas,
    setSourceSvg,
  })

  const {
    updateSelectedPointInputs,
    selectOnlyPoint,
    togglePointSelection,
    selectRangeToIndex,
    clearSelection,
    addPoint,
    moveSelectedPoints,
    deleteSelectedPoints,
    selectAllNodes,
    copySelectedSection,
    applyPointXY,
    transformSelectedNodes,
  } = useNodeEditor({
    syncCommandsToSource,
    pushHistory,
  })

  useActivePathSync({
    sourceSvg,
    selectedPathIndex,
    pathMetas,
    setCommands,
    setSelectedIndices,
    setRangeStartIndex,
    updateSelectedPointInputs,
    setDrag,
    setSelectionBox,
    setXInput,
    setYInput,
    setBaseViewBox,
    setViewBox,
    setStatus,
    setPathIdDraft,
    setPathLabelDraft,
    setPathFillDraft,
    setPathStrokeDraft,
    setPathOpacityDraft,
    setFillPickerHex,
    setStrokePickerHex,
  })

  const {
    setPathHidden,
    addNewLayerGroup,
    addNewPathToRoot,
    addNewPathFromCommands,
    deletePathAtIndex,
    deleteLayerForPath,
    openRenameDialog,
    applyRename,
    movePathAtIndex,
    applyActivePathProperties,
  } = useSvgMutations({
    pathLabelDraft,
    pathIdDraft,
    pathFillDraft,
    pathStrokeDraft,
    pathOpacityDraft,
    renameDraft,
    renameTarget,
    setRenameDialogOpen,
    setRenameTarget,
    setRenameDraft,
    pushHistory,
    getPathCountFromSvg,
    getPathIndexById,
  })

  function extractSelectionToNewPath(opts?: { ownLayer?: boolean }) {
    if (!sourceSvg || selectedPathIndex < 0) {
      setStatus('No active path.')
      return
    }

    const { commands, selectedIndices } = useEditorStore.getState()
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

      const intoOwnLayer = opts?.ownLayer ?? extractToNewLayer
      let sourcePathId: string | null = null
      const serialized = mutateSvg(sourceSvg, (svg, paths) => {
        const sourcePath = paths[selectedPathIndex]
        if (!sourcePath) {
          throw new Error('Active path not found in SVG.')
        }

        // Build new d from selected commands.
        const points = indices
          .map((i) => commands[i])
          .filter((c): c is { type: 'M' | 'L'; x: number; y: number } => c.type !== 'Z')
        const newCommands: PathCommand[] = points.map((p, idx) => ({
          type: idx === 0 ? 'M' : 'L',
          x: p.x,
          y: p.y,
        }))

        // When splitting/extracting into its own layer/path, users typically expect a closed shape.
        // Only close when we have at least 3 points; otherwise Z is not meaningful.
        if (points.length >= 3) newCommands.push({ type: 'Z' })
        const newD = buildPath(newCommands)

        const newPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
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
        if (intoOwnLayer) {
          const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
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

        const deletingStartMove = indices.includes(min) && commands[min]?.type === 'M'
        const beforeIndex = min - 1
        const afterIndex = max + 1
        const before = beforeIndex >= 0 ? commands[beforeIndex] : null
        const after = afterIndex < commands.length ? commands[afterIndex] : null

        deleteIndicesFromCommands(nextCommands, new Set(indices))

        // Reconnect: if we cut a middle segment (L..L) out, ensure the next point is an L (not M).
        // We only do this when both neighbors exist and we're not cutting from a subpath start.
        if (!deletingStartMove && before && after && before.type !== 'Z' && after.type !== 'Z') {
          const removedCount = indices.length
          const newAfterIndex = afterIndex - removedCount
          const candidate = nextCommands[newAfterIndex]
          if (candidate && candidate.type !== 'Z') {
            if (candidate.type === 'M') {
              candidate.type = 'L'
            }
          }
        }

        sourcePath.setAttribute('d', buildPath(nextCommands))
        sourcePathId = sourcePath.getAttribute('id')
      })
      const nextCommands = commands.filter((_, i) => !indices.includes(i))
      setSourceSvg(serialized)
      const count = getPathCountFromSvg(serialized)

      // Select the newly added path by id (not necessarily last).
      if (count > 0) {
        const metas = useEditorStore.getState().pathMetas
        const nextIndex = metas.findIndex((m) => m.id === `path-${now}`)
        setSelectedPathIndex(nextIndex >= 0 ? nextIndex : count - 1)
      }
      if (sourcePathId) {
        setCommands(nextCommands)
      }
      setSelectedIndices([])
      setStatus(intoOwnLayer ? 'Extracted selection into a new path (own layer).' : 'Extracted selection into a new path.')
    } catch (e) {
      setStatus(`Could not extract selection: ${(e as Error).message}`)
    }
  }

  function pushLog(line: string) {
    const msg = String(line ?? '').trim()
    if (!msg) return
    setLogLines((prev) => {
      const next = prev.concat([msg])
      return next.length > LOG_HISTORY_LIMIT ? next.slice(next.length - LOG_HISTORY_LIMIT) : next
    })
  }

  const copyActivePathToClipboard = useCallback(() => {
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
      mutateSvg(sourceSvg, (_svg, paths) => {
        const sourcePath = paths[selectedPathIndex]
        if (!sourcePath) {
          throw new Error('Active path not found in SVG.')
        }
        const attrs: Record<string, string> = {}
        ;['fill', 'stroke', 'stroke-width', 'opacity', 'fill-rule', 'data-label'].forEach((attr) => {
          const v = sourcePath.getAttribute(attr)
          if (v !== null) attrs[attr] = v
        })
        setClipboardPath({ d: meta.d, attrs })
        setClipboardCommands([])
      })
      setStatus('Copied active path.')
    } catch (e) {
      setStatus(`Could not copy path: ${(e as Error).message}`)
    }
  }, [pathMetas, selectedPathIndex, setClipboardCommands, setClipboardPath, setStatus, sourceSvg])

  const pasteSectionAfterSelected = useCallback(() => {
    // Prefer object paste if present.
    if (clipboardPath) {
      if (!sourceSvg || selectedPathIndex < 0) {
        setStatus('No active path to paste into.')
        return
      }
      try {
        const now = Date.now()
        pushHistory()
        const serialized = mutateSvg(sourceSvg, (svg, paths) => {
          const sourcePath = paths[selectedPathIndex]
          if (!sourcePath) {
            throw new Error('Active path not found in SVG.')
          }

          const newPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
          newPath.setAttribute('d', clipboardPath.d)
          Object.entries(clipboardPath.attrs).forEach(([k, v]) => newPath.setAttribute(k, v))
          newPath.setAttribute('id', `path-${now}`)

          const parent = sourcePath.parentNode
          if (parent) parent.insertBefore(newPath, sourcePath.nextSibling)
          else svg.appendChild(newPath)
        })
        setSourceSvg(serialized)
        const count = getPathCountFromSvg(serialized)
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

    const { commands, selectedIndices } = useEditorStore.getState()
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
  }, [clipboardCommands, clipboardPath, getPathCountFromSvg, pushHistory, selectedPathIndex, setCommands, setSelectedIndices, setSelectedPathIndex, setSourceSvg, setStatus, sourceSvg, syncCommandsToSource, updateSelectedPointInputs])

  function openPointEditorForIndex(index: number) {
    const { commands } = useEditorStore.getState()
    const cmd = commands[index]
    if (!cmd || cmd.type === 'Z') return
    setPointEditorX(formatNumber(cmd.x))
    setPointEditorY(formatNumber(cmd.y))
    setPointEditorOpen(true)
  }

  function applyPointEditor() {
    applyPointXY({ x: pointEditorX, y: pointEditorY })
    setPointEditorOpen(false)
  }

  const finishBoxSelection = useCallback(() => {
    const latest = useEditorStore.getState().selectionBox
    if (!latest.active || !latest.start || !latest.current) return
    const x1 = Math.min(latest.start.x, latest.current.x)
    const y1 = Math.min(latest.start.y, latest.current.y)
    const x2 = Math.max(latest.start.x, latest.current.x)
    const y2 = Math.max(latest.start.y, latest.current.y)
    const matrix = matrixCacheRef.current ?? getRenderMatrix()

    const { commands } = useEditorStore.getState()
    const next: number[] = []
    commands.forEach((c, i) => {
      if (c.type === 'Z') return
      const p = transformPoint(matrix, c.x, c.y, svgRef.current)
      if (p.x >= x1 && p.x <= x2 && p.y >= y1 && p.y <= y2) next.push(i)
    })
    setSelectedIndices(next)
    updateSelectedPointInputs(next)
    setStatus(`${next.length} nodes selected.`)
  }, [getRenderMatrix, setSelectedIndices, setStatus, updateSelectedPointInputs])

  // Refresh list for non-drag updates
  useEffect(() => {
    if (!sourceSvg) return
    if (useEditorStore.getState().drag.active) return
    refreshPathMetas(sourceSvg)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceSvg])

  const commandMenuItems = buildCommandMenuItems({
    hasDoc: Boolean(sourceSvg),
    hasSelection: selectedIndicesLength > 0,
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

  useCommandMenuHotkey(setCommandMenuOpen)

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

  // Fix 9+10: Flush live-doc state to React store once at drag-end, instead of
  // calling setSourceSvg + setPathMetas on every RAF frame during drag.
  // Also update the x/y inspector inputs once here instead of every frame.
  const flushDragToSource = useCallback(() => {
    if (selectedPathIndex < 0) return
    const serialized = serializeLiveDoc()
    const cmds = useEditorStore.getState().commands
    const d = buildPath(cmds)
    setSourceSvg(serialized)
    setPathMetas(useEditorStore.getState().pathMetas.map((m) => (m.index === selectedPathIndex ? { ...m, d } : m)))
    updateSelectedPointInputs(undefined, cmds)
  }, [selectedPathIndex, setPathMetas, setSourceSvg, updateSelectedPointInputs])

  useGlobalInputHandlers({
    perfCountersRef,
    panLastViewBoxRef,
    svgRef,
    finishBoxSelection,
    setCurrentViewBox,
    setDrag,
    setPan,
    setSelectionBox,
    setDrawTool,
    setRectDraft,
    addNewPathFromCommands,
    clearSelection,
    deleteSelectedPoints,
    copyActivePathToClipboard,
    pasteSectionAfterSelected,
    undo,
    redo,
    flushDragToSource,
  })

  // Fix A: outputPath, transformedOutlineD, segments are now computed in
  // CanvasOverlay/DebugDock directly from the store — not in App.

  // Fix 3: Use cached render matrix — no layout-forcing getScreenCTM() per render.
  // eslint-disable-next-line react-hooks/refs
  const matrix = matrixCacheRef.current ?? getRenderMatrix()
  // eslint-disable-next-line react-hooks/refs
  const scale = effectiveHandleScale()
  const handleScale = getHandleScale()

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

      <OpenSvgDialog open={openDialogOpen} onOpenChange={setOpenDialogOpen} sourceSvg={sourceSvg} onOpenFile={onOpenFile} />

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
        canApply={selectedIndicesLength === 1}
      />

      <SettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
        tab={settingsTab}
        setTab={setSettingsTab}
        pointRadiusBase={pointRadiusBase}
      />

      <div className="flex h-svh flex-col">
        <TopBar
          dirty={dirty}
          onUndo={undo}
          onRedo={redo}
          onOpenSettings={() => setSettingsDialogOpen(true)}
          onOpenFile={onOpenFile}
          onSaveFile={onSaveFile}
          inspector={
            <InspectorPanel
              actions={{
                selectAllNodes,
                clearSelection,
                deleteSelectedPoints: () => deleteSelectedPoints(),
                extractSelectionToNewPath: () => extractSelectionToNewPath(),
                transformSelectedNodes,
                addNewPathFromCommands,
                selectRangeToIndex,
                copySelectedSection,
                pasteSectionAfterSelected,
                applyActivePathProperties,
                deletePathAtIndex,
                deleteLayerForPath,
              }}
              logLinesLength={logLines.length}
              onOpenLogDialog={() => setLogDialogOpen(true)}
              onClearLog={() => {
                setLogLines([])
                setStatus('Log cleared.')
              }}
            />
          }
          pathMetas={pathMetas}
          setPathHidden={setPathHidden}
          deletePathAtIndex={deletePathAtIndex}
          movePathAtIndex={movePathAtIndex}
          openRenameDialog={openRenameDialog}
          addNewLayerGroup={addNewLayerGroup}
          addNewPathToRoot={addNewPathToRoot}
        />

        <div className="min-h-0 flex-1 min-w-0">
          <div className="flex h-full min-w-0">
            <InspectorSidebar
              inspectorCollapsed={inspectorCollapsed}
              setInspectorCollapsed={setInspectorCollapsed}
              sourceSvgPresent={Boolean(sourceSvg)}
              activePathPresent={Boolean(activePathMeta)}
              drawTool={drawTool}
              setDrawTool={setDrawTool}
              setPenDraftPoints={setPenDraftPoints}
              setRectDraft={setRectDraft}
              setStatus={setStatus}
              pathFillDraft={pathFillDraft}
              setPathFillDraft={setPathFillDraft}
              fillPickerHex={fillPickerHex}
              setFillPickerHex={setFillPickerHex}
              pathStrokeDraft={pathStrokeDraft}
              setPathStrokeDraft={setPathStrokeDraft}
              strokePickerHex={strokePickerHex}
              setStrokePickerHex={setStrokePickerHex}
              applyActivePathProperties={applyActivePathProperties}
              selectAllNodes={selectAllNodes}
              clearSelection={clearSelection}
              deleteSelectedPoints={() => deleteSelectedPoints()}
              extractSelectionToNewPath={() => extractSelectionToNewPath()}
              transformSelectedNodes={transformSelectedNodes}
              addNewPathFromCommands={addNewPathFromCommands}
              selectRangeToIndex={selectRangeToIndex}
              copySelectedSection={copySelectedSection}
              pasteSectionAfterSelected={pasteSectionAfterSelected}
              deletePathAtIndex={deletePathAtIndex}
              deleteLayerForPath={deleteLayerForPath}
              logLinesLength={logLines.length}
              onOpenLogDialog={() => setLogDialogOpen(true)}
              onClearLog={() => {
                setLogLines([])
                setStatus('Log cleared.')
              }}
            />

            <div className="min-h-0 flex-1 min-w-0">
              <div className="flex h-full min-h-0 flex-col">
                <EditorCanvas
                  svgRef={svgRef}
                  svgContentRef={svgContentRef}
                  sourceSvgPresent={Boolean(sourceSvg)}
                  zoomPercent={zoomPercent}
                  cursorPoint={cursorPoint}
                  onZoomIn={zoomIn}
                  onZoomOut={zoomOut}
                  onSetZoomPercent={setZoomPercent}
                  currentViewBox={currentViewBox}
                  zoomAt={zoomAt}
                  getEditorPointFromEvent={getEditorPointFromEvent}
                  getLocalPointFromEvent={getLocalPointFromEvent}
                  drawTool={drawTool}
                  selectionToolActive={selectionToolActive}
                  penDraftPoints={penDraftPoints}
                  getPenDraftPoints={() => useEditorStore.getState().penDraftPoints}
                  rectDraft={rectDraft}
                  pan={pan}
                  drag={drag}
                  selectionBox={selectionBox}
                  setStatus={setStatus}
                  setPenDraftPoints={setPenDraftPoints}
                  setRectDraft={setRectDraft}
                  setSelectionBox={setSelectionBox}
                  setPan={setPan}
                  setViewBoxCoalesced={setViewBoxCoalesced}
                  setCursorPointCoalesced={setCursorPointCoalesced}
                  perfCounters={{
                    panMoves: () => {
                      perfCountersRef.current.panMoves += 1
                    },
                    boxMoves: () => {
                      perfCountersRef.current.boxMoves += 1
                    },
                    dragMoves: () => {
                      perfCountersRef.current.dragMoves += 1
                    },
                  }}
                  moveSelectedPoints={moveSelectedPoints}
                  gridPattern={gridPattern}
                  previewInnerHtml={previewInnerHtml}
                  selectionRect={selectionRect}
                  matrix={matrix}
                  scale={scale}
                  handleScale={handleScale}
                  pointRadiusBase={pointRadiusBase}
                  nodesVisible={nodesVisible}
                  uiOverlayStrokeWidthScale={uiOverlayStrokeWidthScale}
                  uiOutlineStroke={uiOutlineStroke}
                  uiOutlineDash={uiOutlineDash}
                  uiSegmentStroke={uiSegmentStroke}
                  uiSelectionStroke={uiSelectionStroke}
                  uiSelectionFill={uiSelectionFill}
                  uiSelectionFillOpacity={Number(uiSelectionFillOpacity) || 0}
                  uiSelectionDash={uiSelectionDash}
                  addPoint={addPoint}
                  selectOnlyPoint={selectOnlyPoint}
                  togglePointSelection={togglePointSelection}
                  selectRangeToIndex={selectRangeToIndex}
                  openPointEditorForIndex={openPointEditorForIndex}
                  copySelectedSection={copySelectedSection}
                  pasteSectionAfterSelected={pasteSectionAfterSelected}
                  extractSelectionToNewPath={() => extractSelectionToNewPath()}
                  transformSelectedNodes={transformSelectedNodes}
                  deleteSelectedPoints={() => deleteSelectedPoints()}
                  setDrag={setDrag}
                />

                <DebugDock
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
              pathMetas={pathMetas}
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
