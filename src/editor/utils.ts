import type { PathCommand } from './types'

export { parsePath, buildPath } from '@/wasm/index'

export function createSvgPoint(svg: SVGSVGElement, x: number, y: number) {
  const p = svg.createSVGPoint()
  p.x = x
  p.y = y
  return p
}

export function transformPoint(
  matrix: DOMMatrix | null,
  x: number,
  y: number,
  svg: SVGSVGElement | null,
) {
  if (!matrix) return { x, y }
  const point = svg ? createSvgPoint(svg, x, y) : new DOMPoint(x, y)
  const out = point.matrixTransform(matrix)
  return { x: out.x, y: out.y }
}

export function formatNumber(value: number) {
  return Number(value.toFixed(2)).toString()
}

export function snapValue(value: number, snapToGrid: boolean, gridSize: number) {
  if (!snapToGrid) return value
  const size = Number.isFinite(gridSize) && gridSize > 0 ? gridSize : 10
  return Math.round(value / size) * size
}

export function snapPoint(
  point: { x: number; y: number },
  snapToGrid: boolean,
  gridSize: number,
) {
  return {
    x: snapValue(point.x, snapToGrid, gridSize),
    y: snapValue(point.y, snapToGrid, gridSize),
  }
}

export function getPathLabel(path: Element, index: number) {
  const id = path.getAttribute('id')
  const label = path.getAttribute('data-label')
  const fill = path.getAttribute('fill')
  const group = path.closest('g') ? path.closest('g')!.getAttribute('id') : ''
  const name = label || id || fill || `path-${index + 1}`
  const details = [group ? `group: ${group}` : '', fill ? `fill: ${fill}` : '']
    .filter(Boolean)
    .join(', ')
  return `${index + 1}. ${name}${details ? ` (${details})` : ''}`
}

export function getSegments(commands: PathCommand[]) {
  const segments: Array<{ fromIndex: number; toIndex: number; insertIndex: number }> = []
  let subpathStartIndex: number | null = null
  let previousPointIndex: number | null = null

  commands.forEach((c, index) => {
    if (c.type === 'M') {
      subpathStartIndex = index
      previousPointIndex = index
      return
    }
    if (c.type === 'L') {
      if (previousPointIndex !== null) {
        segments.push({ fromIndex: previousPointIndex, toIndex: index, insertIndex: index })
      }
      previousPointIndex = index
      return
    }
    if (c.type === 'Z') {
      if (
        previousPointIndex !== null &&
        subpathStartIndex !== null &&
        previousPointIndex !== subpathStartIndex
      ) {
        segments.push({
          fromIndex: previousPointIndex,
          toIndex: subpathStartIndex,
          insertIndex: index,
        })
      }
      subpathStartIndex = null
      previousPointIndex = null
    }
  })

  return segments
}

export function buildTransformedPathD(
  commands: PathCommand[],
  matrix: DOMMatrix | null,
  svg: SVGSVGElement | null,
) {
  return commands
    .map((c) => {
      if (c.type === 'Z') return 'Z'
      const p = transformPoint(matrix, c.x, c.y, svg)
      return `${c.type} ${p.x} ${p.y}`
    })
    .join(' ')
}

export function getNextPointIndex(index: number, commands: PathCommand[]) {
  for (let i = index + 1; i < commands.length; i += 1) {
    if (commands[i].type === 'M' || commands[i].type === 'L') return i
    if (commands[i].type === 'Z') return null
  }
  return null
}

export function deleteIndicesFromCommands(commands: PathCommand[], selectedIndices: Set<number>) {
  const selected = new Set(selectedIndices)

  // Fix 4: promote M→L for the node immediately after a deleted M, then
  // use a single O(N) filter pass instead of K×O(N) splice calls.
  // We need the M-promotion pass before we remove entries.
  selected.forEach((index) => {
    const command = commands[index]
    if (!command || command.type !== 'M') return
    const nextPointIndex = getNextPointIndex(index, commands)
    if (nextPointIndex !== null && !selected.has(nextPointIndex)) {
      const next = commands[nextPointIndex]
      if (next && next.type !== 'Z') next.type = 'M'
    }
  })

  const before = commands.length
  // Single O(N) pass — no splice, no shifting.
  const kept = commands.filter((_, i) => !selected.has(i))
  // Mutate in-place so callers that hold a reference see the changes.
  commands.length = 0
  for (const c of kept) commands.push(c)

  return before - commands.length
}

export function getTransformTargetIndices(commands: PathCommand[], selectedIndices: number[]) {
  const selected = selectedIndices.filter((i) => {
    const c = commands[i]
    return c && c.type !== 'Z'
  })
  if (selected.length) return selected
  return commands
    .map((c, i) => (c.type === 'Z' ? null : i))
    .filter((v): v is number => v !== null)
}

export type Bounds = {
  minX: number
  maxX: number
  minY: number
  maxY: number
  centerX: number
  centerY: number
}

export function mirrorHorizontalTransformer(
  x: number,
  y: number,
  bounds: { centerX: number },
) {
  return { x: bounds.centerX - (x - bounds.centerX), y }
}

export function mirrorVerticalTransformer(
  x: number,
  y: number,
  bounds: { centerY: number },
) {
  return { x, y: bounds.centerY - (y - bounds.centerY) }
}

export function flipBothTransformer(
  x: number,
  y: number,
  bounds: { centerX: number; centerY: number },
) {
  return {
    x: bounds.centerX - (x - bounds.centerX),
    y: bounds.centerY - (y - bounds.centerY),
  }
}

export function rotateTransformer(degrees: number) {
  const radians = (degrees * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  return (x: number, y: number, bounds: { centerX: number; centerY: number }) => {
    const dx = x - bounds.centerX
    const dy = y - bounds.centerY
    return {
      x: bounds.centerX + dx * cos - dy * sin,
      y: bounds.centerY + dx * sin + dy * cos,
    }
  }
}
