import { vi } from 'vitest'

/**
 * Drives `prefers-color-scheme: dark` for the current test. Other media
 * queries never match.
 */
export function mockColorScheme(initial: 'light' | 'dark') {
  let prefersDark = initial === 'dark'
  const listeners = new Set<EventListener>()

  vi.spyOn(window, 'matchMedia').mockImplementation((media): MediaQueryList => ({
    media,
    get matches() {
      return media === '(prefers-color-scheme: dark)' && prefersDark
    },
    onchange: null,
    addEventListener: (_type: string, listener: EventListener) => listeners.add(listener),
    removeEventListener: (_type: string, listener: EventListener) => listeners.delete(listener),
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }))

  return {
    setColorScheme(scheme: 'light' | 'dark') {
      prefersDark = scheme === 'dark'
      for (const listener of listeners) listener(new Event('change'))
    },
    listenerCount: () => listeners.size,
  }
}
