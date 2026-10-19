import { describe, expect, it } from 'vitest'

import { actionForKey, keyIdFor } from './keyboard'

describe('actionForKey', () => {
  it.each([
    ['7', { type: 'digit', digit: '7' }],
    ['.', { type: 'decimal' }],
    [',', { type: 'decimal' }],
    ['+', { type: 'operator', operator: 'add' }],
    ['-', { type: 'operator', operator: 'subtract' }],
    ['*', { type: 'operator', operator: 'multiply' }],
    ['x', { type: 'operator', operator: 'multiply' }],
    ['/', { type: 'operator', operator: 'divide' }],
    ['^', { type: 'operator', operator: 'power' }],
    ['%', { type: 'operator', operator: 'percentage' }],
    ['r', { type: 'sqrt' }],
    ['n', { type: 'toggleSign' }],
    ['Enter', { type: 'equals' }],
    ['=', { type: 'equals' }],
    ['Backspace', { type: 'backspace' }],
    ['Escape', { type: 'clear' }],
  ])('maps %j', (key, action) => {
    expect(actionForKey(key)).toEqual(action)
  })

  it.each(['a', 'Tab', 'F5', ' ', '12'])('ignores %j', (key) => {
    expect(actionForKey(key)).toBeNull()
  })
})

describe('keyIdFor', () => {
  it('names keys after what they do', () => {
    expect(keyIdFor({ type: 'digit', digit: '4' })).toBe('digit-4')
    expect(keyIdFor({ type: 'operator', operator: 'divide' })).toBe('divide')
    expect(keyIdFor({ type: 'equals' })).toBe('equals')
  })
})
