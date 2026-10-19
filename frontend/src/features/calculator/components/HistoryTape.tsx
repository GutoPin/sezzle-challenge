import { useTranslation } from 'react-i18next'

import { useExpression } from '../hooks/useExpression'
import type { HistoryEntry } from '../hooks/useHistory'
import { useNumberFormat } from '../hooks/useNumberFormat'

interface HistoryTapeProps {
  entries: HistoryEntry[]
  onRecall: (value: number) => void
  onClear: () => void
}

/**
 * History drawn as an adding machine's paper tape: each calculation printed
 * in a line, newest at the top, and any result can be pulled back in.
 */
export function HistoryTape({ entries, onRecall, onClear }: HistoryTapeProps) {
  const { t } = useTranslation()
  const format = useNumberFormat()
  const expression = useExpression()

  return (
    <section aria-labelledby="history-title" className="flex w-full max-w-sm flex-col">
      <div className="flex items-baseline justify-between gap-4 pb-3">
        <h2 id="history-title" className="text-lg font-semibold tracking-tight">
          {t('history.title')}
        </h2>
        {entries.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="tap-target rounded-xs text-sm text-ink-muted underline-offset-2 hover:text-ink hover:underline"
          >
            {t('history.clear')}
          </button>
        )}
      </div>

      <div className="flex flex-col bg-surface pt-4 pb-2 text-ink tape">
        {entries.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-ink-muted">{t('history.empty')}</p>
        ) : (
          <>
            <p className="px-5 pb-2 text-sm text-ink-muted">{t('history.description')}</p>
            <ol className="max-h-96 overflow-y-auto overscroll-contain">
              {entries.map((entry) => {
                const result = format.number(entry.result)
                return (
                  <li
                    key={entry.id}
                    className="transition-[opacity,translate] duration-(--q-duration-moderate) ease-out starting:-translate-y-2 starting:opacity-0"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onRecall(entry.result)
                      }}
                      aria-label={t('history.reuse', { result })}
                      className="block w-full px-5 py-2.5 text-right font-mono hover:bg-sunken focus-visible:bg-sunken focus-visible:-outline-offset-2"
                      dir="ltr"
                    >
                      <span className="block truncate text-xs text-ink-muted">
                        {expression(entry.operation, entry.operands)} =
                      </span>
                      <span className="block truncate text-lg font-medium tabular-nums">
                        {result}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </>
        )}
      </div>
    </section>
  )
}
