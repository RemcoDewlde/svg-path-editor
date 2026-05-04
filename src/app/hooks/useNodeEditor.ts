import { useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { useEditorStore } from '@/editor/store'
import type { PathCommand } from '@/editor/types'
import { deleteIndicesFromCommands, formatNumber, getTransformTargetIndices, snapPoint, snapValue, type Bounds } from '@/editor/utils'

type UseNodeEditorArgs = {
  syncCommandsToSource: (cmds: PathCommand[]) => void
  pushHistory: () => void
}

export function useNodeEditor(args: UseNodeEditorArgs) {
  const { syncCommandsToSource, pushHistory } = args
  const {
    commands,
    selectedIndices,
    setSelectedIndices,
    setRangeStartIndex,
    setStatus,
    setXInput,
    setYInput,
    snapToGrid,
    gridSize,
    setCommands,
    drag,
    setDrag,
    setClipboardCommands,
    setClipboardPath,
  } = useEditorStore(
    useShallow((s) => ({
      commands: s.commands,
      selectedIndices: s.selectedIndices,
      setSelectedIndices: s.setSelectedIndices,
      setRangeStartIndex: s.setRangeStartIndex,
      setStatus: s.setStatus,
      setXInput: s.setXInput,
      setYInput: s.setYInput,
      snapToGrid: s.snapToGrid,
      gridSize: s.gridSize,
      setCommands: s.setCommands,
      drag: s.drag,
      setDrag: s.setDrag,
      setClipboardCommands: s.setClipboardCommands,
      setClipboardPath: s.setClipboardPath,
    })),
  )

  const updateSelectedPointInputs = useCallback(
    (nextSelected = selectedIndices, cmds = commands) => {
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
    },
    [commands, selectedIndices, setStatus, setXInput, setYInput],
  )

  const selectOnlyPoint = useCallback(
    (index: number) => {
      setSelectedIndices([index])
      setRangeStartIndex(index)
      updateSelectedPointInputs([index])
    },
    [setRangeStartIndex, setSelectedIndices, updateSelectedPointInputs],
  )

  const togglePointSelection = useCallback(
    (index: number) => {
      const next = new Set(selectedIndices)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      const arr = Array.from(next)
      setSelectedIndices(arr)
      setRangeStartIndex(index)
      updateSelectedPointInputs(arr)
    },
    [selectedIndices, setRangeStartIndex, setSelectedIndices, updateSelectedPointInputs],
  )

  const findSubpathBounds = useCallback(
    (index: number) => {
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
    },
    [commands],
  )

  const selectRangeToIndex = useCallback(
    (index: number) => {
      const { start, end } = findSubpathBounds(index)
      const next: number[] = []
      for (let i = start; i <= end; i += 1) {
        if (commands[i] && commands[i].type !== 'Z') next.push(i)
      }
      setSelectedIndices(next)
      setRangeStartIndex(start)
      updateSelectedPointInputs(next)
      setStatus(`Selected subpath (${start} -> ${end}) with ${next.length} nodes.`)
    },
    [commands, findSubpathBounds, setRangeStartIndex, setSelectedIndices, setStatus, updateSelectedPointInputs],
  )

  const clearSelection = useCallback(() => {
    setSelectedIndices([])
    setRangeStartIndex(null)
    updateSelectedPointInputs([])
  }, [setRangeStartIndex, setSelectedIndices, updateSelectedPointInputs])

  const addPoint = useCallback(
    (insertIndex: number, x: number, y: number) => {
      const snapped = snapPoint({ x, y }, snapToGrid, gridSize)
      pushHistory()
      const next = commands.slice()
      next.splice(insertIndex, 0, { type: 'L', x: snapped.x, y: snapped.y })
      setCommands(next)
      syncCommandsToSource(next)
      setSelectedIndices([insertIndex])
      updateSelectedPointInputs([insertIndex])
      setStatus(`Added L point at index ${insertIndex}: x=${formatNumber(snapped.x)}, y=${formatNumber(snapped.y)}`)
    },
    [commands, gridSize, pushHistory, setCommands, setSelectedIndices, setStatus, snapToGrid, syncCommandsToSource, updateSelectedPointInputs],
  )

  const moveSelectedPoints = useCallback(
    (currentLocalPoint: DOMPoint, selectedIndicesSet: Set<number>) => {
      if (!drag.active || !drag.startLocal || !drag.originalCommands) return
      if (!drag.hasHistory) {
        pushHistory()
        setDrag({ ...drag, hasHistory: true })
      }

      const snappedCurrent = snapPoint({ x: currentLocalPoint.x, y: currentLocalPoint.y }, snapToGrid, gridSize)
      const snappedStart = snapPoint({ x: drag.startLocal.x, y: drag.startLocal.y }, snapToGrid, gridSize)
      const dx = snappedCurrent.x - snappedStart.x
      const dy = snappedCurrent.y - snappedStart.y

      const base = drag.originalCommands
      const next = base.map((c, i) => {
        if (c.type === 'Z') return c
        if (!selectedIndicesSet.has(i)) return c
        return { ...c, x: c.x + dx, y: c.y + dy }
      })

      setCommands(next)
      syncCommandsToSource(next)
      updateSelectedPointInputs(undefined, next)
    },
    [drag, gridSize, pushHistory, setCommands, setDrag, snapToGrid, syncCommandsToSource, updateSelectedPointInputs],
  )

  const deleteSelectedPoints = useCallback(
    (indicesOverride?: number[]) => {
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
    },
    [commands, pushHistory, selectedIndices, setCommands, setDrag, setSelectedIndices, setStatus, setXInput, setYInput, syncCommandsToSource],
  )

  const selectAllNodes = useCallback(() => {
    const all = commands.map((c, i) => (c.type === 'Z' ? null : i)).filter((v): v is number => v !== null)
    setSelectedIndices(all)
    updateSelectedPointInputs(all)
    setStatus(`${all.length} nodes selected.`)
  }, [commands, setSelectedIndices, setStatus, updateSelectedPointInputs])

  const copySelectedSection = useCallback(() => {
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
  }, [commands, selectedIndices, setClipboardCommands, setClipboardPath, setStatus])

  const applyPointXY = useCallback(
    (opts?: { x?: string; y?: string }) => {
      if (selectedIndices.length !== 1) {
        setStatus('Select exactly one point to edit X/Y.')
        return
      }

      const index = selectedIndices[0]
      const xRaw = (opts?.x ?? useEditorStore.getState().xInput).trim()
      const yRaw = (opts?.y ?? useEditorStore.getState().yInput).trim()
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
    },
    [commands, gridSize, pushHistory, selectedIndices, setCommands, setStatus, snapToGrid, syncCommandsToSource, updateSelectedPointInputs],
  )

  const transformSelectedNodes = useCallback(
    (transformer: (x: number, y: number, bounds: Bounds) => { x: number; y: number }, label: string) => {
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
    },
    [commands, gridSize, pushHistory, selectedIndices, setCommands, setStatus, snapToGrid, syncCommandsToSource, updateSelectedPointInputs],
  )

  return {
    updateSelectedPointInputs,
    selectOnlyPoint,
    togglePointSelection,
    findSubpathBounds,
    selectRangeToIndex,
    clearSelection,
    addPoint,
    moveSelectedPoints,
    deleteSelectedPoints,
    selectAllNodes,
    copySelectedSection,
    applyPointXY,
    transformSelectedNodes,
  }
}
