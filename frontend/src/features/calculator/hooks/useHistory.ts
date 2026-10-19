import { useCallback, useEffect, useState } from 'react'

import { readStorage, writeStorage } from '@/shared/lib/storage'

import { OPERATIONS } from '../api/calculatorApi'
import type { Calculation } from '../model/calculatorReducer'

export interface HistoryEntry extends Calculation {
  id: string
  createdAt: number
}

export const HISTORY_STORAGE_KEY = 'quotient:history'
export const HISTORY_LIMIT = 50

let sequence = 0

function createId(createdAt: number): string {
  sequence += 1
  return `${createdAt.toString(36)}-${sequence.toString(36)}`
}

function isHistoryEntry(value: unknown): value is HistoryEntry {
  if (typeof value !== 'object' || value === null) return false
  const entry = value as Record<string, unknown>
  return (
    typeof entry.id === 'string' &&
    typeof entry.createdAt === 'number' &&
    typeof entry.result === 'number' &&
    OPERATIONS.includes(entry.operation as HistoryEntry['operation']) &&
    Array.isArray(entry.operands) &&
    entry.operands.every((operand) => typeof operand === 'number')
  )
}

// Stored history is untrusted: it may be from an older version or edited by
// hand, so anything that doesn't match the current shape is dropped.
function loadHistory(): HistoryEntry[] {
  try {
    const parsed: unknown = JSON.parse(readStorage(HISTORY_STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter(isHistoryEntry).slice(0, HISTORY_LIMIT) : []
  } catch {
    return []
  }
}

/**
 * Recent calculations, newest first, persisted in localStorage. Clearing can
 * be undone until the next calculation is added.
 */
export function useHistory() {
  const [entries, setEntries] = useState(loadHistory)
  const [cleared, setCleared] = useState<HistoryEntry[] | null>(null)

  useEffect(() => {
    writeStorage(HISTORY_STORAGE_KEY, JSON.stringify(entries))
  }, [entries])

  const add = useCallback((calculation: Calculation) => {
    const createdAt = Date.now()
    setCleared(null)
    setEntries((previous) =>
      [{ ...calculation, id: createId(createdAt), createdAt }, ...previous].slice(0, HISTORY_LIMIT),
    )
  }, [])

  const clear = useCallback(() => {
    setCleared(entries)
    setEntries([])
  }, [entries])

  const undoClear = useCallback(() => {
    if (cleared) setEntries(cleared)
    setCleared(null)
  }, [cleared])

  return { entries, add, clear, canUndoClear: cleared !== null, undoClear }
}
