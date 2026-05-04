import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import type { RenameTarget } from '@/editor/types'

export type RenameDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  target: RenameTarget
  draft: string
  setDraft: (value: string) => void
  onApply: () => void
}

export function RenameDialog(props: RenameDialogProps) {
  const { open, onOpenChange, target, draft, setDraft, onApply } = props

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{target?.kind === 'layer' ? 'Rename Layer' : 'Rename Path'}</DialogTitle>
          <DialogDescription>
            {target?.kind === 'layer' ? 'Updates the closest parent <g id="...">.' : 'Updates data-label on the selected path.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label>New name</Label>
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onApply()
              }
            }}
            placeholder={target?.kind === 'layer' ? 'layer-id' : 'path label'}
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={onApply}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
