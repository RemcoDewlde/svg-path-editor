import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

import {
  FileDown,
  FilePenLine,
  FileUp,
  Grid3X3,
  Grip,
  LayoutPanelLeft,
  Magnet,
  MousePointer2,
  PanelRight,
  Redo2,
  Settings,
  Undo2,
} from 'lucide-react'

import type { PathMeta } from '@/editor/types'
import { useEditorStore } from '@/editor/store'
import { useShallow } from 'zustand/react/shallow'
import { LayersSidebar } from '@/app/sidebars/LayersSidebar'

export function TopBar(props: {
  dirty: boolean
  onUndo: () => void
  onRedo: () => void

  onOpenSettings: () => void
  onOpenFile: () => void
  onSaveFile: (forceSaveAs: boolean) => void

  inspector: ReactNode

  pathMetas: PathMeta[]
  setPathHidden: (index: number, hidden: boolean) => void
  deletePathAtIndex: (index: number) => void
  movePathAtIndex: (index: number, direction: -1 | 1) => void
  openRenameDialog: (kind: 'path' | 'layer', index: number) => void
  addNewLayerGroup: (name: string) => void
  addNewPathToRoot: () => void
}) {
  const {
    dirty,
    onUndo,
    onRedo,
    onOpenSettings,
    onOpenFile,
    onSaveFile,
    inspector,
    pathMetas,
    setPathHidden,
    deletePathAtIndex,
    movePathAtIndex,
    openRenameDialog,
    addNewLayerGroup,
    addNewPathToRoot,
  } = props

  const {
    fileName,
    sourceSvgPresent,
    fileHandlePresent,
    undoCount,
    redoCount,
    selectionToolActive,
    setSelectionToolActive,
    gridVisible,
    setGridVisible,
    nodesVisible,
    setNodesVisible,
    snapToGrid,
    setSnapToGrid,
    autoSaveEnabled,
    setAutoSaveEnabled,
    setStatus,
  } = useEditorStore(
    useShallow((s) => ({
      fileName: s.fileName,
      sourceSvgPresent: Boolean(s.sourceSvg),
      fileHandlePresent: Boolean(s.fileHandle),
      undoCount: s.undoStack.length,
      redoCount: s.redoStack.length,
      selectionToolActive: s.selectionToolActive,
      setSelectionToolActive: s.setSelectionToolActive,
      gridVisible: s.gridVisible,
      setGridVisible: s.setGridVisible,
      nodesVisible: s.nodesVisible,
      setNodesVisible: s.setNodesVisible,
      snapToGrid: s.snapToGrid,
      setSnapToGrid: s.setSnapToGrid,
      autoSaveEnabled: s.autoSaveEnabled,
      setAutoSaveEnabled: s.setAutoSaveEnabled,
      setStatus: s.setStatus,
    })),
  )

  return (
    <header className="shrink-0 border-b bg-background shadow-sm">
      <div className="flex min-h-12 flex-wrap items-center gap-2 px-3 py-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">SVG Path Editor</div>
          <div className="truncate text-xs text-muted-foreground">
            {fileName || 'untitled.svg'}
            {dirty ? ' (modified)' : ''}
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" onClick={onUndo} disabled={!undoCount}>
                <Undo2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" onClick={onRedo} disabled={!redoCount}>
                <Redo2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redo</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="mx-1 h-6" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant={selectionToolActive ? 'secondary' : 'ghost'}
                onClick={() => setSelectionToolActive(!selectionToolActive)}
              >
                <MousePointer2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Box select</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant={gridVisible ? 'secondary' : 'ghost'} onClick={() => setGridVisible(!gridVisible)}>
                <Grid3X3 />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Grid</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant={nodesVisible ? 'secondary' : 'ghost'} onClick={() => setNodesVisible(!nodesVisible)}>
                <Grip />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{nodesVisible ? 'Hide nodes' : 'Show nodes'}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant={snapToGrid ? 'secondary' : 'ghost'} onClick={() => setSnapToGrid(!snapToGrid)}>
                <Magnet />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Snap</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" onClick={onOpenSettings}>
                <Settings />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Settings</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="mx-1 h-6" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" onClick={onOpenFile}>
                <FileUp />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" onClick={() => onSaveFile(false)} disabled={!sourceSvgPresent}>
                <FileDown />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Save</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" onClick={() => onSaveFile(true)} disabled={!sourceSvgPresent}>
                <FilePenLine />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Save As</TooltipContent>
          </Tooltip>

          <div className="hidden items-center gap-2 rounded-md border bg-muted/30 px-3 py-1 md:flex">
            <span className="text-xs text-muted-foreground">Auto-save</span>
            <Switch
              checked={autoSaveEnabled}
              onCheckedChange={(v) => {
                if (v && !fileHandlePresent) {
                  setStatus('Open a file first to enable auto-save.')
                  return
                }
                setAutoSaveEnabled(v)
              }}
            />
          </div>

          <Sheet>
            <Tooltip>
              <TooltipTrigger asChild>
                <SheetTrigger asChild>
                  <Button size="icon" variant="ghost" className="md:hidden">
                    <LayoutPanelLeft />
                  </Button>
                </SheetTrigger>
              </TooltipTrigger>
              <TooltipContent>Inspector</TooltipContent>
            </Tooltip>
            <SheetContent side="left" className="p-0">
              <SheetHeader className="p-4">
                <SheetTitle>Inspector</SheetTitle>
              </SheetHeader>
              {inspector}
            </SheetContent>
          </Sheet>

          <Sheet>
            <Tooltip>
              <TooltipTrigger asChild>
                <SheetTrigger asChild>
                  <Button size="icon" variant="ghost" className="md:hidden">
                    <PanelRight />
                  </Button>
                </SheetTrigger>
              </TooltipTrigger>
              <TooltipContent>Layers</TooltipContent>
            </Tooltip>
            <SheetContent side="right" className="p-0">
              <SheetHeader className="p-4">
                <SheetTitle>Layers</SheetTitle>
              </SheetHeader>
              <LayersSidebar
                pathMetas={pathMetas}
                setPathHidden={setPathHidden}
                deletePathAtIndex={deletePathAtIndex}
                movePathAtIndex={movePathAtIndex}
                openRenameDialog={openRenameDialog}
                addNewLayerGroup={addNewLayerGroup}
                addNewPathToRoot={addNewPathToRoot}
              />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
