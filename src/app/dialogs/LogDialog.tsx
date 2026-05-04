import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog'

export type LogDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  logLines: string[]
  onClear: () => void
}

export function LogDialog(props: LogDialogProps) {
  const { open, onOpenChange, logLines, onClear } = props

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[900px]">
        <DialogHeader>
          <DialogTitle>Log</DialogTitle>
          <DialogDescription>Recent editor status messages.</DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-auto rounded-md border bg-muted/20 p-3">
          {logLines.length ? (
            <div className="space-y-1">
              {logLines
                .slice()
                .reverse()
                .map((l, i) => (
                  <div key={i} className="whitespace-pre-wrap break-words text-xs text-muted-foreground">
                    {l}
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No log entries yet.</div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClear} disabled={!logLines.length}>
            Clear
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
