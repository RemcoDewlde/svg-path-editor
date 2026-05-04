export type ViewBoxLike = { x: number; y: number; width: number; height: number }

export function clampViewBox(vb: ViewBoxLike) {
  const x = Number.isFinite(vb.x) ? vb.x : 0
  const y = Number.isFinite(vb.y) ? vb.y : 0
  const width = Number.isFinite(vb.width) ? Math.max(vb.width, 1) : 1000
  const height = Number.isFinite(vb.height) ? Math.max(vb.height, 1) : 1000
  return { x, y, width, height }
}
