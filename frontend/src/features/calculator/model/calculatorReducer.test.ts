import { describe, expect, it } from 'vitest'

import {
  type CalculatorAction,
  calculatorReducer,
  type CalculatorState,
  initialState,
} from './calculatorReducer'
import { MAX_DIGITS } from './entry'

function run(actions: CalculatorAction[], from: CalculatorState = initialState): CalculatorState {
  return actions.reduce(calculatorReducer, from)
}

function type(text: string): CalculatorAction[] {
  return Array.from(text, (char): CalculatorAction =>
    char === '.' ? { type: 'decimal' } : { type: 'digit', digit: char },
  )
}

/** Answers the in-flight request the way the API would. */
function answer(state: CalculatorState, result: number): CalculatorState {
  if (!state.request) throw new Error('no request in flight')
  return calculatorReducer(state, { type: 'resolved', id: state.request.id, result })
}

const add: CalculatorAction = { type: 'operator', operator: 'add' }
const multiply: CalculatorAction = { type: 'operator', operator: 'multiply' }
const equals: CalculatorAction = { type: 'equals' }

describe('calculatorReducer', () => {
  describe('typing', () => {
    it('builds the entry from digits and one decimal point', () => {
      expect(run(type('012.5.0')).entry).toBe('12.50')
    })

    it('flags input beyond the digit limit without changing the entry', () => {
      const full = run(type('9'.repeat(MAX_DIGITS)))
      const state = calculatorReducer(full, { type: 'digit', digit: '1' })

      expect(state.entry).toBe(full.entry)
      expect(state.error).toBe('max_digits')
    })

    it('deletes the last character and toggles the sign', () => {
      expect(run([...type('123'), { type: 'backspace' }]).entry).toBe('12')
      expect(run([...type('5'), { type: 'toggleSign' }]).entry).toBe('-5')
    })

    it('clears everything, keeping request ids unique', () => {
      const busy = run([...type('2'), add, ...type('3'), equals])
      const cleared = calculatorReducer(busy, { type: 'clear' })

      expect(cleared).toEqual({ ...initialState, nextRequestId: busy.nextRequestId })
    })
  })

  describe('binary operations', () => {
    it('requests the calculation on equals and shows the result', () => {
      const pending = run([
        ...type('10'),
        { type: 'operator', operator: 'divide' },
        ...type('4'),
        equals,
      ])

      expect(pending.request).toMatchObject({ operation: 'divide', operands: [10, 4], then: null })

      const done = answer(pending, 2.5)
      expect(done).toMatchObject({ entry: '2.5', fresh: true, stored: null, operator: null })
      expect(done.request).toBeNull()
      expect(done.last).toEqual({ operation: 'divide', operands: [10, 4], result: 2.5 })
    })

    it('ignores equals when no operator is pending', () => {
      const state = run(type('7'))
      expect(calculatorReducer(state, equals)).toEqual(state)
    })

    it('replaces the operator when two are pressed in a row', () => {
      const state = run([...type('6'), add, multiply])
      expect(state).toMatchObject({ stored: 6, operator: 'multiply', request: null })
    })

    it('uses the shown value as the second operand when none was typed', () => {
      const state = run([...type('5'), multiply, equals])
      expect(state.request?.operands).toEqual([5, 5])
    })

    it('chains operations through the API', () => {
      const pending = run([...type('2'), add, ...type('3'), multiply])
      expect(pending.request).toMatchObject({
        operation: 'add',
        operands: [2, 3],
        then: 'multiply',
      })

      const chained = answer(pending, 5)
      expect(chained).toMatchObject({ stored: 5, operator: 'multiply', entry: '5', fresh: true })

      const done = answer(run([...type('4'), equals], chained), 20)
      expect(done.entry).toBe('20')
    })

    it('starts a new calculation when typing over a result', () => {
      const done = answer(run([...type('1'), add, ...type('1'), equals]), 2)
      const next = calculatorReducer(done, { type: 'digit', digit: '9' })

      expect(next).toMatchObject({ entry: '9', last: null, fresh: false })
    })

    it('continues from a result when an operator is pressed', () => {
      const done = answer(run([...type('1'), add, ...type('1'), equals]), 2)
      expect(calculatorReducer(done, add)).toMatchObject({ stored: 2, operator: 'add' })
    })

    it('starts a negative second operand with ± after an operator', () => {
      const state = run([...type('8'), add, { type: 'toggleSign' }, ...type('3')])
      expect(state.entry).toBe('-3')
    })
  })

  describe('square root', () => {
    it('replaces the entry and records the calculation', () => {
      const done = answer(run([...type('16'), { type: 'sqrt' }]), 4)
      expect(done).toMatchObject({ entry: '4', fresh: true })
      expect(done.last).toEqual({ operation: 'sqrt', operands: [16], result: 4 })
    })

    it('works on the second operand without losing the pending operator', () => {
      const done = answer(run([...type('9'), add, ...type('16'), { type: 'sqrt' }]), 4)
      expect(done).toMatchObject({ stored: 9, operator: 'add', entry: '4', last: null })
      expect(calculatorReducer(done, equals).request?.operands).toEqual([9, 4])
    })
  })

  describe('while a request is in flight', () => {
    const pending = run([...type('1'), add, ...type('2'), equals])

    it('ignores input', () => {
      expect(calculatorReducer(pending, { type: 'digit', digit: '5' })).toBe(pending)
      expect(calculatorReducer(pending, add)).toBe(pending)
    })

    it('ignores answers to other requests', () => {
      const stale = calculatorReducer(pending, { type: 'resolved', id: 999, result: 0 })
      expect(stale).toBe(pending)
    })
  })

  describe('errors', () => {
    const pending = run([
      ...type('1'),
      { type: 'operator', operator: 'divide' },
      ...type('0'),
      equals,
    ])
    const failed = calculatorReducer(pending, {
      type: 'failed',
      id: pending.request?.id ?? 0,
      code: 'division_by_zero',
    })

    it('keeps the expression so the operand can be corrected', () => {
      expect(failed).toMatchObject({
        error: 'division_by_zero',
        stored: 1,
        operator: 'divide',
        entry: '0',
        request: null,
      })
    })

    it('dismisses the error on the next input', () => {
      const fixed = run([{ type: 'backspace' }, ...type('4')], failed)
      expect(fixed).toMatchObject({ error: null, entry: '4' })
    })

    it('retries the failed request', () => {
      const retried = calculatorReducer(failed, { type: 'retry' })
      expect(retried.request).toMatchObject({ operation: 'divide', operands: [1, 0] })
      expect(retried.request?.id).not.toBe(pending.request?.id)
    })

    it('ignores retry when nothing failed', () => {
      const state = run(type('3'))
      expect(calculatorReducer(state, { type: 'retry' })).toEqual(state)
    })

    it('ignores answers that arrive after the request was cleared', () => {
      const cleared = calculatorReducer(pending, { type: 'clear' })
      const late = calculatorReducer(cleared, { type: 'resolved', id: 1, result: 3 })
      expect(late).toBe(cleared)
    })
  })

  it('recalls a value from history as the current entry', () => {
    const state = run([...type('2'), add, { type: 'recall', value: 0.5 }])
    expect(state).toMatchObject({ entry: '0.5', fresh: true, stored: 2, operator: 'add' })
  })
})

