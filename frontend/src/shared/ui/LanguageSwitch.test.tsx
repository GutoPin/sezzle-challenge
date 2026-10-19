import { act, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { i18n } from '@/i18n'
import { renderWithProviders } from '@/test/render'

import { LanguageSwitch } from './LanguageSwitch'

describe('LanguageSwitch', () => {
  afterEach(async () => {
    await act(() => i18n.changeLanguage('en'))
  })

  it('marks the active language as pressed', () => {
    renderWithProviders(<LanguageSwitch />)

    expect(screen.getByRole('group', { name: 'Language' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Español' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('names each language in that language', () => {
    renderWithProviders(<LanguageSwitch />)

    expect(screen.getByRole('button', { name: 'Español' })).toHaveAttribute('lang', 'es')
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('lang', 'en')
  })

  it('switches the interface language', async () => {
    const { user } = renderWithProviders(<LanguageSwitch />)

    await user.click(screen.getByRole('button', { name: 'Español' }))

    expect(screen.getByRole('group', { name: 'Idioma' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Español' })).toHaveAttribute('aria-pressed', 'true')
    expect(document.documentElement.lang).toBe('es')
  })
})
