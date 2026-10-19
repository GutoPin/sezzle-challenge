import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import { i18n } from '@/i18n'

import { App } from './App'

describe('App', () => {
  afterEach(async () => {
    await act(() => i18n.changeLanguage('en'))
  })

  it('renders the page landmarks', async () => {
    render(<App />)

    const header = screen.getByRole('banner')
    expect(within(header).getByRole('link', { name: 'Quotient' })).toHaveAttribute('href', '/')
    expect(within(header).getByRole('link', { name: 'API docs' })).toHaveAttribute('href', '/docs')
    expect(within(header).getByRole('group', { name: 'Language' })).toBeInTheDocument()
    expect(within(header).getByRole('group', { name: 'Theme' })).toBeInTheDocument()

    const main = screen.getByRole('main')
    expect(main).toContainElement(
      screen.getByRole('heading', { level: 1, name: 'Arithmetic, worked out.' }),
    )
    expect(within(main).getByRole('region', { name: 'Calculator' })).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toHaveTextContent('Arithmetic, worked out by a Go API.')
    expect(
      await within(screen.getByRole('contentinfo')).findByText('API online'),
    ).toBeInTheDocument()
  })

  it('lets keyboard users skip the header', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.tab()

    const skip = screen.getByRole('link', { name: 'Skip to main content' })
    expect(skip).toHaveFocus()
    expect(skip).toHaveAttribute('href', '#main')
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
  })

  it('translates the shell when the language changes', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Español' }))

    expect(screen.getByRole('link', { name: 'Documentación de la API' })).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toHaveTextContent(
      'Aritmética resuelta por una API en Go.',
    )
  })
})
