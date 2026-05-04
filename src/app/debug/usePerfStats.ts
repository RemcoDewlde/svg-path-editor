import { useEffect, useState, type MutableRefObject } from 'react'

import type { PerfCounters } from '@/editor/types'

export type PerfStats = {
  fps: number
  frameMsAvg: number
  frameMsP95: number
  frameMsMax: number
  appRendersPerSec: number
  panMovesPerSec: number
  dragMovesPerSec: number
  boxMovesPerSec: number
  viewBoxWritesPerSec: number
  viewBoxCommitsPerSec: number
  cursorWritesPerSec: number
  cursorCommitsPerSec: number
}

export function usePerfStats(params: {
  enabled: boolean
  simulateJank: boolean
  simulateJankMs: string
  perfCountersRef: MutableRefObject<PerfCounters>
  perfLastCountersRef: MutableRefObject<PerfCounters>
  appRenderCountRef: MutableRefObject<number>
  lastAppRenderCountRef: MutableRefObject<number>
}) {
  const { enabled, simulateJank, simulateJankMs, perfCountersRef, perfLastCountersRef, appRenderCountRef, lastAppRenderCountRef } = params
  const [perfStats, setPerfStats] = useState<PerfStats | null>(null)

  useEffect(() => {
    if (!enabled) return

    let raf = 0
    let sampleTimer: number | null = null
    let last = performance.now()
    const frameMsHistory: number[] = []

    function busyWait(ms: number) {
      const end = performance.now() + ms
      // eslint-disable-next-line no-empty
      while (performance.now() < end) {}
    }

    function onFrame(now: number) {
      const dt = now - last
      last = now
      frameMsHistory.push(dt)
      if (frameMsHistory.length > 240) frameMsHistory.splice(0, frameMsHistory.length - 240)

      const jankMs = simulateJank ? Math.max(0, Number(simulateJankMs) || 0) : 0
      if (jankMs) busyWait(Math.min(250, jankMs))

      raf = window.requestAnimationFrame(onFrame)
    }

    const percentile = (arr: number[], p: number) => {
      if (!arr.length) return 0
      const sorted = arr.slice().sort((a, b) => a - b)
      const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * (sorted.length - 1))))
      return sorted[idx]
    }

    raf = window.requestAnimationFrame(onFrame)
    sampleTimer = window.setInterval(() => {
      const frames = frameMsHistory.slice()
      const avg = frames.length ? frames.reduce((a, b) => a + b, 0) / frames.length : 0
      const max = frames.length ? Math.max(...frames) : 0
      const p95 = percentile(frames, 95)
      const fps = avg ? 1000 / avg : 0

      const cur = perfCountersRef.current
      const prev = perfLastCountersRef.current
      const d = {
        panMoves: cur.panMoves - prev.panMoves,
        dragMoves: cur.dragMoves - prev.dragMoves,
        boxMoves: cur.boxMoves - prev.boxMoves,
        viewBoxWrites: cur.viewBoxWrites - prev.viewBoxWrites,
        viewBoxCommits: cur.viewBoxCommits - prev.viewBoxCommits,
        cursorWrites: cur.cursorWrites - prev.cursorWrites,
        cursorCommits: cur.cursorCommits - prev.cursorCommits,
      }
      perfLastCountersRef.current = { ...cur }

      const rendersNow = appRenderCountRef.current
      const rendersDelta = rendersNow - lastAppRenderCountRef.current
      lastAppRenderCountRef.current = rendersNow

      setPerfStats({
        fps,
        frameMsAvg: avg,
        frameMsP95: p95,
        frameMsMax: max,
        appRendersPerSec: rendersDelta,
        panMovesPerSec: d.panMoves,
        dragMovesPerSec: d.dragMoves,
        boxMovesPerSec: d.boxMoves,
        viewBoxWritesPerSec: d.viewBoxWrites,
        viewBoxCommitsPerSec: d.viewBoxCommits,
        cursorWritesPerSec: d.cursorWrites,
        cursorCommitsPerSec: d.cursorCommits,
      })
    }, 1000)

    return () => {
      window.cancelAnimationFrame(raf)
      if (sampleTimer != null) window.clearInterval(sampleTimer)
      setPerfStats(null)
    }
  }, [
    enabled,
    simulateJank,
    simulateJankMs,
    perfCountersRef,
    perfLastCountersRef,
    appRenderCountRef,
    lastAppRenderCountRef,
  ])

  return perfStats
}
