import { useEffect, useRef, useState } from 'react'

import { openSvgFile, saveSvgFile } from '@/editor/file'
import { useEditorStore } from '@/editor/store'

type GetPathCountFromSvg = (fromSvg: string) => number

export function useFileIo(opts: { getPathCountFromSvg: GetPathCountFromSvg }) {
  const {
    svgInput,
    setSvgInput,
    sourceSvg,
    setSourceSvg,
    fileHandle,
    fileName,
    setFileHandle,
    autoSaveEnabled,
    setStatus,
    clearHistory,
    setSelectedIndices,
    setSelectedPathIndex,
    setDrag,
    setSelectionBox,
    setPan,
  } = useEditorStore()

  const [openDialogOpen, setOpenDialogOpen] = useState(false)
  const [lastSavedSvg, setLastSavedSvg] = useState<string>('')

  function loadSvgFromInput() {
    try {
      if (!svgInput.trim()) {
        setStatus('Open an SVG to begin.')
        return
      }
      const doc = new DOMParser().parseFromString(svgInput, 'image/svg+xml')
      const parserError = doc.querySelector('parsererror')
      if (parserError) throw new Error('Invalid SVG markup.')
      const svg = doc.documentElement
      if (svg.tagName.toLowerCase() !== 'svg') throw new Error('Input must contain an <svg> root element.')

      const serialized = new XMLSerializer().serializeToString(svg)
      setSourceSvg(serialized)
      setLastSavedSvg(serialized)
      clearHistory()
      setSelectedIndices([])
      setDrag({ active: false, startLocal: null, originalCommands: null })
      setSelectionBox({ active: false, start: null, current: null })
      setPan({ active: false, start: null })

      const count = opts.getPathCountFromSvg(serialized)
      if (!count) {
        setStatus('No <path d="..."> elements found.')
        return
      }
      setSelectedPathIndex(0)
      setStatus(`Loaded SVG with ${count} editable paths.`)
    } catch (e) {
      setStatus((e as Error).message)
    }
  }

  async function onOpenFile() {
    try {
      const result = await openSvgFile()
      if (!result.text) return
      setFileHandle(result.handle, result.name)
      setSvgInput(result.text)
      setStatus(`Loaded file: ${result.name || 'untitled'}`)

      const doc = new DOMParser().parseFromString(result.text, 'image/svg+xml')
      const parserError = doc.querySelector('parsererror')
      if (parserError) throw new Error('Invalid SVG markup.')
      const svg = doc.documentElement
      if (svg.tagName.toLowerCase() !== 'svg') throw new Error('Input must contain an <svg> root element.')
      const serialized = new XMLSerializer().serializeToString(svg)
      setSourceSvg(serialized)
      setLastSavedSvg(serialized)
      clearHistory()
      setSelectedIndices([])
      setDrag({ active: false, startLocal: null, originalCommands: null })
      setSelectionBox({ active: false, start: null, current: null })
      setPan({ active: false, start: null })

      const count = opts.getPathCountFromSvg(serialized)
      if (!count) {
        setStatus('No <path d="..."> elements found.')
        return
      }
      setSelectedPathIndex(0)
    } catch (e) {
      setStatus((e as Error).message)
    }
  }

  async function onSaveFile(forceSaveAs?: boolean) {
    try {
      if (!sourceSvg) {
        setStatus('Nothing to save yet.')
        return
      }
      const result = await saveSvgFile({
        handle: forceSaveAs ? null : fileHandle,
        suggestedName: fileName || 'edited.svg',
        text: sourceSvg,
      })
      setFileHandle(result.handle, result.name)
      setLastSavedSvg(sourceSvg)
      setStatus(`Saved: ${result.name || 'downloaded'}`)
    } catch (e) {
      setStatus((e as Error).message)
    }
  }

  // Auto-save (debounced)
  const autoSaveTimerRef = useRef<number | null>(null)
  const lastAutoSavedRef = useRef<string>('')
  useEffect(() => {
    if (!autoSaveEnabled) return
    if (!fileHandle) return
    if (!sourceSvg) return
    if (sourceSvg === lastAutoSavedRef.current) return

    if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = window.setTimeout(() => {
      void (async () => {
        try {
          await saveSvgFile({ handle: fileHandle, suggestedName: fileName || 'edited.svg', text: sourceSvg })
          lastAutoSavedRef.current = sourceSvg
          setLastSavedSvg(sourceSvg)
          setStatus(`Auto-saved: ${fileName || fileHandle.name}`)
        } catch (e) {
          setStatus(`Auto-save failed: ${(e as Error).message}`)
        }
      })()
    }, 450)

    return () => {
      if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current)
      autoSaveTimerRef.current = null
    }
  }, [autoSaveEnabled, fileHandle, fileName, sourceSvg, setStatus])

  // Initial load
  useEffect(() => {
    if (!sourceSvg) setOpenDialogOpen(true)
    else loadSvgFromInput()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!sourceSvg) setOpenDialogOpen(true)
  }, [sourceSvg])

  return {
    openDialogOpen,
    setOpenDialogOpen,
    lastSavedSvg,
    setLastSavedSvg,
    loadSvgFromInput,
    onOpenFile,
    onSaveFile,
  }
}
