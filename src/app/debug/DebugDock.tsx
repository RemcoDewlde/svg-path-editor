import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'

import MonacoEditor from '@monaco-editor/react'
import { Bug, ChevronDown, ChevronUp, GripHorizontal } from 'lucide-react'

import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Separator } from '../../components/ui/separator'
import { Switch } from '../../components/ui/switch'

import { lintPathD, lintSvg } from '../../editor/lint'
import { buildPath, parsePath, type PathCommand } from '../../editor/utils'

import { usePerfStats } from './usePerfStats'

function formatPathDMaybe(d: string) {
  // Only formats paths compatible with this editor.
  const parsed = parsePath(d)
  return buildPath(parsed)
}

function formatXmlPretty(xml: string) {
  const doc = new DOMParser().parseFromString(xml, 'image/svg+xml')
  const parserError = doc.querySelector('parsererror')
  if (parserError) throw new Error('Invalid SVG markup.')
  const root = doc.documentElement
  if (root.tagName.toLowerCase() !== 'svg') throw new Error('Input must contain an <svg> root element.')

  function serializeNode(node: Node, indent: string): string {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.nodeValue || '').trim()
      return text ? indent + text + '\n' : ''
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return ''
    const el = node as Element
    const tag = el.tagName

    const attrs = Array.from(el.attributes)
      .map((a) => ` ${a.name}="${a.value.replace(/"/g, '&quot;')}"`)
      .join('')

    const children = Array.from(el.childNodes)
      .map((c) => serializeNode(c, indent + '  '))
      .filter(Boolean)
      .join('')

    if (!children) {
      return `${indent}<${tag}${attrs} />\n`
    }
    return `${indent}<${tag}${attrs}>\n${children}${indent}</${tag}>\n`
  }

  return serializeNode(root, '').trim() + '\n'
}

type PerfCounters = {
  panMoves: number
  dragMoves: number
  boxMoves: number
  viewBoxWrites: number
  viewBoxCommits: number
  cursorWrites: number
  cursorCommits: number
}

export type DebugDockProps = {
  enabled: boolean
  dockOpen: boolean
  setDockOpen: (open: boolean) => void
  dockHeight: number
  setDockHeight: (height: number) => void

  outputSvg: string
  outputPath: string
  activePathIndex: number

  // Editor callbacks
  setStatus: (value: string) => void
  applyPathCommands: (commands: PathCommand[]) => void
  applySvgSerialized: (serializedSvg: string, pathCount: number) => void

  // Perf counters (mutated by the editor during interaction)
  perfCountersRef: MutableRefObject<PerfCounters>
  perfLastCountersRef: MutableRefObject<PerfCounters>
  appRenderCountRef: MutableRefObject<number>
  lastAppRenderCountRef: MutableRefObject<number>
}

