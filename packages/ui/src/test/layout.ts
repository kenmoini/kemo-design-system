import { vi } from 'vitest'

/**
 * jsdom has no layout, so every element measures 0×0, and Zag's focus trap only focuses elements
 * with a box: a dialog's initial focus would fall back to the dialog itself. Gives every element
 * outside a `hidden` subtree a 1px width until the returned spy is restored.
 */
export function stubLayout() {
  return vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (
    this: HTMLElement,
  ) {
    return this.closest('[hidden]') ? 0 : 1
  })
}
