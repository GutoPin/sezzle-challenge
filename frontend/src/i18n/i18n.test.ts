import { afterEach, describe, expect, it } from 'vitest'

import { i18n, isLanguage, LANGUAGE_STORAGE_KEY } from '.'

describe('i18n', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('translates with the bundled resources', () => {
    expect(i18n.t('history.title')).toBe('History')
  })

  it('keeps <html lang> in sync with the active language', async () => {
    await i18n.changeLanguage('es')

    expect(document.documentElement.lang).toBe('es')
    expect(i18n.t('history.title')).toBe('Historial')
  })

  it('remembers the chosen language', async () => {
    await i18n.changeLanguage('es')

    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('es')
  })

  it('resolves regional variants and falls back to English', async () => {
    await i18n.changeLanguage('es-MX')
    expect(i18n.resolvedLanguage).toBe('es')

    await i18n.changeLanguage('fr')
    expect(i18n.resolvedLanguage).toBe('en')
    expect(document.documentElement.lang).toBe('en')
  })

  it('recognises supported language codes', () => {
    expect(isLanguage('es')).toBe(true)
    expect(isLanguage('fr')).toBe(false)
    expect(isLanguage(undefined)).toBe(false)
  })
})
