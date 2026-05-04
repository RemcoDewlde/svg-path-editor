# SVG Path Editor — Refactor Plan

A step-by-step guide for a smaller LLM to follow. Each phase is independent and safe to do in order. Every step ends with `npm run lint && npm run build` — both must pass before moving on. Do not skip steps; do not combine phases.

---

## Ground rules

- Never break existing UX or keyboard shortcuts.
- Preserve the Zustand store structure — do not restructure `src/editor/store.ts` unless a step explicitly says to.
- After every file change run `npm run lint && npm run build`. Fix all errors before continuing.
- Commit or checkpoint after each **phase**, not each step.
- All new files go under `src/app/` unless otherwise stated.
- Use TypeScript. No `any`. Import types with `import type`.

---

## Phase 1 — Shared types and a core utility helper

**Goal:** eliminate the two most frequently duplicated patterns before anything else.

### Step 1.1 — Create `src/editor/types.ts`

Extract types that are currently copy-pasted between files.

Create `src/editor/types.ts` with:

```ts
export type ViewBox = { x: number; y: number; width: number; height: number }

export type PathCommand =
  | { type: 'M'; x: number; y: number }
  | { type: 'L'; x: number; y: number }
  | { type: 'Z' }

export type PathMeta = {
  index: number
  label: string
  d: string
  id: string
  dataLabel: string
  groupId: string
  fill: string
  stroke: string
  strokeWidth: string
  opacity: string
  hidden: boolean
}

export type Snapshot = {
  selectedPathIndex: number
  svg: string
  commands: PathCommand[]
}

export type PerfCounters = {
  viewBoxWrites: number
  viewBoxCommits: number
  cursorWrites: number
  cursorCommits: number
}
```

Then update every import site:
- `src/editor/store.ts` — import `ViewBox`, `PathCommand`, `PathMeta`, `Snapshot` from `./types`
- `src/editor/utils.ts` — import `PathCommand` from `./types`
- `src/App.tsx` — import from `../editor/types`
- `src/app/debug/DebugDock.tsx` — import `PerfCounters` from `../../editor/types`
- `src/app/debug/usePerfStats.ts` — import `PerfCounters` from `../../editor/types`

Delete the locally-defined duplicates in each of those files.

Run `npm run lint && npm run build`.

---

### Step 1.2 — Create `src/editor/svgDoc.ts`

There are 12+ functions in `App.tsx` that all repeat this exact pattern:

```ts
const doc = new DOMParser().parseFromString(sourceSvg, 'image/svg+xml')
const svg = doc.documentElement
const paths = Array.from(svg.querySelectorAll('path[d]'))
// ... mutate ...
const serialized = new XMLSerializer().serializeToString(svg)
```

Create `src/editor/svgDoc.ts`:

```ts
/**
 * Parse `svgString`, run `mutate` against the root <svg> element and its
 * `<path d>` elements, then return the re-serialized SVG string.
 *
 * Throws if the SVG fails to parse (caller should catch).
 */
export function mutateSvg(
  svgString: string,
  mutate: (svg: SVGSVGElement, paths: Element[]) => void,
): string {
  const doc = new DOMParser().parseFromString(svgString, 'image/svg+xml')
  const parserError = doc.querySelector('parsererror')
  if (parserError) throw new Error('SVG parse error')
  const svg = doc.documentElement as unknown as SVGSVGElement
  const paths = Array.from(svg.querySelectorAll('path[d]'))
  mutate(svg, paths)
  return new XMLSerializer().serializeToString(svg)
}
```

Do not change any callers yet — that happens in Phase 3.

Run `npm run lint && npm run build`.

---

## Phase 2 — Extract the Inspector panel

**Goal:** remove the 370-line `const inspector = (...)` JSX variable from `App.tsx` and replace it with a proper `<InspectorPanel />` component.

### Step 2.1 — Identify what `inspector` JSX needs

Read `App.tsx` lines 2062–2434. List every prop, callback, and piece of state the JSX block reads from the surrounding `App` scope. That becomes the props interface of `<InspectorPanel />`.

