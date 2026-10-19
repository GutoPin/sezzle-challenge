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
