export function ellipsisText(value: string, maxChars: number) {
  const s = String(value ?? '')
  if (!Number.isFinite(maxChars) || maxChars <= 0) return ''
  if (s.length <= maxChars) return s
  if (maxChars <= 3) return '.'.repeat(maxChars)
  return `${s.slice(0, maxChars - 3)}...`
}
