# Architecture Notes

## Editor State

Zustand store: `src/editor/store.ts`

- Document: `sourceSvg`, `pathMetas`, `hiddenPathIndexes`, file handle/name
- Editing: `selectedPathIndex`, `commands`, `selectedIndices`, undo/redo stacks
- Interaction: `drag`, `selectionBox`, `pan`, viewBox
- UI: inspector/layers collapsed, debug dock, theme/settings

## Suggested Refactor Direction

1. Extract UI panels/sidebars into `src/app/**` and pass handlers/state from `App.tsx`.
2. Extract pure helpers to `src/app/utils/**`.
3. Later: move editor actions (extract, transforms, visibility toggles) into `src/editor/actions/**` once stable.
