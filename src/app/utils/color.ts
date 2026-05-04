function isHexColor(value: string) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim())
}

function rgbToHex(rgb: string) {
  const m = rgb
    .trim()
    .match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([\d.]+))?\s*\)$/i)
  if (!m) return null
  const r = Math.max(0, Math.min(255, Number(m[1])))
  const g = Math.max(0, Math.min(255, Number(m[2])))
  const b = Math.max(0, Math.min(255, Number(m[3])))
  if (![r, g, b].every((n) => Number.isFinite(n))) return null
  const toHex = (n: number) => n.toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function normalizeCssColorToHex(value: string) {
  const v = value.trim()
  if (!v) return null
  if (isHexColor(v)) {
    if (v.length === 4) {
      const r = v[1]
      const g = v[2]
      const b = v[3]
      return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
    }
    return v.toLowerCase()
  }

  // Browser parsing for named/rgb/hsl/etc.
  const s = new Option().style
  s.color = v
  if (!s.color) return null
  return rgbToHex(s.color)
}

export function normalizeHex6(input: string) {
  const v = input.trim().toLowerCase()
  if (!v.startsWith('#')) return null
  const hex = v.slice(1)
  if (/^[0-9a-f]{6}$/.test(hex)) return `#${hex}`
  if (/^[0-9a-f]{3}$/.test(hex)) return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`
  return null
}
