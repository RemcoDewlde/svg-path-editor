import type { StateCreator } from 'zustand'

import type { PathCommand, PathMeta, Snapshot, DragState, SelectionBoxState } from '../types'

type PathSlice = {
  sourceSvg: string
  setSourceSvg: (value: string) => void
  pathMetas: PathMeta[]
  setPathMetas: (value: PathMeta[]) => void
  hiddenPathIndexes: number[]
  setHiddenPathIndexes: (value: number[]) => void
  selectedPathIndex: number
  setSelectedPathIndex: (value: number) => void
  commands: PathCommand[]
  setCommands: (value: PathCommand[]) => void
  selectedIndices: number[]
  setSelectedIndices: (value: number[]) => void
  drag: DragState
  setDrag: (value: DragState) => void
  selectionBox: SelectionBoxState
  setSelectionBox: (value: SelectionBoxState) => void
  undoStack: Snapshot[]
  redoStack: Snapshot[]
  pushUndo: (snap: Snapshot) => void
  popUndo: () => Snapshot | null
  pushRedo: (snap: Snapshot) => void
  popRedo: () => Snapshot | null
  clearRedo: () => void
  clearHistory: () => void
}

export const createPathSlice: StateCreator<PathSlice, [], [], PathSlice> = (set, get) => ({
  sourceSvg: '',
  setSourceSvg: (value) => set({ sourceSvg: value }),

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

  drag: { active: false, startLocal: null, originalCommands: null },
  setDrag: (value) => set({ drag: value }),

  selectionBox: { active: false, start: null, current: null },
  setSelectionBox: (value) => set({ selectionBox: value }),

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
})

export type { PathSlice }
