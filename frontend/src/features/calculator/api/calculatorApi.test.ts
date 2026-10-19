import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { ApiError } from '@/shared/api/httpClient'
import { server } from '@/test/server'

import { calculate, getHealth, listOperations, OPERATIONS } from './calculatorApi'

describe('calculatorApi', () => {
  it('reports API health', async () => {
    await expect(getHealth()).resolves.toEqual({ status: 'ok' })
  })

  it('lists every supported operation with its arity', async () => {
    const operations = await listOperations()

    expect(operations.map(({ name }) => name)).toEqual(OPERATIONS)
    expect(operations.find(({ name }) => name === 'sqrt')).toMatchObject({ arity: 1 })
    expect(operations.filter(({ arity }) => arity === 2)).toHaveLength(6)
  })

  it('posts the operands to the operation endpoint', async () => {
    let received: { path: string; body: unknown } | undefined
    server.use(
      http.post('/api/v1/operations/:operation', async ({ request }) => {
        received = { path: new URL(request.url).pathname, body: await request.json() }
        return HttpResponse.json({ operation: 'divide', operands: [10, 4], result: 2.5 })
      }),
    )

    const result = await calculate('divide', [10, 4])

    expect(received).toEqual({ path: '/api/v1/operations/divide', body: { operands: [10, 4] } })
    expect(result).toEqual({ operation: 'divide', operands: [10, 4], result: 2.5 })
  })

  it('sends a single operand for square roots', async () => {
    await expect(calculate('sqrt', [81])).resolves.toMatchObject({ operands: [81], result: 9 })
  })

  it('reads percentage as "a% of b"', async () => {
    await expect(calculate('percentage', [15, 80])).resolves.toMatchObject({ result: 12 })
  })

  it('surfaces domain errors as ApiError', async () => {
    const error = await calculate('divide', [1, 0]).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ code: 'division_by_zero', status: 422 })
  })

  it('forwards the abort signal', async () => {
    await expect(getHealth({ signal: AbortSignal.abort() })).rejects.toMatchObject({
      name: 'AbortError',
    })
  })
})