Expected props (based on current code):
- All `commands`, `selectedIndices`, `selectedCount`, `xInput`, `yInput`, `status`, `drawTool`, `snapToGrid`, `gridVisible`, `nodesVisible`, `selectionToolActive`, `drag`, `rotateAngle`
- Callbacks: `applyPointXY`, `openPointEditorForIndex`, `deleteSelectedPoints`, `addPoint`, `selectAllNodes`, `copySelectedSection`, `pasteSectionAfterSelected`, `extractSelectionToNewPath`, `transformSelectedNodes`, `clearSelection`
- Active path meta fields: `activePathMeta`, `pathIdDraft`, `pathLabelDraft`, `pathFillDraft`, `pathStrokeDraft`, `pathOpacityDraft`, `fillPickerHex`, `strokePickerHex`
- Setters for drafts and inputs
- `setStatus`, `applyActivePathProperties`, `applyActivePathPaint`, etc.

### Step 2.2 — Create `src/app/panels/InspectorPanel.tsx`

- Define a `InspectorPanelProps` interface with everything from Step 2.1.
- Move the JSX from `const inspector = (...)` verbatim into the component's return.
- Import every helper it needs (icons, shadcn components, store types).
- Do **not** call `useEditorStore` inside `InspectorPanel` — all state flows in via props for now (this keeps the diff reviewable and behavior identical).

### Step 2.3 — Use `<InspectorPanel />` in App.tsx

- Delete the `const inspector = (...)` block.
- Replace all usages of `{inspector}` and `inspector` with `<InspectorPanel ...props />`.
- Pass all props explicitly (no spread of a giant object).

Run `npm run lint && npm run build`.

---

## Phase 3 — Replace the duplicated SVG parse/serialize pattern

**Goal:** use the `mutateSvg` helper from Phase 1.2 in every mutation function.

These functions in `App.tsx` all do the parse → mutate → serialize dance and should be refactored one at a time:

1. `setPathHidden`
2. `addNewLayerGroup`
3. `addNewPathToRoot`
4. `addNewPathFromCommands`
5. `deletePathAtIndex`
6. `deleteLayerForPath`
7. `movePathAtIndex`
8. `extractSelectionToNewPath`
9. `applyRename`
10. `applyActivePathProperties`
11. `applyActivePathPaint`
12. `syncCommandsToSource`

For each one, replace the inline parse/mutate/serialize block with a call to `mutateSvg`. Example transformation:

**Before:**
```ts
const doc = new DOMParser().parseFromString(sourceSvg, 'image/svg+xml')
const svg = doc.documentElement
const paths = Array.from(svg.querySelectorAll('path[d]'))
const target = paths[index]
target.setAttribute('display', 'none')
const serialized = new XMLSerializer().serializeToString(svg)
setSourceSvg(serialized)
```

**After:**
```ts
const serialized = mutateSvg(sourceSvg, (svg, paths) => {
  const target = paths[index]
  target.setAttribute('display', 'none')
})
setSourceSvg(serialized)
```

Do one function at a time. Run `npm run lint && npm run build` after each one.

---

## Phase 4 — Fix the double `refreshPathMetas` call

**Goal:** every SVG mutation currently calls `refreshPathMetas` directly, AND a `useEffect` on `sourceSvg` calls it again. Remove the duplicate.

### Step 4.1

In `App.tsx`, find the effect:
```ts
useEffect(() => {
  if (!sourceSvg) return
  if (useEditorStore.getState().drag.active) return
  refreshPathMetas(sourceSvg)
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [sourceSvg])
```

Remove all direct `refreshPathMetas(serialized)` calls from every mutation function (the ones refactored in Phase 3 are the main ones). Keep only this single effect as the canonical refresh trigger.

The exception: calls in `undo`/`redo` (`applySnapshot`) may still call `refreshPathMetas` directly because the snapshot restore doesn't go through `setSourceSvg` in a way that synchronously needs the metas. Verify this case carefully before removing.

Run `npm run lint && npm run build`.

---

## Phase 5 — Extract custom hooks from App.tsx

