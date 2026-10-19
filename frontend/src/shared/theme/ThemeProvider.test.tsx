import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { mockColorScheme } from '@/test/matchMedia'

import { THEME_COLORS } from './ThemeContext'
import { THEME_STORAGE_KEY, ThemeProvider } from './ThemeProvider'
import { useTheme } from './useTheme'

function renderTheme() {
  return renderHook(() => useTheme(), { wrapper: ThemeProvider })
}

const appliedTheme = () => document.documentElement.dataset.theme

describe('ThemeProvider', () => {
  afterEach(() => {
    delete document.documentElement.dataset.theme
  })

  it('follows the system theme by default', () => {
    mockColorScheme('dark')

    const { result } = renderTheme()

    expect(result.current.theme).toBe('system')
    expect(result.current.resolvedTheme).toBe('dark')
    expect(appliedTheme()).toBe('dark')
  })

  it('tracks system changes while set to system', () => {
    const media = mockColorScheme('light')
    const { result } = renderTheme()

    act(() => {
      media.setColorScheme('dark')
    })

    expect(result.current.resolvedTheme).toBe('dark')
    expect(appliedTheme()).toBe('dark')
  })

  it('ignores system changes once the user picks a theme', () => {
    const media = mockColorScheme('light')
    const { result } = renderTheme()

    act(() => {
      result.current.setTheme('light')
      media.setColorScheme('dark')
    })

    expect(result.current.resolvedTheme).toBe('light')
    expect(appliedTheme()).toBe('light')
  })

  it('applies and persists the chosen theme', () => {
    mockColorScheme('light')
    const { result } = renderTheme()

    act(() => {
      result.current.setTheme('dark')
    })

    expect(result.current.theme).toBe('dark')
    expect(appliedTheme()).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  })

  it('restores a stored preference', () => {
    mockColorScheme('light')
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')

    const { result } = renderTheme()

    expect(result.current.theme).toBe('dark')
    expect(appliedTheme()).toBe('dark')
  })

  it('falls back to system when the stored value is not a theme', () => {
    mockColorScheme('light')
    localStorage.setItem(THEME_STORAGE_KEY, 'sepia')

    const { result } = renderTheme()

    expect(result.current.theme).toBe('system')
    expect(result.current.resolvedTheme).toBe('light')
  })

  it('paints the browser chrome in the chosen theme', () => {
    mockColorScheme('light')
    const metas = (['light', 'dark'] as const).map((scheme) => {
      const meta = document.createElement('meta')
      meta.name = 'theme-color'
      meta.media = `(prefers-color-scheme: ${scheme})`
      document.head.append(meta)
      return meta
    })
    const { result } = renderTheme()

    act(() => {
      result.current.setTheme('dark')
    })

    for (const meta of metas) {
      expect(meta.content).toBe(THEME_COLORS.dark)
      meta.remove()
    }
  })

  it('stops listening to the system on unmount', () => {
    const media = mockColorScheme('light')
    const { unmount } = renderTheme()

    unmount()

    expect(media.listenerCount()).toBe(0)
  })
})

describe('useTheme', () => {
  it('throws outside a ThemeProvider', () => {
    expect(() => renderHook(() => useTheme())).toThrow(/ThemeProvider/)
  })
})
