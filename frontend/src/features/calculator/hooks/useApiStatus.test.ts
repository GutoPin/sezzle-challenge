import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { server } from '@/test/server'

import { useApiStatus } from './useApiStatus'

describe('useApiStatus', () => {
  it('starts checking and reports the API online', async () => {
    const { result } = renderHook(() => useApiStatus())

    expect(result.current).toBe('checking')
    await waitFor(() => {
      expect(result.current).toBe('online')
    })
  })

  it('reports the API offline when the health check fails', async () => {
    server.use(http.get('/api/v1/health', () => HttpResponse.error()))
    const { result } = renderHook(() => useApiStatus())

    await waitFor(() => {
      expect(result.current).toBe('offline')
    })
  })

  it('follows the browser going offline and back online', async () => {
    const { result } = renderHook(() => useApiStatus())
    await waitFor(() => {
      expect(result.current).toBe('online')
    })

    act(() => {
      window.dispatchEvent(new Event('offline'))
    })
    expect(result.current).toBe('offline')

    act(() => {
      window.dispatchEvent(new Event('online'))
    })
    await waitFor(() => {
      expect(result.current).toBe('online')
    })
  })

  it('polls on an interval', async () => {
    let calls = 0
    server.use(
      http.get('/api/v1/health', () => {
        calls += 1
        return HttpResponse.json({ status: 'ok' })
      }),
    )

    renderHook(() => useApiStatus(20))

    await waitFor(() => {
      expect(calls).toBeGreaterThanOrEqual(3)
    })
  })
})
