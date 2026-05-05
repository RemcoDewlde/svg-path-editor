/**
 * Live SVG document — a single in-memory parsed Document that is kept in sync
 * with the editor state so we never need to DOMParser+XMLSerializer the entire
 * SVG string on hot paths like drag-move.
 *
 * Rules:
 * - Call `loadLiveDoc(svgString)` whenever the source SVG is loaded from disk
 *   or replaced wholesale (file open, undo/redo apply).
 * - Call `mutateLiveDoc(fn)` for every structural edit. The function receives
 *   the root <svg> element and the ordered list of `path[d]` elements. After
 *   `fn` returns, the live doc is the source of truth; call `serializeLiveDoc()`
 *   to get the updated string back.
 * - Call `setActivePath(index, d)` during drag-move to update only the active
 *   path's `d` attribute without touching anything else. This is O(1) after the
 *   initial querySelectorAll.
 * - Call `getPathElements()` to read the ordered path list without re-parsing.
 * - Call `getPathCount()` and `getPathIndexById(id)` as fast alternatives to
 *   the old DOMParser-based helpers.
 * - Call `getInnerHtml()` to read the SVG's innerHTML for the preview pane.
 * - Call `serializeLiveDoc()` only when you need to persist the string (save,
 *   snapshot, non-drag mutation that must round-trip).
 */

let _doc: Document | null = null

// Cached path list — invalidated on every mutateLiveDoc call.
let _pathsCache: Element[] | null = null

function _invalidate() {
  _pathsCache = null
}

/** Replace the in-memory document entirely (file open, undo/redo). */
export function loadLiveDoc(svgString: string): void {
  _doc = new DOMParser().parseFromString(svgString, 'image/svg+xml')
  _invalidate()
}

/** True once a document has been loaded. */
export function isLiveDocLoaded(): boolean {
  return _doc !== null
}

/** Returns the ordered list of `path[d]` elements (cached). */
export function getPathElements(): Element[] {
  if (!_doc) return []
  if (_pathsCache) return _pathsCache
  _pathsCache = Array.from(_doc.documentElement.querySelectorAll('path[d]'))
  return _pathsCache
}

/** Fast path count without re-parsing. */
export function getPathCount(): number {
  return getPathElements().length
}

/** Fast path-index-by-id lookup without re-parsing. */
export function getPathIndexById(id: string): number {
  return getPathElements().findIndex((p) => p.getAttribute('id') === id)
}

/**
 * Apply a structural mutation to the live document.
 * The callback receives the root SVGSVGElement and the current ordered path list.
 * After the callback the path cache is invalidated.
 */
export function mutateLiveDoc(
  mutate: (svg: SVGSVGElement, paths: Element[]) => void,
): void {
  if (!_doc) throw new Error('liveSvgDoc: no document loaded')
  const svg = _doc.documentElement as unknown as SVGSVGElement
  const paths = getPathElements()
  mutate(svg, paths)
  _invalidate()
}

/**
 * Fast update of a single path's `d` attribute — used during drag-move so we
 * never have to serialize the whole document just to update one attribute.
 * Does NOT invalidate the path cache (path list order has not changed).
 */
export function setActivePath(index: number, d: string): void {
  const paths = getPathElements()
  const target = paths[index]
  if (!target) return
  target.setAttribute('d', d)
}

/** Serialize the live document to a string. Only call when you need to persist. */
export function serializeLiveDoc(): string {
  if (!_doc) return ''
  return new XMLSerializer().serializeToString(_doc.documentElement)
}

/** innerHTML of the root SVG element — used for the preview pane. */
export function getInnerHtml(): string {
  if (!_doc) return ''
  return _doc.documentElement.innerHTML
}
