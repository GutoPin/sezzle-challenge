import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import type { BinaryOperation, Operation } from '../api/calculatorApi'
import { useNumberFormat } from './useNumberFormat'

export const OPERATOR_SYMBOLS: Record<BinaryOperation, string> = {
  add: '+',
  subtract: '−',
  multiply: '×',
  divide: '÷',
  power: '^',
  percentage: '%',
}

/**
 * Renders an operation as people write it: "10 ÷ 4", "√16", "15% of 200".
 * Pass one operand for an expression still waiting on its second value.
 */
export function useExpression() {
  const { t } = useTranslation()
  const format = useNumberFormat()

  return useCallback(
    (operation: Operation, operands: number[]): string => {
      const [left = '', right] = operands.map(format.number)
      if (operation === 'sqrt') return `√${left}`
      if (operation === 'percentage') {
        return right === undefined
          ? t('calculator.expressions.percentagePending', { percent: left })
          : t('calculator.expressions.percentage', { percent: left, base: right })
      }
      const symbol = OPERATOR_SYMBOLS[operation]
      return right === undefined ? `${left} ${symbol}` : `${left} ${symbol} ${right}`
    },
    [format, t],
  )
}
