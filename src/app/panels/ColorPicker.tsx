import React from 'react'

import { HexColorPicker } from 'react-colorful'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { normalizeCssColorToHex, normalizeHex6 } from '../utils/color'

type ColorPickerPopoverProps = {
  value: string
  onChange: (hex: string) => void
  title: string
  fallbackColor?: string
  buttonClassName?: string
  disabled?: boolean
}

export function ColorPickerPopover(props: ColorPickerPopoverProps) {
  const { value, onChange, title, fallbackColor, buttonClassName, disabled } = props
  const normalized = normalizeHex6(value) || normalizeCssColorToHex(value)
  const fallback = normalizeHex6(fallbackColor ?? '')
  const parsed = normalized || fallback || '#000000'
  const displayValue = normalized || fallback || ''
  return (
    <Popover>
      <PopoverTrigger asChild>
        <ColorSwatchButton color={parsed} title={title} className={buttonClassName} disabled={disabled} />
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <div className="space-y-3">
          <HexColorPicker color={parsed} onChange={(hex) => onChange(hex)} />
          <div className="space-y-1">
            <Label>Value</Label>
            <Input value={displayValue} onChange={(e) => onChange(e.target.value)} placeholder="#RRGGBB" />
            <div className="text-xs text-muted-foreground">Hex only. Example: `#ff00aa`</div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

const ColorSwatchButton = React.forwardRef<
  HTMLButtonElement,
  { color: string; title: string } & Omit<React.ComponentPropsWithoutRef<typeof Button>, 'title'>
>(function ColorSwatchButton(props, ref) {
  const { color, title, className, ...rest } = props
  return (
    <Button
      ref={ref}
      type="button"
      variant="outline"
      className={cn('h-9 w-12 p-0', className)}
      title={title}
      {...rest}
    >
      <span className="h-full w-full rounded-[calc(var(--radius)-2px)]" style={{ background: color }} />
    </Button>
  )
})
