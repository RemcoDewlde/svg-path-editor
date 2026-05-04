import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'

import { Eye, EyeOff, Layers, PanelRight, Plus, X } from 'lucide-react'
import { ellipsisText } from '@/app/utils/text'

import type { PathMeta } from '@/editor/types'
import { useEditorStore } from '@/editor/store'
import { useShallow } from 'zustand/react/shallow'

export function LayersPanel(props: {
  pathListItems: PathMeta[]
  setPathHidden: (index: number, hidden: boolean) => void
  deletePathAtIndex: (index: number) => void
  movePathAtIndex: (index: number, direction: -1 | 1) => void
  openRenameDialog: (kind: 'path' | 'layer', index: number) => void
  addNewLayerGroup: (name: string) => void
  addNewPathToRoot: () => void
}) {
  const {
    pathListItems,
    setPathHidden,
    deletePathAtIndex,
    movePathAtIndex,
    openRenameDialog,
    addNewLayerGroup,
    addNewPathToRoot,
  } = props

  const { layersCollapsed, setLayersCollapsed, selectedPathIndex, setSelectedPathIndex, hiddenPathIndexes } = useEditorStore(
    useShallow((s) => ({
      layersCollapsed: s.layersCollapsed,
      setLayersCollapsed: s.setLayersCollapsed,
      selectedPathIndex: s.selectedPathIndex,
      setSelectedPathIndex: s.setSelectedPathIndex,
      hiddenPathIndexes: s.hiddenPathIndexes,
    })),
  )

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Layers className="h-4 w-4 text-muted-foreground" />
            Layers
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setLayersCollapsed(!layersCollapsed)}
                  className="hidden md:inline-flex"
                >
                  <PanelRight />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{layersCollapsed ? 'Expand layers' : 'Collapse layers'}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" onClick={addNewPathToRoot}>
                  <Plus />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add new path</TooltipContent>
            </Tooltip>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button type="button" variant="secondary" onClick={() => addNewLayerGroup('layer')}>
            Add layer
          </Button>
          <Button type="button" variant="secondary" onClick={addNewPathToRoot}>
            Add path
          </Button>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="p-2">
          {pathListItems.length ? (
            <div className="space-y-1">
              {pathListItems.map((m) => {
                const active = m.index === selectedPathIndex
                const hidden = hiddenPathIndexes.includes(m.index) || m.hidden
                const displayName = m.dataLabel || m.id || m.label
                const displayNameShort = ellipsisText(displayName, 34)
                const stroke = m.stroke || (m.fill ? 'none' : '#111')
                const fill = m.fill || 'none'
                const viewBox = m.viewBox ?? { x: 0, y: 0, width: 1, height: 1 }
                return (
                  <ContextMenu key={m.index}>
                    <ContextMenuTrigger asChild>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedPathIndex(m.index)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setSelectedPathIndex(m.index)
                          }
                        }}
                        className={
                          active
                            ? 'flex w-full cursor-pointer items-center gap-2 rounded-md border bg-accent pl-3 pr-4 py-2 text-left outline-none'
                            : 'flex w-full cursor-pointer items-center gap-2 rounded-md pl-3 pr-4 py-2 text-left outline-none hover:bg-muted/60'
                        }
                      >
                        <div className="h-12 w-12 shrink-0 rounded border bg-background p-1">
                          <svg width={40} height={40} viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}>
                            <path d={m.d} fill={fill} stroke={stroke} strokeWidth={2} opacity={m.opacity || undefined} />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium" title={displayName}>
                            {displayNameShort}
                          </div>
                          <div className="mt-0.5 truncate text-xs text-muted-foreground">{hidden ? 'Hidden' : 'Visible'}</div>
                        </div>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="shrink-0 mr-2 pr-5"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setPathHidden(m.index, !hidden)
                              }}
                            >
                              {hidden ? <EyeOff /> : <Eye />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{hidden ? 'Show' : 'Hide'}</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="shrink-0"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                deletePathAtIndex(m.index)
                              }}
                            >
                              <X />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete path</TooltipContent>
                        </Tooltip>
                      </div>
                    </ContextMenuTrigger>

                    <ContextMenuContent>
                      <ContextMenuItem onSelect={() => openRenameDialog('path', m.index)}>Rename</ContextMenuItem>
                      <ContextMenuItem onSelect={() => setPathHidden(m.index, !hidden)}>{hidden ? 'Show' : 'Hide'}</ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem onSelect={() => movePathAtIndex(m.index, -1)}>Move path up</ContextMenuItem>
                      <ContextMenuItem onSelect={() => movePathAtIndex(m.index, 1)}>Move path down</ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem className="text-destructive focus:text-destructive" onSelect={() => deletePathAtIndex(m.index)}>
                        Delete path
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                )
              })}
            </div>
          ) : (
            <div className="p-3 text-sm text-muted-foreground">No paths found.</div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
