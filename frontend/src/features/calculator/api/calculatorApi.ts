import { request, type RequestOptions } from '@/shared/api/httpClient'

export const OPERATIONS = [
  'add',
  'subtract',
  'multiply',
  'divide',
  'power',
  'sqrt',
  'percentage',
] as const

export type Operation = (typeof OPERATIONS)[number]
export type UnaryOperation = Extract<Operation, 'sqrt'>
export type BinaryOperation = Exclude<Operation, UnaryOperation>

/**
 * Operands in the order the API expects. For percentage, [a, b] means
 * "a% of b", which is a / 100 × b.
 */
export type Operands<Op extends Operation> = Op extends UnaryOperation
  ? [value: number]
  : [left: number, right: number]

export interface OperationInfo {
  name: Operation
  symbol: string
  arity: 1 | 2
}

export interface CalculationResult {
  operation: Operation
  operands: number[]
  result: number
}

export interface HealthStatus {
  status: 'ok'
}

type CallOptions = Pick<RequestOptions, 'signal' | 'timeoutMs'>

const BASE_PATH = '/api/v1'

export function getHealth(options?: CallOptions): Promise<HealthStatus> {
  return request<HealthStatus>(`${BASE_PATH}/health`, options)
}

export async function listOperations(options?: CallOptions): Promise<OperationInfo[]> {
  const { operations } = await request<{ operations: OperationInfo[] }>(
    `${BASE_PATH}/operations`,
    options,
  )
  return operations
}

export function calculate<Op extends Operation>(
  operation: Op,
  operands: Operands<Op>,
  options?: CallOptions,
): Promise<CalculationResult> {
  return request<CalculationResult>(`${BASE_PATH}/operations/${operation}`, {
    ...options,
    method: 'POST',
    body: { operands },
  })
}
