import { useTranslation } from 'react-i18next'

/** The obelus on a round key: the same drawing as public/favicon.svg. */
function BrandMark() {
  return (
    <svg viewBox="0 0 32 32" width="24" height="24" aria-hidden="true" focusable="false">
      <circle cx="16" cy="16" r="16" className="fill-accent" />
      <g className="fill-on-accent">
        <circle cx="16" cy="9.5" r="2.25" />
        <rect x="8" y="14.5" width="16" height="3" rx="1.5" />
        <circle cx="16" cy="22.5" r="2.25" />
      </g>
    </svg>
  )
}

export function Wordmark() {
  const { t } = useTranslation()

  return (
    <span className="inline-flex items-center gap-2">
      <BrandMark />
      <span className="text-lg font-semibold tracking-tight">{t('app.name')}</span>
    </span>
  )
}
