import { createContext } from 'react'

export const THEMES = ['light', 'dark', 'system'] as const
export type Theme = (typeof THEMES)[number]
export type ResolvedTheme = Exclude<Theme, 'system'>

/** --q-color-canvas as hex, for the browser chrome painted around the page. */
export const THEME_COLORS: Record<ResolvedTheme, string> = {
  light: '#f3f1ee',
  dark: '#15120f',
}

export interface ThemeContextValue {
  /** The user's preference, which may defer to the operating system. */
  theme: Theme
  /** The theme actually on screen. */
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function isTheme(value: unknown): value is Theme {
  return THEMES.includes(value as Theme)
}
