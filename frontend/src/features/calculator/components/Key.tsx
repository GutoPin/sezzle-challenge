import type { ReactNode } from 'react'

export type KeyTone = 'digit' | 'function' | 'operator' | 'equals'

interface KeyProps {
  /** Accessible name; the visible face is often a symbol. */
  label: string
  children: ReactNode
  tone: KeyTone
  onPress: () => void
  /** Lit while the matching physical key is pressed. */
  flashing?: boolean
  /** For operators: this one is waiting for its second operand. */
  pressed?: boolean | undefined
  className?: string | undefined
}

const tones: Record<KeyTone, string> = {
  digit: 'bg-raised text-ink border-line font-mono text-xl',
  function: 'bg-sunken text-ink border-transparent text-lg',
  operator:
    'bg-sunken text-ink border-transparent text-2xl aria-pressed:bg-ink aria-pressed:text-canvas',
  equals: 'bg-accent text-on-accent border-transparent text-3xl hover:bg-accent-hover',
}

export function Key({
  label,
  children,
  tone,
  onPress,
  flashing,
  pressed,
  className = '',
}: KeyProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      data-flash={flashing ? '' : undefined}
      onClick={onPress}
      className={`flex min-h-14 touch-manipulation items-center justify-center rounded-sm border select-none sm:min-h-16 ${tones[tone]} transition-[translate,filter,background-color,color] duration-(--q-duration-instant) ease-out hover:brightness-[0.97] active:translate-y-px active:brightness-[0.92] data-flash:translate-y-px data-flash:brightness-[0.92] dark:hover:brightness-110 dark:active:brightness-90 ${className}`}
    >
      {children}
    </button>
  )
}
