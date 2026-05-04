import { useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { useEditorStore } from '@/editor/store'
import { getPathLabel } from '@/editor/utils'

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
        const doc = new DOMParser().parseFromString(fromSvg, 'image/svg+xml')
        const svg = doc.documentElement
        const paths = Array.from(svg.querySelectorAll('path[d]'))
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

  const getPathCountFromSvg = useCallback((fromSvg: string) => {
    try {
      const doc = new DOMParser().parseFromString(fromSvg, 'image/svg+xml')
      const svg = doc.documentElement
      return Array.from(svg.querySelectorAll('path[d]')).length
    } catch {
      return 0
    }
  }, [])

  const getPathIndexById = useCallback((fromSvg: string, id: string) => {
    try {
      const doc = new DOMParser().parseFromString(fromSvg, 'image/svg+xml')
      const svg = doc.documentElement
      const paths = Array.from(svg.querySelectorAll('path[d]'))
      return paths.findIndex((p) => p.getAttribute('id') === id)
    } catch {
      return -1
    }
  }, [])

  return { refreshPathMetas, getPathCountFromSvg, getPathIndexById }
}
