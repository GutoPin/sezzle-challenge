import { act, screen, waitFor, within } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'

import { i18n } from '@/i18n'
import { renderWithProviders } from '@/test/render'
import { server } from '@/test/server'

import { HISTORY_STORAGE_KEY } from '../hooks/useHistory'
import { CalculatorWorkspace } from './CalculatorWorkspace'

function setup() {
  const view = renderWithProviders(<CalculatorWorkspace />)
  const keypad = screen.getByRole('group', { name: 'Keypad' })
  const press = async (...labels: string[]) => {
    for (const label of labels) {
      await view.user.click(within(keypad).getByRole('button', { name: label }))
    }
  }
  return { ...view, press }
}

function displayValue() {
  return screen.getByTestId('display-value').textContent
}

async function expectDisplay(value: string) {
  await waitFor(() => {
    expect(displayValue()).toBe(value)
  })
}

describe('CalculatorWorkspace', () => {
  afterEach(async () => {
    await act(() => i18n.changeLanguage('en'))
  })

  it('calculates through the API and shows the expression', async () => {
    const { press } = setup()

    await press('1', '2', 'Add', '3', 'Equals')

    await expectDisplay('15')
    expect(screen.getByLabelText('Display')).toHaveTextContent('12 + 3 =')
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent('Result: 15')
  })

  it('chains operations and highlights the pending operator', async () => {
    const { press } = setup()

    await press('2', 'Add')
    expect(screen.getByRole('button', { name: 'Add' })).toHaveAttribute('aria-pressed', 'true')

    await press('3', 'Multiply')
    await expectDisplay('5')
    expect(screen.getByLabelText('Display')).toHaveTextContent('5 ×')

    await press('4', 'Equals')
    await expectDisplay('20')
  })

  it('highlights power and percent like the other operators', async () => {
    const { press } = setup()

    await press('2', 'Raise to the power of')
    expect(screen.getByRole('button', { name: 'Raise to the power of' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await press('Percent of')
    expect(screen.getByRole('button', { name: 'Raise to the power of' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByRole('button', { name: 'Percent of' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('takes square roots and percentages', async () => {
    const { press } = setup()

    await press('8', '1', 'Square root')
    await expectDisplay('9')
    expect(screen.getByLabelText('Display')).toHaveTextContent('√81 =')

    await press('1', '5', 'Percent of', '2', '0', '0', 'Equals')
    await expectDisplay('30')
    expect(screen.getByLabelText('Display')).toHaveTextContent('15% of 200 =')
  })

  it('shows a translated error and lets the operand be corrected', async () => {
    const { press } = setup()

    await press('8', 'Divide', '0', 'Equals')

    expect(await screen.findByRole('alert')).toHaveTextContent('You can’t divide by zero.')
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()

    await press('Delete last digit', '2', 'Equals')
    await expectDisplay('4')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('offers a retry when the API cannot be reached', async () => {
    server.use(http.post('/api/v1/operations/:operation', () => HttpResponse.error()))
    const { press, user } = setup()

    await press('6', 'Multiply', '7', 'Equals')
    expect(await screen.findByRole('alert')).toHaveTextContent('Can’t reach the API')

    server.resetHandlers()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    await expectDisplay('42')
  })

  it('shows progress and ignores input while the API is working', async () => {
    server.use(
      http.post('/api/v1/operations/:operation', async () => {
        await delay(50)
        return HttpResponse.json({ operation: 'add', operands: [1, 1], result: 2 })
      }),
    )
    const { press } = setup()

    await press('1', 'Add', '1', 'Equals')
    expect(screen.getByLabelText('Display')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText('Calculating…')).toBeInTheDocument()

    await press('9')
    await expectDisplay('2')
  })

  it('limits how many digits can be typed', async () => {
    const { press } = setup()

    await press(...Array.from({ length: 17 }, () => '9'))

    expect(screen.getByRole('alert')).toHaveTextContent('Numbers can have up to 16 digits.')
    expect(displayValue()).toBe('9,999,999,999,999,999')
  })

  it('accepts input from the physical keyboard', async () => {
    const { user } = setup()

    await user.keyboard('9^2{Enter}')
    await expectDisplay('81')

    await user.keyboard('{Escape}')
    expect(displayValue()).toBe('0')
  })

  it('does not press "=" twice when Enter activates a focused key', async () => {
    const { user, press } = setup()

    await press('5', 'Add')
    screen.getByRole('button', { name: '2' }).focus()
    await user.keyboard('{Enter}')

    expect(displayValue()).toBe('2')
    expect(screen.getByLabelText('Display')).toHaveTextContent('5 +')
  })

  it('records results on the history tape and reuses them', async () => {
    const { press, user } = setup()

    await press('1', '0', 'Divide', '4', 'Equals')
    const tape = screen.getByRole('region', { name: 'History' })
    const entry = await within(tape).findByRole('button', { name: 'Use result 2.5' })
    expect(entry).toHaveTextContent('10 ÷ 4 =')
    expect(JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) ?? '[]')).toHaveLength(1)

    await press('Clear', '2', 'Multiply')
    await user.click(entry)
    await press('Equals')
    await expectDisplay('5')

    await user.click(within(tape).getByRole('button', { name: 'Clear history' }))
    expect(within(tape).getByText('Your calculations will appear here.')).toBeInTheDocument()
  })

  it('formats numbers for the selected language', async () => {
    const { press } = setup()
    await act(() => i18n.changeLanguage('es'))

    await press('1', 'Separador decimal', '5', 'Multiplicar', '1', '0', '0', '0', 'Igual')

    await expectDisplay('1500')
    expect(screen.getByLabelText('Pantalla')).toHaveTextContent('1,5 × 1000 =')
  })
})
