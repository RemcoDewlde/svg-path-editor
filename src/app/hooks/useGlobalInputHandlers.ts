import { useEffect } from 'react'

import { clampViewBox } from '@/app/canvas/viewBox'
import { useEditorStore } from '@/editor/store'
import type { DragState, PanState, PathCommand, PerfCounters, SelectionBoxState, ViewBox } from '@/editor/types'

type Undo = () => void
type Redo = () => void

export function useGlobalInputHandlers(opts: {
  perfCountersRef: React.RefObject<PerfCounters>
  panLastViewBoxRef: React.RefObject<ViewBox | null>
  svgRef: React.RefObject<SVGSVGElement | null>
  finishBoxSelection: () => void
  setCurrentViewBox: (vb: ViewBox) => void
  setDrag: (next: DragState) => void
  setPan: (next: PanState) => void
  setSelectionBox: (next: SelectionBoxState) => void
  setDrawTool: (tool: 'select' | 'pen' | 'rect') => void
  setRectDraft: (draft: null | { start: { x: number; y: number }; current: { x: number; y: number } }) => void
  addNewPathFromCommands: (cmds: PathCommand[], opts?: { label?: string; newLayer?: boolean }) => void
  clearSelection: () => void
  deleteSelectedPoints: (indices?: number[]) => void
  copyActivePathToClipboard: () => void
  pasteSectionAfterSelected: () => void
  undo: Undo
  redo: Redo
}) {
  const {
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
  } = opts

  useEffect(() => {
    function onMouseUp() {
      if (useEditorStore.getState().selectionBox.active) finishBoxSelection()

      if (useEditorStore.getState().pan.active && panLastViewBoxRef.current) {
        perfCountersRef.current.viewBoxCommits += 1
        setCurrentViewBox(clampViewBox(panLastViewBoxRef.current))
      }

      if (useEditorStore.getState().drawTool === 'rect') {
        const draft = useEditorStore.getState().rectDraft
        if (draft) {
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
          if (w >= 0.01 && height >= 0.01) {
            const cmds: PathCommand[] = [
              { type: 'M', x: minX, y: minY },
              { type: 'L', x: maxX, y: minY },
              { type: 'L', x: maxX, y: maxY },
              { type: 'L', x: minX, y: maxY },
              { type: 'Z' },
            ]
            addNewPathFromCommands(cmds, { label: 'rect', newLayer: useEditorStore.getState().drawNewLayer })
          }
          setDrawTool('select')
        }
        setRectDraft(null)
      }

      setDrag({ active: false, startLocal: null, originalCommands: null, hasHistory: false })
      setPan({ active: false, start: null })
      setSelectionBox({ active: false, start: null, current: null })
      const svg = svgRef.current
      if (svg) svg.style.cursor = 'crosshair'
    }

    function onKeyDown(event: KeyboardEvent) {
      const ctrl = event.ctrlKey || event.metaKey
      const active = document.activeElement as HTMLElement | null
      const tag = (active?.tagName || '').toLowerCase()
      const isEditingText = tag === 'input' || tag === 'textarea' || tag === 'select' || !!active?.isContentEditable
      if (!isEditingText && active && active.closest('.monaco-editor')) return
      if (isEditingText) return

      if (event.key === 'Escape') {
        event.preventDefault()
        clearSelection()
        return
      }

      if (ctrl && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        undo()
        return
      }
      if (ctrl && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        redo()
        return
      }
      if (ctrl && event.key.toLowerCase() === 'c') {
        event.preventDefault()
        copyActivePathToClipboard()
        return
      }
      if (ctrl && event.key.toLowerCase() === 'v') {
        event.preventDefault()
        pasteSectionAfterSelected()
        return
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        const indices = useEditorStore.getState().selectedIndices
        if (indices.length) deleteSelectedPoints(indices)
      }
    }

    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [
    addNewPathFromCommands,
    clearSelection,
    copyActivePathToClipboard,
    deleteSelectedPoints,
    finishBoxSelection,
    panLastViewBoxRef,
    pasteSectionAfterSelected,
    perfCountersRef,
    redo,
    setCurrentViewBox,
    setDrag,
    setDrawTool,
    setPan,
    setRectDraft,
    setSelectionBox,
    svgRef,
    undo,
  ])
}
