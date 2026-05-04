import { useMemo } from 'react'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'

import { PanelRight } from 'lucide-react'
import type { PathMeta } from '@/editor/types'
import { parsePath } from '@/editor/utils'
import { clampViewBox } from '@/app/canvas/viewBox'
import { useEditorStore } from '@/editor/store'
import { useShallow } from 'zustand/react/shallow'
import { LayersPanel } from '../panels/LayersPanel'

export function LayersSidebar(props: {
  pathMetas: PathMeta[]
  setPathHidden: (index: number, hidden: boolean) => void
  deletePathAtIndex: (index: number) => void
  movePathAtIndex: (index: number, direction: -1 | 1) => void
  openRenameDialog: (kind: 'path' | 'layer', index: number) => void
  addNewLayerGroup: (name: string) => void
  addNewPathToRoot: () => void
}) {
  const {
    pathMetas,
    setPathHidden,
    deletePathAtIndex,
    movePathAtIndex,
    openRenameDialog,
    addNewLayerGroup,
    addNewPathToRoot,
  } = props

  const pathListItems = useMemo(() => {
    return pathMetas.map((m) => {
      try {
        const cmds = parsePath(m.d)
        const pts = cmds.filter((c) => c.type !== 'Z') as Array<{ type: 'M' | 'L'; x: number; y: number }>
        if (!pts.length) return { ...m, viewBox: { x: 0, y: 0, width: 1, height: 1 } }
        const xs = pts.map((p) => p.x)
        const ys = pts.map((p) => p.y)
        const minX = Math.min(...xs)
        const minY = Math.min(...ys)
        const maxX = Math.max(...xs)
        const maxY = Math.max(...ys)
        const pad = 6
        const vb = clampViewBox({
          x: minX - pad,
          y: minY - pad,
          width: maxX - minX + pad * 2,
          height: maxY - minY + pad * 2,
        })
        return { ...m, viewBox: vb }
      } catch {
        return { ...m, viewBox: { x: 0, y: 0, width: 1, height: 1 } }
      }
    })
  }, [pathMetas])

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
    <aside className={layersCollapsed ? 'hidden w-[56px] shrink-0 border-l bg-background md:block' : 'hidden w-[340px] shrink-0 border-l bg-background md:block'}>
      {layersCollapsed ? (
        <div className="flex h-full flex-col">
          <div className="shrink-0 border-b p-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="w-full" onClick={() => setLayersCollapsed(false)}>
                  <PanelRight />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Expand layers</TooltipContent>
            </Tooltip>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="flex flex-col items-center gap-1 p-1">
              {pathListItems.map((m) => {
                const active = m.index === selectedPathIndex
                const hidden = hiddenPathIndexes.includes(m.index) || m.hidden
                const displayName = m.dataLabel || m.id || m.label
                const stroke = m.stroke || (m.fill ? 'none' : '#111')
                const fill = m.fill || 'none'
                const viewBox = m.viewBox ?? { x: 0, y: 0, width: 1, height: 1 }
                return (
                  <Tooltip key={m.index}>
                    <ContextMenu>
                      <ContextMenuTrigger asChild>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => setSelectedPathIndex(m.index)}
                            className={
                              active
                                ? 'flex h-12 w-12 items-center justify-center rounded-md border bg-accent'
                                : 'flex h-12 w-12 items-center justify-center rounded-md border border-transparent hover:bg-muted/60'
                            }
                          >
                            <div
                              className={
                                hidden
                                  ? 'h-full w-full rounded-md bg-background p-1 opacity-50'
                                  : 'h-full w-full rounded-md bg-background p-1'
                              }
                            >
                              <svg className="block h-full w-full" viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}>
                                <path
                                  d={m.d}
                                  fill={fill}
                                  stroke={stroke}
                                  strokeWidth={2}
                                  opacity={m.opacity || undefined}
                                  vectorEffect="non-scaling-stroke"
                                />
                              </svg>
                            </div>
                          </button>
                        </TooltipTrigger>
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

                    <TooltipContent>{displayName}</TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          </ScrollArea>
        </div>
      ) : (
        <LayersPanel
          pathListItems={pathListItems}
          setPathHidden={setPathHidden}
          deletePathAtIndex={deletePathAtIndex}
          movePathAtIndex={movePathAtIndex}
          openRenameDialog={openRenameDialog}
          addNewLayerGroup={addNewLayerGroup}
          addNewPathToRoot={addNewPathToRoot}
        />
      )}
    </aside>
  )
}
