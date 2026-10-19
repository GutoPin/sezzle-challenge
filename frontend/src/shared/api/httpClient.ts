export const DEFAULT_TIMEOUT_MS = 8_000

/** Codes the API sends in its error envelope. */
export const SERVER_ERROR_CODES = [
  'invalid_json',
  'invalid_operand_count',
  'unknown_field',
  'unknown_operation',
  'payload_too_large',
  'division_by_zero',
  'negative_square_root',
  'result_out_of_range',
] as const

/** Codes raised on this side when no usable response arrives. */
export const CLIENT_ERROR_CODES = ['network', 'timeout', 'unknown'] as const

export type ServerErrorCode = (typeof SERVER_ERROR_CODES)[number]
export type ClientErrorCode = (typeof CLIENT_ERROR_CODES)[number]
export type ApiErrorCode = ServerErrorCode | ClientErrorCode

export class ApiError extends Error {
  override readonly name = 'ApiError'
  readonly code: ApiErrorCode
  /** HTTP status of the response, or 0 when none was received. */
  readonly status: number

  constructor(code: ApiErrorCode, status: number, message: string) {
    super(message)
    this.code = code
    this.status = status
  }
}

// Matched by name: DOMException is a different constructor in every realm, so
// instanceof misses aborts raised by another window or the test runtime.
export function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError'
  )
}

export interface RequestOptions {
  method?: 'GET' | 'POST'
  body?: unknown
  signal?: AbortSignal
  timeoutMs?: number
}

// Same-origin by default: Vite proxies /api in development and the Go server
// serves the bundle in production. VITE_API_URL points at a separate origin.
const apiOrigin = import.meta.env.VITE_API_URL || window.location.origin

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal, timeoutMs = DEFAULT_TIMEOUT_MS } = options
  const timeout = AbortSignal.timeout(timeoutMs)

  let response: Response
  let text: string
  try {
    response = await fetch(new URL(path, apiOrigin), {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    })
    text = await response.text()
  } catch (error) {
    // A cancellation by the caller is not a failure; surface it untouched so
    // callers can tell it apart with isAbortError.
    if (signal?.aborted) throw signal.reason
    if (timeout.aborted) {
      throw new ApiError('timeout', 0, `No response within ${timeoutMs}ms`)
    }
    throw new ApiError('network', 0, error instanceof Error ? error.message : 'Network error')
  }

  const payload = parseJson(text)
  if (!response.ok) throw toApiError(response.status, payload)
  if (payload === undefined) {
    throw new ApiError('unknown', response.status, 'Response body is not valid JSON')
  }
  return payload as T
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

function toApiError(status: number, payload: unknown): ApiError {
  const error = (payload as { error?: { code?: unknown; message?: unknown } } | undefined)?.error
  const message =
    typeof error?.message === 'string' ? error.message : `Request failed with status ${status}`
  const code = SERVER_ERROR_CODES.find((known) => known === error?.code) ?? 'unknown'
  return new ApiError(code, status, message)
}
