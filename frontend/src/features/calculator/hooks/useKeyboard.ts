import { useEffect, useEffectEvent } from 'react'

import { actionForKey, type InputAction } from '../model/keyboard'

function isTextField(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  )
}

function isActivatable(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.closest('button, a') !== null
}

/** Lets the whole page act as the calculator's keyboard. */
export function useKeyboard(onInput: (action: InputAction) => void) {
  const handleInput = useEffectEvent(onInput)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return
      if (isTextField(event.target)) return
      // Enter on a focused button already clicks it; handling it too would
      // press "=" on top of whatever key has focus.
      if (event.key === 'Enter' && isActivatable(event.target)) return

      const action = actionForKey(event.key)
      if (!action) return
      // "/" would otherwise open Firefox's quick find.
      event.preventDefault()
      handleInput(action)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])
}
