import type { CommandMenuItem } from '../CommandMenu'

export function buildCommandMenuItems(opts: {
  hasDoc: boolean
  hasSelection: boolean
  themeMode: 'system' | 'light' | 'dark'
  gridVisible: boolean
  snapToGrid: boolean
  nodesVisible: boolean
  debugUiVisible: boolean

  openSettings: () => void
  openSettingsTab: (tab: 'keys' | 'appearance' | 'grid') => void
  setThemeMode: (mode: 'system' | 'light' | 'dark') => void
  toggleGrid: () => void
  toggleSnap: () => void
  toggleNodes: () => void
  toggleDebugUi: () => void

  clearSelection: () => void
  deleteSelectedPoints: () => void
  extractSelectionToNewPath: () => void
}): CommandMenuItem[] {
  const {
    hasDoc,
    hasSelection,
    themeMode,
    gridVisible,
    snapToGrid,
    nodesVisible,
    debugUiVisible,
    openSettings,
    openSettingsTab,
    setThemeMode,
    toggleGrid,
    toggleSnap,
    toggleNodes,
    toggleDebugUi,
    clearSelection,
    deleteSelectedPoints,
    extractSelectionToNewPath,
  } = opts

  return [
    {
      id: 'open-settings',
      label: 'Open Settings',
      keywords: 'preferences options',
      onSelect: openSettings,
    },
    {
      id: 'open-keys',
      label: 'Keybindings (cheat sheet)',
      keywords: 'shortcuts help instructions',
      onSelect: () => openSettingsTab('keys'),
    },
    {
      id: 'open-appearance',
      label: 'Settings: Appearance',
      keywords: 'points size overlay colors',
      onSelect: () => openSettingsTab('appearance'),
    },
    {
      id: 'theme-system',
      label: `Theme: System${themeMode === 'system' ? ' (active)' : ''}`,
      keywords: 'theme appearance dark light system',
      onSelect: () => setThemeMode('system'),
    },
    {
      id: 'theme-light',
      label: `Theme: Light${themeMode === 'light' ? ' (active)' : ''}`,
      keywords: 'theme appearance',
      onSelect: () => setThemeMode('light'),
    },
    {
      id: 'theme-dark',
      label: `Theme: Dark${themeMode === 'dark' ? ' (active)' : ''}`,
      keywords: 'theme appearance',
      onSelect: () => setThemeMode('dark'),
    },
    {
      id: 'open-grid',
      label: 'Settings: Grid & Snap',
      keywords: 'snap grid spacing',
      onSelect: () => openSettingsTab('grid'),
    },
    {
      id: 'toggle-grid',
      label: gridVisible ? 'Toggle grid: Hide' : 'Toggle grid: Show',
      keywords: 'grid',
      disabled: !hasDoc,
      onSelect: toggleGrid,
    },
    {
      id: 'toggle-snap',
      label: snapToGrid ? 'Toggle snap: Off' : 'Toggle snap: On',
      keywords: 'snap',
      disabled: !hasDoc,
      onSelect: toggleSnap,
    },
    {
      id: 'toggle-nodes',
      label: nodesVisible ? 'Toggle nodes: Hide' : 'Toggle nodes: Show',
      keywords: 'points nodes',
      disabled: !hasDoc,
      onSelect: toggleNodes,
    },
    {
      id: 'toggle-debug-ui',
      label: debugUiVisible ? 'Toggle debug UI: Hide' : 'Toggle debug UI: Show',
      keywords: 'debug log perf dock',
      disabled: !hasDoc,
      onSelect: toggleDebugUi,
    },
    {
      id: 'clear-selection',
      label: 'Clear node selection',
      keywords: 'deselect',
      disabled: !hasSelection,
      onSelect: clearSelection,
    },
    {
      id: 'delete-selection',
      label: 'Delete selected nodes',
      keywords: 'remove backspace',
      disabled: !hasSelection,
      onSelect: deleteSelectedPoints,
    },
    {
      id: 'extract-selection',
      label: 'Extract selection to new path',
      keywords: 'split extract layer',
      disabled: !hasSelection,
      onSelect: extractSelectionToNewPath,
    },
  ]
}
