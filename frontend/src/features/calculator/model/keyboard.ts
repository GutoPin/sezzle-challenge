import type { BinaryOperation } from '../api/calculatorApi'
import type { CalculatorAction } from './calculatorReducer'

/** Actions a person can trigger from the keypad or the keyboard. */
export type InputAction = Extract<
  CalculatorAction,
  {
    type:
      'digit' | 'decimal' | 'operator' | 'sqrt' | 'equals' | 'clear' | 'backspace' | 'toggleSign'
  }
>

const operatorKeys: Record<string, BinaryOperation> = {
  '+': 'add',
  '-': 'subtract',
  '*': 'multiply',
  x: 'multiply',
  X: 'multiply',
  '/': 'divide',
  '^': 'power',
  '%': 'percentage',
}

const commandKeys: Record<string, InputAction> = {
  '.': { type: 'decimal' },
  // Spanish keyboards and number pads type a comma as the decimal separator.
  ',': { type: 'decimal' },
  Enter: { type: 'equals' },
  '=': { type: 'equals' },
  Backspace: { type: 'backspace' },
  Escape: { type: 'clear' },
  Delete: { type: 'clear' },
  r: { type: 'sqrt' },
  R: { type: 'sqrt' },
  n: { type: 'toggleSign' },
  N: { type: 'toggleSign' },
}

export function actionForKey(key: string): InputAction | null {
  if (/^\d$/.test(key)) return { type: 'digit', digit: key }
  const operator = operatorKeys[key]
  if (operator) return { type: 'operator', operator }
  return commandKeys[key] ?? null
}

/** Stable id of the keypad key that performs an action, used to light it up. */
export function keyIdFor(action: InputAction): string {
  switch (action.type) {
    case 'digit':
      return `digit-${action.digit}`
    case 'operator':
      return action.operator
    default:
      return action.type
  }
}
