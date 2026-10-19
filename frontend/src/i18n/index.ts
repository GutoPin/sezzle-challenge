import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import es from './locales/es.json'

export const SUPPORTED_LANGUAGES = ['en', 'es'] as const
export type Language = (typeof SUPPORTED_LANGUAGES)[number]

// Endonyms: each language is always offered in its own name.
export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  es: 'Español',
}

export const LANGUAGE_STORAGE_KEY = 'quotient:language'

export const resources = {
  en: { translation: en },
  es: { translation: es satisfies typeof en },
} as const

export function isLanguage(value: unknown): value is Language {
  return SUPPORTED_LANGUAGES.includes(value as Language)
}

i18n.on('languageChanged', (language) => {
  document.documentElement.lang = language
})

// initAsync: false makes init finish synchronously with bundled resources, so
// the first render never suspends waiting for translations.
void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: SUPPORTED_LANGUAGES,
    fallbackLng: 'en',
    load: 'languageOnly',
    initAsync: false,
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ['localStorage'],
    },
  })

export { i18n }
