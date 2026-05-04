import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { PathCommand, ViewBox } from './utils'

export type PathMeta = {
  index: number
  label: string
  d: string
  id: string
  dataLabel: string
  groupId: string
  fill: string
  stroke: string
  strokeWidth: string
  opacity: string
  hidden: boolean
}

export type Snapshot = {
  selectedPathIndex: number
  svg: string
  commands: PathCommand[]
}

type DragState = {
  active: boolean
  startLocal: DOMPoint | null
  originalCommands: PathCommand[] | null
  hasHistory?: boolean
}

type SelectionBoxState = {
  active: boolean
  start: { x: number; y: number } | null
  current: { x: number; y: number } | null
}

type PanState = {
  active: boolean
  start:
    | {
        // Capture screen-space anchor to avoid viewBox feedback jitter.
        client: { x: number; y: number }
        unitsPerPx: { x: number; y: number }
        viewBox: ViewBox
      }
    | null
}

const defaultSvgInput = ''

const defaultViewBox: ViewBox = { x: 0, y: 0, width: 1000, height: 1000 }

type EditorStore = {
  svgInput: string
  setSvgInput: (value: string) => void

  sourceSvg: string
  setSourceSvg: (value: string) => void

  fileHandle: FileSystemFileHandle | null
  fileName: string
  setFileHandle: (handle: FileSystemFileHandle | null, name?: string) => void
  autoSaveEnabled: boolean
  setAutoSaveEnabled: (value: boolean) => void

  pathMetas: PathMeta[]
  setPathMetas: (value: PathMeta[]) => void

  // Path visibility is stored in the SVG (display:none) but we mirror it here for UI.
  hiddenPathIndexes: number[]
  setHiddenPathIndexes: (value: number[]) => void

  selectedPathIndex: number
  setSelectedPathIndex: (value: number) => void

  commands: PathCommand[]
  setCommands: (value: PathCommand[]) => void

  selectedIndices: number[]
  setSelectedIndices: (value: number[]) => void

  status: string
  setStatus: (value: string) => void

  xInput: string
  yInput: string
  setXInput: (value: string) => void
  setYInput: (value: string) => void

  selectionToolActive: boolean
  setSelectionToolActive: (value: boolean) => void

  nodesVisible: boolean
  setNodesVisible: (value: boolean) => void

  rangeStartIndex: number | null
  setRangeStartIndex: (value: number | null) => void

  clipboardCommands: Array<{ type: 'L'; x: number; y: number }>
  setClipboardCommands: (value: Array<{ type: 'L'; x: number; y: number }>) => void

  clipboardPath: null | { d: string; attrs: Record<string, string> }
  setClipboardPath: (value: null | { d: string; attrs: Record<string, string> }) => void

  gridVisible: boolean
  setGridVisible: (value: boolean) => void

  snapToGrid: boolean
  setSnapToGrid: (value: boolean) => void

  gridSize: number
  setGridSize: (value: number) => void

  majorGridEvery: number
  setMajorGridEvery: (value: number) => void

  baseViewBox: ViewBox
  setBaseViewBox: (value: ViewBox) => void

  currentViewBox: ViewBox
  setCurrentViewBox: (value: ViewBox) => void

  rotateAngle: string
  setRotateAngle: (value: string) => void

  undoStack: Snapshot[]
  redoStack: Snapshot[]
  pushUndo: (snap: Snapshot) => void
  popUndo: () => Snapshot | null
  pushRedo: (snap: Snapshot) => void
  popRedo: () => Snapshot | null
  clearRedo: () => void
  clearHistory: () => void

  drag: DragState
  setDrag: (value: DragState) => void

  selectionBox: SelectionBoxState
  setSelectionBox: (value: SelectionBoxState) => void

  pan: PanState
  setPan: (value: PanState) => void

  inspectorCollapsed: boolean
  setInspectorCollapsed: (value: boolean) => void
  layersCollapsed: boolean
  setLayersCollapsed: (value: boolean) => void

  debugDockOpen: boolean
  setDebugDockOpen: (value: boolean) => void
  debugDockHeight: number
  setDebugDockHeight: (value: number) => void

  debugUiVisible: boolean
  setDebugUiVisible: (value: boolean) => void

  drawTool: 'select' | 'pen' | 'rect'
  setDrawTool: (value: 'select' | 'pen' | 'rect') => void
  drawNewLayer: boolean
  setDrawNewLayer: (value: boolean) => void

  themeMode: 'system' | 'light' | 'dark'
  setThemeMode: (value: 'system' | 'light' | 'dark') => void

  // UI appearance (editor overlays)
  uiOverlayStrokeWidthScale: number
  setUiOverlayStrokeWidthScale: (value: number) => void

  uiPointSize: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  setUiPointSize: (value: 'xs' | 'sm' | 'md' | 'lg' | 'xl') => void

  uiOutlineStroke: string
  setUiOutlineStroke: (value: string) => void
  uiOutlineDash: string
  setUiOutlineDash: (value: string) => void

  uiSelectionStroke: string
  setUiSelectionStroke: (value: string) => void
  uiSelectionFill: string
  setUiSelectionFill: (value: string) => void
  uiSelectionFillOpacity: number
  setUiSelectionFillOpacity: (value: number) => void
  uiSelectionDash: string
  setUiSelectionDash: (value: string) => void

  uiSegmentStroke: string
  setUiSegmentStroke: (value: string) => void
  uiSegmentHoverStroke: string
  setUiSegmentHoverStroke: (value: string) => void

  uiGridStroke: string
  setUiGridStroke: (value: string) => void
  uiGridMajorStroke: string
  setUiGridMajorStroke: (value: string) => void

  resetUiAppearance: () => void
}

