import { useState, useRef, useEffect } from 'react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { ZoomIn, ZoomOut } from 'lucide-react'

export function CanvasHud({
  zoomPercent,
  selectedCount,
  cursorText,
  onZoomIn,
  onZoomOut,
  onSetZoomPercent,
  disabled,
}: {
  zoomPercent: number
  selectedCount: number
  cursorText: string
  onZoomIn: () => void
  onZoomOut: () => void
  onSetZoomPercent: (percent: number) => void
  disabled?: boolean
}) {
  const [zoomDraft, setZoomDraft] = useState(() => String(zoomPercent))
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setZoomDraft(String(zoomPercent))
  }, [zoomPercent])

  useEffect(() => {
    function onPointerDownCapture(ev: PointerEvent) {
      const input = inputRef.current
      if (!input) return
      if (document.activeElement !== input) return
      const target = ev.target
      if (target instanceof Node && input.contains(target)) return
      input.blur()
    }
    // Capture so this runs even if the canvas prevents default.
    document.addEventListener('pointerdown', onPointerDownCapture, true)
    return () => document.removeEventListener('pointerdown', onPointerDownCapture, true)
  }, [])

  function commit() {
    const raw = zoomDraft.trim().replace(/%/g, '')
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) {
      setZoomDraft(String(zoomPercent))
      return
    }
    onSetZoomPercent(parsed)
  }

  return (
    <>
      <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-md border bg-background/80 px-2 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
        {zoomPercent}% · {selectedCount} selected
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-md border bg-background/80 px-2 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
        {cursorText}
      </div>

      <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1 rounded-md border bg-background/80 p-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onZoomOut} title="Zoom out" disabled={disabled}>
          <ZoomOut className="h-4 w-4" />
        </Button>

        <Input
          ref={inputRef}
          value={zoomDraft}
          inputMode="numeric"
          className="h-8 w-[72px] border-0 bg-transparent px-0 text-center text-xs tabular-nums shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
          onChange={(e) => setZoomDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit()
            }
            if (e.key === 'Escape') {
              e.preventDefault()
              setZoomDraft(String(zoomPercent))
            }
          }}
          aria-label="Zoom percent"
          disabled={disabled}
        />

        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onZoomIn} title="Zoom in" disabled={disabled}>
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>
    </>
  )
}
