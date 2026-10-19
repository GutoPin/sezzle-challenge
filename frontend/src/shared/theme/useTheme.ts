import { use } from 'react'

import { ThemeContext, type ThemeContextValue } from './ThemeContext'

export function useTheme(): ThemeContextValue {
  const context = use(ThemeContext)
  if (!context) throw new Error('useTheme must be used within a ThemeProvider')
  return context
}
