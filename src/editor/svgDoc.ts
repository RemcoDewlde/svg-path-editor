import { loadLiveDoc, mutateLiveDoc, serializeLiveDoc } from './liveSvgDoc'

/**
 * Load `svgString` into the live in-memory document, run `mutate` against the
 * root <svg> element and its ordered `path[d]` elements, then return the
 * re-serialized SVG string.
 *
 * Subsequent calls to `getInnerHtml()`, `getPathCount()`, etc. from
 * liveSvgDoc will be O(1) — no second DOMParser round-trip required.
 *
 * Throws if the SVG fails to parse (caller should catch).
 */
export function mutateSvg(
  svgString: string,
  mutate: (svg: SVGSVGElement, paths: Element[]) => void,
): string {
  loadLiveDoc(svgString)

  // Detect a parse error by checking for a <parsererror> element.
  // We do this via a lightweight re-parse only when the serialized result
  // looks like an error document, to avoid a DOM query on every call.
  // In practice DOMParser never throws — it embeds the error in the doc.
  mutateLiveDoc((svg, paths) => {
    // Check for parsererror on the live doc's root before running the mutation.
    if ((svg as unknown as Element).querySelector('parsererror')) {
      throw new Error('SVG parse error')
    }
    mutate(svg, paths)
  })

  return serializeLiveDoc()
}
