# WebAssembly Integration Plan — SVG Path Editor

## Executive Summary

The editor has a critical performance bottleneck: every single pointer-move event during a drag triggers a cascade of:

1. `moveSelectedPoints` → O(N) array map over all commands
2. `buildPath` → O(N) serialisation of all commands to a `d` string
3. `mutateSvg` → **full DOMParser + XMLSerializer** round-trip on the entire SVG document — O(S)
4. `previewInnerHtml` memo → **second full DOMParser** parse — O(S)
5. `pathMetas.map` → O(P) Zustand update
6. React render → `buildTransformedPathD` (O(N) DOMPoint allocs) + `getSegments` (O(N)) + CanvasOverlay with N node circles (O(N) Radix tree creates)

For a complex SVG with many paths and thousands of nodes this fires at ~60 Hz. The solution has two parts:

- **WASM module** for pure-compute hotspots (path math, serialisation, geometry)
- **JS-side architectural fixes** that eliminate redundant DOM parses (biggest wins, no WASM required)

Both are described below so the implementer can tackle the highest-ROI items first.

---

## Part 1 — JS-Side Architectural Fixes (High ROI, No WASM Required)

These fixes alone will likely eliminate 80% of the performance problem. They should be done **before** the WASM work.

### Fix 1 — Stop round-tripping the entire SVG string on every drag event

**Problem:** `mutateSvg` (`src/editor/svgDoc.ts:7`) parses the full SVG string with `DOMParser` and re-serialises it with `XMLSerializer` on every drag-move. This is the single most expensive operation.

**Fix:** Keep a parsed `Document` object in memory (a "live doc" ref). Apply mutations directly to this in-memory DOM. Only serialise to string when:
- The file is saved
- Undo snapshot is pushed
- A non-drag edit completes

During drag, the in-memory `Document` is the source of truth; the `d` attribute of the active path element is updated in-place with no full re-serialise.

**Implementation sketch:**
```ts
// src/editor/liveSvgDoc.ts
let liveDoc: Document | null = null;

export function loadLiveDoc(svgString: string) {
  liveDoc = new DOMParser().parseFromString(svgString, 'image/svg+xml');
}

export function getLiveDoc(): Document {
  return liveDoc!;
}

export function serializeLiveDoc(): string {
  return new XMLSerializer().serializeToString(liveDoc!);
}

export function mutateActivePath(id: string, newD: string) {
  const el = liveDoc!.getElementById(id) as SVGPathElement;
  el.setAttribute('d', newD);
  // No re-serialise needed here
}
```

The store `sourceSvg` string is only updated at save / snapshot time. During drag, only the `d` attribute of the active path element changes.

**Estimated win:** Eliminates 2–3 full DOMParser + XMLSerializer calls per drag-move event.

---

### Fix 2 — Eliminate the redundant `previewInnerHtml` DOMParser

**Problem:** `previewInnerHtml` (`App.tsx:193`) parses `sourceSvg` again every time it changes, just to get `innerHTML`.

**Fix:** Read `innerHTML` from the live doc directly:
```ts
const previewInnerHtml = useMemo(
  () => liveDoc ? liveDoc.documentElement.innerHTML : '',
  [liveDocVersion] // bump a lightweight counter instead of a full string compare
);
```

**Estimated win:** Eliminates one full DOMParser parse per drag frame.

---

### Fix 3 — Replace `getRenderMatrix()` unconditional call with a memoised/cached value

**Problem:** `getRenderMatrix()` (`App.tsx:710`) calls `getScreenCTM()` (layout-forcing DOM query) unconditionally on every React render.

**Fix:** Cache the matrix in a ref; only recompute in a `ResizeObserver` or when the viewBox changes:
```ts
const matrixRef = useRef<DOMMatrix | null>(null);

useEffect(() => {
  const observer = new ResizeObserver(() => {
    matrixRef.current = computeRenderMatrix(svgRef, previewPathRef);
  });
  observer.observe(svgRef.current!);
  return () => observer.disconnect();
}, []);

// Also recompute when viewBox changes:
useEffect(() => {
  matrixRef.current = computeRenderMatrix(svgRef, previewPathRef);
}, [currentViewBox]);
```

**Estimated win:** Removes 1–2 layout-forcing DOM queries from the hot render path.

---

### Fix 4 — Make `deleteIndicesFromCommands` O(N) instead of O(K×N)

**Problem:** `deleteIndicesFromCommands` (`src/editor/utils.ts:160`) calls `Array.splice` K times, each O(N).

