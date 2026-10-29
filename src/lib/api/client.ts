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

/**
 * Última resposta de cada GET, com o texto que a gerou. As telas atualizam por polling a cada 10 s
 * (`useRealtime`), e cada ciclo trazia um objeto novo mesmo quando o conteúdo era idêntico: o React
 * via "mudança", redesenhava a tela e os gráficos refaziam a animação — a interface ficava
 * piscando. Devolvendo o mesmo objeto quando nada mudou, o `setState` das telas é ignorado.
 */
const ultimaRespostaGet = new Map<string, { texto: string; dados: unknown }>()

async function getEstavel<T>(path: string): Promise<T> {
  const dados = await request<T>('GET', path)
  if (dados === null || typeof dados !== 'object') return dados
  // Compara pela serialização do objeto já entregue: se alguma tela o tiver alterado, ele deixa de
  // bater e a resposta nova é usada, em vez de devolver um objeto adulterado.
  const texto = JSON.stringify(dados)
  const anterior = ultimaRespostaGet.get(path)
  if (anterior && anterior.texto === texto && JSON.stringify(anterior.dados) === texto) {
    return anterior.dados as T
  }
  ultimaRespostaGet.set(path, { texto, dados })
  return dados
}

// Troca de conta não pode reaproveitar dados da sessão anterior.
authStore.onChange(() => ultimaRespostaGet.clear())

export const api = {
  get: <T>(path: string) => getEstavel<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string, body?: unknown) => request<T>('DELETE', path, body),
  postForm: <T>(path: string, form: FormData) => request<T>('POST', path, form, true),
  patchForm: <T>(path: string, form: FormData) => request<T>('PATCH', path, form, true),
}

/**
 * Baixa um arquivo gerado pelo backend (exportações). Diferente de `api.get`, a resposta é binária,
 * então precisa passar por Blob — e o nome do arquivo vem no Content-Disposition, para o usuário
 * receber `evidencias_projeto_turma_data.docx` em vez de um nome genérico.
 */
export async function downloadFile(path: string): Promise<{ blob: Blob; filename: string }> {
  const headers: Record<string, string> = {}
  if (authStore.isValid) headers['Authorization'] = `Bearer ${authStore.token}`

  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(FORM_TIMEOUT_MS),
    })
  } catch {
    throw new ApiError(
      0,
      'network_error',
      'Não foi possível conectar ao servidor. Verifique sua conexão.',
    )
  }

  if (!res.ok) {
    let data: any = null
    try {
      data = JSON.parse(await res.text())
    } catch {
      data = null
    }
    if (res.status === 401 && authStore.isValid) authStore.clear()
    throw new ApiError(
      res.status,
      data?.error ?? 'unknown_error',
      data?.message ?? 'Não foi possível gerar o arquivo.',
      data?.fields,
    )
  }

  const disposition = res.headers.get('Content-Disposition') ?? ''
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)
  const filename = match ? decodeURIComponent(match[1]) : 'download'
  return { blob: await res.blob(), filename }
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
