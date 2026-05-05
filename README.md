# SVG Path Editor

A browser-based SVG `path[d]` editor for quickly tweaking shapes, moving nodes, and splitting paths into layers.

## Features

- Open/import SVGs and edit individual `path[d]` elements ("layers")
- Node editing: select, drag, box-select, delete
- Transform selection: rotate/mirror/flip
- Pan/zoom with an accurate overlay (nodes/segments aligned to rendered SVG)
- Grid + snap-to-grid
- Draw tools: pen + rectangle
- Clipboard helpers: copy/paste sections and whole paths
- Extract a node range into a new path (optionally in its own layer)
- Command menu (Cmd/Ctrl+K)
- Debug dock (logs + perf counters)

## Quick Start

```bash
npm install
npm run dev
```

Then open the app at the URL Vite prints.

## Build

```bash
npm run lint
npm run build
npm run preview
```

Build output goes to `dist/`.

## Shortcuts

- `Cmd/Ctrl+K`: command menu
- `Esc`: clear selection
- `Cmd/Ctrl+Z`: undo
- `Cmd/Ctrl+Y`: redo
- `Cmd/Ctrl+C`: copy active path
- `Cmd/Ctrl+V`: paste
- `Delete` / `Backspace`: delete selected nodes

## Browser Notes

- File open/save uses the File System Access API when available. For best results, use a Chromium-based browser.

## Docker

Build a production image:

```bash
docker build -t svg-path-editor .
```

Run it:

```bash
docker run --rm -p 8080:80 svg-path-editor
```

Then open `http://localhost:8080`.

## Tech Stack

- React 19 + TypeScript
- Vite
- Zustand
- Radix UI (via shadcn/ui) + Tailwind
