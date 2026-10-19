import { useTranslation } from 'react-i18next'

import { isLanguage, LANGUAGE_NAMES, SUPPORTED_LANGUAGES, type Language } from '@/i18n'

import { SegmentedControl } from './SegmentedControl'

const options = SUPPORTED_LANGUAGES.map((language) => ({
  value: language,
  label: LANGUAGE_NAMES[language],
  content: language.toUpperCase(),
  lang: language,
}))

export function LanguageSwitch() {
  const { t, i18n } = useTranslation()
  const current: Language = isLanguage(i18n.resolvedLanguage) ? i18n.resolvedLanguage : 'en'

  return (
    <SegmentedControl
      label={t('header.language')}
      options={options}
      value={current}
      onChange={(language) => void i18n.changeLanguage(language)}
    />
  )
}
