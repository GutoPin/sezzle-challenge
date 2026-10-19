import { useEffect, useEffectEvent, useReducer } from 'react'

import { ApiError, isAbortError } from '@/shared/api/httpClient'

import { calculate, type Operands, type Operation } from '../api/calculatorApi'
import { type Calculation, calculatorReducer, initialState } from '../model/calculatorReducer'

interface UseCalculatorOptions {
  onCalculated?: (calculation: Calculation) => void
}

/**
 * Runs the calculator state machine and performs the API requests it asks
 * for. Clearing or unmounting aborts the request in flight.
 */
export function useCalculator({ onCalculated }: UseCalculatorOptions = {}) {
  const [state, dispatch] = useReducer(calculatorReducer, initialState)
  const { request } = state

  const notifyCalculated = useEffectEvent((calculation: Calculation) => {
    onCalculated?.(calculation)
  })

  useEffect(() => {
    if (!request) return

    const controller = new AbortController()
    const { id, operation, operands } = request
    calculate(operation, operands as Operands<Operation>, { signal: controller.signal }).then(
      ({ result }) => {
        dispatch({ type: 'resolved', id, result })
        notifyCalculated({ operation, operands, result })
      },
      (error: unknown) => {
        if (isAbortError(error)) return
        dispatch({ type: 'failed', id, code: error instanceof ApiError ? error.code : 'unknown' })
      },
    )
    return () => {
      controller.abort()
    }
  }, [request])

  return { state, dispatch }
}
