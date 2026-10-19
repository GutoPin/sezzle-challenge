import { describe, expect, it } from 'vitest'

import {
  appendDecimal,
  appendDigit,
  deleteLast,
  digitCount,
  fromNumber,
  MAX_DIGITS,
  toggleSign,
  toNumber,
} from './entry'

describe('entry', () => {
  it.each([
    ['0', '7', '7'],
    ['-0', '7', '-7'],
    ['12', '3', '123'],
    ['0.', '0', '0.0'],
    ['-1.5', '2', '-1.52'],
  ])('appendDigit(%j, %j) is %j', (entry, digit, expected) => {
    expect(appendDigit(entry, digit)).toBe(expected)
  })

  it('refuses digits beyond the limit, ignoring sign and separator', () => {
    const full = `-0.${'9'.repeat(MAX_DIGITS - 1)}`
    expect(digitCount(full)).toBe(MAX_DIGITS)
    expect(appendDigit(full, '1')).toBeNull()
    expect(appendDigit(full.slice(0, -1), '1')).not.toBeNull()
  })

  it.each([
    ['0', '0.'],
    ['12', '12.'],
    ['1.5', '1.5'],
  ])('appendDecimal(%j) is %j', (entry, expected) => {
    expect(appendDecimal(entry)).toBe(expected)
  })

  it.each([
    ['123', '12'],
    ['1.', '1'],
    ['7', '0'],
    ['-7', '0'],
    ['0', '0'],
  ])('deleteLast(%j) is %j', (entry, expected) => {
    expect(deleteLast(entry)).toBe(expected)
  })

  it.each([
    ['5', '-5'],
    ['-5', '5'],
    ['0', '-0'],
  ])('toggleSign(%j) is %j', (entry, expected) => {
    expect(toggleSign(entry)).toBe(expected)
  })

  it('converts between entries and numbers', () => {
    expect(toNumber('12.')).toBe(12)
    expect(toNumber('-0.25')).toBe(-0.25)
    expect(fromNumber(2.5)).toBe('2.5')
    expect(fromNumber(1e21)).toBe('1e+21')
  })
})
