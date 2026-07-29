import { Usuario } from '@/lib/types'

const BASE_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8085'

const STORAGE_KEY = 'ff_auth'

const DEFAULT_TIMEOUT_MS = 20_000
const FORM_TIMEOUT_MS = 60_000

export class ApiError extends Error {
  status: number
  error: string
  fields?: Record<string, string>

  constructor(status: number, error: string, message: string, fields?: Record<string, string>) {
    super(message)
    this.status = status
    this.error = error
    this.fields = fields
  }
}

type AuthListener = (token: string | null, user: Usuario | null) => void

interface StoredAuth {
  token: string
  user: Usuario
}

function readStorage(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredAuth) : null
  } catch {
    return null
  }
}

class AuthStore {
  private listeners = new Set<AuthListener>()
  private state: StoredAuth | null = readStorage()

  get isValid(): boolean {
    return this.state !== null
  }

  get token(): string {
    return this.state?.token ?? ''
  }

  get user(): Usuario | null {
    return this.state?.user ?? null
  }

  save(token: string, user: Usuario) {
    this.state = { token, user }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state))
    this.notify()
  }

  setUser(user: Usuario) {
    if (!this.state) return
    this.state = { ...this.state, user }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state))
    this.notify()
  }

  clear() {
    this.state = null
    localStorage.removeItem(STORAGE_KEY)
    this.notify()
  }

  onChange(listener: AuthListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify() {
    for (const l of this.listeners) l(this.token || null, this.user)
  }
}

export const authStore = new AuthStore()

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  isForm = false,
): Promise<T> {
  const headers: Record<string, string> = {}
  if (authStore.isValid) headers['Authorization'] = `Bearer ${authStore.token}`
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json'

  // Sem timeout, uma requisição pendurada (backend reiniciando: a porta já
  // aceita conexão mas ainda não responde) trava a tela indefinidamente.
  // Uploads recebem uma folga maior por transferirem arquivos.
  const timeoutMs = isForm ? FORM_TIMEOUT_MS : DEFAULT_TIMEOUT_MS

  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      throw new ApiError(
        0,
        'timeout',
        `O servidor não respondeu em ${Math.round(timeoutMs / 1000)}s. Verifique se o backend está no ar e tente novamente.`,
      )
    }
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError(0, 'aborted', 'Requisição cancelada.')
    }
    throw new ApiError(
      0,
      'network_error',
      'Não foi possível conectar ao servidor. Verifique sua conexão.',
    )
  }

  if (res.status === 204) return null as T

  let data: any = null
  const text = await res.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }

  if (!res.ok) {
    if (res.status === 401 && authStore.isValid && path !== '/api/auth/login') {
      authStore.clear()
    }
    throw new ApiError(
      res.status,
      data?.error ?? 'unknown_error',
      data?.message ?? 'Erro inesperado. Tente novamente.',
      data?.fields,
    )
  }
  return data as T
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string, body?: unknown) => request<T>('DELETE', path, body),
  postForm: <T>(path: string, form: FormData) => request<T>('POST', path, form, true),
  patchForm: <T>(path: string, form: FormData) => request<T>('PATCH', path, form, true),
}

/**
 * URL de um arquivo salvo no backend (avatar, documentos). O endpoint exige autenticação;
 * como <img>/links não enviam headers, o token vai na query string.
 */
export function fileUrl(filename: string | undefined | null): string {
  if (!filename) return ''
  const token = authStore.isValid ? `?token=${encodeURIComponent(authStore.token)}` : ''
  return `${BASE_URL}/api/files/${filename}${token}`
}

export default api
