import { useEffect, useMemo, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'

import type { CommandMenuItem } from '@/app/command-menu/commandMenuItems'

function normalize(s: string) {
  return s.trim().toLowerCase()
}

export function CommandMenu(props: {
  open: boolean
  onOpenChange: (v: boolean) => void
  items: CommandMenuItem[]
}) {
  const { open, onOpenChange, items } = props
  const [q, setQ] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])

  const filtered = useMemo(() => {
    const query = normalize(q)
    if (!query) return items
    return items.filter((it) => {
      const hay = `${it.label} ${it.keywords || ''}`
      return normalize(hay).includes(query)
    })
  }, [items, q])

  const firstEnabledIndex = useMemo(() => filtered.findIndex((it) => !it.disabled), [filtered])

  useEffect(() => {
    // Reset active item when query changes.
    setActiveIndex(firstEnabledIndex >= 0 ? firstEnabledIndex : 0)
  }, [firstEnabledIndex, q])

  useEffect(() => {
    if (!open) return
    const el = itemRefs.current[activeIndex]
    if (!el) return
    el.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open])

  function clampIndex(i: number) {
    if (!filtered.length) return 0
    return Math.max(0, Math.min(filtered.length - 1, i))
  }

  function nextEnabled(from: number, dir: -1 | 1) {
    if (!filtered.length) return 0
    let i = clampIndex(from)
    for (let step = 0; step < filtered.length; step += 1) {
      i = clampIndex(i + dir)
      if (!filtered[i]?.disabled) return i
    }
    return clampIndex(from)
  }

  function runIndex(i: number) {
    const it = filtered[i]
    if (!it || it.disabled) return
    onOpenChange(false)
    it.onSelect()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (!v) setQ('')
      }}
    >
      <DialogContent className="max-w-[720px] p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle>Command Menu</DialogTitle>
          <DialogDescription>Search actions, settings, and help.</DialogDescription>
        </DialogHeader>

        <div className="px-4 pb-3">
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type to search (e.g. grid, keybindings, theme, save…)"
            aria-controls="command-menu-list"
            aria-activedescendant={filtered[activeIndex] ? `cmd-item-${filtered[activeIndex]!.id}` : undefined}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault()
                onOpenChange(false)
                return
              }
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                const start = activeIndex < 0 ? (firstEnabledIndex >= 0 ? firstEnabledIndex : 0) : activeIndex
                setActiveIndex(nextEnabled(start, 1))
                return
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault()
                const start = activeIndex < 0 ? (firstEnabledIndex >= 0 ? firstEnabledIndex : 0) : activeIndex
                setActiveIndex(nextEnabled(start, -1))
                return
              }
              if (e.key === 'Home') {
                e.preventDefault()
                setActiveIndex(firstEnabledIndex >= 0 ? firstEnabledIndex : 0)
                return
              }
              if (e.key === 'End') {
                e.preventDefault()
                const lastEnabled = [...filtered]
                  .map((it, idx) => ({ it, idx }))
                  .reverse()
                  .find((x) => !x.it.disabled)?.idx
                setActiveIndex(typeof lastEnabled === 'number' ? lastEnabled : 0)
                return
              }
              if (e.key === 'Enter') {
                e.preventDefault()
                const idx = filtered[activeIndex] && !filtered[activeIndex]!.disabled ? activeIndex : firstEnabledIndex
                if (idx < 0) return
                runIndex(idx)
              }
            }}
          />
        </div>

        <ScrollArea className="max-h-[60vh]">
          <div className="p-2" id="command-menu-list" role="listbox">
            {filtered.length ? (
              <div className="space-y-1">
                {filtered.map((it, idx) => (
                  <button
                    key={it.id}
                    id={`cmd-item-${it.id}`}
                    type="button"
                    disabled={it.disabled}
                    ref={(el) => {
                      itemRefs.current[idx] = el
                    }}
                    role="option"
                    aria-selected={idx === activeIndex}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => runIndex(idx)}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm outline-none transition-colors',
                      it.disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring',
                      idx === activeIndex && !it.disabled ? 'bg-muted/60' : null,
                    )}
                  >
                    <span className="min-w-0 truncate">{it.label}</span>
                    {it.rightHint ? <span className="shrink-0 text-xs text-muted-foreground">{it.rightHint}</span> : null}
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">No matches.</div>
            )}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between border-t bg-muted/10 px-4 py-2">
          <div className="text-xs text-muted-foreground">Enter runs the first match. Esc closes.</div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md border bg-background px-3 py-1 text-xs font-medium hover:bg-muted/50"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