**Fix:**
```ts
export function deleteIndicesFromCommands(
  commands: PathCommand[],
  indices: number[]
): PathCommand[] {
  const set = new Set(indices);
  return commands.filter((_, i) => !set.has(i));
}
```

**Estimated win:** O(K×N) → O(N+K). Meaningful for large selections.

---

### Fix 5 — Replace `indices.includes(i)` in `transformSelectedNodes` with a `Set`

**Problem:** `transformSelectedNodes` (`src/app/hooks/useNodeEditor.ts:252`) calls `indices.includes(i)` inside a `commands.map` → O(N×K).

**Fix:**
```ts
const targetSet = new Set(transformTargetIndices);
commands.map((c, i) => {
  if (!targetSet.has(i)) return c;
  // ... transform
});
```

**Estimated win:** O(N×K) → O(N+K).

---

### Fix 6 — Eliminate redundant DOMParser calls in `getPathCountFromSvg` / `getPathIndexById`

**Problem:** Both functions parse `sourceSvg` from scratch (`src/app/hooks/useSvgPathMetas.ts:59–78`) after `mutateSvg` already parsed it.

**Fix:** Replace with reads from the live doc:
```ts
export function getPathCountFromLiveDoc(doc: Document): number {
  return doc.querySelectorAll('path[d]').length;
}

export function getPathIndexByIdFromLiveDoc(doc: Document, id: string): number {
  return Array.from(doc.querySelectorAll('path[d]')).findIndex(el => el.id === id);
}
```

**Estimated win:** Removes 1–2 DOMParser parses per structural mutation.

---

### Fix 7 — Virtualise CanvasOverlay node rendering for large paths

**Problem:** CanvasOverlay renders N `<NodeContextMenu>` + `<circle>` elements (`src/app/canvas/CanvasOverlay.tsx:260`). Radix ContextMenu trees are non-trivial. For N > 500 this causes significant React reconciliation.

**Fix:** Only render circles that are inside the current viewport (after matrix transform). Use a spatial index (simple sorted array by X after transform) or just a viewport AABB cull:
```ts
const visibleCommands = commands.filter((c, i) => {
  const pt = transformPoint(matrix, c.x, c.y);
  return pt.x > -20 && pt.x < viewWidth + 20 && pt.y > -20 && pt.y < viewHeight + 20;
});
```

Also: defer ContextMenu portals — only mount the Radix context menu on the hovered/right-clicked node, not all N nodes.

**Estimated win:** For large paths with most nodes off-screen, reduces O(N) to O(visible ⊂ N). Also reduces Radix tree mount overhead significantly.

---

### Fix 8 — Throttle `syncCommandsToSource` during drag with `requestAnimationFrame`

**Problem:** `syncCommandsToSource` fires synchronously on every `mousemove`. Browsers fire `mousemove` faster than 60 Hz on high-refresh displays.

**Fix:**
```ts
const syncRafRef = useRef<number | null>(null);

function syncCommandsToSourceThrottled(cmds: PathCommand[]) {
  if (syncRafRef.current !== null) return; // already queued
  syncRafRef.current = requestAnimationFrame(() => {
    syncRafRef.current = null;
    syncCommandsToSource(cmds);
  });
}
```

**Estimated win:** Caps the cascade at the display refresh rate (typically 60 Hz), halving cost on 120 Hz displays.

---

## Part 2 — WebAssembly Module

After the JS fixes above, the remaining compute-intensive work that is worth moving to WASM is:

### What goes in WASM

| Function | Current location | Why WASM helps |
|----------|-----------------|---------------|
| `parsePath(d)` | `src/editor/utils.ts:43` | Regex + token loop in hot undo/redo + file-open path. WASM can tokenise 5–10× faster. |
| `buildPath(commands)` | `src/editor/utils.ts:79` | Called on every drag-move. WASM string building avoids JS GC pressure. |
| `getSegments(commands)` | `src/editor/utils.ts:100` | O(N) loop, called per render. |
| `transformSelectedNodes(...)` | `src/app/hooks/useNodeEditor.ts:252` | SIMD-vectorisable float math on node coordinates. |
| `moveSelectedPoints(...)` | `src/app/hooks/useNodeEditor.ts:149` | Same — bulk float offset. |
| `deleteIndicesFromCommands(...)` | `src/editor/utils.ts:160` | Even after Fix 4, WASM avoids GC from `filter` allocations. |
| `finishBoxSelection(...)` | `App.tsx:618` | N AABB containment tests — trivially SIMD. |
| `buildTransformedPathD(...)` | `src/editor/utils.ts:138` | N matrix multiplies — SIMD-vectorisable. |
| `snapPoint(x, y, grid)` | wherever called | Repeated float rounding — negligible, but trivial to include. |

