// localStorage throws when it is disabled, in some private browsing modes and
// when the quota is exceeded. Preferences are a convenience, so persistence is
// best-effort and never allowed to break rendering.

export function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Best-effort; see above.
  }
}
