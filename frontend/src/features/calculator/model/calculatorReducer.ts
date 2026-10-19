import type { ApiErrorCode } from '@/shared/api/httpClient'

import type { BinaryOperation, Operation } from '../api/calculatorApi'
import { appendDecimal, appendDigit, deleteLast, fromNumber, toggleSign, toNumber } from './entry'

export type CalculatorErrorCode = ApiErrorCode | 'max_digits'

export interface Calculation {
  operation: Operation
  operands: number[]
  result: number
}

/**
 * A calculation the reducer wants the API to run. The reducer stays pure: it
 * only describes the request, and useCalculator performs it.
 */
export interface CalculationRequest {
  id: number
  operation: Operation
  operands: number[]
  /** Operator pressed while chaining ("2 + 3 ×"), applied once the result arrives. */
  then: BinaryOperation | null
}

export interface CalculatorState {
  entry: string
  /** The next digit starts a new entry instead of extending this one. */
  fresh: boolean
  stored: number | null
  operator: BinaryOperation | null
  request: CalculationRequest | null
  failedRequest: CalculationRequest | null
  error: CalculatorErrorCode | null
  /** The completed calculation shown above the result. */
  last: Calculation | null
  nextRequestId: number
}

export type CalculatorAction =
  | { type: 'digit'; digit: string }
  | { type: 'decimal' }
  | { type: 'operator'; operator: BinaryOperation }
  | { type: 'sqrt' }
  | { type: 'equals' }
  | { type: 'clear' }
  | { type: 'backspace' }
  | { type: 'toggleSign' }
  | { type: 'recall'; value: number }
  | { type: 'retry' }
  | { type: 'resolved'; id: number; result: number }
  | { type: 'failed'; id: number; code: ApiErrorCode }

export const initialState: CalculatorState = {
  entry: '0',
  fresh: false,
  stored: null,
  operator: null,
  request: null,
  failedRequest: null,
  error: null,
  last: null,
  nextRequestId: 1,
}

export function calculatorReducer(
  state: CalculatorState,
  action: CalculatorAction,
): CalculatorState {
  if (action.type === 'clear') {
    return { ...initialState, nextRequestId: state.nextRequestId }
  }
  if (state.request) {
    // Input is locked while the API works; only the answer gets through.
    return settle(state, state.request, action)
  }

  // Any new input dismisses the previous error.
  const current: CalculatorState = { ...state, error: null }

  switch (action.type) {
    case 'digit':
      return edit(current, (entry) => appendDigit(entry, action.digit))

    case 'decimal':
      return edit(current, appendDecimal)

    case 'backspace':
      return edit(current, deleteLast)

    case 'toggleSign':
      // Right after an operator, ± starts a negative second operand.
      if (current.fresh && current.operator) return { ...current, entry: '-0', fresh: false }
      return { ...current, entry: toggleSign(current.entry) }

    case 'operator':
      if (current.operator && !current.fresh) {
        return withRequest(current, current.operator, operands(current), action.operator)
      }
      if (current.operator) return { ...current, operator: action.operator }
      return {
        ...current,
        stored: toNumber(current.entry),
        operator: action.operator,
        fresh: true,
        last: null,
      }

    case 'equals':
      return current.operator ? withRequest(current, current.operator, operands(current)) : current

    case 'sqrt':
      return withRequest(current, 'sqrt', [toNumber(current.entry)])

    case 'recall':
      return { ...current, entry: fromNumber(action.value), fresh: true, last: null }

    case 'retry': {
      const failed = current.failedRequest
      return failed ? withRequest(current, failed.operation, failed.operands, failed.then) : current
    }

    case 'resolved':
    case 'failed':
      // A late answer to a request that was cleared away.
      return state
  }
}

function settle(
  state: CalculatorState,
  request: CalculationRequest,
  action: CalculatorAction,
): CalculatorState {
  if ((action.type !== 'resolved' && action.type !== 'failed') || action.id !== request.id) {
    return state
  }

  if (action.type === 'failed') {
    return { ...state, request: null, failedRequest: request, error: action.code }
  }

  const calculation: Calculation = {
    operation: request.operation,
    operands: request.operands,
    result: action.result,
  }
  const base = { ...state, request: null, entry: fromNumber(action.result), fresh: true }

  if (request.operation === 'sqrt') {
    // √ rewrites the current entry in place, so "9 + √16 =" still adds.
    return { ...base, last: state.operator ? null : calculation }
  }
  if (request.then) {
    return { ...base, stored: action.result, operator: request.then, last: null }
  }
  return { ...base, stored: null, operator: null, last: calculation }
}

function edit(state: CalculatorState, change: (entry: string) => string | null): CalculatorState {
  const startsNewNumber = state.fresh
  const entry = change(startsNewNumber ? '0' : state.entry)
  if (entry === null) return { ...state, error: 'max_digits' }

  return {
    ...state,
    entry,
    fresh: false,
    // Typing over a finished result starts a new calculation.
    last: startsNewNumber && !state.operator ? null : state.last,
  }
}

function operands(state: CalculatorState): number[] {
  return [state.stored ?? 0, toNumber(state.entry)]
}

function withRequest(
  state: CalculatorState,
  operation: Operation,
  values: number[],
  then: BinaryOperation | null = null,
): CalculatorState {
  return {
    ...state,
    request: { id: state.nextRequestId, operation, operands: values, then },
    failedRequest: null,
    nextRequestId: state.nextRequestId + 1,
  }
}
