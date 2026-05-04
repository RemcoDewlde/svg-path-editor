export type ViewBox = { x: number; y: number; width: number; height: number }

export type DragState = {
  active: boolean
  startLocal: DOMPoint | null
  originalCommands: PathCommand[] | null
  hasHistory?: boolean
}

export type SelectionBoxState = {
  active: boolean
  start: { x: number; y: number } | null
  current: { x: number; y: number } | null
}

export type PanState = {
  active: boolean
  start:
    | {
        // Capture screen-space anchor to avoid viewBox feedback jitter.
        client: { x: number; y: number }
        unitsPerPx: { x: number; y: number }
        viewBox: ViewBox
      }
    | null
}

export type PathCommand =
  | { type: 'M' | 'L'; x: number; y: number }
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
  viewBox?: { x: number; y: number; width: number; height: number }
}

export type RenameTarget = null | { kind: 'path' | 'layer'; index: number }

export type UiPointSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export type Snapshot = {
  selectedPathIndex: number
  svg: string
  commands: PathCommand[]
}

export type PerfCounters = {
  panMoves: number
  dragMoves: number
  boxMoves: number
  viewBoxWrites: number
  viewBoxCommits: number
  cursorWrites: number
  cursorCommits: number
}
