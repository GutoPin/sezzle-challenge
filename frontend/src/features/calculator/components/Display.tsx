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

// Every Martian Mono glyph, separators included, advances 0.675em at this
// tracking, so a font size of 100cqi / (length * GLYPH_EM) always fits one line.
const GLYPH_EM = 0.68

function fitFontSize(text: string): string {
  return `min(2.75rem, 100cqi / ${(text.length * GLYPH_EM).toFixed(2)})`
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
      role="group"
      aria-label={t('calculator.display')}
      aria-busy={pending}
      className="@container flex min-h-36 flex-col justify-end gap-1 rounded-sm bg-sunken px-4 pt-3 pb-4 inset-shadow-well"
    >
      {/* RTL cuts an overflowing expression at its start, keeping the latest operator in view. */}
      <p className="min-h-6 truncate text-right font-mono text-sm text-ink-muted" dir="rtl">
        <bdi dir="ltr">{context}</bdi>
      </p>
      <p
        data-testid="display-value"
        dir="ltr"
        style={{ fontSize: fitFontSize(entry) }}
        // A fixed line keeps the expression above from shifting as the number shrinks.
        className={`flex h-14 items-end justify-end font-mono leading-tight font-medium tracking-tight whitespace-nowrap tabular-nums transition-opacity duration-(--q-duration-quick) ${pending ? 'opacity-40 delay-150' : ''}`}
      >
        {entry}
      </p>
      <div className="flex min-h-6 items-center justify-end gap-2 text-sm">
        {pending && (
          // Fades in only if the API is slow, so quick answers never flicker.
          <span className="inline-flex items-center gap-2 text-ink-muted transition-opacity delay-150 duration-(--q-duration-quick) starting:opacity-0">
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
                className="tap-target inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-medium text-ink underline-offset-2 hover:underline"
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
