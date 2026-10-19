import type { ReactNode } from 'react'

export interface SegmentedOption<Value extends string> {
  value: Value
  /** Accessible name; also shown as a tooltip. */
  label: string
  content: ReactNode
  lang?: string
}

interface SegmentedControlProps<Value extends string> {
  label: string
  options: readonly SegmentedOption<Value>[]
  value: Value
  onChange: (value: Value) => void
}

export function SegmentedControl<Value extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<Value>) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-full bg-sunken p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-label={option.label}
          aria-pressed={option.value === value}
          title={option.label}
          lang={option.lang}
          onClick={() => {
            onChange(option.value)
          }}
          // Segments share edges, so their hit areas only grow vertically.
          className="tap-target inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-sm font-medium text-ink-muted transition-colors duration-(--q-duration-quick) ease-out after:inset-x-0 hover:text-ink aria-pressed:bg-raised aria-pressed:text-ink"
        >
          {option.content}
        </button>
      ))}
    </div>
  )
}
