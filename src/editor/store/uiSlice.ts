import type { StateCreator } from 'zustand'

type UiSlice = {
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
  selectionToolActive: boolean
  setSelectionToolActive: (value: boolean) => void
  nodesVisible: boolean
  setNodesVisible: (value: boolean) => void
}

export const createUiSlice: StateCreator<UiSlice, [], [], UiSlice> = (set) => ({
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
      if (!value) return { debugUiVisible: false, debugDockOpen: false }
      return { debugUiVisible: true }
    }),

  drawTool: 'select',
  setDrawTool: (value) => set({ drawTool: value }),
  drawNewLayer: true,
  setDrawNewLayer: (value) => set({ drawNewLayer: value }),

  themeMode: 'system',
  setThemeMode: (value) => set({ themeMode: value }),

  selectionToolActive: false,
  setSelectionToolActive: (value) => set({ selectionToolActive: value }),

  nodesVisible: true,
  setNodesVisible: (value) => set({ nodesVisible: value }),
})

export type { UiSlice }
