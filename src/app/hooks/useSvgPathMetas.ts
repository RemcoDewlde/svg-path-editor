import { useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { useEditorStore } from '@/editor/store'
import { getPathLabel } from '@/editor/utils'
import {
  getPathCount,
  getPathIndexById as liveGetPathIndexById,
  getPathElements,
  loadLiveDoc,
} from '@/editor/liveSvgDoc'

/**
 * Utilities for deriving and refreshing the layers list (`pathMetas`) from an SVG string.
 */
export function useSvgPathMetas() {
  // useShallow caches the snapshot so React 19 doesn't warn/loop on new object literals.
  const { setPathMetas, setHiddenPathIndexes } = useEditorStore(
    useShallow((s) => ({
      setPathMetas: s.setPathMetas,
      setHiddenPathIndexes: s.setHiddenPathIndexes,
    })),
  )

  const refreshPathMetas = useCallback(
    (fromSvg: string) => {
      try {
        // Fix 1/6: Load into live doc once — all subsequent helpers read from it.
        loadLiveDoc(fromSvg)
        const paths = getPathElements()
        const hidden: number[] = []
        setPathMetas(
          paths.map((p, index) => {
            const groupId = p.closest('g')?.getAttribute('id') || ''
            const style = (p.getAttribute('style') || '').toLowerCase()
            const displayAttr = (p.getAttribute('display') || '').toLowerCase()
            const isHidden = displayAttr === 'none' || style.includes('display:none')
            if (isHidden) hidden.push(index)
            return {
              index,
              label: getPathLabel(p, index),
              d: p.getAttribute('d') || '',
              id: p.getAttribute('id') || '',
              dataLabel: p.getAttribute('data-label') || '',
              groupId,
              fill: p.getAttribute('fill') || '',
              stroke: p.getAttribute('stroke') || '',
              strokeWidth: p.getAttribute('stroke-width') || '',
              opacity: p.getAttribute('opacity') || '',
              hidden: isHidden,
            }
          }),
        )
        setHiddenPathIndexes(hidden)
        return paths.length
      } catch {
        setPathMetas([])
        setHiddenPathIndexes([])
        return 0
      }
    },
    [setHiddenPathIndexes, setPathMetas],
  )

  // Fix 6: use live doc instead of re-parsing from scratch.
  // The svgString arg is kept for API compatibility but unused — the live doc
  // is already current after every mutateSvg / loadLiveDoc call.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getPathCountFromSvg = useCallback((_fromSvg?: string) => {
    // Live doc is kept in sync; fallback to re-loading if somehow stale.
    try {
      return getPathCount()
    } catch {
      return 0
    }
  }, [])

  const getPathIndexById = useCallback((_fromSvg?: string, id?: string) => {
    try {
      return liveGetPathIndexById(id ?? '')
    } catch {
      return -1
    }
  }, [])

  return { refreshPathMetas, getPathCountFromSvg, getPathIndexById }
}
