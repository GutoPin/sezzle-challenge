import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/test/render'

import { ThemeToggle } from './ThemeToggle'

describe('ThemeToggle', () => {
  afterEach(() => {
    delete document.documentElement.dataset.theme
  })

  it('offers light, dark and system themes, starting on system', () => {
    renderWithProviders(<ThemeToggle />)

    const group = screen.getByRole('group', { name: 'Theme' })
    expect(group).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Light theme' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByRole('button', { name: 'Dark theme' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByRole('button', { name: 'Match system theme' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('applies the chosen theme', async () => {
    const { user } = renderWithProviders(<ThemeToggle />)

    await user.click(screen.getByRole('button', { name: 'Dark theme' }))

    expect(screen.getByRole('button', { name: 'Dark theme' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Match system theme' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('can be operated from the keyboard', async () => {
    const { user } = renderWithProviders(<ThemeToggle />)

    await user.tab()
    expect(screen.getByRole('button', { name: 'Light theme' })).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(document.documentElement.dataset.theme).toBe('light')
  })
})