Each hook moves a cohesive group of state + handlers out of App. Hooks still call `useEditorStore` directly — no prop drilling needed.

### Step 5.1 — `src/app/hooks/useViewBox.ts`

Move out:
- `setViewBox`, `setViewBoxCoalesced`, `zoomAt`, `zoomByFactor`, `setZoomPercent`
- Refs: `viewBoxRafRef`, `pendingViewBoxRef`, `lastViewBoxCommitTsRef`, `panLastViewBoxRef`, `viewBoxAttrRafRef`
- `zoomPercent` derived value

Hook signature: `function useViewBox(svgRef: RefObject<SVGSVGElement | null>)`
Returns: `{ zoomPercent, setViewBox, setViewBoxCoalesced, zoomAt, zoomByFactor, setZoomPercent, panLastViewBoxRef }`

### Step 5.2 — `src/app/hooks/useNodeEditor.ts`

Move out:
- `addPoint`, `moveSelectedPoints`, `deleteSelectedPoints`, `selectAllNodes`, `copySelectedSection`, `pasteSectionAfterSelected`, `applyPointXY`, `transformSelectedNodes`, `extractSelectionToNewPath`
- `updateSelectedPointInputs`, `selectOnlyPoint`, `togglePointSelection`, `findSubpathBounds`, `selectRangeToIndex`, `clearSelection`

Hook signature: `function useNodeEditor(syncCommandsToSource: (cmds: PathCommand[]) => void)`
Returns all the above functions.

### Step 5.3 — `src/app/hooks/useSvgMutations.ts`

Move out the SVG CRUD functions:
- `refreshPathMetas`, `setPathHidden`, `addNewLayerGroup`, `addNewPathToRoot`, `addNewPathFromCommands`, `deletePathAtIndex`, `deleteLayerForPath`, `movePathAtIndex`, `applyRename`, `syncCommandsToSource`, `applyActivePathProperties`, `applyActivePathPaint`

Hook signature: `function useSvgMutations()`
Returns all functions above.

### Step 5.4 — `src/app/hooks/useHistory.ts`

Move out:
- `snapshot`, `pushHistory`, `applySnapshot`, `undo`, `redo`

Hook signature: `function useHistory(syncCommandsToSource: (cmds: PathCommand[]) => void)`
Returns: `{ snapshot, pushHistory, undo, redo }`

For each step: create the hook file, move code, import it in `App.tsx`, delete the original declarations, run `npm run lint && npm run build`.

---

## Phase 6 — Stabilize callbacks with useCallback

**Goal:** prevent unnecessary re-renders and fix the `globalHandlersRef` hack.

After Phase 5, the hooks return functions. Wrap each returned function in `useCallback` with correct dependencies inside its hook file. This is the correct place to do it — not in `App.tsx`.

Once the functions from `useSvgMutations` and `useNodeEditor` are stable:
- The `globalHandlersRef` pattern in `App.tsx` can be simplified: since the functions no longer change identity on every render, the global `mouseup`/`keydown` effect can list them as proper dependencies and drop the ref indirection entirely.
- Delete `globalHandlersRef` and its corresponding effect.

Run `npm run lint && npm run build`.

---

## Phase 7 — Extract the canvas SVG overlay

**Goal:** move the ~500-line SVG overlay render out of `App.tsx`'s return.

### Step 7.1 — Create `src/app/canvas/CanvasOverlay.tsx`

This component renders:
- The `<defs>` grid pattern
- The transformed path outline
- The segment polylines (hover hit areas)
- The selection rubber-band rect
- The cursor crosshair point
- The node circles (with mouse handlers)

Props it needs: `commands`, `selectedIndices`, `selectionRect`, `gridPattern`, `transformedOutlineD`, `segments`, `cursorPoint`, `scale`, `pointRadiusBase`, `drag`, `drawTool`, `penDraftPoints`, `rectDraft`, `uiOutlineStroke`, `uiOutlineDash`, `uiSegmentStroke`, `uiSelectionStroke`, `uiSelectionFill`, `uiSelectionFillOpacity`, `uiSelectionDash`, and all the node mouse event callbacks.

