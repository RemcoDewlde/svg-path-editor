import { useCallback } from 'react'

import { useShallow } from 'zustand/react/shallow'

import { mutateSvg } from '@/editor/svgDoc'
import { useEditorStore } from '@/editor/store'
import type { PathCommand, RenameTarget } from '@/editor/types'
import { buildPath } from '@/editor/utils'

type UseSvgMutationsArgs = {
  pathLabelDraft: string
  pathIdDraft: string
  pathFillDraft: string
  pathStrokeDraft: string
  pathOpacityDraft: string
  renameDraft: string
  renameTarget: RenameTarget | null
  setRenameDialogOpen: (value: boolean) => void
  setRenameTarget: (value: RenameTarget | null) => void
  setRenameDraft: (value: string) => void
  pushHistory: () => void
  getPathCountFromSvg: (value: string) => number
  getPathIndexById: (value: string, id: string) => number
}

export function useSvgMutations(args: UseSvgMutationsArgs) {
  const {
    pathLabelDraft,
    pathIdDraft,
    pathFillDraft,
    pathStrokeDraft,
    pathOpacityDraft,
    renameDraft,
    renameTarget,
    setRenameDialogOpen,
    setRenameTarget,
    setRenameDraft,
    pushHistory,
    getPathCountFromSvg,
    getPathIndexById,
  } = args

  const {
    sourceSvg,
    selectedPathIndex,
    setSourceSvg,
    setHiddenPathIndexes,
    setStatus,
    setSelectedPathIndex,
    setSelectedIndices,
    setCommands,
    setDrag,
    setSelectionBox,
    setPan,
  } = useEditorStore(
    useShallow((s) => ({
      sourceSvg: s.sourceSvg,
      selectedPathIndex: s.selectedPathIndex,
      setSourceSvg: s.setSourceSvg,
      setHiddenPathIndexes: s.setHiddenPathIndexes,
      setStatus: s.setStatus,
      setSelectedPathIndex: s.setSelectedPathIndex,
      setSelectedIndices: s.setSelectedIndices,
      setCommands: s.setCommands,
      setDrag: s.setDrag,
      setSelectionBox: s.setSelectionBox,
      setPan: s.setPan,
    })),
  )


  const setPathHidden = useCallback((index: number, hidden: boolean) => {
    if (!sourceSvg) return
    try {
      const serialized = mutateSvg(sourceSvg, (_svg, paths) => {
        const target = paths[index]
        if (!target) return

        if (hidden) {
          target.setAttribute('display', 'none')
        } else {
          if ((target.getAttribute('display') || '').toLowerCase() === 'none') target.removeAttribute('display')
          const style = target.getAttribute('style')
          if (style && style.toLowerCase().includes('display')) {
            const cleaned = style
              .split(';')
              .map((s) => s.trim())
              .filter((s) => s && !s.toLowerCase().startsWith('display:'))
              .join('; ')
            if (cleaned) target.setAttribute('style', cleaned)
            else target.removeAttribute('style')
          }
        }
      })
      setSourceSvg(serialized)

      const nextHidden = new Set(useEditorStore.getState().hiddenPathIndexes)
      if (hidden) nextHidden.add(index)
      else nextHidden.delete(index)
      setHiddenPathIndexes(Array.from(nextHidden).sort((a, b) => a - b))
    } catch {
      // ignore
    }
  }, [setHiddenPathIndexes, setSourceSvg, sourceSvg])

  const addNewLayerGroup = useCallback((label?: string) => {
    if (!sourceSvg) return
    try {
      const now = Date.now()
      pushHistory()
      const serialized = mutateSvg(sourceSvg, (svg) => {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
        g.setAttribute('id', label ? label.replace(/\s+/g, '-').toLowerCase() : `layer-${now}`)
        svg.appendChild(g)
      })
      setSourceSvg(serialized)
      setStatus('Added new layer group (<g>).')
    } catch (e) {
      setStatus(`Could not add layer: ${(e as Error).message}`)
    }
  }, [pushHistory, setSourceSvg, setStatus, sourceSvg])

  const addNewPathToRoot = useCallback(() => {
    if (!sourceSvg) return
    try {
      const now = Date.now()
      pushHistory()
      const serialized = mutateSvg(sourceSvg, (svg) => {
        const p = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        p.setAttribute('fill', 'none')
        p.setAttribute('stroke', '#111')
        p.setAttribute('stroke-width', '2')
        p.setAttribute('d', 'M 0 0\nL 50 0\nL 50 30\nL 0 30\nZ')
        p.setAttribute('id', `path-${now}`)
        svg.appendChild(p)
      })
      setSourceSvg(serialized)
      const count = getPathCountFromSvg(serialized)
      if (count > 0) setSelectedPathIndex(count - 1)
      setStatus('Added new path and selected it.')
    } catch (e) {
      setStatus(`Could not add path: ${(e as Error).message}`)
    }
  }, [getPathCountFromSvg, pushHistory, setSelectedPathIndex, setSourceSvg, setStatus, sourceSvg])

  const addNewPathFromCommands = useCallback((newCommands: PathCommand[], opts?: { label?: string; newLayer?: boolean }) => {
    if (!sourceSvg) return
    try {
      const now = Date.now()
      pushHistory()
      const serialized = mutateSvg(sourceSvg, (svg) => {
        const p = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        p.setAttribute('d', buildPath(newCommands))
        p.setAttribute('id', `path-${now}`)
        if (opts?.label) p.setAttribute('data-label', opts.label)
        p.setAttribute('fill', 'none')
        p.setAttribute('stroke', '#111')
        p.setAttribute('stroke-width', '2')

        if (opts?.newLayer) {
          const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
          g.setAttribute('id', `layer-${now}`)
          g.appendChild(p)
          svg.appendChild(g)
        } else {
          svg.appendChild(p)
        }
      })
      setSourceSvg(serialized)
      const count = getPathCountFromSvg(serialized)
      if (count > 0) setSelectedPathIndex(count - 1)
      setStatus('Added drawn path.')
    } catch (e) {
      setStatus(`Could not add drawn path: ${(e as Error).message}`)
    }
  }, [getPathCountFromSvg, pushHistory, setSelectedPathIndex, setSourceSvg, setStatus, sourceSvg])

  const deletePathAtIndex = useCallback((index: number) => {
    if (!sourceSvg) return
    try {
      pushHistory()
      const serialized = mutateSvg(sourceSvg, (_svg, paths) => {
        const target = paths[index]
        if (!target || !target.parentNode) {
          throw new Error('Could not delete: path not found.')
        }
        target.parentNode.removeChild(target)
      })
      setSourceSvg(serialized)
      const count = getPathCountFromSvg(serialized)

      setSelectedIndices([])
      setDrag({ active: false, startLocal: null, originalCommands: null })
      setSelectionBox({ active: false, start: null, current: null })
      setPan({ active: false, start: null })

      if (!count) {
        setSelectedPathIndex(-1)
        setCommands([])
        setStatus('Deleted path. No paths remain.')
        return
      }

      const nextIndex = Math.min(index, count - 1)
      setSelectedPathIndex(nextIndex)
      setStatus('Deleted path.')
    } catch (e) {
      setStatus(`Could not delete path: ${(e as Error).message}`)
    }
  }, [getPathCountFromSvg, pushHistory, setCommands, setDrag, setPan, setSelectedIndices, setSelectedPathIndex, setSelectionBox, setSourceSvg, setStatus, sourceSvg])

  const deleteLayerForPath = useCallback((index: number) => {
    if (!sourceSvg) return
    try {
      pushHistory()
      const serialized = mutateSvg(sourceSvg, (_svg, paths) => {
        const target = paths[index]
        if (!target) throw new Error('Could not delete layer: path not found.')

        const findSinglePathGroup = () => {
          let g = (target.parentElement?.closest('g') as SVGGElement | null) ?? (target.closest('g') as SVGGElement | null)
          while (g) {
            const groupPaths = Array.from(g.querySelectorAll('path[d]'))
            if (groupPaths.length === 1 && groupPaths[0] === target) return g
            g = g.parentElement?.closest('g') as SVGGElement | null
          }
          return null
        }

        const parentGroup = findSinglePathGroup()
        if (!parentGroup) {
          throw new Error('Layer contains multiple paths (or no layer group). Use “Delete path” instead.')
        }
        parentGroup.parentNode?.removeChild(parentGroup)
      })
      setSourceSvg(serialized)
      const count = getPathCountFromSvg(serialized)

      setSelectedIndices([])
      setDrag({ active: false, startLocal: null, originalCommands: null })
      setSelectionBox({ active: false, start: null, current: null })
      setPan({ active: false, start: null })

      if (!count) {
        setSelectedPathIndex(-1)
        setCommands([])
        setStatus('Deleted layer. No paths remain.')
        return
      }
      setSelectedPathIndex(Math.min(selectedPathIndex, count - 1))
      setStatus('Deleted layer group (<g>).')
    } catch (e) {
      setStatus(`Could not delete layer: ${(e as Error).message}`)
    }
  }, [getPathCountFromSvg, pushHistory, selectedPathIndex, setCommands, setDrag, setPan, setSelectedIndices, setSelectedPathIndex, setSelectionBox, setSourceSvg, setStatus, sourceSvg])

  const openRenameDialog = useCallback((kind: 'path' | 'layer', index: number) => {
    if (!sourceSvg) return
    try {
      mutateSvg(sourceSvg, (_svg, paths) => {
        const target = paths[index]
        if (!target) return

        if (kind === 'path') {
          const current = target.getAttribute('data-label') || target.getAttribute('id') || `Path ${index + 1}`
          setRenameDraft(current)
        } else {
          const g = target.closest('g') as SVGGElement | null
          if (!g) {
            throw new Error('Path is not inside a <g> layer.')
          }
          const current = g.getAttribute('id') || 'layer'
          setRenameDraft(current)
        }

        setRenameTarget({ kind, index })
        setRenameDialogOpen(true)
      })
    } catch {
      // ignore
    }
  }, [setRenameDialogOpen, setRenameDraft, setRenameTarget, sourceSvg])

  const applyRename = useCallback(() => {
    if (!renameTarget || !sourceSvg) return
    const { kind, index } = renameTarget
    try {
      pushHistory()
      const serialized = mutateSvg(sourceSvg, (_svg, paths) => {
        const target = paths[index]
        if (!target) return

        const trimmed = renameDraft.trim()
        if (kind === 'path') {
          if (trimmed) target.setAttribute('data-label', trimmed)
          else target.removeAttribute('data-label')
        } else {
          const g = target.closest('g') as SVGGElement | null
          if (!g) {
            throw new Error('Path is not inside a <g> layer.')
          }
          if (trimmed) g.setAttribute('id', trimmed)
          else g.removeAttribute('id')
        }
      })
      setSourceSvg(serialized)
      setRenameDialogOpen(false)
      setRenameTarget(null)
      setStatus(kind === 'path' ? 'Renamed path.' : 'Renamed layer.')
    } catch (e) {
      setStatus(`Could not rename: ${(e as Error).message}`)
    }
  }, [pushHistory, renameDraft, renameTarget, setRenameDialogOpen, setRenameTarget, setSourceSvg, setStatus, sourceSvg])

  const movePathAtIndex = useCallback((index: number, direction: -1 | 1) => {
    if (!sourceSvg) return
    try {
      pushHistory()
      let movedId: string | null = null
      const serialized = mutateSvg(sourceSvg, (_svg, paths) => {
        const target = paths[index]
        if (!target) return

        let id = target.getAttribute('id')
        if (!id) {
          const now = Date.now()
          id = `path-${now}`
          target.setAttribute('id', id)
        }

        const moved = target.parentNode ? target.parentNode.insertBefore(target, direction === -1 ? target.previousSibling : target.nextSibling?.nextSibling ?? null) : null
        if (!moved) return
        movedId = id
      })
      if (!movedId) return
      setSourceSvg(serialized)
      const nextIndex = getPathIndexById(serialized, movedId)
      if (nextIndex >= 0) setSelectedPathIndex(nextIndex)
      setStatus(direction === -1 ? 'Moved path up.' : 'Moved path down.')
    } catch (e) {
      setStatus(`Could not move path: ${(e as Error).message}`)
    }
  }, [getPathIndexById, pushHistory, setSelectedPathIndex, setSourceSvg, setStatus, sourceSvg])

  const applyActivePathProperties = useCallback(() => {
    if (!sourceSvg || selectedPathIndex < 0) return
    try {
      pushHistory()
      const serialized = mutateSvg(sourceSvg, (_svg, paths) => {
        const target = paths[selectedPathIndex]
        if (!target) return

        const trimmedLabel = pathLabelDraft.trim()
        if (trimmedLabel) target.setAttribute('data-label', trimmedLabel)
        else target.removeAttribute('data-label')

        const trimmedId = pathIdDraft.trim()
        if (trimmedId) target.setAttribute('id', trimmedId)
        else target.removeAttribute('id')

        const fill = pathFillDraft.trim()
        const stroke = pathStrokeDraft.trim()
        const opacity = pathOpacityDraft.trim()
        if (fill) target.setAttribute('fill', fill)
        else target.removeAttribute('fill')
        if (stroke) target.setAttribute('stroke', stroke)
        else target.removeAttribute('stroke')
        if (opacity) target.setAttribute('opacity', opacity)
        else target.removeAttribute('opacity')
      })
      setSourceSvg(serialized)
      setStatus('Updated active path properties.')
    } catch (e) {
      setStatus(`Could not update path: ${(e as Error).message}`)
    }
  }, [pathFillDraft, pathIdDraft, pathLabelDraft, pathOpacityDraft, pathStrokeDraft, pushHistory, selectedPathIndex, setSourceSvg, setStatus, sourceSvg])

  return {
    setPathHidden,
    addNewLayerGroup,
    addNewPathToRoot,
    addNewPathFromCommands,
    deletePathAtIndex,
    deleteLayerForPath,
    openRenameDialog,
    applyRename,
    movePathAtIndex,
    applyActivePathProperties,
  }
}
