import { digitCount, MAX_DIGITS } from './entry'

// Typographic minus: the same width as "+" and read as "minus" by screen readers.
const MINUS = '−'

const plainFormatters = new Map<string, Intl.NumberFormat>()
const scientificFormatters = new Map<string, Intl.NumberFormat>()
const integerFormatters = new Map<string, Intl.NumberFormat>()

function cached(
  cache: Map<string, Intl.NumberFormat>,
  locale: string,
  options: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  let formatter = cache.get(locale)
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, options)
    cache.set(locale, formatter)
  }
  return formatter
}

function withMinus(text: string): string {
  return text.replace('-', MINUS)
}

/** Formats a computed value for display in the given locale. */
export function formatNumber(value: number, locale: string): string {
  const magnitude = Math.abs(value)
  const scientific = magnitude >= 1e16 || (magnitude !== 0 && magnitude < 1e-9)
  const formatter = scientific
    ? cached(scientificFormatters, locale, { notation: 'scientific', maximumSignificantDigits: 10 })
    : cached(plainFormatters, locale, { maximumSignificantDigits: 15 })
  return withMinus(formatter.format(value))
}

export function decimalSeparator(locale: string): string {
  const parts = cached(plainFormatters, locale, { maximumSignificantDigits: 15 }).formatToParts(1.5)
  return parts.find((part) => part.type === 'decimal')?.value ?? '.'
}

/**
 * Formats the entry being typed. Unlike formatNumber it keeps what the user
 * typed verbatim: a trailing separator ("12,") and trailing zeros ("0.50").
 */
export function formatEntry(entry: string, locale: string): string {
  if (/e/i.test(entry) || digitCount(entry) > MAX_DIGITS) {
    return formatNumber(Number(entry), locale)
  }

  const negative = entry.startsWith('-')
  const [integer = '0', fraction] = (negative ? entry.slice(1) : entry).split('.')
  // BigInt groups the digits exactly as typed, without a float round trip.
  const grouped = cached(integerFormatters, locale, {}).format(BigInt(integer || '0'))
  const decimals = fraction === undefined ? '' : decimalSeparator(locale) + fraction
  return (negative ? MINUS : '') + grouped + decimals
}
