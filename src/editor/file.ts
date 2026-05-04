export async function openSvgFile(): Promise<{
  handle: FileSystemFileHandle | null
  name: string
  text: string
}> {
  // Preferred: File System Access API
  if ('showOpenFilePicker' in window) {
    const picker = (window as Window & {
      showOpenFilePicker?: (options?: unknown) => Promise<FileSystemFileHandle[]>
    }).showOpenFilePicker

    if (!picker) {
      // Should be unreachable because of the feature check above.
      return { handle: null, name: '', text: '' }
    }

    const [handle] = await picker({
      multiple: false,
      types: [
        {
          description: 'SVG',
          accept: {
            'image/svg+xml': ['.svg'],
          },
        },
      ],
    })

    const file = await handle.getFile()
    const text = await file.text()
    return { handle, name: file.name || handle.name || '', text }
  }

  // Fallback: file input
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.svg,image/svg+xml'
  input.style.position = 'fixed'
  input.style.left = '-10000px'
  document.body.appendChild(input)

  const file = await new Promise<File | null>((resolve) => {
    input.addEventListener(
      'change',
      () => {
        resolve(input.files && input.files[0] ? input.files[0] : null)
      },
      { once: true },
    )
    input.click()
  })

  document.body.removeChild(input)
  if (!file) return { handle: null, name: '', text: '' }
  const text = await file.text()
  return { handle: null, name: file.name || '', text }
}

export async function saveSvgFile(params: {
  handle: FileSystemFileHandle | null
  suggestedName: string
  text: string
}): Promise<{ handle: FileSystemFileHandle | null; name: string }> {
  const { handle, suggestedName, text } = params

  // Preferred: File System Access API
  if (handle && 'createWritable' in handle) {
    const writable = await handle.createWritable()
    await writable.write(text)
    await writable.close()
    return { handle, name: handle.name || suggestedName }
  }

  if (!handle && 'showSaveFilePicker' in window) {
    const picker = (window as Window & {
      showSaveFilePicker?: (options?: unknown) => Promise<FileSystemFileHandle>
    }).showSaveFilePicker

    if (!picker) {
      // Should be unreachable because of the feature check above.
      return { handle: null, name: suggestedName || '' }
    }

    const nextHandle = await picker({
      suggestedName: suggestedName || 'edited.svg',
      types: [
        {
          description: 'SVG',
          accept: {
            'image/svg+xml': ['.svg'],
          },
        },
      ],
    })
    const writable = await nextHandle.createWritable()
    await writable.write(text)
    await writable.close()
    return { handle: nextHandle, name: nextHandle.name || suggestedName }
  }

  // Fallback: download
  const blob = new Blob([text], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = suggestedName || 'edited.svg'
  a.rel = 'noreferrer'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  return { handle: null, name: suggestedName || '' }
}
