import { useEffect } from 'react'

/**
 * Opens the command menu on Cmd/Ctrl+K, ignoring text inputs and Monaco.
 */
export function useCommandMenuHotkey(setOpen: (open: boolean) => void) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isK = e.key.toLowerCase() === 'k'
      if (!isK) return
      if (!(e.metaKey || e.ctrlKey)) return

      const active = document.activeElement as HTMLElement | null
      const tag = (active?.tagName || '').toLowerCase()
      const isEditingText = tag === 'input' || tag === 'textarea' || tag === 'select' || !!active?.isContentEditable
      if (active && active.closest('.monaco-editor')) return
      if (isEditingText) return

      e.preventDefault()
      setOpen(true)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setOpen])
}
