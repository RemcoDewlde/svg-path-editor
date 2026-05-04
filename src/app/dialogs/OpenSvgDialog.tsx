import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { FileUp } from 'lucide-react'

export type OpenSvgDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  sourceSvg: string
  onOpenFile: () => Promise<void>
  afterOpenHasSvg: () => boolean
}

export function OpenSvgDialog(props: OpenSvgDialogProps) {
  const { open, onOpenChange, sourceSvg, onOpenFile, afterOpenHasSvg } = props

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        // Prevent dismissing the prompt when nothing is loaded.
        if (!sourceSvg && !v) return
        onOpenChange(v)
      }}
    >
      <DialogContent className="max-w-[520px]" onPointerDownOutside={(e) => (!sourceSvg ? e.preventDefault() : undefined)}>
        <DialogHeader>
          <DialogTitle>Open SVG</DialogTitle>
          <DialogDescription>Select an SVG file to start editing.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">No SVG is currently loaded.</div>
          <Button
            type="button"
            onClick={async () => {
              await onOpenFile()
              // onOpenFile sets sourceSvg; the effect will close/allow close.
              if (afterOpenHasSvg()) onOpenChange(false)
            }}
          >
            <FileUp className="mr-2 h-4 w-4" />
            Open SVG…
          </Button>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (!sourceSvg) return
              onOpenChange(false)
            }}
            disabled={!sourceSvg}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
