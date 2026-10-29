import { ApiError } from '@/lib/api/client'

export type FieldErrors = Record<string, string>

export function extractFieldErrors(error: unknown): FieldErrors {
  if (error instanceof ApiError && error.fields) return error.fields
  return {}
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const msgs = Object.values(error.fields ?? {})
    return msgs.length > 0 ? msgs.join(' ') : error.message || 'Erro inesperado. Tente novamente.'
  }
  return error instanceof Error ? error.message : 'Erro inesperado. Tente novamente.'
}
