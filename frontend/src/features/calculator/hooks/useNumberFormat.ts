import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { decimalSeparator, formatEntry, formatNumber } from '../model/format'

/** Number formatting bound to the active language. */
export function useNumberFormat() {
  const { i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? 'en'

  return useMemo(
    () => ({
      number: (value: number) => formatNumber(value, locale),
      entry: (entry: string) => formatEntry(entry, locale),
      decimalSeparator: decimalSeparator(locale),
    }),
    [locale],
  )
}