Move the SVG overlay JSX verbatim (no logic changes). Wire up the props in `App.tsx`.

Run `npm run lint && npm run build`.

---

## Phase 8 — Split the Zustand store

**Goal:** the single 422-line store is manageable now, but should be sliced by domain for clarity.

Rename `src/editor/store.ts` → `src/editor/store/index.ts` (re-export everything from there so imports don't break).

Create slices:
- `src/editor/store/uiSlice.ts` — theme, inspector/layers collapsed, debug dock, draw tool, nodes visible, selection tool
- `src/editor/store/viewSlice.ts` — `baseViewBox`, `currentViewBox`, `pan`
- `src/editor/store/pathSlice.ts` — `sourceSvg`, `pathMetas`, `hiddenPathIndexes`, `selectedPathIndex`, `commands`, `selectedIndices`, `drag`, `selectionBox`, undo/redo stacks
- `src/editor/store/settingsSlice.ts` — all `ui*` appearance values, grid settings, snap, `autoSaveEnabled`, `rotateAngle`
- `src/editor/store/ephemeralSlice.ts` — `status`, `xInput`, `yInput`, `rangeStartIndex`, `clipboardCommands`, `clipboardPath`, `svgInput`, `fileHandle`, `fileName`

Each slice is a plain object satisfying a `SliceOf<TState>` pattern — use Zustand's `StateCreator` type. Combine them in `index.ts`.

The `persist` middleware only needs to target the settings + UI slices — ephemeral state should not be persisted.

Run `npm run lint && npm run build`.

---

## Phase 9 — Add path aliases

**Goal:** eliminate deep relative imports (`../../../editor/types`).

In `tsconfig.app.json`, add:
```json
"paths": {
  "@/*": ["./src/*"]
}
```

In `vite.config.ts`, add:
```ts
import path from 'path'
resolve: {
  alias: { '@': path.resolve(__dirname, './src') }
}
```

Then do a project-wide find-and-replace of relative imports that go more than 2 levels up:
- `../../editor/` → `@/editor/`
- `../../app/` → `@/app/`
- `../../components/` → `@/components/`
- `../../lib/` → `@/lib/`

Run `npm run lint && npm run build`.

---

## Phase 10 — Performance: selective store subscriptions

**Goal:** components that only need one slice of state should not re-render when unrelated slices change.

After Phase 8's store split, audit every component that calls `useEditorStore()`:
- Replace full destructuring with selector-based subscriptions:
  ```ts
  // Before
  const { commands, selectedIndices, status, themeMode } = useEditorStore()

  // After
  const commands = useEditorStore((s) => s.commands)
  const selectedIndices = useEditorStore((s) => s.selectedIndices)
  ```
- For components that need several related fields, use a shallow-equal multi-selector:
  ```ts
  import { useShallow } from 'zustand/react/shallow'
  const { commands, selectedIndices } = useEditorStore(
    useShallow((s) => ({ commands: s.commands, selectedIndices: s.selectedIndices }))
  )
  ```

Priority components to fix first (most frequently re-rendering):
1. `LayersSidebar` / `LayersPanel` — currently re-renders on any store change
2. `CanvasHud` — only needs `zoomPercent`
3. `TopBar` — only needs `drawTool`, `undoStack.length`, `redoStack.length`, `dirty`
4. `DebugDock` — only needs debug flags

Run `npm run lint && npm run build`.

---

## Phase 11 — Code-split the Monaco editor

**Goal:** Monaco is ~300 KB of the 540 KB bundle. It should only load when the debug dock is opened.

In `src/app/debug/DebugDock.tsx`, lazy-load the Monaco import:

```ts
// Replace the static import
import Editor from '@monaco-editor/react'

// With dynamic lazy loading
const MonacoEditor = React.lazy(() =>
  import('@monaco-editor/react').then((m) => ({ default: m.default }))
)
```

Wrap the usage in `<Suspense fallback={<div>Loading editor…</div>}>`.

This alone will reduce the initial bundle by ~300 KB.

Run `npm run lint && npm run build`. Verify the chunk size warning is gone.

---

## Phase 12 — Fix imports, props and type inconsistencies

**Goal:** clean up every unnecessary prop being passed through components, remove duplicated type definitions, fix naming inconsistencies, and eliminate dead code. This phase is purely structural — no logic changes.

### Step 12.1 — Add shared type aliases to `src/editor/types.ts`

Three types are currently defined more than once across files:

**a) `RenameTarget`**
Defined inline in `App.tsx` (line ~348) and also exported from `RenameDialog.tsx` (line 6). They happen to match today — but are separate declarations.
- Delete the inline `null | { kind: 'path' | 'layer'; index: number }` definition from `App.tsx`.
- Add `export type RenameTarget = { kind: 'path' | 'layer'; index: number }` to `src/editor/types.ts`.
- Update `App.tsx` and `RenameDialog.tsx` to both import `RenameTarget` from `@/editor/types`.

