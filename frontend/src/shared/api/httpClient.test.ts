import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { apiError } from '@/test/handlers'
import { server } from '@/test/server'

import { ApiError, isAbortError, request, type ServerErrorCode } from './httpClient'

const ENDPOINT = '/api/v1/test'

const STATUS_BY_CODE: Record<ServerErrorCode, number> = {
  invalid_json: 400,
  unknown_field: 400,
  invalid_operand_count: 400,
  invalid_operand: 400,
  unknown_operation: 404,
  not_found: 404,
  method_not_allowed: 405,
  payload_too_large: 413,
  division_by_zero: 422,
  negative_square_root: 422,
  undefined_result: 422,
  result_out_of_range: 422,
  internal_error: 500,
}

function respondWith(resolver: Parameters<typeof http.all>[1]) {
  server.use(http.all(ENDPOINT, resolver))
}

async function captureError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error('Expected the request to fail')
}

describe('request', () => {
  it('returns the parsed JSON body', async () => {
    respondWith(() => HttpResponse.json({ status: 'ok' }))

    await expect(request(ENDPOINT)).resolves.toEqual({ status: 'ok' })
  })

  it('sends the body as JSON with the given method', async () => {
    let received: { method: string; contentType: string | null; body: unknown } | undefined
    respondWith(async ({ request: req }) => {
      received = {
        method: req.method,
        contentType: req.headers.get('Content-Type'),
        body: await req.json(),
      }
      return HttpResponse.json({})
    })

    await request(ENDPOINT, { method: 'POST', body: { operands: [10, 4] } })

    expect(received).toEqual({
      method: 'POST',
      contentType: 'application/json',
      body: { operands: [10, 4] },
    })
  })

  it('omits the Content-Type header when there is no body', async () => {
    let contentType: string | null = 'unset'
    respondWith(({ request: req }) => {
      contentType = req.headers.get('Content-Type')
      return HttpResponse.json({})
    })

    await request(ENDPOINT)

    expect(contentType).toBeNull()
  })

  describe('error responses', () => {
    it.each(Object.entries(STATUS_BY_CODE))(
      'maps the %s envelope to an ApiError',
      async (code, status) => {
        respondWith(() => apiError(status, code, `server says ${code}`))

        const error = await captureError(request(ENDPOINT))

        expect(error).toBeInstanceOf(ApiError)
        expect(error).toMatchObject({ code, status, message: `server says ${code}` })
      },
    )

    it('maps an unrecognised code to unknown, keeping the status and message', async () => {
      respondWith(() => apiError(500, 'disk_on_fire', 'internal error'))

      await expect(request(ENDPOINT)).rejects.toMatchObject({
        code: 'unknown',
        status: 500,
        message: 'internal error',
      })
    })

    it('maps a body that is not JSON to unknown', async () => {
      respondWith(() => new HttpResponse('<h1>Bad Gateway</h1>', { status: 502 }))

      await expect(request(ENDPOINT)).rejects.toMatchObject({
        code: 'unknown',
        status: 502,
        message: 'Request failed with status 502',
      })
    })

    it('maps JSON without an error envelope to unknown', async () => {
      respondWith(() => HttpResponse.json({ detail: 'nope' }, { status: 405 }))

      await expect(request(ENDPOINT)).rejects.toMatchObject({ code: 'unknown', status: 405 })
    })

    it('rejects a successful response whose body is not JSON', async () => {
      respondWith(() => HttpResponse.text('<!doctype html>'))

      await expect(request(ENDPOINT)).rejects.toMatchObject({ code: 'unknown', status: 200 })
    })
  })

  describe('transport failures', () => {
    it('maps a network failure to network', async () => {
      respondWith(() => HttpResponse.error())

      await expect(request(ENDPOINT)).rejects.toMatchObject({ code: 'network', status: 0 })
    })

    it('maps a slow response to timeout', async () => {
      respondWith(async () => {
        await delay('infinite')
        return HttpResponse.json({})
      })

      await expect(request(ENDPOINT, { timeoutMs: 20 })).rejects.toMatchObject({
        code: 'timeout',
        status: 0,
      })
    })

    it('passes a caller abort through as an AbortError', async () => {
      respondWith(async () => {
        await delay('infinite')
        return HttpResponse.json({})
      })
      const controller = new AbortController()

      const pending = captureError(request(ENDPOINT, { signal: controller.signal }))
      controller.abort()
      const error = await pending

      expect(error).not.toBeInstanceOf(ApiError)
      expect(isAbortError(error)).toBe(true)
    })

    it('does not send a request when the signal is already aborted', async () => {
      let called = false
      respondWith(() => {
        called = true
        return HttpResponse.json({})
      })

      const error = await captureError(request(ENDPOINT, { signal: AbortSignal.abort() }))

      expect(isAbortError(error)).toBe(true)
      expect(called).toBe(false)
    })
  })
})

describe('isAbortError', () => {
  it('recognises only AbortError exceptions', () => {
    expect(isAbortError(new DOMException('stop', 'AbortError'))).toBe(true)
    expect(isAbortError(new DOMException('slow', 'TimeoutError'))).toBe(false)
    expect(isAbortError(new Error('AbortError'))).toBe(false)
  })
})
