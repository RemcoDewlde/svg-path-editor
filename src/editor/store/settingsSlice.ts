import type { StateCreator } from 'zustand'

import type { UiPointSize } from '../types'

type SettingsSlice = {
  autoSaveEnabled: boolean
  setAutoSaveEnabled: (value: boolean) => void
  gridVisible: boolean
  setGridVisible: (value: boolean) => void
  snapToGrid: boolean
  setSnapToGrid: (value: boolean) => void
  gridSize: number
  setGridSize: (value: number) => void
  majorGridEvery: number
  setMajorGridEvery: (value: number) => void
  rotateAngle: string
  setRotateAngle: (value: string) => void
  uiOverlayStrokeWidthScale: number
  setUiOverlayStrokeWidthScale: (value: number) => void
  uiPointSize: UiPointSize
  setUiPointSize: (value: UiPointSize) => void
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

export const createSettingsSlice: StateCreator<SettingsSlice, [], [], SettingsSlice> = (set) => ({
  autoSaveEnabled: false,
  setAutoSaveEnabled: (value) => set({ autoSaveEnabled: value }),

  gridVisible: false,
  setGridVisible: (value) => set({ gridVisible: value }),

  snapToGrid: false,
  setSnapToGrid: (value) => set({ snapToGrid: value }),

  gridSize: 10,
  setGridSize: (value) => set({ gridSize: value }),

  majorGridEvery: 5,
  setMajorGridEvery: (value) => set({ majorGridEvery: value }),

  rotateAngle: '45',
  setRotateAngle: (value) => set({ rotateAngle: value }),

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
})

export type { SettingsSlice }
