/**
 * WASM loader + JS fallback for SVG path operations.
 *
 * Call `loadWasm()` once at startup (main.tsx). All exported functions
 * (`parsePath`, `buildPath`) use WASM when available and fall back to
 * the JS implementations automatically.
 */

import type { PathCommand } from '@/editor/types'

// Flat-array command type codes — must match Rust constants in parse.rs
const CMD_M = 0
const CMD_L = 1
const CMD_Z = 2

// ── JS fallback implementations ───────────────────────────────────────────────

function parsePathJs(d: string): PathCommand[] {
  const tokens = d.match(/[MLZmlz]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || []
  const parsed: PathCommand[] = []
  let index = 0
  let command: string | null = null

  while (index < tokens.length) {
    const token = tokens[index]
    if (/^[MLZmlz]$/.test(token)) {
      command = token.toUpperCase()
      index += 1
    }

    if (command === 'Z') {
      parsed.push({ type: 'Z' })
      command = null
      continue
    }

    if (command === 'M' || command === 'L') {
      const x = Number(tokens[index])
      const y = Number(tokens[index + 1])
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        throw new Error('Invalid path near: ' + tokens.slice(index, index + 3).join(' '))
      }
      parsed.push({ type: command as 'M' | 'L', x, y })
      index += 2
      continue
    }

    throw new Error('Expected M, L or Z command near: ' + token)
  }

  return parsed
}

function formatNumber(value: number) {
  return Number(value.toFixed(2)).toString()
}

function buildPathJs(commands: PathCommand[]): string {
  return commands
    .map((c) => {
      if (c.type === 'Z') return 'Z'
      return `${c.type} ${formatNumber(c.x)} ${formatNumber(c.y)}`
    })
    .join('\n')
}

// ── WASM state ────────────────────────────────────────────────────────────────

type WasmModule = {
  parse_path: (d: string) => [Uint8Array, Float64Array, number]
  build_path: (types: Uint8Array, coords: Float64Array, n: number) => string
}

let wasm: WasmModule | null = null

export async function loadWasm(): Promise<void> {
  try {
    const mod = await import('./generated/svg_path_wasm')
    await (mod as unknown as { default: () => Promise<void> }).default()
    wasm = mod as unknown as WasmModule
    console.debug('[wasm] WASM module loaded')
  } catch (e) {
    console.warn('[wasm] Failed to load WASM module, using JS fallback:', e)
    wasm = null
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Parse an SVG path `d` string into PathCommand[].
 * Uses WASM when available, JS otherwise.
 */
export function parsePath(d: string): PathCommand[] {
  if (!wasm) return parsePathJs(d)

  try {
    const result = wasm.parse_path(d) as unknown as [Uint8Array, Float64Array, number]
    const [types, coords, n] = result
    const commands: PathCommand[] = []
    for (let i = 0; i < n; i++) {
      const t = types[i]
      if (t === CMD_Z) {
        commands.push({ type: 'Z' })
      } else if (t === CMD_M) {
        commands.push({ type: 'M', x: coords[i * 2], y: coords[i * 2 + 1] })
      } else if (t === CMD_L) {
        commands.push({ type: 'L', x: coords[i * 2], y: coords[i * 2 + 1] })
      }
    }
    return commands
  } catch (e) {
    console.warn('[wasm] parse_path failed, falling back to JS:', e)
    return parsePathJs(d)
  }
}

/**
 * Serialise PathCommand[] to an SVG path `d` string.
 * Uses WASM when available, JS otherwise.
 */
export function buildPath(commands: PathCommand[]): string {
  if (!wasm) return buildPathJs(commands)

  try {
    const n = commands.length
    const types = new Uint8Array(n)
    const coords = new Float64Array(n * 2)
    for (let i = 0; i < n; i++) {
      const c = commands[i]
      if (c.type === 'Z') {
        types[i] = CMD_Z
        coords[i * 2] = 0
        coords[i * 2 + 1] = 0
      } else if (c.type === 'M') {
        types[i] = CMD_M
        coords[i * 2] = c.x
        coords[i * 2 + 1] = c.y
      } else {
        types[i] = CMD_L
        coords[i * 2] = c.x
        coords[i * 2 + 1] = c.y
      }
    }
    return wasm.build_path(types, coords, n)
  } catch (e) {
    console.warn('[wasm] build_path failed, falling back to JS:', e)
    return buildPathJs(commands)
  }
}
