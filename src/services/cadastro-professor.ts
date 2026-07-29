const BASE_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8085'

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
 * Cadastro público de professor (multipart, sem login). Vira uma solicitação pendente que a
 * Gestão aprova depois, definindo o núcleo.
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
