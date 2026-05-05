import { useEffect, useRef } from 'react'

import { clampViewBox } from '@/app/canvas/viewBox'
import { normalizeCssColorToHex } from '@/app/utils/color'

import { useEditorStore } from '@/editor/store'
import type { PathCommand, PathMeta, ViewBox } from '@/editor/types'
import { parsePath } from '@/editor/utils'

export function useActivePathSync(opts: {
  sourceSvg: string
  selectedPathIndex: number
  pathMetas: PathMeta[]
  setCommands: (cmds: PathCommand[]) => void
  setSelectedIndices: (indices: number[]) => void
  setRangeStartIndex: (value: number | null) => void
  updateSelectedPointInputs: (indices: number[], cmds?: PathCommand[]) => void
  setDrag: (next: ReturnType<typeof useEditorStore.getState>['drag']) => void
  setSelectionBox: (next: ReturnType<typeof useEditorStore.getState>['selectionBox']) => void
  setXInput: (value: string) => void
  setYInput: (value: string) => void
  setBaseViewBox: (vb: ViewBox) => void
  setViewBox: (vb: ViewBox) => void
  setStatus: (value: string) => void

  setPathIdDraft: (value: string) => void
  setPathLabelDraft: (value: string) => void
  setPathFillDraft: (value: string) => void
  setPathStrokeDraft: (value: string) => void
  setPathOpacityDraft: (value: string) => void
  setFillPickerHex: (value: string) => void
  setStrokePickerHex: (value: string) => void
}) {
  const {
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
  } = opts

  // Used to detect whether we stayed on the same active path.
  // Many SVGs have paths without an `id` attribute, so we fall back to index-based identity.
  const lastActivePathIdRef = useRef<string | null>(null)

  // Parse active path when selection changes.
  useEffect(() => {
    if (!sourceSvg) return
    if (selectedPathIndex < 0) return
    const meta = pathMetas[selectedPathIndex]
    if (!meta) return
    if (useEditorStore.getState().drag.active) return

    const activePathKey = meta.id ? `id:${meta.id}` : `index:${selectedPathIndex}`
    const stayingOnSamePath = lastActivePathIdRef.current === activePathKey
    const prevSelected = useEditorStore.getState().selectedIndices

    setDrag({ active: false, startLocal: null, originalCommands: null })
    setSelectionBox({ active: false, start: null, current: null })
    setXInput('')
    setYInput('')

    try {
      const nextCommands = parsePath(meta.d)
      setCommands(nextCommands)

      if (stayingOnSamePath && prevSelected.length) {
        const nextSel = prevSelected.filter((i) => nextCommands[i] && nextCommands[i].type !== 'Z')
        setSelectedIndices(nextSel)
        setRangeStartIndex(nextSel.length ? nextSel[0] : null)
        updateSelectedPointInputs(nextSel, nextCommands)
      } else {
        setSelectedIndices([])
      }

      if (!stayingOnSamePath) {
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

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPathIndex, pathMetas, sourceSvg])

  // Sync active-path drafts.
  useEffect(() => {
    const meta = selectedPathIndex >= 0 ? pathMetas[selectedPathIndex] : null
    setPathIdDraft(meta?.id || '')
    setPathLabelDraft(meta?.dataLabel || '')
    setPathFillDraft(meta?.fill || '')
    setPathStrokeDraft(meta?.stroke || '')
    setPathOpacityDraft(meta?.opacity || '')

    const fillHex = normalizeCssColorToHex(meta?.fill || '')
    if (fillHex) setFillPickerHex(fillHex)
    const strokeHex = normalizeCssColorToHex(meta?.stroke || '')
    if (strokeHex) setStrokePickerHex(strokeHex)
  }, [
    pathMetas,
    selectedPathIndex,
    setFillPickerHex,
    setPathFillDraft,
    setPathIdDraft,
    setPathLabelDraft,
    setPathOpacityDraft,
    setPathStrokeDraft,
    setStrokePickerHex,
  ])
}
