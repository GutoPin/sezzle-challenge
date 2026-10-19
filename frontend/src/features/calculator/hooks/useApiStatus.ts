import { useEffect, useState } from 'react'

import { isAbortError } from '@/shared/api/httpClient'

import { getHealth } from '../api/calculatorApi'

export type ApiStatus = 'checking' | 'online' | 'offline'

const CHECK_TIMEOUT_MS = 4_000

/** Polls the health endpoint and re-checks as soon as the browser reconnects. */
export function useApiStatus(intervalMs = 30_000): ApiStatus {
  const [status, setStatus] = useState<ApiStatus>('checking')

  useEffect(() => {
    let controller: AbortController | undefined

    function check() {
      controller?.abort()
      controller = new AbortController()
      getHealth({ signal: controller.signal, timeoutMs: CHECK_TIMEOUT_MS }).then(
        () => {
          setStatus('online')
        },
        (error: unknown) => {
          if (!isAbortError(error)) setStatus('offline')
        },
      )
    }

    function goOffline() {
      setStatus('offline')
    }

    check()
    const timer = window.setInterval(check, intervalMs)
    window.addEventListener('online', check)
    window.addEventListener('offline', goOffline)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('online', check)
      window.removeEventListener('offline', goOffline)
      controller?.abort()
    }
  }, [intervalMs])

  return status
}