export function DebugDock(props: DebugDockProps) {
  const {
    enabled,
    dockOpen,
    setDockOpen,
    dockHeight,
    setDockHeight,
    outputSvg,
    outputPath,
    activePathIndex,
    setStatus,
    applyPathCommands,
    applySvgSerialized,
    perfCountersRef,
    perfLastCountersRef,
    appRenderCountRef,
    lastAppRenderCountRef,
  } = props

  const [tab, setTab] = useState<'svg' | 'path' | 'perf'>('svg')
  const [live, setLive] = useState(true)
  const [followCurrent, setFollowCurrent] = useState(true)
  const [autoFormat, setAutoFormat] = useState(false)
  const [lintEnabled, setLintEnabled] = useState(true)

  const [svgDraft, setSvgDraft] = useState<string>('')
  const [pathDraft, setPathDraft] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [lintText, setLintText] = useState<string>('')

  const applyTimerRef = useRef<number | null>(null)
  const isResizingRef = useRef(false)
  const resizeStartRef = useRef<{ y: number; height: number } | null>(null)

  const [simulateJank, setSimulateJank] = useState(false)
  const [simulateJankMs, setSimulateJankMs] = useState('0')

  const perfStats = usePerfStats({
    enabled: enabled && dockOpen && tab === 'perf',
    simulateJank,
    simulateJankMs,
    perfCountersRef,
    perfLastCountersRef,
    appRenderCountRef,
    lastAppRenderCountRef,
  })

  const canApplyPath = activePathIndex >= 0

  function scheduleApply(next: { svg?: string; path?: string }) {
    if (!live) return
    if (applyTimerRef.current) window.clearTimeout(applyTimerRef.current)
    applyTimerRef.current = window.setTimeout(() => {
      try {
        setError('')
        if (lintEnabled) setLintText('')

        if (typeof next.path === 'string') {
          if (!canApplyPath) {
            setError('No active path selected.')
            return
          }

          const raw = next.path
          const formatted = autoFormat ? formatPathDMaybe(raw) : raw

          // Validate
          const parsed = parsePath(formatted)
          if (lintEnabled) {
            const issues = lintPathD(formatted)
            setLintText(
              issues.length
                ? issues
                    .slice(0, 50)
                    .map((i) => `${i.severity.toUpperCase()}: ${i.message}${i.near ? ` (near: ${i.near})` : ''}`)
                    .join('\n')
                : 'No issues found.',
            )
          }
          if (autoFormat && formatted !== raw) setPathDraft(formatted)
          applyPathCommands(parsed)
          return
        }

        if (typeof next.svg === 'string') {
          const raw = next.svg
          const formatted = autoFormat ? formatXmlPretty(raw) : raw
          if (lintEnabled) {
            const report = lintSvg(formatted)
            const lines: string[] = []
            report.slice(0, 50).forEach((entry) => {
              entry.issues.slice(0, 10).forEach((iss) => {
                lines.push(
                  `${entry.pathIndex >= 0 ? `path#${entry.pathIndex + 1} (${entry.label})` : entry.label}: ${iss.severity.toUpperCase()}: ${iss.message}`,
                )
              })
            })
            setLintText(lines.length ? lines.join('\n') : 'No issues found.')
          }
          const doc = new DOMParser().parseFromString(formatted, 'image/svg+xml')
          const parserError = doc.querySelector('parsererror')
          if (parserError) throw new Error('Invalid SVG markup.')
          const svg = doc.documentElement
          if (svg.tagName.toLowerCase() !== 'svg') throw new Error('Input must contain an <svg> root element.')

          const serialized = new XMLSerializer().serializeToString(svg)
          if (autoFormat && formatted !== raw) setSvgDraft(formatted)

          const count = doc.documentElement.querySelectorAll('path[d]').length
          applySvgSerialized(serialized, count)
          return
        }
      } catch (e) {
        setError((e as Error).message)
      }
    }, 250)
  }

  // When following, keep drafts synced to current output.
  useEffect(() => {
    if (!enabled || !dockOpen || !followCurrent) return
    if (!outputSvg) return
    setSvgDraft(outputSvg)
    setPathDraft(outputPath)
    // Don't clear error here; it might contain useful parse errors.
  }, [enabled, dockOpen, followCurrent, outputSvg, outputPath])

  // Resizing handlers live in the dock, not App.
  useEffect(() => {
    function onMouseMove(event: MouseEvent) {
      if (!isResizingRef.current || !resizeStartRef.current) return
      const dy = resizeStartRef.current.y - event.clientY
      const next = Math.max(160, Math.min(window.innerHeight * 0.95, resizeStartRef.current.height + dy))
      setDockHeight(next)
    }
    function onMouseUp() {
      if (!isResizingRef.current) return
      isResizingRef.current = false
      resizeStartRef.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [setDockHeight])

  const statusText = useMemo(() => {
    if (error) return { kind: 'error' as const, text: error }
    return { kind: 'muted' as const, text: dockOpen ? (live ? 'Live' : 'Manual') : 'Hidden' }
  }, [dockOpen, live, error])

  if (!enabled) return null

  return (
    <div className="shrink-0 border-t bg-background">
      <div className="flex h-9 items-center justify-between gap-2 px-2">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2"
            onClick={() => {
              setDockOpen(!dockOpen)
              if (!dockOpen) {
                setSvgDraft(outputSvg)
                setPathDraft(outputPath)
                setError('')
              }
            }}
          >
            <Bug className="mr-2 h-4 w-4" />
            Debug
            {dockOpen ? <ChevronDown className="ml-2 h-4 w-4" /> : <ChevronUp className="ml-2 h-4 w-4" />}
          </Button>
          {statusText.kind === 'error' ? (
            <div className="truncate text-xs text-destructive">{statusText.text}</div>
          ) : (
            <div className="truncate text-xs text-muted-foreground">{statusText.text}</div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            Live
            <Switch checked={live} onCheckedChange={setLive} />
          </div>

          <div className="hidden items-center gap-2 text-xs text-muted-foreground md:flex">
            Follow current
            <Switch checked={followCurrent} onCheckedChange={setFollowCurrent} />
          </div>

          <div className="hidden items-center gap-2 text-xs text-muted-foreground md:flex">
            Lint
            <Switch
              checked={lintEnabled}
              onCheckedChange={(v) => {
                setLintEnabled(v)
                setLintText('')
              }}
            />
          </div>

          <div className="hidden items-center gap-2 text-xs text-muted-foreground md:flex">
            Auto-format
            <Switch checked={autoFormat} onCheckedChange={setAutoFormat} />
          </div>
        </div>
      </div>

      {dockOpen ? (
        <div style={{ height: dockHeight }} className="border-t">
          <div
            className="flex h-4 cursor-row-resize items-center justify-center border-b bg-muted/40 text-muted-foreground"
            onMouseDown={(e) => {
              isResizingRef.current = true
              resizeStartRef.current = { y: e.clientY, height: dockHeight }
              document.body.style.cursor = 'row-resize'
              document.body.style.userSelect = 'none'
            }}
            title="Drag to resize"
          >
            <GripHorizontal className="h-4 w-4" />
          </div>

          <div className="flex h-[calc(100%-16px)] min-h-0 flex-col">
            <div className="shrink-0 border-b px-2 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 rounded-md border p-1">
                  <Button size="sm" variant={tab === 'svg' ? 'secondary' : 'ghost'} className="h-7 px-2" onClick={() => setTab('svg')}>
                    SVG
                  </Button>
                  <Button size="sm" variant={tab === 'path' ? 'secondary' : 'ghost'} className="h-7 px-2" onClick={() => setTab('path')}>
                    Path d
                  </Button>
                  <Button size="sm" variant={tab === 'perf' ? 'secondary' : 'ghost'} className="h-7 px-2" onClick={() => setTab('perf')}>
                    Perf
                  </Button>
                </div>

                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7"
                  onClick={() => {
                    setSvgDraft(outputSvg)
                    setPathDraft(outputPath)
                    setError('')
                    setStatus('Loaded current SVG/path into debug dock.')
                  }}
                  disabled={!outputSvg || tab === 'perf' || followCurrent}
                >
                  Load current
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7"
                  onClick={() => {
                    try {
                      if (tab === 'svg') {
                        setSvgDraft(formatXmlPretty(svgDraft))
                      } else {
                        setPathDraft(formatPathDMaybe(pathDraft))
                      }
                      setError('')
                    } catch (e) {
                      setError((e as Error).message)
                    }
                  }}
                  disabled={tab === 'perf'}
                >
                  Format
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7"
                  onClick={() => {
                    if (tab === 'svg') scheduleApply({ svg: svgDraft })
                    else scheduleApply({ path: pathDraft })
                  }}
                  disabled={live || tab === 'perf'}
                >
                  Apply
                </Button>

                <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                  {tab === 'path' ? (canApplyPath ? `Active: #${activePathIndex + 1}` : 'No active path') : null}
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1">
              {tab === 'perf' ? (
                <div className="h-full overflow-auto p-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-md border bg-muted/20 p-3">
                      <div className="mb-2 text-xs font-medium text-muted-foreground">Frame</div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded border bg-background px-2 py-1">
                          <div className="text-xs text-muted-foreground">FPS</div>
                          <div className="tabular-nums">{perfStats ? perfStats.fps.toFixed(1) : '-'}</div>
                        </div>
                        <div className="rounded border bg-background px-2 py-1">
                          <div className="text-xs text-muted-foreground">Avg ms</div>
                          <div className="tabular-nums">{perfStats ? perfStats.frameMsAvg.toFixed(2) : '-'}</div>
                        </div>
                        <div className="rounded border bg-background px-2 py-1">
                          <div className="text-xs text-muted-foreground">p95 ms</div>
                          <div className="tabular-nums">{perfStats ? perfStats.frameMsP95.toFixed(2) : '-'}</div>
                        </div>
                        <div className="rounded border bg-background px-2 py-1">
                          <div className="text-xs text-muted-foreground">Max ms</div>
                          <div className="tabular-nums">{perfStats ? perfStats.frameMsMax.toFixed(2) : '-'}</div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-md border bg-muted/20 p-3">
                      <div className="mb-2 text-xs font-medium text-muted-foreground">App</div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded border bg-background px-2 py-1">
                          <div className="text-xs text-muted-foreground">Renders/s</div>
                          <div className="tabular-nums">{perfStats ? perfStats.appRendersPerSec : '-'}</div>
                        </div>
                        <div className="rounded border bg-background px-2 py-1">
                          <div className="text-xs text-muted-foreground">Pan moves/s</div>
                          <div className="tabular-nums">{perfStats ? perfStats.panMovesPerSec : '-'}</div>
                        </div>
                        <div className="rounded border bg-background px-2 py-1">
                          <div className="text-xs text-muted-foreground">Drag moves/s</div>
                          <div className="tabular-nums">{perfStats ? perfStats.dragMovesPerSec : '-'}</div>
                        </div>
                        <div className="rounded border bg-background px-2 py-1">
                          <div className="text-xs text-muted-foreground">Box moves/s</div>
                          <div className="tabular-nums">{perfStats ? perfStats.boxMovesPerSec : '-'}</div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-md border bg-muted/20 p-3 md:col-span-2">
                      <div className="mb-2 text-xs font-medium text-muted-foreground">Hot Path Counters</div>
                      <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
                        <div className="rounded border bg-background px-2 py-1">
                          <div className="text-xs text-muted-foreground">viewBox writes/s</div>
                          <div className="tabular-nums">{perfStats ? perfStats.viewBoxWritesPerSec : '-'}</div>
                        </div>
                        <div className="rounded border bg-background px-2 py-1">
                          <div className="text-xs text-muted-foreground">viewBox commits/s</div>
                          <div className="tabular-nums">{perfStats ? perfStats.viewBoxCommitsPerSec : '-'}</div>
                        </div>
                        <div className="rounded border bg-background px-2 py-1">
                          <div className="text-xs text-muted-foreground">cursor writes/s</div>
                          <div className="tabular-nums">{perfStats ? perfStats.cursorWritesPerSec : '-'}</div>
                        </div>
                        <div className="rounded border bg-background px-2 py-1">
                          <div className="text-xs text-muted-foreground">cursor commits/s</div>
                          <div className="tabular-nums">{perfStats ? perfStats.cursorCommitsPerSec : '-'}</div>
                        </div>
                      </div>

                      <Separator className="my-3" />

                      <div className="flex flex-wrap items-end gap-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          Simulate jank
                          <Switch checked={simulateJank} onCheckedChange={setSimulateJank} />
                        </div>
                        <div className="w-[140px]">
                          <Label className="text-xs">Jank ms/frame</Label>
                          <Input
                            type="number"
                            step={1}
                            min={0}
                            value={simulateJankMs}
                            onChange={(e) => setSimulateJankMs(e.target.value)}
                            disabled={!simulateJank}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Uses a busy-wait inside rAF; intended for testing UI resilience.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : tab === 'svg' ? (
                <MonacoEditor
                  height="100%"
                  defaultLanguage="xml"
                  value={svgDraft}
                  onChange={(v) => {
                    if (followCurrent) return
                    const next = v ?? ''
                    setSvgDraft(next)
                    setError('')
                    if (live) scheduleApply({ svg: next })
                  }}
                  options={{
                    readOnly: followCurrent,
                    minimap: { enabled: false },
                    fontSize: 12,
                    wordWrap: 'on',
                    scrollBeyondLastLine: false,
                  }}
                />
              ) : (
                <MonacoEditor
                  height="100%"
                  defaultLanguage="plaintext"
                  value={pathDraft}
                  onChange={(v) => {
                    if (followCurrent) return
                    const next = v ?? ''
                    setPathDraft(next)
                    setError('')
                    if (live) scheduleApply({ path: next })
                  }}
                  options={{
                    readOnly: followCurrent,
                    minimap: { enabled: false },
                    fontSize: 12,
                    wordWrap: 'on',
                    scrollBeyondLastLine: false,
                  }}
                />
              )}
            </div>

            {lintEnabled ? (
              <div className="shrink-0 border-t bg-muted/20 p-2">
                <div className="mb-1 text-xs font-medium text-muted-foreground">Lint</div>
                <pre className="max-h-[120px] overflow-auto whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
                  {lintText || 'Type to see issues.'}
                </pre>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
