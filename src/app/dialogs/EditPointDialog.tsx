import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'

export type EditPointDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  x: string
  y: string
  setX: (value: string) => void
  setY: (value: string) => void
  onApply: () => void
  canApply: boolean
}

export function EditPointDialog(props: EditPointDialogProps) {
  const { open, onOpenChange, x, y, setX, setY, onApply, canApply } = props

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (!v) {
          setX('')
          setY('')
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Point</DialogTitle>
          <DialogDescription>Edits the selected node position (snaps if enabled).</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label>X / Y</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input type="number" step={0.5} placeholder="x" value={x} onChange={(e) => setX(e.target.value)} />
            <Input type="number" step={0.5} placeholder="y" value={y} onChange={(e) => setY(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={onApply} disabled={!canApply}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