### What does NOT belong in WASM

- DOM mutations (`mutateSvg`, `refreshPathMetas`) — WASM cannot touch the DOM; gains come from Fix 1/2/6.
- React rendering — not applicable.
- File I/O — not applicable.
- `lintSvg` — DOM-dependent, on-demand only.

---

## Recommended Language / Toolchain

**Rust + `wasm-pack`** is recommended:

- First-class WASM target with `wasm-bindgen` for zero-copy JS ↔ WASM bridging
- `wasm-pack build --target bundler` integrates directly with Vite
- `js-sys` and `web-sys` crates available if any Web API access is needed
- Strong ecosystem for SVG/geometry math (e.g. `lyon_path` for path parsing)
- SIMD support via `std::simd` (nightly) or `packed_simd`

Alternative: **AssemblyScript** (TypeScript-like, easier to onboard but less performant and less ecosystem support).

---

## Repository Structure

```
svg-path/
├── wasm/                          # New Rust crate
│   ├── Cargo.toml
│   ├── src/
│   │   ├── lib.rs                 # wasm-bindgen exports
│   │   ├── parse.rs               # parsePath + buildPath
│   │   ├── transform.rs           # moveSelectedPoints, transformSelectedNodes
│   │   ├── segments.rs            # getSegments, buildTransformedPathD
│   │   ├── select.rs              # finishBoxSelection, deleteIndicesFromCommands
│   │   └── snap.rs                # snapPoint
│   └── tests/
│       └── roundtrip.rs           # Rust unit tests
├── src/
│   ├── wasm/
│   │   ├── index.ts               # Async loader + fallback to JS impl
│   │   ├── pathOps.ts             # Thin TypeScript wrappers
│   │   └── generated/             # wasm-pack output (gitignored)
│   └── editor/
│       └── utils.ts               # Existing JS impls kept as fallback
└── ...
```

---

## WASM Data Representation

### PathCommand encoding

JS objects (`{type, x, y, x1?, y1?, x2?, y2?}`) are expensive to pass to WASM one by one. Use a flat `Float64Array` + `Uint8Array` (for type codes):

```ts
// JS side
const types = new Uint8Array(N);     // M=0, L=1, C=2, Z=3, ...
const coords = new Float64Array(N * 6); // [x, y, x1, y1, x2, y2] per command

// Pass to WASM via pointer (zero-copy with SharedArrayBuffer or per-call copy)
const resultD = wasmModule.build_path(types, coords, N);
```

This avoids N JS object allocations and JS↔WASM serialisation overhead.

### Matrix encoding

Pass `DOMMatrix` as a `Float64Array` of 6 values `[a, b, c, d, e, f]`.

---

## JS Fallback Strategy

Every WASM function must have a JS fallback. The loader pattern:

```ts
// src/wasm/index.ts
let wasm: WasmModule | null = null;

export async function loadWasm(): Promise<void> {
  try {
    const mod = await import('./generated/svg_path_wasm');
    await mod.default(); // init
    wasm = mod;
  } catch {
    console.warn('[wasm] Failed to load WASM module, using JS fallback');
    wasm = null;
  }
}

export function parsePath(d: string): PathCommand[] {
  if (wasm) return wasm.parse_path(d);
  return parsePathJs(d); // existing JS impl
}
```

Call `loadWasm()` once in `main.tsx` before mounting the app. Use the JS impl synchronously until WASM is ready (instant for local, <100ms for CDN).

---

## Vite Integration

Install `vite-plugin-wasm` and `vite-plugin-top-level-await`:

```bash
npm install -D vite-plugin-wasm vite-plugin-top-level-await
```

```ts
// vite.config.ts
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
});
```

`wasm-pack build --target bundler --out-dir src/wasm/generated`

Add `src/wasm/generated/` to `.gitignore`. Add the build step to CI:
```bash
# In Dockerfile build stage, before npm run build:
curl https://sh.rustup.rs -sSf | sh -s -- -y
cargo install wasm-pack
wasm-pack build wasm --target bundler --out-dir ../src/wasm/generated
```

---

## Implementation Order (Recommended)

### Phase 0 — JS Architectural Fixes (no WASM, highest ROI)

1. Implement "live doc" pattern (Fix 1) — eliminates the worst bottleneck
2. Fix `previewInnerHtml` to use live doc (Fix 2)
3. Fix `getPathCountFromSvg` / `getPathIndexById` (Fix 6)
4. Fix `getRenderMatrix` caching (Fix 3)
5. Fix `deleteIndicesFromCommands` O(N×K) → O(N) (Fix 4)
6. Fix `transformSelectedNodes` Set lookup (Fix 5)
7. Add RAF throttle to `syncCommandsToSource` (Fix 8)
8. Add viewport culling to CanvasOverlay (Fix 7)

