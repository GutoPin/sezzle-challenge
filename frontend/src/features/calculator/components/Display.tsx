import { useTranslation } from 'react-i18next'

import { RetryIcon } from '@/shared/ui/icons'

import { useExpression } from '../hooks/useExpression'
import { useNumberFormat } from '../hooks/useNumberFormat'
import type { CalculatorErrorCode, CalculatorState } from '../model/calculatorReducer'
import { MAX_DIGITS } from '../model/entry'

interface DisplayProps {
  state: CalculatorState
  onRetry: () => void
}

// Errors where the same request may well succeed a second time.
const RETRYABLE = new Set<CalculatorErrorCode>(['network', 'timeout', 'unknown', 'internal_error'])

// Martian Mono is wide, so long numbers step down in size instead of overflowing.
function sizeFor(text: string): string {
  if (text.length <= 9) return 'text-[2.75rem]'
  if (text.length <= 13) return 'text-[2rem]'
  if (text.length <= 18) return 'text-[1.5rem]'
  return 'text-[1.2rem]'
}

export function Display({ state, onRetry }: DisplayProps) {
  const { t } = useTranslation()
  const format = useNumberFormat()
  const expression = useExpression()

  const pending = state.request !== null
  const entry = format.entry(state.entry)

  let context = ''
  if (state.operator && state.stored !== null) {
    context = expression(state.operator, [state.stored])
  } else if (state.last) {
    context = `${expression(state.last.operation, state.last.operands)} =`
  }

  return (
    <div
      aria-label={t('calculator.display')}
      aria-busy={pending}
      className="flex min-h-36 flex-col justify-end gap-1 rounded-sm bg-sunken px-4 pt-3 pb-4 inset-shadow-well"
    >
      <p className="min-h-6 truncate text-right font-mono text-sm text-ink-muted" dir="ltr">
        {context}
      </p>
      <p
        data-testid="display-value"
        dir="ltr"
        className={`text-right font-mono leading-tight font-medium tracking-tight break-all tabular-nums transition-opacity duration-(--q-duration-quick) ${sizeFor(entry)} ${pending ? 'opacity-40' : ''}`}
      >
        {entry}
      </p>
      <div className="flex min-h-6 items-center justify-end gap-2 text-sm">
        {pending && (
          <span className="inline-flex items-center gap-2 text-ink-muted">
            <span className="size-1.5 animate-pulse rounded-full bg-accent" aria-hidden="true" />
            {t('calculator.calculating')}
          </span>
        )}
        {state.error && (
          <p role="alert" className="flex items-center gap-3 text-right text-danger">
            <span>{t(`errors.${state.error}`, { max: MAX_DIGITS })}</span>
            {RETRYABLE.has(state.error) && state.failedRequest && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-medium text-ink underline-offset-2 hover:underline"
              >
                <RetryIcon />
                {t('calculator.retry')}
              </button>
            )}
          </p>
        )}
      </div>
    </div>
  )
}