**b) `UiPointSize`**
The union `'xs' | 'sm' | 'md' | 'lg' | 'xl'` appears literally in the store, in `SettingsDialog.tsx`, and wherever it is used in App.
- Add `export type UiPointSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'` to `src/editor/types.ts`.
- Replace the inline union literals everywhere with the named type.

**c) `LayersPanelPathItem` vs `PathMeta`**
`LayersPanelPathItem` in `LayersPanel.tsx` is `PathMeta` with one extra field (`viewBox`). Having a second "path metadata" type is confusing.
- Extend `PathMeta` in `src/editor/types.ts` to include an optional `viewBox?: { x: number; y: number; width: number; height: number }`.
- Delete `LayersPanelPathItem` from `LayersPanel.tsx` and use `PathMeta` directly throughout `LayersPanel`, `LayersSidebar`, and the `pathListItems` computation in `App.tsx`.
- Update all import sites.

Run `npm run lint && npm run build`.

---

### Step 12.2 — Rename props in `DebugDock.tsx` to match store names

Every prop of `DebugDock` has a different name than the store value it carries. This causes confusion when reading the component in isolation.

| Current prop | Maps to store key | Rename to |
|---|---|---|
| `enabled` | `debugUiVisible` | `debugUiVisible` |
| `dockOpen` | `debugDockOpen` | `debugDockOpen` |
| `setDockOpen` | `setDebugDockOpen` | `setDebugDockOpen` |
| `dockHeight` | `debugDockHeight` | `debugDockHeight` |
| `setDockHeight` | `setDebugDockHeight` | `setDebugDockHeight` |
| `outputSvg` | `sourceSvg` | `sourceSvg` |
| `activePathIndex` | `selectedPathIndex` | `selectedPathIndex` |

- Update the `DebugDockProps` interface in `DebugDock.tsx`.
- Update every usage of the old prop names inside `DebugDock.tsx`.
- Update the `<DebugDock ... />` call site in `App.tsx` to pass the new names.

Run `npm run lint && npm run build`.

---

### Step 12.3 — Make `SettingsDialog` self-contained

`SettingsDialog` currently receives 44 props — 40 of which are direct Zustand store values or setters. This is the largest unnecessary prop surface in the codebase.

- Remove all store-passthrough props from `SettingsDialogProps`:
  - `themeMode`, `setThemeMode`
  - `nodesVisible`, `setNodesVisible`
  - `selectionToolActive`, `setSelectionToolActive`
  - `debugUiVisible`, `setDebugUiVisible`
  - `autoSaveEnabled`, `setAutoSaveEnabled`
  - `fileHandle`, `setStatus`
  - `gridVisible`, `setGridVisible`
  - `snapToGrid`, `setSnapToGrid`
  - `gridSize`, `setGridSize`
  - `majorGridEvery`, `setMajorGridEvery`
  - `uiOverlayStrokeWidthScale`, `setUiOverlayStrokeWidthScale`
  - `uiPointSize`, `setUiPointSize`
  - All 12 `ui*` color/stroke/dash props and their setters
  - `resetUiAppearance`

- Inside `SettingsDialog.tsx`, replace all those props with a single `useEditorStore(useShallow(...))` call that reads only the fields needed.

