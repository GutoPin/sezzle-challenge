import { describe, expect, it } from 'vitest'

import { CLIENT_ERROR_CODES, SERVER_ERROR_CODES } from '@/shared/api/httpClient'

import en from './locales/en.json'
import es from './locales/es.json'

type Messages = Record<string, unknown>

function flatten(messages: Messages, prefix = ''): Map<string, string> {
  const entries = new Map<string, string>()
  for (const [key, value] of Object.entries(messages)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') {
      entries.set(path, value)
    } else {
      for (const entry of flatten(value as Messages, path)) entries.set(...entry)
    }
  }
  return entries
}

function placeholders(message: string): string[] {
  return [...message.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((match) => match[1] ?? '').sort()
}

const english = flatten(en)
const spanish = flatten(es)

describe('locales', () => {
  it('define exactly the same keys in English and Spanish', () => {
    expect([...spanish.keys()].sort()).toEqual([...english.keys()].sort())
  })

  it('leave no message empty', () => {
    for (const [key, message] of [...english, ...spanish]) {
      expect(message.trim(), key).not.toBe('')
    }
  })

  it('use the same interpolation variables in both languages', () => {
    for (const [key, message] of english) {
      expect(placeholders(spanish.get(key) ?? ''), key).toEqual(placeholders(message))
    }
  })

  it('have a message for every API error code', () => {
    for (const code of [...SERVER_ERROR_CODES, ...CLIENT_ERROR_CODES]) {
      expect(english.has(`errors.${code}`), code).toBe(true)
    }
  })
})