describe('calculatorReducer under hostile input', () => {
  it.each<[string, CalculatorAction[], Partial<CalculatorState>]>([
    ['repeated equals after a result', [...type('2'), add, ...type('2'), equals], {}],
    ['a run of decimal points', type('1....5'), { entry: '1.5' }],
    ['an operator as the very first key', [add, ...type('3')], { stored: 0, entry: '3' }],
    ['± on zero, then digits', [{ type: 'toggleSign' }, ...type('7')], { entry: '-7' }],
    [
      'backspace past the sign',
      [...type('5'), { type: 'toggleSign' }, { type: 'backspace' }, { type: 'backspace' }],
      { entry: '0' },
    ],
    [
      'backspace right after an operator',
      [...type('5'), add, { type: 'backspace' }],
      { entry: '0', operator: 'add' },
    ],
    [
      '√ right after an operator',
      [...type('9'), add, { type: 'sqrt' }],
      { stored: 9, operator: 'add' },
    ],
  ])('%s', (_, actions, expected) => {
    expect(run(actions)).toMatchObject(expected)
  })

  it('keeps editing sane after a result in scientific notation', () => {
    const big = answer(
      run([...type('9'), { type: 'operator', operator: 'power' }, ...type('99'), equals]),
      1e94,
    )
    expect(big.entry).toBe('1e+94')

    expect(calculatorReducer(big, { type: 'toggleSign' }).entry).toBe('-1e+94')
    expect(calculatorReducer(big, { type: 'backspace' }).entry).toBe('0')
    expect(calculatorReducer(big, { type: 'decimal' }).entry).toBe('0.')
    expect(calculatorReducer(big, multiply)).toMatchObject({ stored: 1e94, operator: 'multiply' })
  })

  it('never reaches an invalid state, whatever is pressed', () => {
    // A small seeded generator, so a failure always reproduces.
    let seed = 20261019
    const random = () => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31
      return seed / 2 ** 31
    }
    const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)] as T

    const inputs: CalculatorAction[] = [
      ...type('0123456789'),
      { type: 'decimal' },
      { type: 'toggleSign' },
      { type: 'backspace' },
      { type: 'clear' },
      { type: 'equals' },
      { type: 'sqrt' },
      { type: 'retry' },
      { type: 'recall', value: -0.5 },
      ...(['add', 'subtract', 'multiply', 'divide', 'power', 'percentage'] as const).map(
        (operator): CalculatorAction => ({ type: 'operator', operator }),
      ),
    ]

    let state = initialState
    for (let step = 0; step < 20_000; step++) {
      state = calculatorReducer(state, pick(inputs))

      if (state.request) {
        // Answer like the API would: sometimes a number, sometimes an error.
        const { id } = state.request
        state = calculatorReducer(
          state,
          random() < 0.8
            ? { type: 'resolved', id, result: (random() - 0.5) * 10 ** Math.floor(random() * 20) }
            : {
                type: 'failed',
                id,
                code: pick(['division_by_zero', 'network', 'timeout'] as const),
              },
        )
      }

      expect(Number.isFinite(Number(state.entry)), state.entry).toBe(true)
      if (!state.fresh)
        expect(state.entry.replace(/\D/g, '').length).toBeLessThanOrEqual(MAX_DIGITS)
      expect(state.request).toBeNull()
      if (state.operator) expect(state.stored).not.toBeNull()
    }
  })
})
