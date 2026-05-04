export function moveElementWithinParent(el: Element, direction: -1 | 1) {
  const parent = el.parentElement
  if (!parent) return false
  const siblings = Array.from(parent.children)
  const idx = siblings.indexOf(el)
  if (idx < 0) return false
  const nextIdx = idx + direction
  if (nextIdx < 0 || nextIdx >= siblings.length) return false
  const anchor = direction === -1 ? siblings[nextIdx] : siblings[nextIdx].nextSibling
  parent.insertBefore(el, anchor)
  return true
}
