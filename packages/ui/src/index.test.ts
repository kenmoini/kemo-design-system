import { describe, expect, it } from 'vitest'
import * as ui from './index'

describe('package index', () => {
  it('re-exports createListCollection and Portal, so consumers build a Select without Ark', () => {
    expect(typeof ui.createListCollection).toBe('function')
    const collection = ui.createListCollection({ items: [{ value: 'a', label: 'A' }] })
    expect(collection.items).toHaveLength(1)
    expect(typeof ui.Portal).toBe('function')
  })
})
