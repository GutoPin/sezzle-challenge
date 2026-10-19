// The number being typed is kept as a string, not a number: "0.", "-0" and
// "2.50" are all valid mid-edit states that a float would lose.

export const MAX_DIGITS = 16

export function digitCount(entry: string): number {
  return entry.replace(/\D/g, '').length
}

/** Returns null when the digit would exceed MAX_DIGITS. */
export function appendDigit(entry: string, digit: string): string | null {
  if (digitCount(entry) >= MAX_DIGITS) return null
  if (entry === '0') return digit
  if (entry === '-0') return `-${digit}`
  return entry + digit
}

export function appendDecimal(entry: string): string {
  return entry.includes('.') ? entry : `${entry}.`
}

export function deleteLast(entry: string): string {
  const next = entry.slice(0, -1)
  return next === '' || next === '-' ? '0' : next
}

export function toggleSign(entry: string): string {
  return entry.startsWith('-') ? entry.slice(1) : `-${entry}`
}

export function toNumber(entry: string): number {
  return Number(entry)
}

export function fromNumber(value: number): string {
  return String(value)
}
