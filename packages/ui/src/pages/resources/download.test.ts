import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadText } from './download'

describe('downloadText', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    // jsdom has neither; the test adds them.
    delete (URL as { createObjectURL?: unknown }).createObjectURL
    delete (URL as { revokeObjectURL?: unknown }).revokeObjectURL
  })

  it('clicks a temporary link to an object URL of the text, then revokes the URL', async () => {
    const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:demo')
    const revokeObjectURL = vi.fn()
    Object.assign(URL, { createObjectURL, revokeObjectURL })
    const clicked: { download: string; href: string; connected: boolean }[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push({ download: this.download, href: this.href, connected: this.isConnected })
    })

    downloadText('demo.yaml', 'kind: Widget\n')

    expect(clicked).toEqual([{ download: 'demo.yaml', href: 'blob:demo', connected: true }])
    const blob = createObjectURL.mock.calls[0]![0]
    expect(blob.type).toBe('text/yaml')
    expect(await blob.text()).toBe('kind: Widget\n')
    expect(document.querySelector('a[download]')).toBeNull()
    await vi.waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith('blob:demo'))
  })
})