export const useEditorStore = create<EditorStore>()(
  persist(
    (set, get) => ({
  svgInput: defaultSvgInput,
  setSvgInput: (value) => set({ svgInput: value }),

  sourceSvg: '',
  setSourceSvg: (value) => set({ sourceSvg: value }),

  fileHandle: null,
  fileName: '',
  setFileHandle: (handle, name) =>
    set({
      fileHandle: handle,
      fileName: name ?? (handle ? (handle.name || '') : ''),
    }),
  autoSaveEnabled: false,
  setAutoSaveEnabled: (value) => set({ autoSaveEnabled: value }),

  pathMetas: [],
  setPathMetas: (value) => set({ pathMetas: value }),

  hiddenPathIndexes: [],
  setHiddenPathIndexes: (value) => set({ hiddenPathIndexes: value }),

  selectedPathIndex: -1,
  setSelectedPathIndex: (value) => set({ selectedPathIndex: value }),

  commands: [],
  setCommands: (value) => set({ commands: value }),

  selectedIndices: [],
  setSelectedIndices: (value) => set({ selectedIndices: value }),

  status: 'Open an SVG to begin.',
  setStatus: (value) => set({ status: value }),

  xInput: '',
  yInput: '',
  setXInput: (value) => set({ xInput: value }),
  setYInput: (value) => set({ yInput: value }),

  selectionToolActive: false,
  setSelectionToolActive: (value) => set({ selectionToolActive: value }),

  nodesVisible: true,
  setNodesVisible: (value) => set({ nodesVisible: value }),

  rangeStartIndex: null,
  setRangeStartIndex: (value) => set({ rangeStartIndex: value }),

  clipboardCommands: [],
  setClipboardCommands: (value) => set({ clipboardCommands: value }),

  clipboardPath: null,
  setClipboardPath: (value) => set({ clipboardPath: value }),

  gridVisible: false,
  setGridVisible: (value) => set({ gridVisible: value }),

  snapToGrid: false,
  setSnapToGrid: (value) => set({ snapToGrid: value }),

  gridSize: 10,
  setGridSize: (value) => set({ gridSize: value }),

  majorGridEvery: 5,
  setMajorGridEvery: (value) => set({ majorGridEvery: value }),

  baseViewBox: { ...defaultViewBox },
  setBaseViewBox: (value) => set({ baseViewBox: value }),

  currentViewBox: { ...defaultViewBox },
  setCurrentViewBox: (value) => set({ currentViewBox: value }),

  rotateAngle: '45',
  setRotateAngle: (value) => set({ rotateAngle: value }),

  undoStack: [],
  redoStack: [],
  pushUndo: (snap) =>
    set((s) => {
      const next = s.undoStack.concat([snap])
      return { undoStack: next.length > 200 ? next.slice(next.length - 200) : next }
    }),
  popUndo: () => {
    const s = get()
    if (!s.undoStack.length) return null
    const prev = s.undoStack[s.undoStack.length - 1]
    set({ undoStack: s.undoStack.slice(0, -1) })
    return prev
  },
  pushRedo: (snap) => set((s) => ({ redoStack: s.redoStack.concat([snap]) })),
  popRedo: () => {
    const s = get()
    if (!s.redoStack.length) return null
    const next = s.redoStack[s.redoStack.length - 1]
    set({ redoStack: s.redoStack.slice(0, -1) })
    return next
  },
  clearRedo: () => set({ redoStack: [] }),
  clearHistory: () => set({ undoStack: [], redoStack: [] }),

  drag: { active: false, startLocal: null, originalCommands: null },
  setDrag: (value) => set({ drag: value }),

  selectionBox: { active: false, start: null, current: null },
  setSelectionBox: (value) => set({ selectionBox: value }),

  pan: { active: false, start: null },
  setPan: (value) => set({ pan: value }),

  inspectorCollapsed: false,
  setInspectorCollapsed: (value) => set({ inspectorCollapsed: value }),
  layersCollapsed: false,
  setLayersCollapsed: (value) => set({ layersCollapsed: value }),

  debugDockOpen: true,
  setDebugDockOpen: (value) => set({ debugDockOpen: value }),
  debugDockHeight: 280,
  setDebugDockHeight: (value) => set({ debugDockHeight: value }),

  debugUiVisible: true,
  setDebugUiVisible: (value) =>
    set(() => {
      // If the whole debug UI is hidden, ensure the dock isn't left open.
      if (!value) return { debugUiVisible: false, debugDockOpen: false }
      return { debugUiVisible: true }
    }),

  drawTool: 'select',
  setDrawTool: (value) => set({ drawTool: value }),
  drawNewLayer: true,
  setDrawNewLayer: (value) => set({ drawNewLayer: value }),

  themeMode: 'system',
  setThemeMode: (value) => set({ themeMode: value }),

  uiOverlayStrokeWidthScale: 1,
  setUiOverlayStrokeWidthScale: (value) => set({ uiOverlayStrokeWidthScale: value }),

  uiPointSize: 'md',
  setUiPointSize: (value) => set({ uiPointSize: value }),

  uiOutlineStroke: '#ff3b30',
  setUiOutlineStroke: (value) => set({ uiOutlineStroke: value }),
  uiOutlineDash: '6 4',
  setUiOutlineDash: (value) => set({ uiOutlineDash: value }),

  uiSelectionStroke: '#0b66ff',
  setUiSelectionStroke: (value) => set({ uiSelectionStroke: value }),
  uiSelectionFill: '#0b66ff',
  setUiSelectionFill: (value) => set({ uiSelectionFill: value }),
  uiSelectionFillOpacity: 0.12,
  setUiSelectionFillOpacity: (value) => set({ uiSelectionFillOpacity: value }),
  uiSelectionDash: '4 3',
  setUiSelectionDash: (value) => set({ uiSelectionDash: value }),

  uiSegmentStroke: 'rgba(0, 0, 0, 0.35)',
  setUiSegmentStroke: (value) => set({ uiSegmentStroke: value }),
  uiSegmentHoverStroke: '#ff9500',
  setUiSegmentHoverStroke: (value) => set({ uiSegmentHoverStroke: value }),

  uiGridStroke: 'rgba(0, 0, 0, 0.16)',
  setUiGridStroke: (value) => set({ uiGridStroke: value }),
  uiGridMajorStroke: 'rgba(0, 0, 0, 0.28)',
  setUiGridMajorStroke: (value) => set({ uiGridMajorStroke: value }),

  resetUiAppearance: () =>
    set({
      uiOverlayStrokeWidthScale: 1,
      uiPointSize: 'md',
      uiOutlineStroke: '#ff3b30',
      uiOutlineDash: '6 4',
      uiSelectionStroke: '#0b66ff',
      uiSelectionFill: '#0b66ff',
      uiSelectionFillOpacity: 0.12,
      uiSelectionDash: '4 3',
      uiSegmentStroke: 'rgba(0, 0, 0, 0.35)',
      uiSegmentHoverStroke: '#ff9500',
      uiGridStroke: 'rgba(0, 0, 0, 0.16)',
      uiGridMajorStroke: 'rgba(0, 0, 0, 0.28)',
    }),
    }),
    {
      name: 'svg-path-editor-settings',
      version: 1,
      partialize: (state) => ({
        // Persist only “settings” style flags and defaults.
        autoSaveEnabled: state.autoSaveEnabled,
        selectionToolActive: state.selectionToolActive,
        nodesVisible: state.nodesVisible,
        gridVisible: state.gridVisible,
        snapToGrid: state.snapToGrid,
        gridSize: state.gridSize,
        majorGridEvery: state.majorGridEvery,
        inspectorCollapsed: state.inspectorCollapsed,
        layersCollapsed: state.layersCollapsed,
        debugDockHeight: state.debugDockHeight,
        debugUiVisible: state.debugUiVisible,
        drawTool: state.drawTool,
        drawNewLayer: state.drawNewLayer,
        rotateAngle: state.rotateAngle,

        themeMode: state.themeMode,

        uiOverlayStrokeWidthScale: state.uiOverlayStrokeWidthScale,
        uiPointSize: state.uiPointSize,
        uiOutlineStroke: state.uiOutlineStroke,
        uiOutlineDash: state.uiOutlineDash,
        uiSelectionStroke: state.uiSelectionStroke,
        uiSelectionFill: state.uiSelectionFill,
        uiSelectionFillOpacity: state.uiSelectionFillOpacity,
        uiSelectionDash: state.uiSelectionDash,
        uiSegmentStroke: state.uiSegmentStroke,
        uiSegmentHoverStroke: state.uiSegmentHoverStroke,
        uiGridStroke: state.uiGridStroke,
        uiGridMajorStroke: state.uiGridMajorStroke,
      }),
    },
  ),
)
