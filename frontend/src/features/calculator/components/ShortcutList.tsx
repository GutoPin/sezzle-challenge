import { useTranslation } from 'react-i18next'

const shortcuts = [
  { keys: ['0–9', '.'], label: 'digits' },
  { keys: ['+', '−', '*', '/'], label: 'operators' },
  { keys: ['^'], label: 'power' },
  { keys: ['%'], label: 'percentage' },
  { keys: ['R'], label: 'sqrt' },
  { keys: ['N'], label: 'toggleSign' },
  { keys: ['Enter'], label: 'equals' },
  { keys: ['⌫'], label: 'backspace' },
  { keys: ['Esc'], label: 'clear' },
] as const

/** Only shown where a physical keyboard is likely. */
export function ShortcutList() {
  const { t } = useTranslation()

  return (
    <section aria-labelledby="shortcuts-title" className="hidden pointer-fine:block">
      <h2 id="shortcuts-title" className="pb-3 text-lg font-semibold tracking-tight">
        {t('calculator.shortcuts.title')}
      </h2>
      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 text-sm">
        {shortcuts.map(({ keys, label }) => (
          <div key={label} className="contents">
            <dt className="flex gap-1">
              {keys.map((key) => (
                <kbd
                  key={key}
                  className="inline-flex h-6 min-w-6 items-center justify-center rounded-xs border border-line bg-surface px-1.5 font-sans text-xs text-ink"
                >
                  {key}
                </kbd>
              ))}
            </dt>
            <dd className="text-ink-muted">{t(`calculator.shortcuts.${label}`)}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
