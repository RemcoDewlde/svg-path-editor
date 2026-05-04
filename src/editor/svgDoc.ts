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
