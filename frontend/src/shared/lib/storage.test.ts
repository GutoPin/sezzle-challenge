import { describe, expect, it, vi } from 'vitest'

import { readStorage, writeStorage } from './storage'

describe('storage', () => {
  it('round-trips a value through localStorage', () => {
    writeStorage('quotient:test', 'value')

    expect(readStorage('quotient:test')).toBe('value')
  })

  it('returns null for a missing key', () => {
    expect(readStorage('quotient:missing')).toBeNull()
  })

  it('swallows errors when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })

    expect(() => {
      writeStorage('quotient:test', 'value')
    }).not.toThrow()
    expect(readStorage('quotient:test')).toBeNull()
  })
})
