import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { Calculation } from '../model/calculatorReducer'
import { HISTORY_LIMIT, HISTORY_STORAGE_KEY, useHistory } from './useHistory'

const calculation: Calculation = { operation: 'add', operands: [1, 2], result: 3 }

describe('useHistory', () => {
  it('adds entries newest first and persists them', () => {
    const { result } = renderHook(() => useHistory())

    act(() => {
      result.current.add(calculation)
      result.current.add({ ...calculation, operands: [2, 2], result: 4 })
    })

    expect(result.current.entries.map((entry) => entry.result)).toEqual([4, 3])
    expect(new Set(result.current.entries.map((entry) => entry.id)).size).toBe(2)
    expect(JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) ?? '')).toHaveLength(2)
  })

  it(`keeps only the latest ${HISTORY_LIMIT} entries`, () => {
    const { result } = renderHook(() => useHistory())

    act(() => {
      for (let i = 0; i <= HISTORY_LIMIT; i++) result.current.add({ ...calculation, result: i })
    })

    expect(result.current.entries).toHaveLength(HISTORY_LIMIT)
    expect(result.current.entries[0]?.result).toBe(HISTORY_LIMIT)
  })

  it('restores saved entries and drops malformed ones', () => {
    const valid = { ...calculation, id: 'a', createdAt: 1 }
    localStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify([valid, { ...valid, operation: 'modulo' }, { id: 'b' }, null, 'junk']),
    )

    const { result } = renderHook(() => useHistory())

    expect(result.current.entries).toEqual([valid])
  })

  it.each(['not json', '{"an":"object"}'])('starts empty when storage holds %j', (stored) => {
    localStorage.setItem(HISTORY_STORAGE_KEY, stored)
    const { result } = renderHook(() => useHistory())
    expect(result.current.entries).toEqual([])
  })

  it('clears every entry', () => {
    const { result } = renderHook(() => useHistory())

    act(() => {
      result.current.add(calculation)
      result.current.clear()
    })

    expect(result.current.entries).toEqual([])
    expect(localStorage.getItem(HISTORY_STORAGE_KEY)).toBe('[]')
  })
})
