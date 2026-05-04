export type LintSeverity = 'error' | 'warning'

export type LintIssue = {
  severity: LintSeverity
  message: string
  at: number // character offset
  near?: string
}

type Token = {
  kind: 'cmd' | 'num'
  value: string
  at: number
}

function tokenizePathD(d: string): Token[] {
  const tokens: Token[] = []
  const re = /[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g
  for (const m of d.matchAll(re)) {
    const value = m[0]
    const at = m.index ?? 0
    if (/^[a-zA-Z]$/.test(value)) tokens.push({ kind: 'cmd', value, at })
    else tokens.push({ kind: 'num', value, at })
  }
  return tokens
}

function snippetAt(text: string, at: number) {
  const start = Math.max(0, at - 16)
  const end = Math.min(text.length, at + 24)
  return text.slice(start, end).replace(/\s+/g, ' ')
}

export function lintPathD(d: string): LintIssue[] {
  const issues: LintIssue[] = []
  const tokens = tokenizePathD(d)
  if (!tokens.length) {
    issues.push({ severity: 'warning', message: 'Empty path data.', at: 0 })
    return issues
  }

  const allowed = new Set(['M', 'L', 'Z', 'm', 'l', 'z'])
  for (const t of tokens) {
    if (t.kind === 'cmd' && !allowed.has(t.value)) {
      issues.push({
        severity: 'error',
        message: `Unsupported command '${t.value}'. This editor supports only M/L/Z.`,
        at: t.at,
        near: snippetAt(d, t.at),
      })
    }
  }

  // Basic structural checks for MLZ
  let i = 0
  let currentCmd: string | null = null
  let hasMoveInSubpath = false
  let subpathStartAt = 0
  let lastPoint: { x: number; y: number } | null = null
  let lastMovePoint: { x: number; y: number } | null = null

  const toNum = (tok: Token) => Number(tok.value)

  while (i < tokens.length) {
    const t = tokens[i]
    if (t.kind === 'cmd') {
      currentCmd = t.value
      if (currentCmd === 'Z' || currentCmd === 'z') {
        if (!hasMoveInSubpath) {
          issues.push({ severity: 'error', message: 'Z without a subpath start (missing M).', at: t.at, near: snippetAt(d, t.at) })
        }
        hasMoveInSubpath = false
        lastPoint = lastMovePoint
        currentCmd = null
        i += 1
        continue
      }
      if (currentCmd === 'M' || currentCmd === 'm') {
        hasMoveInSubpath = true
        subpathStartAt = t.at
      }
      i += 1
      continue
    }

    // number without a command
    if (!currentCmd) {
      issues.push({ severity: 'error', message: 'Number without a command (expected M/L/Z).', at: t.at, near: snippetAt(d, t.at) })
      i += 1
      continue
    }

    if (currentCmd !== 'M' && currentCmd !== 'm' && currentCmd !== 'L' && currentCmd !== 'l') {
      i += 1
      continue
    }

    const xTok = tokens[i]
    const yTok = tokens[i + 1]
    if (!yTok || yTok.kind !== 'num') {
      issues.push({ severity: 'error', message: 'Expected y coordinate.', at: xTok.at, near: snippetAt(d, xTok.at) })
      break
    }
    if (xTok.kind !== 'num') {
      issues.push({ severity: 'error', message: 'Expected numeric x coordinate.', at: xTok.at, near: snippetAt(d, xTok.at) })
      i += 1
      continue
    }
    const x = toNum(xTok)
    const y = toNum(yTok)
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      issues.push({ severity: 'error', message: 'Invalid number.', at: xTok.at, near: snippetAt(d, xTok.at) })
      i += 2
      continue
    }

    if ((currentCmd === 'L' || currentCmd === 'l') && !hasMoveInSubpath) {
      issues.push({ severity: 'error', message: 'L before M (subpath has no start).', at: xTok.at, near: snippetAt(d, xTok.at) })
    }

    // Warn for implicit multiple coordinate pairs (valid SVG but not supported by our parser).
    const nextTok = tokens[i + 2]
    if (nextTok && nextTok.kind === 'num') {
      issues.push({
        severity: 'warning',
        message: `Multiple coordinate pairs after '${currentCmd.toUpperCase()}'. Consider expanding into explicit commands for this editor.`,
        at: nextTok.at,
        near: snippetAt(d, nextTok.at),
      })
    }

    const point = { x, y }
    if (lastPoint && lastPoint.x === point.x && lastPoint.y === point.y) {
      issues.push({
        severity: 'warning',
        message: 'Zero-length segment (same point repeated).',
        at: xTok.at,
        near: snippetAt(d, xTok.at),
      })
    }

    lastPoint = point
    if (currentCmd === 'M' || currentCmd === 'm') {
      lastMovePoint = point
    }
    i += 2
  }

  // If we ended with an open subpath, that's fine; warn only if started with M but never had any L.
  if (hasMoveInSubpath && lastMovePoint && subpathStartAt) {
    // No-op: could add additional heuristics here.
  }

  return issues
}

export function lintSvg(svgText: string): Array<{ pathIndex: number; label: string; issues: LintIssue[] }> {
  const out: Array<{ pathIndex: number; label: string; issues: LintIssue[] }> = []
  try {
    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
    const parserError = doc.querySelector('parsererror')
    if (parserError) {
      return [
        {
          pathIndex: -1,
          label: 'SVG',
          issues: [{ severity: 'error', message: 'Invalid SVG markup.', at: 0 }],
        },
      ]
    }
    const svg = doc.documentElement
    const paths = Array.from(svg.querySelectorAll('path[d]'))
    paths.forEach((p, idx) => {
      const d = p.getAttribute('d') || ''
      const label = p.getAttribute('data-label') || p.getAttribute('id') || `path-${idx + 1}`
      const issues = lintPathD(d)
      if (issues.length) out.push({ pathIndex: idx, label, issues })
    })
    return out
  } catch {
    return [
      {
        pathIndex: -1,
        label: 'SVG',
        issues: [{ severity: 'error', message: 'Could not parse SVG for linting.', at: 0 }],
      },
    ]
  }
}
