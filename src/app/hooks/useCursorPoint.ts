import { useEffect, useRef, useState } from 'react'

import type { PerfCounters } from '@/editor/types'

export function useCursorPoint(perfCountersRef: React.RefObject<PerfCounters>) {
  const [cursorPoint, setCursorPoint] = useState<{ x: number; y: number } | null>(null)

  const cursorRafRef = useRef<number | null>(null)
  const pendingCursorRef = useRef<{ x: number; y: number } | null>(null)

  function setCursorPointCoalesced(next: { x: number; y: number } | null) {
    pendingCursorRef.current = next
    if (perfCountersRef.current) perfCountersRef.current.cursorWrites += 1
    if (cursorRafRef.current != null) return
    cursorRafRef.current = window.requestAnimationFrame(() => {
      cursorRafRef.current = null
      if (perfCountersRef.current) perfCountersRef.current.cursorCommits += 1
      setCursorPoint(pendingCursorRef.current)
    })
  }

  useEffect(() => {
    return () => {
      if (cursorRafRef.current != null) window.cancelAnimationFrame(cursorRafRef.current)
    }
  }, [])

  return { cursorPoint, setCursorPointCoalesced }
}
