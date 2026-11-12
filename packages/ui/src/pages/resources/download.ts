/**
 * Saves `text` as a YAML file named `fileName`: a temporary link to an object URL, clicked, then
 * removed (the URL is revoked once the download has started). Does nothing on the server.
 */
export function downloadText(fileName: string, text: string): void {
  if (typeof document === 'undefined') return
  const url = URL.createObjectURL(new Blob([text], { type: 'text/yaml' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.hidden = true
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  // Revoking in the same task can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
