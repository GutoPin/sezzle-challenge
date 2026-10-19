import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { BackspaceIcon } from '@/shared/ui/icons'

import type { BinaryOperation } from '../api/calculatorApi'
import { OPERATOR_SYMBOLS } from '../hooks/useExpression'
import { useNumberFormat } from '../hooks/useNumberFormat'
import { type InputAction, keyIdFor } from '../model/keyboard'
import { Key, type KeyTone } from './Key'

interface KeypadProps {
  onInput: (action: InputAction) => void
  activeOperator: BinaryOperation | null
  flashKey: string | null
}

interface KeySpec {
  action: InputAction
  tone: KeyTone
  face: ReactNode
  className?: string | undefined
}

const digit = (value: string, className?: string): KeySpec => ({
  action: { type: 'digit', digit: value },
  tone: 'digit',
  face: value,
  className,
})

const operator = (value: BinaryOperation, tone: KeyTone = 'operator'): KeySpec => ({
  action: { type: 'operator', operator: value },
  tone,
  face: OPERATOR_SYMBOLS[value],
})

export function Keypad({ onInput, activeOperator, flashKey }: KeypadProps) {
  const { t } = useTranslation()
  const { decimalSeparator } = useNumberFormat()

  // Laid out like a desk calculator: functions on top, digits in the middle,
  // operators down the right edge and a tall "=" at the bottom.
  const keys: KeySpec[] = [
    { action: { type: 'clear' }, tone: 'function', face: 'AC' },
    {
      action: { type: 'backspace' },
      tone: 'function',
      face: <BackspaceIcon width={22} height={22} />,
    },
    { action: { type: 'toggleSign' }, tone: 'function', face: '±' },
    operator('divide'),
    { action: { type: 'sqrt' }, tone: 'function', face: '√' },
    {
      action: { type: 'operator', operator: 'power' },
      tone: 'function',
      face: (
        <span>
          x<sup className="text-[0.65em]">y</sup>
        </span>
      ),
    },
    operator('percentage', 'function'),
    operator('multiply'),
    digit('7'),
    digit('8'),
    digit('9'),
    operator('subtract'),
    digit('4'),
    digit('5'),
    digit('6'),
    operator('add'),
    digit('1'),
    digit('2'),
    digit('3'),
    { action: { type: 'equals' }, tone: 'equals', face: '=', className: 'row-span-2' },
    digit('0', 'col-span-2'),
    { action: { type: 'decimal' }, tone: 'digit', face: decimalSeparator },
  ]

  return (
    <div role="group" aria-label={t('calculator.keypad')} className="grid grid-cols-4 gap-2">
      {keys.map(({ action, tone, face, className }) => {
        const id = keyIdFor(action)
        const isOperator = action.type === 'operator'
        return (
          <Key
            key={id}
            label={labelFor(action, t)}
            tone={tone}
            flashing={flashKey === id}
            pressed={isOperator ? action.operator === activeOperator : undefined}
            onPress={() => {
              onInput(action)
            }}
            className={className}
          >
            {face}
          </Key>
        )
      })}
    </div>
  )
}

function labelFor(action: InputAction, t: ReturnType<typeof useTranslation>['t']): string {
  switch (action.type) {
    case 'digit':
      return action.digit
    case 'operator':
      return t(`calculator.keys.${action.operator}`)
    default:
      return t(`calculator.keys.${action.type}`)
  }
}
