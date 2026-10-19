import { describe, expect, it } from 'vitest'

import { decimalSeparator, formatEntry, formatNumber } from './format'

describe('formatNumber', () => {
  it.each([
    [2.5, 'en', '2.5'],
    [2.5, 'es', '2,5'],
    [1234567.5, 'en', '1,234,567.5'],
    [1234567.5, 'es', '1.234.567,5'],
    [-42, 'en', '−42'],
    [0.333333333333333, 'en', '0.333333333333333'],
    [0, 'en', '0'],
  ])('formats %d in %s as %j', (value, locale, expected) => {
    expect(formatNumber(value, locale)).toBe(expected)
  })

  it('switches to scientific notation for very large and very small values', () => {
    expect(formatNumber(1e21, 'en')).toBe('1E21')
    expect(formatNumber(-1.5e-12, 'es')).toBe('−1,5E-12')
  })
})

describe('formatEntry', () => {
  it.each([
    ['0', 'en', '0'],
    ['1234', 'en', '1,234'],
    ['12.', 'en', '12.'],
    ['12.', 'es', '12,'],
    ['0.50', 'en', '0.50'],
    ['-0', 'en', '−0'],
    ['-1234.5', 'es', '−1234,5'],
    ['1234567', 'es', '1.234.567'],
    ['9999999999999999', 'en', '9,999,999,999,999,999'],
  ])('formats entry %j in %s as %j', (entry, locale, expected) => {
    expect(formatEntry(entry, locale)).toBe(expected)
  })

  it('formats exponent entries like computed values', () => {
    expect(formatEntry('1e+21', 'en')).toBe('1E21')
  })

  it('formats results longer than the typing limit compactly', () => {
    expect(formatEntry('123456789012345680000', 'en')).toBe('1.23456789E20')
  })
})

describe('decimalSeparator', () => {
  it('follows the locale', () => {
    expect(decimalSeparator('en')).toBe('.')
    expect(decimalSeparator('es')).toBe(',')
  })
})