- The remaining `SettingsDialogProps` should only contain:
  ```ts
  type SettingsDialogProps = {
    open: boolean
    onOpenChange: (v: boolean) => void
    tab: string
    setTab: (v: string) => void
    pointRadiusBase: number   // derived memo — cannot come from store directly
  }
  ```

- Remove the now-unused props from the `<SettingsDialog ... />` call site in `App.tsx`.

Run `npm run lint && npm run build`.

---

### Step 12.4 — Make `DebugDock` self-contained for store props

After the rename in Step 12.2, go further: remove all pure store props from `DebugDock`.

Remove from `DebugDockProps`:
- `debugUiVisible`, `debugDockOpen`, `setDebugDockOpen`, `debugDockHeight`, `setDebugDockHeight`, `sourceSvg`, `selectedPathIndex`, `setStatus`

Inside `DebugDock.tsx`, read them directly:
```ts
const { debugUiVisible, debugDockOpen, setDebugDockOpen, debugDockHeight, setDebugDockHeight, sourceSvg, selectedPathIndex, setStatus } = useEditorStore(useShallow(...))
```

The remaining props should only be:
```ts
type DebugDockProps = {
  outputPath: string                      // buildPath(commands) — derived
  applyPathCommands: (cmds: PathCommand[]) => void
  applySvgSerialized: (svg: string, pathCount?: number) => void
  perfCountersRef: RefObject<PerfCounters>
  perfLastCountersRef: RefObject<PerfCounters>
  appRenderCountRef: RefObject<number>
  lastAppRenderCountRef: RefObject<number>
}
```

Remove the now-redundant props from the `<DebugDock ... />` call site in `App.tsx`.

Run `npm run lint && npm run build`.

---

### Step 12.5 — Make `NodeContextMenu` self-contained for store props

Remove from `NodeContextMenu`'s props:
- `selectedIndices` — read from store: `useEditorStore((s) => s.selectedIndices)`
- `clipboardPath` — read from store: `useEditorStore((s) => s.clipboardPath)`
- `clipboardCommandsLength` — read from store: `useEditorStore((s) => s.clipboardCommands.length)`

The remaining props are per-node values and callbacks that cannot come from the store:
`index`, `disableSelectNode`, `onSelectOnlyPoint`, `onTogglePointSelection`, `onSelectRangeToIndex`, `onOpenPointEditor`, `onCopySelectedSection`, `onPasteSectionAfterSelected`, `onExtractSelectionToNewPath`, `onTransformSelectedNodes`, `onDeleteSelectedPoints`, `children`.

Remove the 3 props from all `<NodeContextMenu ... />` call sites in `App.tsx`.

Run `npm run lint && npm run build`.

---

### Step 12.6 — Reduce `LayersSidebar` and `LayersPanel` prop surfaces

`LayersSidebar` passes all 11 of its props straight through to `LayersPanel` unchanged. Both components re-declare the same interface.

Remove from both `LayersSidebarProps` and `LayersPanelProps`:
- `layersCollapsed`, `setLayersCollapsed` — read from store
- `selectedPathIndex`, `setSelectedPathIndex` — read from store
- `hiddenPathIndexes` — read from store

Inside both components, subscribe:
```ts
const { layersCollapsed, setLayersCollapsed, selectedPathIndex, setSelectedPathIndex, hiddenPathIndexes } =
  useEditorStore(useShallow((s) => ({ ... })))
```

The remaining props are mutation callbacks and derived data that cannot come from the store:
`pathListItems`, `setPathHidden`, `deletePathAtIndex`, `movePathAtIndex`, `openRenameDialog`, `addNewLayerGroup`, `addNewPathToRoot`.

Remove the 5 now-unnecessary props from `LayersSidebar`'s call site in `App.tsx` and from `LayersSidebar`'s own pass-through to `LayersPanel`.

Run `npm run lint && npm run build`.

---

### Step 12.7 — Reduce `TopBar` prop surface

