import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'

import { readStorage, writeStorage } from '@/shared/lib/storage'

import { isTheme, THEME_COLORS, ThemeContext, type ResolvedTheme, type Theme } from './ThemeContext'

export const THEME_STORAGE_KEY = 'quotient:theme'

const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)'

function subscribeToSystemTheme(onChange: () => void) {
  const query = window.matchMedia(DARK_SCHEME_QUERY)
  query.addEventListener('change', onChange)
  return () => {
    query.removeEventListener('change', onChange)
  }
}

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia(DARK_SCHEME_QUERY).matches ? 'dark' : 'light'
}

function readStoredTheme(): Theme {
  const stored = readStorage(THEME_STORAGE_KEY)
  return isTheme(stored) ? stored : 'system'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState(readStoredTheme)
  const systemTheme = useSyncExternalStore(subscribeToSystemTheme, getSystemTheme)
  const resolvedTheme = theme === 'system' ? systemTheme : theme

  // A layout effect applies the attribute before paint, so switching never
  // flashes the previous palette.
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme
    // index.html matches the bar to the OS theme; a theme picked here must win.
    for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
      meta.content = THEME_COLORS[resolvedTheme]
    }
  }, [resolvedTheme])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    writeStorage(THEME_STORAGE_KEY, next)
  }, [])

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  )

  return <ThemeContext value={value}>{children}</ThemeContext>
}
