import { ScrollArea } from '../../components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip'
import { Button } from '../../components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '../../components/ui/context-menu'

import { PanelRight } from 'lucide-react'
import { LayersPanel, type LayersPanelPathItem } from '../panels/LayersPanel'

export function LayersSidebar(props: {
  layersCollapsed: boolean
  setLayersCollapsed: (v: boolean) => void
  pathListItems: LayersPanelPathItem[]
  selectedPathIndex: number
  hiddenPathIndexes: number[]
  setSelectedPathIndex: (index: number) => void
  setPathHidden: (index: number, hidden: boolean) => void
  deletePathAtIndex: (index: number) => void
  movePathAtIndex: (index: number, direction: -1 | 1) => void
  openRenameDialog: (kind: 'path' | 'layer', index: number) => void
  addNewLayerGroup: (name: string) => void
  addNewPathToRoot: () => void
}) {
  const {
    layersCollapsed,
    setLayersCollapsed,
    pathListItems,
    selectedPathIndex,
    hiddenPathIndexes,
    setSelectedPathIndex,
    setPathHidden,
    deletePathAtIndex,
    movePathAtIndex,
    openRenameDialog,
    addNewLayerGroup,
    addNewPathToRoot,
  } = props

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
                              <svg
                                className="block h-full w-full"
                                viewBox={`${m.viewBox.x} ${m.viewBox.y} ${m.viewBox.width} ${m.viewBox.height}`}
                              >
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
          selectedPathIndex={selectedPathIndex}
          hiddenPathIndexes={hiddenPathIndexes}
          layersCollapsed={layersCollapsed}
          setLayersCollapsed={setLayersCollapsed}
          setSelectedPathIndex={setSelectedPathIndex}
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