Remove from `TopBar`'s props:
- `selectionToolActive`, `setSelectionToolActive` — read from store
- `gridVisible`, `setGridVisible` — read from store
- `nodesVisible`, `setNodesVisible` — read from store
- `snapToGrid`, `setSnapToGrid` — read from store
- `autoSaveEnabled`, `setAutoSaveEnabled` — read from store
- `setStatus` — read from store
- `sourceSvgPresent` — derive from `!!useEditorStore((s) => s.sourceSvg)` inside TopBar
- `fileHandlePresent` — derive from `!!useEditorStore((s) => s.fileHandle)` inside TopBar
- `undoCount` — derive from `useEditorStore((s) => s.undoStack.length)`
- `redoCount` — derive from `useEditorStore((s) => s.redoStack.length)`
- `fileName` — read from store

Inside `TopBar.tsx`, read all of these from the store directly.

The remaining props should only be:
```ts
type TopBarProps = {
  dirty: boolean              // derived memo in App (sourceSvg !== lastSavedSvg)
  onUndo: () => void
  onRedo: () => void
  onOpenSettings: () => void
  onOpenFile: () => void
  onSaveFile: () => void
  inspector: React.ReactNode  // removed in Phase 2 once InspectorPanel is extracted
  layersPanelProps: ...       // addressed separately below
}
```

Note: `layersPanelProps` is addressed in Step 12.8 below.

Remove the now-unnecessary props from `<TopBar ... />` in `App.tsx`.

Run `npm run lint && npm run build`.

---

### Step 12.8 — Remove the `layersPanelProps` passthrough from `TopBar`

`TopBar` receives a `layersPanelProps` object purely to render `<LayersPanel {...layersPanelProps} />` inside a `<Sheet>` for mobile layout. This is a prop-bag anti-pattern — `TopBar` knows nothing about it and just spreads it.

After Step 12.6 has reduced `LayersPanel`'s required props, `TopBar` should directly render `<LayersSidebar />` (or `<LayersPanel />`) inside the mobile `<Sheet>` without needing any layering props passed from `App`. Since `LayersSidebar` and `LayersPanel` now read most of their state from the store, they need only the callback props that cannot come from the store (`setPathHidden`, `deletePathAtIndex`, etc.).

If those callbacks are still needed, pass them as a minimal set directly. Remove the `layersPanelProps` prop bag entirely from `TopBarProps`.

Run `npm run lint && npm run build`.

---

### Step 12.9 — Fix `OpenSvgDialog` unnecessary prop

`OpenSvgDialog` receives an `afterOpenHasSvg` callback whose entire implementation in App is `() => !!useEditorStore.getState().sourceSvg`. The component uses this to check whether the open operation succeeded.

- Remove the `afterOpenHasSvg` prop from `OpenSvgDialogProps`.
- Inside `OpenSvgDialog.tsx`, import `useEditorStore` and call `useEditorStore.getState().sourceSvg` directly where needed.

Run `npm run lint && npm run build`.

---

### Step 12.10 — Fix dead state: `extractToNewLayer`

In `App.tsx` there is:
```ts
const [extractToNewLayer] = useState(true)
```
The setter is never used, so the user can never change this value. It is a constant masquerading as state.

- Delete the `useState` declaration.
- Replace with `const extractToNewLayer = true`.
- If in the future this should be user-configurable, it should be added to the store.

Run `npm run lint && npm run build`.

---

### Step 12.11 — Clean up `TopBar` import style

In `TopBar.tsx`, line 1:
```ts
import type * as React from 'react'
```
`React` is only used for `React.ReactNode`. Replace with:
```ts
import type { ReactNode } from 'react'
```
And update the one usage from `React.ReactNode` to `ReactNode`.

Run `npm run lint && npm run build`.

---

### Step 12.12 — Fix `commandMenuItems.ts` import location for `CommandMenuItem`

`src/app/command-menu/commandMenuItems.ts` imports `CommandMenuItem` from `../CommandMenu` (the sibling component file). This type should live alongside the data builder, not be exported from a UI component.

