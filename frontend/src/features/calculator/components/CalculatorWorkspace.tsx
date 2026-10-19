import { type ReactNode, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useCalculator } from '../hooks/useCalculator'
import { useHistory } from '../hooks/useHistory'
import { useKeyboard } from '../hooks/useKeyboard'
import { useNumberFormat } from '../hooks/useNumberFormat'
import { type InputAction, keyIdFor } from '../model/keyboard'
import { Display } from './Display'
import { HistoryTape } from './HistoryTape'
import { Keypad } from './Keypad'
import { ShortcutList } from './ShortcutList'

const FLASH_MS = 140

interface CalculatorWorkspaceProps {
  /** Shown beside the calculator on wide screens and above it on phones. */
  intro?: ReactNode
}

export function CalculatorWorkspace({ intro }: CalculatorWorkspaceProps) {
  const { t } = useTranslation()
  const format = useNumberFormat()
  const history = useHistory()
  const { state, dispatch } = useCalculator({ onCalculated: history.add })

  const [flashKey, setFlashKey] = useState<string | null>(null)
  const flashTimer = useRef<number | undefined>(undefined)
  useEffect(
    () => () => {
      window.clearTimeout(flashTimer.current)
    },
    [],
  )

  useKeyboard((action: InputAction) => {
    dispatch(action)
    setFlashKey(keyIdFor(action))
    window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => {
      setFlashKey(null)
    }, FLASH_MS)
  })

  // Typing is not announced key by key; screen readers hear results and errors.
  const announcement = state.last
    ? t('calculator.result', { value: format.number(state.last.result) })
    : ''

  return (
    <div className="grid grid-cols-1 items-start gap-x-12 gap-y-10 [grid-template-areas:'intro'_'calc'_'side'] lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:[grid-template-areas:'calc_intro'_'calc_side']">
      {intro && <div className="[grid-area:intro]">{intro}</div>}
      <section
        aria-label={t('calculator.label')}
        className="rounded-lg border border-line bg-surface p-3 shadow-overlay [grid-area:calc] sm:p-4"
      >
        <Display
          state={state}
          onRetry={() => {
            dispatch({ type: 'retry' })
          }}
        />
        <div className="pt-3 sm:pt-4">
          <Keypad
            onInput={dispatch}
            activeOperator={state.fresh ? state.operator : null}
            flashKey={flashKey}
          />
        </div>
        <p role="status" className="sr-only">
          {announcement}
        </p>
      </section>

      <div className="grid grid-cols-1 items-start gap-10 [grid-area:side] md:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:grid-cols-1">
        <HistoryTape
          entries={history.entries}
          onRecall={(value) => {
            dispatch({ type: 'recall', value })
          }}
          onClear={history.clear}
        />
        <ShortcutList />
      </div>
    </div>
  )
}
