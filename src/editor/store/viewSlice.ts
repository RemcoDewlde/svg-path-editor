import type { StateCreator } from 'zustand'

import type { ViewBox, PanState } from '../types'

type ViewSlice = {
  baseViewBox: ViewBox
  setBaseViewBox: (value: ViewBox) => void
  currentViewBox: ViewBox
  setCurrentViewBox: (value: ViewBox) => void
  pan: PanState
  setPan: (value: PanState) => void
}

const defaultViewBox: ViewBox = { x: 0, y: 0, width: 1000, height: 1000 }

export const createViewSlice: StateCreator<ViewSlice, [], [], ViewSlice> = (set) => ({
  baseViewBox: { ...defaultViewBox },
  setBaseViewBox: (value) => set({ baseViewBox: value }),

  currentViewBox: { ...defaultViewBox },
  setCurrentViewBox: (value) => set({ currentViewBox: value }),

  pan: { active: false, start: null },
  setPan: (value) => set({ pan: value }),
})

export type { ViewSlice }
