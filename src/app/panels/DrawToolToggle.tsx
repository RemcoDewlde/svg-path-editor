import { Grip, Pencil, Square } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

type DrawTool = 'select' | 'pen' | 'rect'

type DrawToolToggleProps = {
  variant: 'panel' | 'collapsed'
  drawTool: DrawTool
  setDrawTool: (value: DrawTool) => void
  setPenDraftPoints: (value: Array<{ x: number; y: number }>) => void
  setRectDraft: (value: null | { start: { x: number; y: number }; current: { x: number; y: number } }) => void
  setStatus: (value: string) => void
  disabled?: boolean
}

export function DrawToolToggle(props: DrawToolToggleProps) {
  const { variant, drawTool, setDrawTool, setPenDraftPoints, setRectDraft, setStatus, disabled } = props

  const apply = (next: DrawTool) => {
    setDrawTool(next)
    // Clear drafts when switching.
    setPenDraftPoints([])
    setRectDraft(null)

    // Preserve current behavior: only the collapsed toolbar announces tool changes.
    if (variant === 'collapsed') {
      if (next === 'pen') setStatus('Pen: click to add points, Finish to commit.')
      if (next === 'rect') setStatus('Rect: drag to draw, release to commit.')
    }
  }

  if (variant === 'collapsed') {
    return (
      <>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant={drawTool === 'select' ? 'secondary' : 'ghost'}
              className="h-12 w-12"
              onClick={() => apply('select')}
              disabled={disabled}
            >
              <Grip className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Draw: select</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant={drawTool === 'pen' ? 'secondary' : 'ghost'}
              className="h-12 w-12"
              onClick={() => apply('pen')}
              disabled={disabled}
            >
              <Pencil className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Draw: pen</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant={drawTool === 'rect' ? 'secondary' : 'ghost'}
              className="h-12 w-12"
              onClick={() => apply('rect')}
              disabled={disabled}
            >
              <Square className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Draw: rect</TooltipContent>
        </Tooltip>
      </>
    )
  }

  return (
    <ToggleGroup
      type="single"
      value={drawTool}
      onValueChange={(v) => apply(((v || 'select') as DrawTool))}
      className="grid grid-cols-3 gap-1"
      disabled={disabled}
    >
      <ToggleGroupItem value="select" aria-label="Select">
        <Grip className="mr-2 h-4 w-4" />
        Sel
      </ToggleGroupItem>
      <ToggleGroupItem value="pen" aria-label="Pen">
        <Pencil className="mr-2 h-4 w-4" />
        Pen
      </ToggleGroupItem>
      <ToggleGroupItem value="rect" aria-label="Rectangle">
        <Square className="mr-2 h-4 w-4" />
        Rect
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
