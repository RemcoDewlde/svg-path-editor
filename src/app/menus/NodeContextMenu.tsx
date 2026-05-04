import type * as React from 'react'

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'

import {
  flipBothTransformer,
  mirrorHorizontalTransformer,
  mirrorVerticalTransformer,
  rotateTransformer,
  type Bounds,
} from '@/editor/utils'

import { useEditorStore } from '@/editor/store'

export function NodeContextMenu({
  index,
  disableSelectNode,
  onSelectOnlyPoint,
  onTogglePointSelection,
  onSelectRangeToIndex,
  onOpenPointEditor,
  onCopySelectedSection,
  onPasteSectionAfterSelected,
  onExtractSelectionToNewPath,
  onTransformSelectedNodes,
  onDeleteSelectedPoints,
  children,
}: {
  index: number
  disableSelectNode: boolean
  onSelectOnlyPoint: (index: number) => void
  onTogglePointSelection: (index: number) => void
  onSelectRangeToIndex: (index: number) => void
  onOpenPointEditor: (index: number) => void
  onCopySelectedSection: () => void
  onPasteSectionAfterSelected: () => void
  onExtractSelectionToNewPath: (opts: { ownLayer: boolean }) => void
  onTransformSelectedNodes: (
    transformer: (x: number, y: number, bounds: Bounds) => { x: number; y: number },
    label: string,
  ) => void
  onDeleteSelectedPoints: () => void
  children: React.ReactElement
}) {
  const selectedIndices = useEditorStore((s) => s.selectedIndices)
  const clipboardPath = useEditorStore((s) => s.clipboardPath)
  const clipboardCommandsLength = useEditorStore((s) => s.clipboardCommands.length)
  const hasSelection = selectedIndices.length > 0
  const canPaste = Boolean(clipboardPath) || clipboardCommandsLength > 0

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem disabled={disableSelectNode} onSelect={() => onSelectOnlyPoint(index)}>
          Select node
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => onTogglePointSelection(index)}>Toggle selection</ContextMenuItem>
        <ContextMenuItem onSelect={() => onSelectRangeToIndex(index)}>Select subpath</ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem
          onSelect={() => {
            onSelectOnlyPoint(index)
            onOpenPointEditor(index)
          }}
        >
          Edit point…
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem disabled={!hasSelection} onSelect={onCopySelectedSection}>
          Copy nodes
        </ContextMenuItem>
        <ContextMenuItem disabled={!canPaste} onSelect={onPasteSectionAfterSelected}>
          Paste
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem disabled={!hasSelection} onSelect={() => onExtractSelectionToNewPath({ ownLayer: true })}>
          Extract selection to own layer
        </ContextMenuItem>
        <ContextMenuItem disabled={!hasSelection} onSelect={() => onExtractSelectionToNewPath({ ownLayer: false })}>
          Extract selection to new path
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem onSelect={() => onTransformSelectedNodes(mirrorHorizontalTransformer, 'Horizontal mirror')}>
          Mirror X
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => onTransformSelectedNodes(mirrorVerticalTransformer, 'Vertical mirror')}>
          Mirror Y
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => onTransformSelectedNodes(rotateTransformer(-90), 'Rotate -90 deg')}>
          Rotate -90
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => onTransformSelectedNodes(rotateTransformer(90), 'Rotate 90 deg')}>
          Rotate +90
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => onTransformSelectedNodes(flipBothTransformer, 'Flip 180 deg')}>
          Flip 180
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem
          disabled={!hasSelection}
          className="text-destructive focus:text-destructive"
          onSelect={onDeleteSelectedPoints}
        >
          Delete node(s)
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
