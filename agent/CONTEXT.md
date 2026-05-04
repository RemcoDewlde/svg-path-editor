# Context

This repo is a browser-based SVG path editor.

## Stack

- React + TypeScript + Vite
- Zustand for editor state (`src/editor/store.ts`)
- shadcn/ui (Radix primitives + Tailwind)
- `lucide-react` icons

## What The App Does

- Load/open/save SVGs
- Extract and edit individual `path[d]` elements
- Node selection, transforms (mirror/rotate/flip), snapping/grid, pan/zoom
- Layers UI (right sidebar) is a list of `path[d]` elements, not `<g>` groups
- Debug dock for logs/perf

## Code Structure (Current)

- `src/App.tsx` is historically monolithic and contains UI + many editor actions.
- `src/editor/utils.ts` contains path parsing/building and geometry utilities.
- `src/editor/file.ts` contains file open/save helpers.

## Conventions

- Keep interaction behavior predictable: avoid SVG event handlers that break Radix context menus.
- Persist user settings using Zustand `persist`.
- Prefer small, safe refactors: extract UI panels/components first, keep existing logic/handlers in `App.tsx` until stable.

## Known Gotchas

- Path list is derived from `querySelectorAll('path[d]')`; empty groups do not show up as layers.
- Updating `sourceSvg` can trigger effects that refresh `pathMetas` and re-parse the active path; be careful not to accidentally clear selection during transforms.
- Pan jitter can happen if viewBox updates depend on changing transforms; keep pan deltas screen-space.
