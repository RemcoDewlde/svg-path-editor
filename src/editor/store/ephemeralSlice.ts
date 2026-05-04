import type { StateCreator } from 'zustand'

type EphemeralSlice = {
  svgInput: string
  setSvgInput: (value: string) => void
  fileHandle: FileSystemFileHandle | null
  fileName: string
  setFileHandle: (handle: FileSystemFileHandle | null, name?: string) => void
  status: string
  setStatus: (value: string) => void
  xInput: string
  yInput: string
  setXInput: (value: string) => void
  setYInput: (value: string) => void
  rangeStartIndex: number | null
  setRangeStartIndex: (value: number | null) => void
  clipboardCommands: Array<{ type: 'L'; x: number; y: number }>
  setClipboardCommands: (value: Array<{ type: 'L'; x: number; y: number }>) => void
  clipboardPath: null | { d: string; attrs: Record<string, string> }
  setClipboardPath: (value: null | { d: string; attrs: Record<string, string> }) => void

  penDraftPoints: Array<{ x: number; y: number }>
  setPenDraftPoints: (value: Array<{ x: number; y: number }>) => void

  rectDraft: null | { start: { x: number; y: number }; current: { x: number; y: number } }
  setRectDraft: (value: null | { start: { x: number; y: number }; current: { x: number; y: number } }) => void

  inspectorTab: 'nodes' | 'path'
  setInspectorTab: (value: 'nodes' | 'path') => void

  pathLabelDraft: string
  setPathLabelDraft: (value: string) => void
  pathIdDraft: string
  setPathIdDraft: (value: string) => void
  pathFillDraft: string
  setPathFillDraft: (value: string) => void
  pathStrokeDraft: string
  setPathStrokeDraft: (value: string) => void
  pathOpacityDraft: string
  setPathOpacityDraft: (value: string) => void
  fillPickerHex: string
  setFillPickerHex: (value: string) => void
  strokePickerHex: string
  setStrokePickerHex: (value: string) => void
}

const defaultSvgInput = ''

export const createEphemeralSlice: StateCreator<EphemeralSlice, [], [], EphemeralSlice> = (set) => ({
  svgInput: defaultSvgInput,
  setSvgInput: (value) => set({ svgInput: value }),

  fileHandle: null,
  fileName: '',
  setFileHandle: (handle, name) =>
    set({
      fileHandle: handle,
      fileName: name ?? (handle ? handle.name || '' : ''),
    }),

  status: 'Open an SVG to begin.',
  setStatus: (value) => set({ status: value }),

  xInput: '',
  yInput: '',
  setXInput: (value) => set({ xInput: value }),
  setYInput: (value) => set({ yInput: value }),

  rangeStartIndex: null,
  setRangeStartIndex: (value) => set({ rangeStartIndex: value }),

  clipboardCommands: [],
  setClipboardCommands: (value) => set({ clipboardCommands: value }),

  clipboardPath: null,
  setClipboardPath: (value) => set({ clipboardPath: value }),

  penDraftPoints: [],
  setPenDraftPoints: (value) => set({ penDraftPoints: value }),

  rectDraft: null,
  setRectDraft: (value) => set({ rectDraft: value }),

  inspectorTab: 'nodes',
  setInspectorTab: (value) => set({ inspectorTab: value }),

  pathLabelDraft: '',
  setPathLabelDraft: (value) => set({ pathLabelDraft: value }),
  pathIdDraft: '',
  setPathIdDraft: (value) => set({ pathIdDraft: value }),
  pathFillDraft: '',
  setPathFillDraft: (value) => set({ pathFillDraft: value }),
  pathStrokeDraft: '',
  setPathStrokeDraft: (value) => set({ pathStrokeDraft: value }),
  pathOpacityDraft: '',
  setPathOpacityDraft: (value) => set({ pathOpacityDraft: value }),

  fillPickerHex: '#000000',
  setFillPickerHex: (value) => set({ fillPickerHex: value }),
  strokePickerHex: '#000000',
  setStrokePickerHex: (value) => set({ strokePickerHex: value }),
})

export type { EphemeralSlice }
