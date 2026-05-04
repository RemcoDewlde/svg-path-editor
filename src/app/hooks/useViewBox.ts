import { useCallback, useEffect, useMemo, useRef, type MutableRefObject, type RefObject } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { clampViewBox } from '../canvas/viewBox'
import { useEditorStore } from '@/editor/store'
import type { PerfCounters } from '@/editor/types'

type ViewBox = ReturnType<typeof useEditorStore.getState>['currentViewBox']

export function useViewBox(
  svgRef: RefObject<SVGSVGElement | null>,
  perfCountersRef: MutableRefObject<PerfCounters>,
) {
  const { baseViewBox, currentViewBox, setCurrentViewBox, pan } = useEditorStore(
    useShallow((s) => ({
      baseViewBox: s.baseViewBox,
      currentViewBox: s.currentViewBox,
      setCurrentViewBox: s.setCurrentViewBox,
      pan: s.pan,
    })),
  )

  const viewBoxRafRef = useRef<number | null>(null)
  const pendingViewBoxRef = useRef<ViewBox | null>(null)
  const lastViewBoxCommitTsRef = useRef(0)
  const panLastViewBoxRef = useRef<ViewBox | null>(null)

  const viewBoxAttrRafRef = useRef<number | null>(null)
  const pendingViewBoxAttrRef = useRef<ViewBox | null>(null)

  const setViewBox = useCallback(
    (vb: ViewBox) => {
      const next = clampViewBox(vb)
      setCurrentViewBox(next)
      const svg = svgRef.current
      if (svg) svg.setAttribute('viewBox', `${next.x} ${next.y} ${next.width} ${next.height}`)
    },
    [setCurrentViewBox, svgRef],
  )

  const setViewBoxCoalesced = useCallback(
    (vb: ViewBox) => {
      const next = clampViewBox(vb)
      pendingViewBoxRef.current = next
      panLastViewBoxRef.current = next
      pendingViewBoxAttrRef.current = next
      const svg = svgRef.current

      if (svg && viewBoxAttrRafRef.current == null) {
        viewBoxAttrRafRef.current = window.requestAnimationFrame(() => {
          viewBoxAttrRafRef.current = null
          const nextAttr = pendingViewBoxAttrRef.current
          const el = svgRef.current
          if (!nextAttr || !el) return
          el.setAttribute('viewBox', `${nextAttr.x} ${nextAttr.y} ${nextAttr.width} ${nextAttr.height}`)
          perfCountersRef.current.viewBoxWrites += 1
        })
      }

      if (viewBoxRafRef.current != null) return
      viewBoxRafRef.current = window.requestAnimationFrame(() => {
        viewBoxRafRef.current = null
        const nextCommit = pendingViewBoxRef.current
        if (!nextCommit) return

        if (pan.active) return

        const now = performance.now()
        if (now - lastViewBoxCommitTsRef.current < 50) return
        lastViewBoxCommitTsRef.current = now
        perfCountersRef.current.viewBoxCommits += 1
        setCurrentViewBox(nextCommit)
      })
    },
    [pan.active, perfCountersRef, setCurrentViewBox, svgRef],
  )

  const zoomAt = useCallback(
    (event: WheelEvent, getEditorPointFromEvent: (event: WheelEvent) => DOMPoint | null) => {
      event.preventDefault()
      const mouse = getEditorPointFromEvent(event)
      if (!mouse) return

      const factor = event.deltaY < 0 ? 0.85 : 1.15
      const nextWidth = currentViewBox.width * factor
      const nextHeight = currentViewBox.height * factor
      const minWidth = baseViewBox.width / 40
      const maxWidth = baseViewBox.width * 8
      if (nextWidth < minWidth || nextWidth > maxWidth) return

      const relativeX = (mouse.x - currentViewBox.x) / currentViewBox.width
      const relativeY = (mouse.y - currentViewBox.y) / currentViewBox.height
      const next = {
        x: mouse.x - nextWidth * relativeX,
        y: mouse.y - nextHeight * relativeY,
        width: nextWidth,
        height: nextHeight,
      }
      setViewBox(next)
    },
    [baseViewBox.width, currentViewBox, setViewBox],
  )

  const zoomByFactor = useCallback(
    (factor: number) => {
      const nextWidth = currentViewBox.width * factor
      const nextHeight = currentViewBox.height * factor
      const minWidth = baseViewBox.width / 40
      const maxWidth = baseViewBox.width * 8
      if (nextWidth < minWidth || nextWidth > maxWidth) return

      const cx = currentViewBox.x + currentViewBox.width / 2
      const cy = currentViewBox.y + currentViewBox.height / 2
      const relativeX = (cx - currentViewBox.x) / currentViewBox.width
      const relativeY = (cy - currentViewBox.y) / currentViewBox.height

      const next = {
        x: cx - nextWidth * relativeX,
        y: cy - nextHeight * relativeY,
        width: nextWidth,
        height: nextHeight,
      }
      setViewBox(next)
    },
    [baseViewBox.width, currentViewBox, setViewBox],
  )

  const zoomIn = useCallback(() => {
    zoomByFactor(0.85)
  }, [zoomByFactor])

  const zoomOut = useCallback(() => {
    zoomByFactor(1.15)
  }, [zoomByFactor])

  const setZoomPercent = useCallback(
    (pct: number) => {
      if (!Number.isFinite(pct) || pct <= 0) return
      const p = Math.max(5, Math.min(800, pct))
      const targetWidth = baseViewBox.width / (p / 100)
      const targetHeight = baseViewBox.height / (p / 100)
      const minWidth = baseViewBox.width / 40
      const maxWidth = baseViewBox.width * 8
      if (targetWidth < minWidth || targetWidth > maxWidth) return

      const cx = currentViewBox.x + currentViewBox.width / 2
      const cy = currentViewBox.y + currentViewBox.height / 2
      setViewBox({
        x: cx - targetWidth / 2,
        y: cy - targetHeight / 2,
        width: targetWidth,
        height: targetHeight,
      })
    },
    [baseViewBox, currentViewBox, setViewBox],
  )

  const zoomPercent = useMemo(() => {
    if (!baseViewBox.width || !currentViewBox.width) return 100
    return Math.round((baseViewBox.width / currentViewBox.width) * 100)
  }, [baseViewBox.width, currentViewBox.width])

  useEffect(() => {
    return () => {
      if (viewBoxRafRef.current != null) window.cancelAnimationFrame(viewBoxRafRef.current)
      if (viewBoxAttrRafRef.current != null) window.cancelAnimationFrame(viewBoxAttrRafRef.current)
    }
  }, [])

  return {
    zoomPercent,
    setViewBox,
    setViewBoxCoalesced,
    zoomAt,
    zoomIn,
    zoomOut,
    setZoomPercent,
    panLastViewBoxRef,
  }
}
