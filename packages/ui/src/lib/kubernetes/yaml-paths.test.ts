import { describe, expect, it } from 'vitest'
import { offsetForPath, pathAtOffset } from './yaml-paths'

const text = `spec:
  template:
    spec:
      containers:
        - name: web
          image: web:1.0
`

describe('pathAtOffset', () => {
  it('finds a value in a sequence item', () => {
    expect(pathAtOffset(text, text.indexOf('web:1.0') + 2)).toEqual([
      'spec',
      'template',
      'spec',
      'containers',
      0,
      'image',
    ])
  })

  it('finds a key', () => {
    expect(pathAtOffset(text, text.indexOf('template') + 1)).toEqual(['spec', 'template'])
  })
})

describe('offsetForPath', () => {
  it('returns the key offset', () => {
    expect(offsetForPath(text, ['spec', 'template', 'spec', 'containers', 0, 'image'])).toBe(
      text.indexOf('image:'),
    )
    expect(offsetForPath(text, ['spec', 'template'])).toBe(text.indexOf('template'))
  })

  it('is undefined for a missing path', () => {
    expect(offsetForPath(text, ['spec', 'nope'])).toBeUndefined()
  })
})
