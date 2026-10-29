import api, { ApiError } from '@/lib/api/client'

const BASE_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8085'

/** Tipos que podem ser escolhidos no cadastro de profissional (Gestão Geral fica de fora). */
export const TIPOS_PROFISSIONAL = [
  ['PROFESSOR', 'Professor(a)'],
  ['ASSISTENTE_SOCIAL', 'Assistente Social'],
  ['ADMINISTRATIVO', 'Administrativo'],
] as const

export interface CadastroProfessorResposta {
  id: string
  status: string
}

interface ApiErrorBody {
  error?: string
  message?: string
  fields?: Record<string, string>
}

export class CadastroProfessorError extends Error {
  fields?: Record<string, string>
  constructor(message: string, fields?: Record<string, string>) {
    super(message)
    this.fields = fields
  }
}

/**
 * Cadastro feito pela Gestão Geral (com login): mesmo formulário do autocadastro, mas a conta já
 * nasce criada com o tipo escolhido.
 */
export const submitCadastroPelaGestao = async (
  form: FormData,
): Promise<CadastroProfessorResposta> => {
  try {
    return await api.postForm<CadastroProfessorResposta>('/api/cadastro-profissional', form)
  } catch (err) {
    if (err instanceof ApiError) throw new CadastroProfessorError(err.message, err.fields)
    throw err
  }
}

/**
 * Autocadastro público de profissional (multipart, sem login). Vira uma solicitação pendente que a
 * Gestão aprova em Solicitações; a conta nasce com o tipo escolhido no formulário.
 */
export const submitCadastroProfessor = async (
  form: FormData,
): Promise<CadastroProfessorResposta> => {
  const res = await fetch(`${BASE_URL}/api/cadastro-professor`, {
    method: 'POST',
    body: form,
  })
  const text = await res.text()
  const data: ApiErrorBody & CadastroProfessorResposta = text ? JSON.parse(text) : ({} as never)
  if (!res.ok) {
    throw new CadastroProfessorError(
      data?.message ?? 'Erro ao enviar o cadastro. Tente novamente.',
      data?.fields,
    )
  }
  return data
}
