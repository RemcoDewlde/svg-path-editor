import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { createEphemeralSlice, type EphemeralSlice } from './ephemeralSlice'
import { createPathSlice, type PathSlice } from './pathSlice'
import { createSettingsSlice, type SettingsSlice } from './settingsSlice'
import { createUiSlice, type UiSlice } from './uiSlice'
import { createViewSlice, type ViewSlice } from './viewSlice'

type EditorStore = UiSlice & ViewSlice & PathSlice & SettingsSlice & EphemeralSlice

export const useEditorStore = create<EditorStore>()(
  persist(
    (set, get) => ({
      ...createUiSlice(set, get, undefined as never),
      ...createViewSlice(set, get, undefined as never),
      ...createPathSlice(set, get, undefined as never),
      ...createSettingsSlice(set, get, undefined as never),
      ...createEphemeralSlice(set, get, undefined as never),
    }),
    {
      name: 'svg-path-editor-settings',
      version: 1,
      partialize: (state) => ({
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

export type { EditorStore }
