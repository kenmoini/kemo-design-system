const matches = new Map<string, boolean>()

export function setMediaMatches(query: string, value: boolean): void {
  matches.set(query, value)
}

export function resetMedia(): void {
  matches.clear()
}

export function matchMediaStub(query: string): MediaQueryList {
  return {
    matches: matches.get(query) ?? false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }
}