**Measure after each fix** with browser DevTools Performance panel. Most gains will be here.

### Phase 1 — WASM scaffolding

1. Add `wasm/` Rust crate with `Cargo.toml`
2. Implement `parse_path` + `build_path` in Rust with tests
3. Add `vite-plugin-wasm` to Vite config
4. Wire loader in `main.tsx` with JS fallback
5. Swap `parsePath` / `buildPath` in `utils.ts` to use WASM

### Phase 2 — WASM hot path

6. Implement `move_selected_points` + `transform_selected_nodes` in Rust
7. Implement `get_segments` + `build_transformed_path_d` in Rust
8. Implement `finish_box_selection` (N AABB tests) in Rust

### Phase 3 — WASM optimisation

9. Switch from per-call array copies to `SharedArrayBuffer` shared memory for drag-move loop
10. Evaluate SIMD for `transform_selected_nodes` / `move_selected_points`
11. Profile and verify measurable improvement over Phase 0 baseline

---

## Expected Performance Profile After All Fixes

| Scenario | Before | After Phase 0 | After Phase 1–2 |
|----------|--------|--------------|-----------------|
| Drag single node (1000-node path) | ~15–25 ms/frame | ~2–4 ms/frame | ~0.5–1 ms/frame |
| Box select (1000-node path) | ~5–10 ms | ~1–2 ms | <0.5 ms |
| File open (large SVG) | ~50–200 ms | ~50–200 ms | ~10–30 ms |
| Undo/redo | ~5–15 ms | ~5–15 ms | ~1–3 ms |
| Pan (large path) | ~5–10 ms/frame | ~1–2 ms/frame | <1 ms/frame |

Phase 0 (pure JS) provides the majority of the gain. WASM provides an additional 3–10× on the compute-only portions but the absolute gain is smaller because the bottleneck after Phase 0 is React reconciliation and DOMPoint allocation, not pure math.

---

## Testing Strategy

- **Unit tests:** Rust `#[test]` in `wasm/tests/` for every WASM function. Fuzz with `cargo fuzz` on `parse_path`.
- **Parity tests:** TypeScript tests comparing WASM output to JS fallback output for identical inputs.
- **Performance benchmarks:** `performance.now()` micro-benchmarks in a `bench/` script comparing JS vs WASM for N = 100, 1000, 10000 nodes.
- **E2E:** Existing drag/edit behaviour verified manually after each phase.

---

## Files to Create / Modify

### New files
- `wasm/Cargo.toml`
- `wasm/src/lib.rs`
- `wasm/src/parse.rs`
- `wasm/src/transform.rs`
- `wasm/src/segments.rs`
- `wasm/src/select.rs`
- `wasm/src/snap.rs`
- `src/wasm/index.ts`
- `src/wasm/pathOps.ts`
- `src/editor/liveSvgDoc.ts` (Phase 0 Fix 1)

### Modified files
- `vite.config.ts` — add `vite-plugin-wasm`
- `src/main.tsx` — call `loadWasm()`
- `src/editor/svgDoc.ts` — adopt live doc pattern
- `src/editor/utils.ts` — swap implementations to WASM wrappers; fix `deleteIndicesFromCommands`
- `src/app/hooks/useNodeEditor.ts` — fix `transformSelectedNodes` Set lookup; adopt WASM for move/transform
- `src/app/hooks/useSvgPathMetas.ts` — use live doc instead of re-parsing
- `src/app/canvas/CanvasOverlay.tsx` — add viewport culling
- `src/App.tsx` — fix `getRenderMatrix` caching; add RAF throttle; fix `previewInnerHtml`
- `Dockerfile` — add Rust + wasm-pack install step
- `package.json` — add `vite-plugin-wasm`, `vite-plugin-top-level-await`; add `build:wasm` npm script

---

## References

- [wasm-pack](https://rustwasm.github.io/wasm-pack/)
- [wasm-bindgen guide](https://rustwasm.github.io/docs/wasm-bindgen/)
- [vite-plugin-wasm](https://github.com/Menci/vite-plugin-wasm)
- [lyon_path crate](https://docs.rs/lyon_path) — battle-tested SVG path parser in Rust
- [WebAssembly SIMD](https://v8.dev/features/simd)
- [SharedArrayBuffer for WASM](https://developer.mozilla.org/en-US/docs/WebAssembly/JavaScript_interface/Memory)
