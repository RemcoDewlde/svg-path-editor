import { useCallback } from 'react'

import { useShallow } from 'zustand/react/shallow'

import { useEditorStore } from '@/editor/store'
import type { PathCommand } from '@/editor/types'

type Snapshot = { selectedPathIndex: number; svg: string; commands: PathCommand[] }

type UseHistoryArgs = {
  refreshPathMetas: (value: string) => void
  setSourceSvg: (value: string) => void
}

export function useHistory(syncCommandsToSource: (cmds: PathCommand[]) => void, args: UseHistoryArgs) {
  const { refreshPathMetas, setSourceSvg } = args
  const {
    sourceSvg,
    selectedPathIndex,
    commands,
    pushUndo,
    popUndo,
    pushRedo,
    popRedo,
    clearRedo,
    setSelectedPathIndex,
    setCommands,
    setSelectedIndices,
    setDrag,
    setSelectionBox,
    setPan,
    setXInput,
    setYInput,
    baseViewBox,
    currentViewBox,
    setBaseViewBox,
    setCurrentViewBox,
  } = useEditorStore(
    useShallow((s) => ({
      sourceSvg: s.sourceSvg,
      selectedPathIndex: s.selectedPathIndex,
      commands: s.commands,
      pushUndo: s.pushUndo,
      popUndo: s.popUndo,
      pushRedo: s.pushRedo,
      popRedo: s.popRedo,
      clearRedo: s.clearRedo,
      setSelectedPathIndex: s.setSelectedPathIndex,
      setCommands: s.setCommands,
      setSelectedIndices: s.setSelectedIndices,
      setDrag: s.setDrag,
      setSelectionBox: s.setSelectionBox,
      setPan: s.setPan,
      setXInput: s.setXInput,
      setYInput: s.setYInput,
      baseViewBox: s.baseViewBox,
      currentViewBox: s.currentViewBox,
      setBaseViewBox: s.setBaseViewBox,
      setCurrentViewBox: s.setCurrentViewBox,
    })),
  )

  const snapshot = useCallback((): Snapshot => {
    return {
      selectedPathIndex,
      svg: sourceSvg,
      commands: commands.map((c) => ({ ...c })) as PathCommand[],
    }
  }, [commands, selectedPathIndex, sourceSvg])

  const pushHistory = useCallback(() => {
    if (!sourceSvg || selectedPathIndex < 0) return
    pushUndo(snapshot())
    clearRedo()
  }, [clearRedo, pushUndo, selectedPathIndex, snapshot, sourceSvg])

  const applySnapshot = useCallback(
    (snap: Snapshot) => {
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
      setCurrentViewBox(preservedCurrent)
      syncCommandsToSource(snap.commands)
    },
    [
      baseViewBox,
      currentViewBox,
      refreshPathMetas,
      setBaseViewBox,
      setCommands,
      setCurrentViewBox,
      setDrag,
      setPan,
      setSelectedIndices,
      setSelectedPathIndex,
      setSelectionBox,
      setSourceSvg,
      setXInput,
      setYInput,
      syncCommandsToSource,
    ],
  )

  const undo = useCallback(() => {
    const prev = popUndo()
    if (!prev) return
    pushRedo(snapshot())
    applySnapshot(prev)
    useEditorStore.getState().setStatus('Undo')
  }, [applySnapshot, popUndo, pushRedo, snapshot])

  const redo = useCallback(() => {
    const next = popRedo()
    if (!next) return
    pushUndo(snapshot())
    applySnapshot(next)
    useEditorStore.getState().setStatus('Redo')
  }, [applySnapshot, popRedo, pushUndo, snapshot])

  return { snapshot, pushHistory, undo, redo }
}