- Move the `CommandMenuItem` type definition from `CommandMenu.tsx` to `commandMenuItems.ts` (or to `src/editor/types.ts` if it's used elsewhere).
- Update `CommandMenu.tsx` to import `CommandMenuItem` from its new location.

Run `npm run lint && npm run build`.

---

## Phase 13 — Remaining App.tsx cleanup

By this point `App.tsx` should be under ~500 lines. Do a final cleanup pass:

### Step 13.1 — Fix `lastSavedSvg` dual tracking

Remove `lastSavedSvgRef`. Keep only the `lastSavedSvg` state. Update the `dirty` memo and all save functions to use only the state value.

### Step 13.2 — Fix the collapsed inspector duplicate draw-tool buttons

The collapsed inspector sidebar (icon strip) and the expanded inspector Nodes tab both have Select/Pen/Rect toggle buttons. Extract a `<DrawToolToggle />` component and use it in both places.

### Step 13.3 — Inline `pathListItems` computation into `LayersPanel`

`pathListItems` is computed in `App.tsx` with `parsePath` per item, then passed to `LayersSidebar` → `LayersPanel`. Move this computation into `LayersPanel.tsx` where it is used, memoized with `useMemo`. Remove it from `App.tsx` entirely.

### Step 13.4 — Remove no-op `outputSvg` memo

```ts
const outputSvg = useMemo(() => sourceSvg, [sourceSvg])
```
This is a transparent alias. Replace `outputSvg` usages with `sourceSvg` directly and delete the line.

### Step 13.5 — Move `ColorPickerPopover` and `ColorSwatchButton`

These two mini-components (lines 84–125 in App.tsx) are only used inside `InspectorPanel`. Move them to `src/app/panels/InspectorPanel.tsx` or a new `src/app/panels/ColorPicker.tsx`.

Run `npm run lint && npm run build`.

---

## Final checklist

Before calling the refactor done, verify:

- [ ] `npm run lint` — zero errors, zero warnings
- [ ] `npm run build` — zero TypeScript errors, bundle < 250 KB initial (after Monaco lazy-load)
- [ ] `App.tsx` is under 400 lines
- [ ] No file in `src/app/` is over 400 lines
- [ ] Every component only subscribes to the store state it actually uses
- [ ] No prop is passed from App to a child when the child can read it from the store instead
- [ ] No type is defined in more than one file
- [ ] No duplicated SVG parse/serialize pattern remains
- [ ] Undo/redo works correctly
- [ ] Node add, delete, move, drag do not reset the viewBox
- [ ] All keyboard shortcuts work (Esc, Ctrl+Z/Y/C/V, Delete/Backspace, Ctrl+K)
- [ ] Context menus on nodes and in the layers sidebar work
- [ ] Settings dialog persists across reload

---

## File structure after all phases

```
src/
  main.tsx
  App.tsx                          < 400 lines
  App.css
  index.css

  editor/
    types.ts                       shared TypeScript types
    svgDoc.ts                      mutateSvg helper
    utils.ts                       pure path/transform functions
    file.ts                        file open/save I/O
    lint.ts                        path/SVG linting
    store/
      index.ts                     combines slices, persist config
      uiSlice.ts
      viewSlice.ts
      pathSlice.ts
      settingsSlice.ts
      ephemeralSlice.ts

  app/
    CommandMenu.tsx
    hooks/
      useViewBox.ts
      useNodeEditor.ts
      useSvgMutations.ts
      useHistory.ts
    canvas/
      CanvasHud.tsx
      CanvasOverlay.tsx
      viewBox.ts
    command-menu/
      commandMenuItems.ts
    debug/
      DebugDock.tsx
      usePerfStats.ts
    dialogs/
      EditPointDialog.tsx
      LogDialog.tsx
      OpenSvgDialog.tsx
      RenameDialog.tsx
    menus/
      NodeContextMenu.tsx
    panels/
      InspectorPanel.tsx
      LayersPanel.tsx
      ColorPicker.tsx
      DrawToolToggle.tsx
    settings/
      SettingsDialog.tsx
    sidebars/
      LayersSidebar.tsx
    topbar/
      TopBar.tsx
    utils/
      color.ts
      dom.ts
      text.ts

  components/ui/   (unchanged)
  lib/
    utils.ts
```
