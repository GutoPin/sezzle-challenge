import { http, HttpResponse } from 'msw'

import { OPERATIONS, type Operation } from '@/features/calculator/api/calculatorApi'

interface OperationSpec {
  symbol: string
  arity: 1 | 2
  evaluate: (operands: number[]) => number
}

// An in-memory stand-in for the Go API, faithful enough that component tests
// exercise the real request/response shapes rather than hand-rolled fixtures.
const operations: Record<Operation, OperationSpec> = {
  add: { symbol: '+', arity: 2, evaluate: ([a = 0, b = 0]) => a + b },
  subtract: { symbol: '-', arity: 2, evaluate: ([a = 0, b = 0]) => a - b },
  multiply: { symbol: '*', arity: 2, evaluate: ([a = 0, b = 0]) => a * b },
  divide: { symbol: '/', arity: 2, evaluate: ([a = 0, b = 0]) => a / b },
  power: { symbol: '^', arity: 2, evaluate: ([a = 0, b = 0]) => a ** b },
  sqrt: { symbol: '√', arity: 1, evaluate: ([a = 0]) => Math.sqrt(a) },
  percentage: { symbol: '%', arity: 2, evaluate: ([a = 0, b = 0]) => (a / 100) * b },
}

export function apiError(status: number, code: string, message: string) {
  return HttpResponse.json({ error: { code, message } }, { status })
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'number')
}

export const handlers = [
  http.get('/api/v1/health', () => HttpResponse.json({ status: 'ok' })),

  http.get('/api/v1/operations', () =>
    HttpResponse.json({
      operations: OPERATIONS.map((name) => ({
        name,
        symbol: operations[name].symbol,
        arity: operations[name].arity,
      })),
    }),
  ),

  http.post<{ operation: string }>('/api/v1/operations/:operation', async ({ params, request }) => {
    const name = OPERATIONS.find((operation) => operation === params.operation)
    if (!name) return apiError(404, 'unknown_operation', `unknown operation "${params.operation}"`)
    const spec = operations[name]

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return apiError(400, 'invalid_json', 'request body must be valid JSON')
    }

    const operands = (body as { operands?: unknown } | null)?.operands
    if (!isNumberArray(operands) || operands.length !== spec.arity) {
      return apiError(400, 'invalid_operand_count', `expected ${spec.arity} operands`)
    }
    if (name === 'divide' && operands[1] === 0) {
      return apiError(422, 'division_by_zero', 'cannot divide by zero')
    }
    if (name === 'sqrt' && (operands[0] ?? 0) < 0) {
      return apiError(
        422,
        'negative_square_root',
        'cannot take the square root of a negative number',
      )
    }

    const result = spec.evaluate(operands)
    if (!Number.isFinite(result)) {
      return apiError(422, 'result_out_of_range', 'result is out of range')
    }
    return HttpResponse.json({ operation: name, operands, result })
  }),
]
